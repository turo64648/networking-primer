---
title: "12. L7 Proxies"
---

<script setup>
import { cards } from './l7-proxies-review'
</script>

# 12. L7 Proxies

Behind the packet-level load balancer sits a fleet of servers that read every request, decide where it goes,
and forward it. These <Term id="reverse-proxy">reverse proxies</Term> are where TLS ends, where routing,
balancing, rate limiting and bot defence happen, and where many large outages start, so interviewers probe them
in both system design and debugging rounds.

::: info Before you start
- An **L4 load balancer** spreads connections across servers by looking only at addresses and ports. It never
  reads the request. [Chapter 11](/edge/l4-load-balancing) covers it.
- **TLS** encrypts the connection; whoever holds the certificate's private key can decrypt it.
  [Chapter 5](/protocols/tls) covers it.
- An **HTTP** request has a method, a path and headers. HTTP/2 carries many requests at once on one connection,
  and clients keep connections open for reuse. [Chapter 6](/protocols/http) covers it.

The chapter makes sense without them. Names and addresses in the examples are placeholders.
:::

## What an L7 proxy does

**In short:** it accepts the client's connection, reads each HTTP request, picks a backend server for it, and
forwards it on a separate connection. Because it reads the request, it can make decisions an L4 balancer cannot.

A phone connects to `www.example.com`. The packets reach a PoP, where an L4 load balancer hands the connection
to one of many proxy servers. That proxy completes the TCP and TLS handshakes with the phone. Now it can read the
request: `GET /api/feed`, with a cookie and a user agent.

It then looks up a rule such as "paths starting with `/api/` go to the API servers", picks one API server, and
sends the request there over a connection it already holds open. The response comes back the same way. The
client only ever talks to the proxy. A proxy that does this on behalf of servers is a **reverse proxy**. (A
forward proxy does the same on behalf of clients, like a company's outbound web proxy.)

The name comes from the layer model: <Term id="layer-7">layer 7</Term> is the application layer, here HTTP.
An L4 balancer works with packets and connections. An L7 proxy works with requests.

There are always **two connections**: client to proxy (often called *downstream*) and proxy to backend
(*upstream*). They are independent. They can use different protocols, different TLS settings and different
lifetimes. Most of this chapter follows from that one fact.

<L7ProxyPipelineDiagram />

### Why put one in the path

- **Routing by content.** Send `/api/` and `/images/` to different services, or one customer's hostname to its
  own servers.
- **Balancing requests, not connections.** One HTTP/2 connection can carry thousands of requests. An L4 balancer
  must send them all to one server; an L7 proxy can spread them.
- **Shielding backends.** The proxy absorbs slow clients, bad TLS, malformed requests and floods, so backends
  see clean, fast traffic.
- **One place for policy.** Rate limits, authentication checks, header rewrites, logging and metrics, the same
  for every service.
- **Connection reuse.** Thousands of client connections become a few warm, reused connections to each backend.

The cost is real. Each request pays for parsing, a TLS decryption, and an extra hop, typically well under a
millisecond of processing on a healthy proxy, more under load. The proxy also sees every request in plain text,
so it is a high-value target and a single point of failure for everything behind it.

### Telling the backend who the client is

The backend's connection comes from the proxy, so the client's IP address is lost. Proxies put it back in a
header. The common one is `X-Forwarded-For: 203.0.113.7`; the standard one is `Forwarded: for=203.0.113.7`.
Each proxy on the way appends the address it saw.

Clients can send these headers too, with fake values. A backend must trust only the entries added by proxies it
knows. In practice: take the address that your own outermost proxy appended, and ignore everything to its left.
Getting this wrong lets an attacker dodge IP-based rate limits by sending a fake header.

::: details Going deeper: PROXY protocol, Via and request IDs
- When a proxy passes TCP through without reading HTTP (for example, for non-HTTP traffic), it cannot add a
  header. The **PROXY protocol**, defined by HAProxy, prepends a small block with the original addresses to the
  start of the connection. Both sides must agree to use it, or the backend sees garbage.
- `Forwarded` is defined in RFC 7239 (2014). `X-Forwarded-For`, `X-Forwarded-Proto` and `X-Forwarded-Host` are
  older conventions that every proxy supports.
- Proxies often add a request ID header (for example `X-Request-Id`) and a `traceparent` header so one request can
  be followed through logs ([chapter 18](/operations/observing-the-path)).
:::

## Terminating TLS and HTTP

**In short:** the proxy ends the client's TLS and HTTP connection and starts fresh ones to the backend. That lets
it translate protocols, buffer slow clients and enforce limits, but the two sides must agree exactly on where
each request starts and ends.

<Term id="tls-termination">Terminating TLS</Term> at the proxy means the proxy holds the certificate and private
key and decrypts traffic. [Chapter 5](/protocols/tls) covers the handshake and certificates. Here, what matters is
what the proxy can do once it has the plain request.

**Protocol translation.** The client may speak HTTP/3 over QUIC or HTTP/2. The proxy can speak HTTP/1.1 or
HTTP/2 to the backend. This lets a site adopt HTTP/3 at the edge without changing any backend. The proxy maps
each client stream to an upstream request.

**Buffering.** A phone on a weak network can take seconds to upload a request body or download a response. If the
backend had to wait, one slow client would tie up a backend worker for seconds. The proxy can read the whole
request first, send it to the backend in one fast burst, then take the response quickly and feed it to the phone
at the phone's pace. Buffering protects backends but adds latency for streaming responses, so proxies let you turn
it off per route.

**Limits.** The proxy enforces maximum header size, body size, number of headers and request rate per connection.
It rejects bad input before any backend sees it. These limits are an important part of the attack surface:
defaults differ between proxies.

**Encryption to the backend.** The proxy-to-backend hop can be plain HTTP inside a trusted network, or TLS again,
often mutual TLS where the backend checks the proxy's certificate too. [Chapter 14](/backend/edge-to-origin)
covers that hop.

::: details Going deeper: request smuggling
HTTP/1.1 has two ways to say how long a body is: a `Content-Length` header, and chunked `Transfer-Encoding`. If
the proxy and the backend read the same bytes with different rules, they disagree on where one request ends. An
attacker can then hide a second request inside the first. The proxy sees one harmless request; the backend sees
two, and the hidden one may be attached to the next user's connection. This is **request smuggling**. PortSwigger's
2019 "HTTP Desync Attacks" research showed it against many real sites. Defences: proxies that reject ambiguous
requests (both headers, malformed chunking), HTTP/2 to the backend, and keeping proxy and backend parsers strict.
:::

## Routing

**In short:** the proxy matches each request against an ordered list of rules (hostname, path, headers) and sends
it to a named group of backends. The same mechanism does canaries, traffic splits and sticky sessions.

A route is a rule plus a destination. A typical table, checked in order:

| Match | Destination |
|---|---|
| Host `api.example.com`, path starts with `/v2/` | API v2 servers |
| Host `api.example.com` | API v1 servers |
| Path starts with `/static/` | static file servers or a cache |
| Anything else | web servers |

The destination is a named group of interchangeable backends. Envoy calls it a *cluster*, NGINX an *upstream*,
HAProxy a *backend*. This chapter says **backend group**. Picking a group is routing; picking one server inside
it is balancing, covered next.

Routing does more than split by path:

- **Weighted splits.** Send 1% of traffic to a new version (a canary), then 10%, then all of it. Rolling back is a
  config change, not a deploy.
- **Header-based routing.** Send employees, or requests with a test header, to a staging version.
- **Affinity.** Send all requests from one user to the same server, using a cookie or a hash of a header. This
  helps when servers keep a per-user cache. The proxy can use the same consistent hashing methods as L4
  balancers ([chapter 11](/edge/l4-load-balancing)), so adding a server moves few users.

Each route also carries a **timeout** and a **retry policy**: how long to wait for the backend, and whether to try
another server after a failure. Retries are powerful and dangerous. A proxy should retry only requests that are safe
to repeat, and only within a budget, or retries can multiply load during an outage. [Chapter 17](/operations/timeouts-retries-overload)
covers the policy; here, note that the proxy is usually where it is configured.

::: details Going deeper: dynamic configuration
Large fleets do not edit config files by hand. A control plane computes routes and backend lists and pushes them to
every proxy. Envoy defines a family of APIs for this, often called **xDS** (for listeners, routes, clusters and
endpoints). NGINX and HAProxy have their own runtime APIs, or are reloaded with new files. The control plane is
powerful: a bad push reaches every proxy within seconds. Several of the outages below were exactly that. Staged
rollouts of config, not only of code, are the standard defence.
:::

## Balancing requests across backends

**In short:** for each request, the proxy picks one server in the group. Round robin is fine when requests and
servers are alike. When they are not, "pick two at random and use the less busy one" gives most of the benefit of
perfect knowledge without a herd effect.

### Round robin and its limits

**Round robin** sends requests to servers in turn: A, B, C, A, B, C. **Weighted round robin** gives bigger servers
a bigger share. Both assume every request costs about the same. Real traffic breaks that assumption. One request
renders a feed in 300 ms; another returns a cached flag in 2 ms. One server is slower because it is busy with
garbage collection or shares a host with a noisy neighbour.

Round robin keeps sending that slow server its full share. Requests pile up on it, its latency climbs, and the
tail latency of the whole service climbs with it.

### Least request

A proxy knows how many requests it currently has in flight to each server. A server that is slow has more in
flight, because its requests take longer to finish. So "send the next request to the server with the fewest
active requests" automatically sends less to slow servers. This is **least request** (HAProxy and NGINX call the
connection-based version *least connections*).

There is a catch at scale. Each proxy sees only its own requests. With hundreds of proxies and a few dozen servers,
every proxy may pick the same server, the one that looked idle a moment ago. They all pile onto it at once. This is a
small <Term id="thundering-herd">thundering herd</Term>, and it gets worse when the load information is stale.

### Power of two choices

The fix is surprisingly simple: pick **two servers at random**, and send the request to whichever has fewer active
requests. This is the <Term id="power-of-two-choices">power of two choices</Term>.

Randomness spreads the proxies' choices, so they do not all pick the same server. Comparing two avoids the worst
servers most of the time. Michael Mitzenmacher's analysis (published in 2001) shows the effect is large: compared with
one random choice, two choices make the most loaded server far less loaded, and a third choice adds little more.
Envoy's least-request balancer works this way by default when servers have equal weights.

```python
# Run: python3 p2c.py  — compare random, round robin and two-choices with uneven request costs
import random
def run(pick, n=10, reqs=200_000):
    load = [0.0] * n                      # outstanding work per server
    for i in range(reqs):
        load = [max(0.0, l - 1.0) for l in load]   # each server finishes 1 unit per tick
        s = pick(load, i)
        load[s] += random.expovariate(1 / 9.0)     # uneven request costs, ~90% utilisation
    return max(load)
rand = lambda load, i: random.randrange(len(load))
rr   = lambda load, i: i % len(load)
p2c  = lambda load, i: min(random.sample(range(len(load)), 2), key=lambda s: load[s])
for name, f in [("random", rand), ("round robin", rr), ("two choices", p2c)]:
    print(f"{name:12} worst backlog at end: {run(f):8.1f}")
```

Exact numbers vary run to run. Look at the ratio: two choices keeps the worst server's backlog far below random or
round robin, because it steers away from whichever server is temporarily behind.

### New servers and slow start

A server that just started has cold caches, and a runtime that has not optimised its code yet. If least request
sends it a full share at once (it has zero active requests, so it looks perfect), it can fall over. **Slow start**
ramps a new server's share up over tens of seconds. HAProxy, Envoy and NGINX Plus offer it.

::: details Going deeper: why L7 balancing matters for HTTP/2 and gRPC
An L4 balancer spreads **connections**. A gRPC client often opens one HTTP/2 connection and sends everything over
it for hours. With L4 balancing alone, each client pins to one server, and a few busy clients overload a few servers
while others idle. Adding servers does not help, because existing connections never move. An L7 proxy, or a client
library that balances per request, fixes this. A common partial fix without a proxy is a **maximum connection age**:
the server closes connections after some minutes, so clients reconnect and spread out.

Some balancers use recent latency instead of the in-flight count, for example a moving average of response times.
That reacts to slow servers even when traffic is light.
:::

## Health checks and outlier detection

**In short:** the proxy learns which servers are broken in two ways: by probing them (active health checks) and by
watching real responses (outlier detection). Both need a cap, so a bug in the checks cannot remove every server.

<Term id="health-check">Active health checks</Term> work as described for L4 balancers in [chapter 11](/edge/l4-load-balancing):
send a request like `GET /healthz` every few seconds, and remove a server after several failures. An L7 proxy can
check the HTTP status and even the body, not only whether a port is open.

Probes have two weaknesses. They test one cheap path, so a server can pass `/healthz` while failing real requests,
a <Term id="gray-failure">gray failure</Term>. And with many proxies probing many servers, the probes themselves
become noticeable load.

**Passive checks** use the traffic the proxy is already sending. If a server returns five errors in a row, or its
error rate is far above its peers, the proxy stops sending it requests for a while. This is
<Term id="outlier-detection">outlier detection</Term>. It catches gray failures that probes miss, within seconds, at no
extra cost. The ejected server comes back after a timeout, and stays out longer each time it fails again.

### Protecting against your own checks

The danger is removing too much. Suppose a shared dependency, such as a database, fails. Every server returns
errors. Outlier detection ejects them all, and now the proxy has nowhere to send traffic, even for the requests that
would have worked. Or a typo in the health check path marks every server unhealthy at once.

Two common guards:

- **Maximum ejection percentage.** Never eject more than a set share of the group (say 10–30%) through outlier
  detection.
- **Panic mode.** If too few servers look healthy, assume the health signal is wrong and balance across all servers.
  This is a form of <Term id="fail-open">failing open</Term>: degraded service beats none.

Health is also local. Each proxy reaches its own conclusions, so during a partial network problem some proxies may
eject a server that others still use. That is usually fine, and it is better than one central checker that can be
wrong for everyone. Deciding when to stop calling a struggling dependency entirely (circuit breaking) belongs to
[chapter 17](/operations/timeouts-retries-overload).

::: details Going deeper: example settings
- **Envoy**'s documentation describes outlier detection by consecutive 5xx errors, consecutive gateway errors, and
  success rate compared with the group. Its defaults eject a host after 5 consecutive 5xx responses, for a base time
  of 30 s that grows with each ejection, and cap ejection at 10% of hosts. Its **panic threshold** defaults to 50%:
  below that share of healthy hosts, it balances across all of them.
- **NGINX** (open source) marks a server unavailable after `max_fails` failed attempts within `fail_timeout`
  (defaults 1 and 10 s). Active health checks are an NGINX Plus feature.
- **HAProxy** has active checks (`option httpchk`) and passive error tracking (`observe layer7`).
- Check the version you run; defaults change.
:::

## Rate limiting

**In short:** a rate limit caps how many requests a client, key or route may make per unit of time. The usual
algorithm is a token bucket. The hard parts are choosing the key and counting across many proxies.

A public API allows 100 requests per second per API key. A login endpoint allows 5 attempts per minute per
account. Above the limit, the proxy answers `429 Too Many Requests`, ideally with a `Retry-After` header, and the
backend never sees the request. This is <Term id="rate-limiting">rate limiting</Term>. It protects backends from
overload, shares capacity fairly between customers, and slows down abuse such as password guessing.

### The token bucket

Picture a bucket that holds up to 100 tokens and refills at 10 tokens per second. Each request takes one token. If
the bucket is empty, the request is rejected. This <Term id="token-bucket">token bucket</Term> allows short bursts (up
to the bucket size) while holding the long-run average to the refill rate. It needs only two numbers per key: the
token count and the time of the last refill.

Simpler schemes exist. A **fixed window** counts requests per calendar minute; it is cheap but lets a client send
double the limit across a window boundary. A **sliding window** smooths that by weighting the previous window.

### Choosing the key

What you count by matters more than the algorithm:

- **Per IP address** is the default for anonymous traffic, and it is crude. Thousands of mobile users can share one
  address behind <Term id="cgnat">carrier-grade NAT</Term> ([chapter 8](/internet/last-mile)), and an attacker with a
  botnet has thousands of addresses. Limit IPv6 by prefix (for example a /64), not by single address.
- **Per API key, user or session** is fairer, but needs the request to be authenticated or at least parsed.
- **Per route** protects an expensive endpoint (search, login) separately from cheap ones.

### Counting across many proxies

Traffic for one key lands on many proxies. **Local limits** count on each proxy separately. They are fast and need no
coordination, but the real limit depends on how many proxies a client hits. **Global limits** ask a shared counter
service on each request, or every few requests. They are accurate but add a network call, and the counter service
becomes a dependency.

Most large systems combine them: a generous local limit as a cheap first line, and a global limit for the keys that
matter. And they decide in advance what happens when the counter service is down. For most APIs, the answer is to
fail open and allow traffic, because a broken limiter should not take the site down.

::: details Going deeper: rate limiting vs load shedding
A rate limit is a per-client promise ("you may send 100 per second"). **Load shedding** rejects work because the
server is overloaded, whoever sent it. They complement each other: a client within its limit can still be shed during
an overload. Load shedding, and how clients should back off, are in [chapter 17](/operations/timeouts-retries-overload).
The Generic Cell Rate Algorithm (GCRA) is a token bucket stored as a single timestamp, popular in Redis-based limiters.
:::

## L7 DDoS and bots

**In short:** application-layer attacks send requests that look legitimate, so they cannot be filtered by packet
rules. Proxies defend by absorbing load at the edge, scoring each client, challenging suspicious ones, and limiting
expensive work. Protocol-level tricks attack the proxy itself.

Volumetric attacks flood links with packets; [chapter 9](/internet/internet-routing) covers absorbing them with anycast
and scrubbing. An **L7 DDoS** is different. A <Term id="ddos">distributed denial-of-service</Term> attack at layer 7
sends valid HTTPS requests, each completing a TLS handshake: `GET /search?q=random-string`, from tens of thousands of
machines. The traffic volume is modest. The damage comes from cost: each request is cheap to send and expensive to
serve, because it misses the cache and runs a database query.

### Layers of defence

- **Absorb.** Anycast spreads the attack across all PoPs, so each sees a fraction. Caching answers repeat requests
  without touching backends ([chapter 13](/edge/cdns)).
- **Fingerprint and score.** The proxy sees much more than an IP address: the TLS handshake details, the HTTP/2
  settings, header order, the user agent, request timing. Browsers produce consistent combinations; many attack tools
  do not. A **bot score** combines these signals, often with machine-learned models.
- **Challenge.** Suspicious clients get a JavaScript or proof-of-work challenge that a real browser solves invisibly
  and a simple script cannot.
- **Rate limit and block.** Per-key limits on expensive routes, and blocks on clients that score badly.
- **Rules.** A <Term id="waf">web application firewall (WAF)</Term> matches requests against rules, such as patterns
  for SQL injection, and blocks them.

<Term id="bot-management">Bot management</Term> is the wider job of telling automated clients from humans. Not all bots
are bad: search engine crawlers and monitoring services are wanted, and can be verified by checking that their address
belongs to the operator they claim. The rest range from price scrapers to credential-stuffing tools.

### Attacks on the proxy itself

Some attacks target the proxy's own resources:

- **Slow clients.** The <Term id="slowloris">Slowloris</Term> attack opens many connections and sends headers one byte
  at a time, never finishing. A proxy that holds a thread or a fixed slot per connection runs out. Defences: event-driven
  proxies, header and body timeouts, and limits on connections per IP.
- **Protocol abuse.** In the **HTTP/2 Rapid Reset** attack (disclosed in October 2023, CVE-2023-44487), clients opened
  streams and cancelled them immediately, over and over. Cancelled streams do not count against the concurrent stream
  limit, so one connection could start a huge number of requests. Cloudflare reported a peak of 201 million requests per
  second from a botnet of about 20,000 machines. Proxies fixed it by tracking cancellation rates and closing abusive
  connections.

All of these defences run in the request path. A bot score or WAF rule is code that every request executes, and an
expensive or broken rule hurts every user, as two of the outages below show.

## Long-lived connections during deploys

**In short:** to restart a proxy or a backend without errors, stop giving it new work, tell clients to move, let
in-flight requests finish, then stop. Short requests drain in seconds. WebSockets and streams do not finish by
themselves, so you must close them and handle the reconnect wave.

Proxies are restarted often: new code, new certificates, config changes that cannot be applied live. Backends behind
them are deployed many times a day. Each restart must not drop the requests in flight. [Chapter 11](/edge/l4-load-balancing)
describes <Term id="drain">draining</Term> at the connection level. An L7 proxy works one level up, with requests and
streams.

### Restarting the proxy itself

The first problem is the listening socket. If the old process closes it before the new one opens it, new connections
are refused for a moment. Proxies avoid that by handing over the socket:

- The new process starts and receives the open listening socket from the old one (passed over a local socket), or both
  listen on the same port at once with `SO_REUSEPORT`.
- The old process stops accepting. It keeps serving the connections it already has.
- It tells clients to move: `Connection: close` on the next HTTP/1.1 response, or a <Term id="goaway">GOAWAY</Term>
  frame on HTTP/2 and HTTP/3. Clients open new connections, which go to the new process.
- After a drain period, the old process closes whatever is left and exits.

<L7DrainTimelineDiagram />

Ordinary requests finish within seconds. The problem is connections that never end on their own:
<Term id="websocket">WebSockets</Term>, server-sent event streams, long gRPC streams, MQTT sessions from apps. A
GOAWAY does not end a stream already in progress. So the drain period has a hard limit, often minutes, after which the
old process closes the rest. Every such client then reconnects.

### The reconnect wave

If a million clients lose their connections in the same second, a million reconnect in the next second, each with a
TCP and TLS handshake and perhaps a login. That burst can overload the proxies or the backends behind them. Ways to
soften it:

- **Restart in small batches**, so only a few percent of connections drop at a time.
- **Spread the closes** over the drain period instead of all at its end.
- **Clients reconnect with random delay** (jitter) and exponential backoff, and resume sessions cheaply
  ([chapter 5](/protocols/tls) covers TLS session resumption).
- **Move the connection instead of dropping it**, which some large systems do (see below).

### Deploying backends behind the proxy

When a backend restarts, the order matters. First remove it from the proxy's backend group, or have it fail its health
check on purpose. Wait until proxies have stopped sending it new requests. Let in-flight requests finish. Only then stop
the process. Reversing the order turns every deploy into a burst of `502` errors.

A related, common bug comes from upstream connection pools. The proxy keeps idle connections to backends for reuse.
If the backend closes an idle connection at the same moment the proxy sends a request on it, the request fails, and
the user sees a `502`. The rule: the proxy's idle timeout for upstream connections must be **shorter** than the
backend's, so the proxy always closes first. [Chapter 6](/protocols/http) covers keep-alive timeouts in general.

::: details Going deeper: how specific systems describe it
- **Envoy** documents a *hot restart*: a new process takes the listening sockets from the old one, and the old one drains
  for a configurable time (`--drain-time-s`) before exiting.
- **NGINX** reloads by starting new worker processes and asking old workers to finish their connections;
  `worker_shutdown_timeout` caps how long they may take. **HAProxy** has a similar seamless reload and `hard-stop-after`.
- **Meta**'s 2020 SIGCOMM paper "Zero Downtime Release" describes three mechanisms for its Proxygen-based proxies and
  web servers. *Socket takeover* passes listening sockets to a new proxy process, with user-space forwarding of QUIC
  packets that belong to the old process. *Downstream connection reuse* moves long-lived MQTT connections to another
  healthy proxy instead of dropping them. *Partial post replay* lets a restarting web server hand an unfinished upload
  back to the proxy, which replays it to another server, so the client never re-sends it.
:::

## Common proxies

**In short:** Envoy, NGINX and HAProxy are the open-source proxies you are most likely to meet. All are event-driven
and do the jobs in this chapter. They differ mainly in configuration model and extension style.

| Proxy | Origin | Configuration | Often seen as |
|---|---|---|---|
| **NGINX** | Web server, first released in 2004 | Config files, reloaded gracefully | Web server, reverse proxy, Kubernetes ingress |
| **HAProxy** | Load balancer, first released in 2001 | Config files, runtime API | High-performance L4 and L7 balancer |
| **Envoy** | Built at Lyft, open-sourced in 2016 | Dynamic APIs (xDS) from a control plane | Service-mesh sidecar, edge and API gateway |

Large companies often build their own, usually because of scale or process-model limits. Two dated examples, as their
authors describe them:

- **Proxygen**, Meta's C++ HTTP library, was announced in 2014 and is the basis of the proxies in the Zero Downtime
  Release paper (2020).
- **Pingora**, described by Cloudflare in September 2022, replaced NGINX in part of its network. Cloudflare wrote that
  NGINX's model of separate worker processes split connection pools between workers, which hurt connection reuse to
  origins, and pinned each request to one worker, which unbalanced CPU load. Pingora is written in Rust and uses threads
  sharing one pool. Cloudflare reported about 70% less CPU and 67% less memory for the same traffic, and a third as many
  new connections per second.

## Why this matters in real systems

**HTTP/2 and gRPC need L7 balancing.** A team moves internal calls to gRPC and finds a few servers at full CPU while
others idle. Each client holds one long-lived connection, and the L4 balancer spread connections, not requests. A proxy,
a balancing client library, or a maximum connection age fixes it.

**Connection reuse is a large, hidden win.** Every new upstream connection costs a TCP and TLS handshake. Pingora's 2022
write-up reported that one large customer's connection reuse rose from 87.1% to 99.92%, cutting new connections to its
origins by 160 times. Pool design matters as much as raw speed.

**The proxy fleet is shared blast radius.** One proxy fleet often fronts every product. A config push, a WAF rule or a
bot model reaches all of them. Mature teams roll out config in stages like code, and keep a fast, tested way to turn a
feature off.

**Rate limits by IP hurt mobile users.** A limit tuned on desktop traffic blocks a whole carrier's users sharing one
NAT address. Prefer keys tied to accounts or sessions, and treat IP as one signal among several.

**How to look at it:**

```bash
curl -sv https://www.example.com/ -o /dev/null 2>&1 | grep -iE '^< (server|via|x-cache|cf-ray|x-served-by)'
                                              # headers that reveal the proxy and PoP (vary by provider)
curl -so /dev/null -w 'connect %{time_connect} tls %{time_appconnect} ttfb %{time_starttransfer}\n' https://www.example.com/
for i in $(seq 30); do curl -so /dev/null -w '%{http_code}\n' https://api.example.com/; done | sort | uniq -c
                                              # watch 200s turn into 429s as you hit a rate limit
ss -tn state established '( sport = :443 )' | wc -l   # on a proxy: open client connections
```

On an Envoy host, the admin endpoint (`curl localhost:9901/clusters`, or `/stats`) shows per-backend active requests,
health flags and outlier ejections. A backend marked `failed_outlier_check` explains a server that "gets no traffic".

## Where it breaks

**Cloudflare, 2019: one regular expression.** On 2 July 2019, Cloudflare deployed a new WAF rule containing a regular
expression that backtracked heavily. It was pushed to every PoP at once. CPU on the machines serving HTTP traffic hit
100% worldwide, and users saw `502` errors for about 27 minutes. **Lesson:** rules that run on every request need
staged rollouts and limits on how much work one rule can do.
([Cloudflare, 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/))

**HTTP/2 Rapid Reset, 2023: a protocol feature as a weapon.** From August 2023, attackers opened and cancelled HTTP/2
streams in a tight loop, getting around stream concurrency limits. Cloudflare reported 201 million requests per second
from about 20,000 machines, and mitigated it in its proxies by detecting abusive cancellation patterns and closing those
connections. **Lesson:** a proxy must limit work per connection, not only connections per client.
([Cloudflare, 2023](https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/))

**Cloudflare, 2025: a bot-management file crashed the proxy.** On 18 November 2025, a database permissions change made a
query return duplicate rows. The feature file for the bot-management model more than doubled in size and exceeded a
preset limit of 200 features. The new Rust proxy hit that limit and failed with `5xx` errors; the older proxy did not
crash but gave every request a bot score of zero. The incident lasted from 11:20 to 17:06 UTC. **Lesson:** treat
generated config and model files like code: validate them, and fail safely when one is bad.
([Cloudflare, 2025](https://blog.cloudflare.com/18-november-2025-outage/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. What is the difference between an L4 load balancer and an L7 proxy? Why use both?
An L4 balancer forwards packets of a connection to a server without reading them. It is fast, cheap and can handle huge
packet rates, but it can only balance whole connections. An L7 proxy terminates the connection, reads each HTTP request,
and can route, balance, rate limit and retry per request.

Large sites use both: L4 balancers spread connections across a fleet of L7 proxies, and the proxies do the
request-level work. The L4 layer gives the proxies one stable address and lets you add or drain proxies.

**Senior add-on:** the L7 proxy costs CPU (TLS and parsing) and becomes a shared blast radius. It holds per-connection
state, which makes its restarts harder than an L4 balancer's. The L4 layer is often stateless or hash-based
([chapter 11](/edge/l4-load-balancing)).
:::

::: details 2. Explain the power of two choices. Why not always pick the least-loaded server?
Pick two servers at random, and send the request to the one with fewer active requests. It avoids overloaded servers
almost as well as picking the global minimum.

Always picking the least-loaded server fails with many proxies. Each proxy sees only its own traffic, and information is
slightly stale. They all pick the same idle-looking server and overload it together. Random sampling spreads their
choices.

**Senior add-on:** the theory (Mitzenmacher, 2001) shows going from one random choice to two cuts the worst-case load
dramatically, and more choices add little. Combine it with slow start for new servers, and with outlier detection, since
a server that fails fast has few active requests and would otherwise attract traffic.
:::

::: details 3. A server that returns errors instantly gets more traffic, not less. Why?
With least request, the proxy prefers servers with few requests in flight. A server that fails in 1 ms finishes requests
faster than healthy ones, so it always looks idle. It attracts a large share of traffic and fails all of it. This is
sometimes called a black hole server.

Fix it with outlier detection: eject servers whose error rate stands out. Some balancers also count errors as a penalty
in the load signal.

**Senior add-on:** health probes often miss this, because `/healthz` may still work. Add alerts on per-server error
rates, and cap ejections so a shared failure does not eject everyone.
:::

::: details 4. Design rate limiting for a public API served from 50 PoPs.
Identify clients by API key; fall back to IP prefix for anonymous traffic. Use a token bucket per key, which allows short
bursts and enforces an average rate. Return `429` with `Retry-After`.

Count in two layers. Each proxy enforces a local limit, generous enough that normal clients never hit it. For accurate
per-customer limits, keep counters in a shared store per region, and sync or split the global budget between regions.
Accept some inaccuracy rather than a cross-world call on every request.

Decide the failure mode: if the counter store is down, allow traffic (fail open) for most routes, and keep the local
limits as a safety net.

**Senior add-on:** batch counter updates (check every N requests, or reserve tokens in chunks) to cut store load. Give
expensive routes their own limits. Expose current usage in response headers so well-behaved clients slow down. Plan for
mobile users behind carrier-grade NAT before limiting by IP.
:::

::: details 5. After every deploy of the API service, users see a burst of 502 errors for a few seconds. How do you find out why?
First, see where the 502 comes from. The proxy produces it when the backend connection fails or resets. Look at the
proxy's logs for the failure reason: connection refused, reset, or upstream timeout.

Connection refused points to deploy order: the process stopped before the proxy removed it. Fix the sequence: fail
health checks, wait for proxies to notice, drain in-flight requests, then stop. Resets on reused connections point to
idle timeouts: the backend closes idle keep-alive connections while the proxy sends on them. Make the proxy's upstream
idle timeout shorter than the backend's.

**Senior add-on:** check whether the proxy retries these failures. A reset before any response bytes is often safe to
retry for idempotent requests, and many proxies can be configured to do so ([chapter 17](/operations/timeouts-retries-overload)).
Also check that the backend handles `SIGTERM` by draining instead of exiting at once.
:::

::: details 6. How do you deploy a new version of the edge proxy without dropping WebSocket connections?
Mostly, you cannot avoid closing them; you can avoid breaking users. Start the new process and hand it the listening
sockets, so no new connection is refused. The old process stops accepting, sends GOAWAY or `Connection: close`, and
finishes short requests within seconds.

WebSockets do not end on their own. Give them a drain period, then close them, spread over time rather than all at
once. Restart the fleet in small batches. Clients must reconnect with backoff and jitter, and resume their session cheaply.

**Senior add-on:** watch the reconnect wave: handshake rate, login rate, backend load. Meta's 2020 Zero Downtime Release
paper describes moving long-lived MQTT connections to another proxy instead of dropping them, and replaying partially
received uploads to a new server.
:::

::: details 7. A gRPC service behind an L4 load balancer has very uneven CPU across servers. Why, and what do you do?
gRPC uses long-lived HTTP/2 connections, and each client sends all its calls over one of them. The L4 balancer places
each connection once, so a few heavy clients load a few servers. New servers get no traffic until clients reconnect.

Balance per request instead: put an L7 proxy in front, or use client-side balancing that spreads calls across several
servers. As a quick fix, set a maximum connection age on servers so clients reconnect and redistribute.

**Senior add-on:** with client-side balancing, the client needs service discovery and health information
([chapter 16](/backend/reaching-the-service)). With a proxy, you pay an extra hop but get central policy.
:::

::: details 8. Your site is getting 50 times normal traffic to its search endpoint from many IPs. How do you respond?
Confirm it is an attack: look at request patterns, user agents, TLS fingerprints, and whether the clients load anything
else (real users fetch pages, scripts and images). Then act at the proxy, cheapest first: rate limit the search route per
IP prefix and per session, challenge clients with poor bot scores, and block clearly bad fingerprints.

Protect the backend meanwhile: cache common queries briefly, and shed load on search so the rest of the site stays up.

**Senior add-on:** prefer actions you can scope and undo quickly: a rule limited to one route, in log-only mode first if
time allows. Remember that mitigation rules run on every request; a costly rule can hurt more than the attack.
:::

## Common misconceptions

- **"An L7 proxy is just a slower L4 balancer."** It does a different job: per-request routing, balancing, limits and
  retries, which an L4 balancer cannot do.
- **"Least connections is always better than round robin."** With many proxies it can herd onto one server, and it
  rewards servers that fail fast. Two random choices plus outlier detection is safer.
- **"`X-Forwarded-For` tells you the client's address."** Only the entries your own proxies added are trustworthy.
- **"Health checks keep bad servers out."** Probes miss gray failures, and without caps they can remove every server at
  once.
- **"GOAWAY drains a connection."** It stops new streams. Streams already open, such as WebSockets or long gRPC calls,
  keep going until something closes them.
- **"Rate limiting by IP is fair."** Many users can share one address, and attackers have many.

## Key takeaways

- An L7 proxy keeps **two connections** and reads every request, so it can route, balance, limit and retry per request.
- **Power of two choices** with least request avoids slow servers without herding; add slow start for new servers.
- **Outlier detection** catches failures probes miss; cap ejections and fall back to all servers when health looks wrong.
- **Rate limits** are mostly about the key and where you count; L7 attacks are fought with scoring, challenges and
  limits on expensive work.
- **Deploys** need socket handover, GOAWAY and a bounded drain; long-lived connections will reconnect, so plan the wave.

## Review

<Flashcards id="l7-proxies" :cards="cards" />

<MarkDone id="l7-proxies" />

## Sources

- [Envoy documentation: supported load balancers](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/load_balancers) (documentation)
- [Envoy documentation: outlier detection](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/outlier) and [panic threshold](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/upstream/load_balancing/panic_threshold) (documentation)
- [Envoy documentation: hot restart](https://www.envoyproxy.io/docs/envoy/latest/intro/arch_overview/operations/hot_restart) (documentation)
- [NGINX upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html) (documentation)
- [The PROXY protocol](https://www.haproxy.org/download/2.8/doc/proxy-protocol.txt) (specification, HAProxy)
- [The Power of Two Choices in Randomized Load Balancing](https://www.eecs.harvard.edu/~michaelm/postscripts/tpds2001.pdf), M. Mitzenmacher (paper, 2001)
- [RFC 7239: Forwarded HTTP Extension](https://www.rfc-editor.org/rfc/rfc7239) (RFC, 2014)
- [RFC 6585: Additional HTTP Status Codes (429)](https://www.rfc-editor.org/rfc/rfc6585) (RFC, 2012)
- [RFC 9113: HTTP/2 (GOAWAY)](https://www.rfc-editor.org/rfc/rfc9113) (RFC, 2022)
- [Zero Downtime Release: Disruption-free Load Balancing of a Multi-Billion User Website](https://dl.acm.org/doi/10.1145/3387514.3405885), Naseer et al. (paper, SIGCOMM 2020)
- [How we built Pingora, the proxy that connects Cloudflare to the Internet](https://blog.cloudflare.com/how-we-built-pingora-the-proxy-that-connects-cloudflare-to-the-internet/) (engineering blog, 2022)
- [HTTP Desync Attacks: Request Smuggling Reborn](https://portswigger.net/research/http-desync-attacks-request-smuggling-reborn) (security research, 2019)
- [Details of the Cloudflare outage on July 2, 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/) (incident report, 2019)
- [HTTP/2 Rapid Reset: deconstructing the record-breaking attack](https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/) (engineering blog, 2023)
- [Cloudflare outage on November 18, 2025](https://blog.cloudflare.com/18-november-2025-outage/) (incident report, 2025)
