---
title: "18. Observing & Debugging the Path"
---

<script setup>
import { cards } from './observing-the-path-review'
</script>

# 18. Observing & Debugging the Path

Every earlier chapter explained one stretch of the path from a phone to an application server. This chapter
is about method: how to see what that path is doing for real users, and how to find which stretch broke
when "the site is slow" lands on your desk. Senior interviews almost always include a debugging question,
and a calm, ordered method is what interviewers listen for.

::: info Before you start
- A request crosses the phone's radio, the carrier, the internet, an edge site and a load balancer before
  it reaches a server. [Chapter 1](/foundations/the-map) draws the whole path.
- A cold request pays for a name lookup, a TCP connection and a TLS handshake before the first byte of the
  response. A warm one reuses an open connection. [Chapter 1](/foundations/the-map) and
  [chapter 5](/protocols/tls) explain the costs.
- Each tool used here (`dig`, `curl`, `traceroute`, `openssl`) has its basics explained in the chapter
  that owns its layer. This chapter shows how to combine them.

The chapter makes sense without them. Addresses, names and numbers in examples are placeholders.
:::

## Two ways to watch: real users and probes

**In short:** measure what real users get, and also run your own scripted requests from known places.
Real-user data tells you what is true; probes tell you what changed, quickly and repeatably.

Imagine your dashboards show a server-side latency of 40 ms, flat all week. Meanwhile users in one country
complain that the app takes three seconds to load. Both can be true. The server only sees the time between
receiving a request and sending the response. It does not see the name lookup, the handshakes, the radio
waking up, or requests that never arrived.

So you need measurements taken from the user's side. Two kinds exist, and teams use both.

<Term id="real-user-monitoring">Real-user monitoring (RUM)</Term> collects timings from the actual devices of
your users. A browser page or a mobile app records how long each phase of a request took and sends a small
report, called a **beacon**, back to you. Browsers expose these timings through standard interfaces
(Navigation Timing and Resource Timing). Mobile HTTP libraries have similar hooks.

<Term id="synthetic-monitoring">Synthetic monitoring</Term> means running scripted requests yourself, from
machines you control, on a schedule. A probe in each of twenty cities fetches your home page every minute and
records the timings and errors.

| | Real-user monitoring | Synthetic probes |
|---|---|---|
| **Sees** | Real devices, networks, app versions | A fixed client on a fixed network |
| **Good for** | "How bad is it, and for whom?" | "Did it change?", alerting at 3 a.m., pre-launch checks |
| **Blind to** | Users who failed before the beacon was sent | The last mile, real phones, real traffic mix |
| **Noise** | High; needs volume and percentiles | Low; a change stands out |

The blind spots matter. Probes usually run in cloud datacenters, with fast, wired, well-peered networks.
They rarely see a carrier's radio, carrier-grade NAT or a home router. RUM has the opposite problem:
**survivorship bias**. A user whose DNS lookup failed never loaded your page, so they never sent a beacon. A
RUM dashboard can look healthier during an outage, because the worst-affected users vanish from it.

### Slice until the problem concentrates

RUM is useful only when you can cut it by the right dimensions. A global p99 that rose by 200 ms tells you
little. The same rise concentrated in one carrier, one app version or one edge site tells you nearly
everything.

The dimensions that most often find the answer:

- **Where:** country, network operator (by its <Term id="autonomous-system">autonomous system</Term>
  number), edge site that served the request.
- **How:** network type (Wi-Fi, cellular), IPv4 or IPv6, HTTP/2 or HTTP/3, new or reused connection.
- **What:** app version, OS version, browser, endpoint.
- **When:** the exact minute it started, to line up with deploys, certificate changes and routing changes.

Always look at a phase breakdown, not only the total. If DNS time rose, look at resolvers. If connect time
rose, look at the route and the edge. If time to first byte rose and connect did not, look behind the edge.

::: details Going deeper: what browsers and apps expose
- **Navigation Timing** and **Resource Timing** (W3C) give timestamps such as `domainLookupStart`,
  `connectStart`, `secureConnectionStart`, `requestStart` and `responseStart` for each request. For
  requests to another origin, most detail is hidden unless that server sends `Timing-Allow-Origin`.
- A reused connection shows zero DNS and connect time. Mixing new and reused connections in one percentile
  hides regressions in either; split them.
- On Android, OkHttp's `EventListener` reports the same phases. On iOS, `URLSessionTaskMetrics` does.
- Sampling is normal. Keep the sample rate in each beacon so you can weight results correctly.
- Large sites also use RUM to choose which site serves each network. [Chapter 10](/edge/steering) covers
  that use.
:::

<ObserveVantageDiagram />

## Following one request across hops

**In short:** give every request an ID at the edge and pass it to every hop. Then the edge, the proxies
and the server each report their share of the time under that same ID.

A slow request may have spent its time in many places: the CDN, a regional load balancer, a proxy, the
application. Each keeps its own logs, on its own machines. Without a shared key, you cannot join them.

<Term id="distributed-tracing">Distributed tracing</Term> solves this. The first hop creates a random ID for
the whole request and passes it on in a header. Each hop records the time it spent, called a **span**,
tagged with that ID. A tracing system then draws all spans of one request as a timeline.

### The traceparent header

The W3C <Term id="trace-context">Trace Context</Term> standard defines one header for this, so different
vendors and proxies can cooperate:

```text
traceparent: 00-4bf92f3577b34da6a3ce929d0e0e4736-00f067aa0ba902b7-01
             │  │                                │                └ flags (01 = sampled)
             │  └ trace ID: same for the whole request
             │                                   └ parent ID: the span that sent this request
             └ version
```

Each hop keeps the trace ID, puts its own span ID in the parent field, and forwards the header. A second
header, `tracestate`, carries vendor-specific data. Common proxies such as Envoy and NGINX can create or
forward these headers, and OpenTelemetry libraries handle them in application code.

Three practical points come up in interviews:

- **Start the trace as early as you can.** A trace that starts at the application server cannot show time
  lost at the edge. Start it at the edge, or even in the client.
- **Sample, but keep the interesting ones.** Tracing every request is expensive at scale. Teams sample a
  small fraction, plus all errors and slow requests if their system can decide after the fact.
- **Put the trace ID in every log line and in error responses.** A user's screenshot with a request ID is
  then enough to find the exact trace.

### Server-Timing: telling the client where time went

Tracing lives on your side. The <Term id="server-timing">Server-Timing</Term> response header sends a
summary to the client, where RUM can record it next to the client's own timings:

```text
Server-Timing: cdn-cache;desc=MISS, edge;dur=4, origin;dur=182;desc="origin fetch"
```

Now a RUM beacon can say: "this user waited 420 ms for the first byte; 182 ms of it was the origin, and the
CDN missed". That joins the client view and the server view in one record. In browsers, the values appear in
Resource Timing as `serverTiming`. For other origins, they are hidden unless the server sends
`Timing-Allow-Origin`.

Do not leak internals you would not show an attacker. Durations and cache status are usually fine; internal
host names usually are not.

### Network Error Logging: hearing from users who failed

RUM's blind spot is the user who never got a page. <Term id="network-error-logging">Network Error Logging
(NEL)</Term> fills part of it. Your site sends a `NEL` header once, on a successful response. The browser
remembers the policy. Later, if a request to your site fails, the browser sends a report to a collector you
named: what failed, in which phase, and which server address it tried.

```text
NEL: {"report_to":"nel","max_age":604800,"failure_fraction":1.0,"success_fraction":0.01}
```

A report might say `"type": "tls.cert.date_invalid"` or `"type": "tcp.timed_out"`, with `"phase":
"connection"` and the `server_ip` the browser used. That is exactly what you need to tell DNS failures
from connection failures from TLS failures, per network and per edge site.

Two limits. NEL is supported in Chromium-based browsers only (as of 2025), and it is still a W3C Working
Draft. And the collector must not share fate with your site: if reports go to the same domain and edge that
is failing, they fail too.

::: details Going deeper: the exact formats
- Trace Context Level 1 became a W3C Recommendation in 2020. The trace ID is 16 bytes and the parent ID 8
  bytes, both hex-encoded. An all-zero ID is invalid.
- `tracestate` is a list of `vendor=value` pairs. Hops may add their own entry at the front and must pass
  the others on.
- OpenTelemetry's "baggage" header carries application key-values alongside the trace. Treat it as
  untrusted input from the client.
- Server-Timing entries are `name;dur=<ms>;desc="text"`. Several entries can be comma-separated or sent in
  several headers.
- NEL policies point at a reporting endpoint group defined by the Reporting API (`Report-To` or the newer
  `Reporting-Endpoints` header). Error types include `dns.name_not_resolved`, `tcp.reset`, `tcp.refused`,
  `tls.cert.*` and `http.protocol.error`.
:::

## A method: walk the path in order

**In short:** first find who is affected and since when. Then test each stage of the request in the order
the request meets it, from a client like the affected one, aimed at the same edge site.

Most debugging time is lost by jumping to a favourite theory. A fixed order prevents that. The request meets
DNS, then a connection, then TLS, then the server; test them in that order and stop at the first stage that
looks wrong.

### Step 0: scope it

Before touching a command line, answer four questions from RUM, NEL, edge logs and change history:

1. **Who?** Which countries, networks, app versions, edge sites? "Everyone" and "one carrier" lead to very
   different places.
2. **Since when?** Line up the start with deploys, certificate rotations, DNS and routing changes, and
   provider status pages.
3. **Which phase?** DNS, connect, TLS, waiting for the first byte, or download?
4. **How often?** Every request, a steady fraction, or bursts? A steady fraction such as one in sixteen
   often points to one bad member of a group (a server, a link, a site).

### Step 1: DNS — what address does the client get?

```bash
dig www.example.com +short                    # your resolver
dig @8.8.8.8 www.example.com +short           # a public resolver
dig @ns1.example.net www.example.com +norec   # the authoritative server, no cache
```

Compare answers across resolvers, and with what affected users report. Different answers send users to
different edge sites, which is often the whole story. [Chapter 4](/protocols/dns) covers caches, TTLs and
location-aware answers.

### Step 2: connection and TLS — time each phase with curl

`curl -w` prints timings for one request. Aim it at a specific edge address with `--resolve`, so you test
the site the affected users reach, not the one nearest to you:

```bash
curl -so /dev/null --resolve www.example.com:443:203.0.113.7 \
  -H 'traceparent: 00-0af7651916cd43dd8448eb211c80319c-b7ad6b7169203331-01' \
  -w 'ip=%{remote_ip} http=%{http_version}\ndns=%{time_namelookup} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' \
  https://www.example.com/
```

```text
ip=203.0.113.7 http=2
dns=0.000012 connect=0.081 tls=0.152 ttfb=0.281 total=0.322
```

(Illustrative.) Every value is measured **from the start of the request**, so subtract to get each phase:

<ObserveCurlTimelineDiagram />

What to read from it:

- **connect minus dns** is about one round trip to the edge. If it is far above what distance explains,
  suspect the route or the wrong site.
- **tls minus connect** is the handshake: about one more round trip with TLS 1.3, more with an older
  version or a long certificate chain.
- **ttfb minus tls** is the server side plus one round trip. A big number here moves the search behind the
  edge.
- Sending your own `traceparent` lets you find this exact request in the edge and server logs.

Add `-D -` to print response headers, including `Server-Timing` and any cache-status header. Run the same
command with `-4` and then `-6` to compare the IPv4 and IPv6 paths.

### Step 3: the certificate — what does this edge actually serve?

```bash
openssl s_client -connect 203.0.113.7:443 -servername www.example.com -showcerts </dev/null
```

Always pass `-servername`. Without it, the server does not know which site you want and may send a default
certificate, which misleads you. Look at the `s:` (subject) and `i:` (issuer) lines of each certificate in
the chain, and the `Verify return code` at the end. Pipe the output to
`openssl x509 -noout -issuer -enddate -fingerprint -sha256` to compare the leaf certificate across edge
sites. [Chapter 5](/protocols/tls) explains chains and validation.

### Step 4: the route — mtr and traceroute, read carefully

<Term id="traceroute">traceroute</Term> and `mtr` show the routers on the way, by sending probes with a
growing hop limit and listening for the <Term id="icmp">ICMP</Term> "time exceeded" reply from each router.
[Chapter 2](/foundations/packets-and-links) explains the mechanism. `mtr` repeats this continuously and adds
loss and latency per hop:

```text
$ mtr -rwbzc 100 www.example.com
HOST                                 Loss%   Snt   Last   Avg  Best  Wrst StDev
  1. AS???   192.168.1.1              0.0%   100    1.9   2.3   1.5   9.8   1.1
  2. AS64500 100.64.0.1               0.0%   100    9.1  10.4   8.0  31.0   3.2
  3. AS64500 198.51.100.1            42.0%   100   12.0  48.3  11.2 210.5  50.1
  4. AS64501 198.51.100.77            0.0%   100   14.2  14.9  13.8  22.0   1.0
  5. AS64502 203.0.113.7              0.0%   100   15.1  15.6  14.9  19.3   0.6
```

(Illustrative.) Hop 3 shows 42% loss and high latency, yet hops 4 and 5 show none. **That hop is fine.**
This misreading is the most common traceroute mistake. Three caveats explain most surprises:

- **Routers deprioritise ICMP.** A router forwards your traffic in fast hardware, but it builds the "time
  exceeded" reply on its slower main processor, and it rate-limits those replies. Loss or delay that
  appears at one hop and does **not** continue to later hops is the router being busy, not your traffic
  being hurt. Only loss and latency that persist to the final hop matter.
- **Paths are asymmetric.** The time shown for each hop includes the reply's trip back, and the reply may
  return by a completely different route. A jump in latency may be on the return path, which your
  traceroute cannot see. Run a traceroute from the other end too (from the server towards the user's
  network), or use a looking glass or a measurement network with probes in the user's network.
- **Load-balanced hops confuse it.** Routers split traffic across equal paths by hashing each flow's
  addresses and ports (<Term id="ecmp">ECMP</Term>). Classic traceroute changes the port on each probe, so
  successive probes take different branches. You get a path that mixes branches, sometimes with links that
  do not exist. A tool that keeps the flow fixed, such as Paris traceroute or `mtr` in TCP mode with a fixed
  port, shows one real path at a time.

Two more practical points. Many servers and firewalls drop ICMP or UDP probes, so the last hops show `* * *`;
use TCP probes to the real port (`mtr -T -P 443`, or `traceroute -T -p 443` on Linux, which needs root). And
the addresses shown are the router's interface facing you, with reverse DNS names that may be stale or
missing; tunnels can hide whole sections of the path.

### Step 5: packets — tcpdump when timings are not enough

When curl says "connect took 3 seconds" you still do not know why. A packet capture shows it.

```text
$ sudo tcpdump -ni any 'host 203.0.113.7 and tcp port 443 and tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'
10:01:02.100 IP 10.0.0.5.51522 > 203.0.113.7.443: Flags [S], seq 3911, win 64240, ...
10:01:03.112 IP 10.0.0.5.51522 > 203.0.113.7.443: Flags [S], seq 3911, win 64240, ...
10:01:05.130 IP 10.0.0.5.51522 > 203.0.113.7.443: Flags [S], seq 3911, win 64240, ...
10:01:05.146 IP 203.0.113.7.443 > 10.0.0.5.51522: Flags [S.], seq 7720, ack 3912, ...
```

(Illustrative; needs root.) The same SYN went out three times, one second and then two seconds apart, before
the server answered. So the first two were lost, and the "3-second connect" is two retransmission timeouts.
[Chapter 3](/foundations/tcp-and-udp) explains the timers.

Capture **at both ends at once** when you can. A packet that left the client but never reached the server
was lost on the path. A packet that reached the server and got no reply points to the server or to
something in front of it. Write to a file with `-w capture.pcap` and open it in Wireshark for long
captures. With TLS, you see packet timing and sizes but not content, which is usually enough.

`ss -ti` on Linux shows the kernel's view of each live connection: its round-trip estimate and its
retransmission counts. The [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers
sockets and `ss`.

::: details Going deeper: more on the tools
- `curl -w '%{json}'` (curl 7.70 and later) prints every timing variable at once. `%{time_pretransfer}`,
  `%{time_redirect}`, `%{num_connects}` and `%{ssl_verify_result}` are also useful.
- `curl --connect-to` redirects a connection to another host and port while keeping the URL, the Host
  header and SNI unchanged. It is handy behind CDNs.
- `mtr -u` uses UDP probes, `-T` TCP; `-z` looks up each hop's AS number. Depending on how mtr was
  installed, it may need root. `tracepath` on Linux needs no root and also reports the path MTU.
- Paris traceroute was described in a 2006 paper by Augustin and others. It keeps the header fields that
  routers hash constant, so all probes follow one path.
- In mobile apps, a debugging proxy or the platform's own network inspector often gives the client-side
  view faster than a capture on the device.
:::

## Scenario 1: p99 rose only on mobile

**In short:** a latency rise that only one kind of client sees is almost always about that client's network
or that client's code. Slice by network, protocol and app version before you touch the servers.

**Symptom.** p99 time to load the home screen in the app rose from about 1.5 s to about 3 s over a day. The
median barely moved. Desktop web is unchanged, and server-side latency is flat.

**Hypotheses.** Each points to a different chapter:

- A new app version stopped reusing connections, so more requests pay for a full handshake.
- One carrier started dropping UDP on port 443, so HTTP/3 attempts stall before falling back to TCP
  ([chapter 7](/protocols/quic)).
- An IPv6 path problem on one carrier, hidden by <Term id="happy-eyeballs">Happy Eyeballs</Term> as a
  delay rather than an error ([chapter 8](/internet/last-mile)).
- Larger responses hit a packet-size black hole on one network ([chapter 2](/foundations/packets-and-links)).
- Users were moved to a farther edge site ([chapter 10](/edge/steering)).

**What tells them apart.** All of it comes from RUM, sliced:

| If the rise is concentrated in… | Then suspect |
|---|---|
| One app version, all networks; new-connection rate up | Connection reuse in the client |
| One carrier; HTTP/3 attempts with long connect times; TCP fine | UDP blocked or throttled on that carrier |
| One carrier; IPv6 connect failures, IPv4 fine | The carrier's IPv6 or NAT64 path |
| Large responses only, on one network | MTU black hole |
| One edge site, in its connect phase | Steering or the route to that site |

Then confirm from a phone on that carrier: run `curl -w` with `--http3` (if your curl build supports it)
and without, and with `-4` and `-6`.

**Cause (in this example).** The rise was in one carrier and only in HTTP/3 attempts. The carrier had
started dropping most UDP traffic to port 443. The app tried QUIC first and waited for a timeout before
using TCP. The fix was to race QUIC and TCP rather than try them in sequence, and to remember per network
that QUIC fails. [Chapter 7](/protocols/quic) explains this fallback design.

## Scenario 2: TLS errors in one country after a certificate rotation

**In short:** errors that start with a change and are limited to one place usually mean the change did not
land the same way everywhere. Ask each edge site directly what it serves.

**Symptom.** An hour after a planned certificate rotation, NEL reports of type `tls.cert.authority_invalid`
jump for users in one country. Other countries are fine. Desktop browsers in that country are mostly fine;
the app and some older Android devices fail.

**Hypotheses:**

- The edge sites that serve that country did not get the new certificate, or got it with an incomplete
  chain ([chapter 5](/protocols/tls)).
- The new certificate comes from a different authority whose root is missing from older devices' trust
  stores, and that country has many older devices.
- A network or a security product in that country intercepts TLS ([chapter 5](/protocols/tls)).
- The app pins the old certificate or its key (also chapter 5).

**What tells them apart:**

- NEL reports carry the `server_ip`. If every failure names addresses of the same one or two edge sites,
  the problem is in those sites, not in devices.
- `openssl s_client -connect <edge IP>:443 -servername www.example.com -showcerts` against each edge site
  shows which certificate and chain each one serves. Compare fingerprints and issuers.
- A `Verify return code: 21 (unable to verify the first certificate)` means the server sent the leaf
  without its intermediate.
- Failures spread across all edge sites but limited to old OS versions point to the trust store, not to
  your deploy. Failures where the issuer seen by the client is not your authority point to interception.

**Cause (in this example).** The certificate was deployed everywhere, but the edge sites serving that
country loaded it from an old configuration path that held only the leaf, without the intermediate.
Desktop browsers often fill in a missing intermediate from their caches or by fetching it, so they hid the
problem. The app's TLS library does not, so it failed. Users of that country reached those sites through
location-aware DNS and <Term id="anycast">anycast</Term> ([chapter 10](/edge/steering)), which is why the
errors had borders.

The lesson for the deploy: after a rotation, check the served chain on every edge site from outside, as part
of the rollout, not only the certificate file.

## Scenario 3: intermittent timeouts behind a load balancer

**In short:** a steady fraction of failures usually means one bad member of a group. Find what the failing
requests share: a backend, a connection, a source port, a response size.

**Symptom.** About 5% of requests to one internal service time out after 10 seconds. Retries almost
always succeed. The service's own latency graphs look normal, and its health checks pass.

**Hypotheses:**

- One backend is unhealthy in a way health checks miss, a <Term id="gray-failure">gray failure</Term>
  ([chapter 12](/edge/l7-proxies)).
- An idle-timeout mismatch: the backend closes idle keep-alive connections sooner than the proxy expects,
  so the proxy sometimes sends a request on a connection the backend just closed
  ([chapter 6](/protocols/http)).
- One link in the fabric drops packets, and only flows hashed onto it fail
  ([chapter 15](/backend/datacenter-fabric)).
- Only large responses fail, because an overlay network reduced the usable packet size (also chapter 15).
- The load balancer or a NAT runs out of connection-tracking entries or source ports
  ([chapter 11](/edge/l4-load-balancing)).

**What tells them apart:**

- **Traces and logs, grouped by backend.** If failures cluster on one backend, it is that backend. Here
  they were spread evenly across all backends.
- **Timing of the failure.** An idle-timeout race fails fast, with a reset, usually on the first request
  after a quiet period. These failures were full 10-second timeouts at any time, so that hypothesis fell.
- **Response size.** Failures happened on small responses too, which rules out a packet-size problem.
- **The connection's addresses and ports.** Logging the source port of failed connections showed that a
  given port either always worked or always failed. That is the signature of hashing onto a bad path.
- **mtr with a fixed flow.** `mtr -T -P 8443` from a client, repeated with different fixed source ports,
  showed loss to the end for some ports and none for others. A `tcpdump` on both sides confirmed packets
  leaving the client and never arriving.

**Cause (in this example).** One of the parallel links between two switch tiers was dropping a large share
of packets without going down. ECMP hashed a fixed share of flows onto it. Retries used a new source port,
so they usually hashed elsewhere and succeeded, which is why the problem looked random. Draining that link
fixed it. [Chapter 15](/backend/datacenter-fabric) explains ECMP hashing.

## Scenario 4: the first request is slow

**In short:** if only the first request is slow, the cost is in setting up: lookup, handshakes, radio
wake-up, a cache miss or a cold process. Compare a cold request with a warm one, phase by phase.

**Symptom.** The first API call after the app opens takes 1–2 seconds. Every later call takes about 100 ms.

**Hypotheses:**

- A cold request pays for DNS, TCP and TLS before the request, each a round trip or more
  ([chapter 1](/foundations/the-map), [chapter 5](/protocols/tls)).
- The phone's radio is idle and must wake up first ([chapter 8](/internet/last-mile)).
- TLS session resumption is not working, so every new connection does a full handshake
  ([chapter 5](/protocols/tls)).
- A broken IPv6 path: the client tries IPv6, waits, then falls back to IPv4 ([chapter 8](/internet/last-mile)).
- The first request misses the CDN cache or opens a cold connection to the origin
  ([chapter 13](/edge/cdns), [chapter 14](/backend/edge-to-origin)).

**What tells them apart:**

- RUM phase breakdown for first versus later requests. If DNS + connect + TLS explain most of the gap,
  it is setup. If time to first byte explains it, look behind the edge.
- `Server-Timing` on the first response. A cache `MISS` with a long origin duration points at the CDN or
  origin, not the client.
- From a test machine: `curl -w` with `-6` and then `-4`. Here `-6` hung until it timed out, while `-4`
  connected in 30 ms.
- `dig www.example.com AAAA` returned an IPv6 address, so clients were trying it first.

**Cause (in this example).** A recent change had added AAAA records for the API name, but the IPv6 route to
one edge site was broken. Each new connection tried IPv6 first, waited for Happy Eyeballs to give up on it,
and then used IPv4. Later requests reused the IPv4 connection, so only the first one paid. Clients that had
no working IPv6 at all were unaffected, which made the problem hard to reproduce. Fixing the route removed
the delay; the team also added an IPv6-only synthetic probe, so the next break would raise an alert.

## Why this matters in real systems

**Large sites watch from many sides at once.** The usual pattern is RUM for truth, synthetic probes from
many cities and networks for alerting, edge logs for every request, and sampled traces from the edge
inward. No single source is enough; each covers another's blind spot.

**CDNs and edge networks run their own measurement.** Steering systems choose sites using real users'
measured latency rather than maps ([chapter 10](/edge/steering)). The same data powers debugging: "which
networks got slower after we changed a route?"

**Mobile is where the long tail lives.** Radio wake-ups, carrier NAT timeouts, changing networks and older
devices all show up as p99, not median. Teams that only watch medians or server-side latency miss most
mobile pain.

**ML serving changes what "latency" means.** For a model that streams tokens, time to first token and the
gap between tokens matter more than total time. The same phase thinking applies: queueing, model start,
first token, stream. Server-Timing or trailing metadata can report the server-side parts to the client.

**Your tools are on the path too.** Monitoring, dashboards and remote access often depend on the same DNS,
network and identity systems as the product. The stories below show what happens when they share its fate.

## Where it breaks

**Slack, 2021: the dashboards went down with the network.** On 4 January 2021, the first workday after the
holidays, traffic overwhelmed AWS Transit Gateways that connected Slack's networks, causing packet loss.
Early in the investigation, Slack's dashboarding and alerting service became unavailable too. It ran in a
different network from its databases and depended on the same overloaded gateways. **Lesson:** monitoring
must not share fate with what it monitors. ([Slack engineering, 2021](https://slack.engineering/slacks-outage-on-january-4th-2021/))

**Facebook, 2021: no DNS, no debugging tools.** During the 4 October 2021 outage, Facebook wrote that "the
total loss of DNS broke many of the internal tools we'd normally use to investigate and resolve outages like
this". Primary and out-of-band network access were both down, so engineers had to go to the datacenters in
person. **Lesson:** keep a debugging path that works when your own DNS and network do not.
([Facebook engineering, 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/))

**Let's Encrypt, 2021: errors only on old clients.** On 30 September 2021, an old root certificate that
Let's Encrypt's chains relied on for compatibility (DST Root CA X3) expired. Most clients were unaffected.
Older devices and software whose trust stores lacked the newer root, and some older TLS libraries, began
failing to connect to many sites. Server-side metrics stayed normal; the signal was in client-side errors
sliced by OS and library version. **Lesson:** after any certificate or chain change, watch errors by client
version, not only in total. ([Let's Encrypt, 2021](https://letsencrypt.org/docs/dst-root-ca-x3-expiration-september-2021/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Users say the site is slow. Your server latency graphs are flat. What do you do?
Flat server graphs only mean the server's own work did not change. The time could be in DNS, the route,
the handshakes, the edge, or the client. First scope it with real-user data: who is affected, since when,
and in which phase. Slice by country, network, edge site, protocol and app version until the problem
concentrates.

Then test the path in order from a client like the affected one: `dig` for the address, `curl -w` against
the same edge address for connect, TLS and first-byte times, `openssl s_client` for the certificate, and
`mtr` for the route.

**Senior add-on:** mention survivorship bias: RUM loses users who failed outright, so check NEL reports
and edge error logs too. And correlate the start time with changes: deploys, certificates, DNS, routing.
:::

::: details 2. What does traceroute tell you, and what does it not?
It shows the routers that answered on the way to a destination and roughly how long each reply took. It is
good for spotting where the path goes, where it changes, and where loss starts and continues to the end.

It does not show the return path, which may differ. Routers deprioritise and rate-limit the replies it
relies on, so loss at one hop that does not persist is not real loss. With load-balanced paths, classic
traceroute mixes branches and can show links that do not exist.

**Senior add-on:** use flow-stable tools (Paris traceroute, `mtr -T` with a fixed port), probe the real
port with TCP, and trace from both ends. Tunnels can hide hops, and reverse DNS names may be wrong.
:::

::: details 3. Compare real-user monitoring and synthetic monitoring. When do you need each?
RUM measures real users on real devices and networks. It tells you how bad a problem is and for whom, but
it is noisy and misses users who failed before reporting. Synthetic probes run fixed scripts from known
places. They are steady, so changes stand out, and they work with no traffic, such as before a launch or at
night.

You need both: probes to alert quickly and repeatably, RUM to know the true impact and to find problems
probes cannot see, such as one carrier's network.

**Senior add-on:** probes in cloud datacenters skip the last mile. Place some on real consumer and mobile
networks, and keep probes for every important variant: IPv6-only, HTTP/3, each edge site.
:::

::: details 4. Design request tracing across a CDN, a load balancer and a set of services.
Create a trace ID at the first hop you control, ideally the edge, and pass it in the W3C `traceparent`
header. Every proxy and service records a span with its timing and forwards the header. Put the trace ID in
every log line and in error responses.

Sample a small fraction of requests to control cost, but keep all errors and slow requests. Return a
`Server-Timing` header with coarse durations so client-side monitoring can join its own timings to yours.

**Senior add-on:** decide where to trust incoming trace headers from clients (rate-limit or re-root them),
avoid leaking internal names in Server-Timing, and make sure the tracing pipeline does not share fate with
the system it watches.
:::

::: details 5. After a certificate rotation, users in one country see TLS errors. How do you find out why?
Find which servers the failing users reach. NEL reports or client logs give the server address; edge logs
show handshake failures per site. Then ask those sites directly with
`openssl s_client -connect <ip>:443 -servername <name> -showcerts` and compare the certificate and chain with
other sites.

If one site serves an old certificate or a chain without the intermediate, that is the cause. If all sites
serve the same chain but only old devices fail, the new authority's root is missing from their trust store.
If the issuer seen by clients is not yours, someone is intercepting TLS.

**Senior add-on:** desktop browsers can hide a missing intermediate; apps and older libraries do not.
Build an outside check of the served chain on every edge site into the rotation itself.
:::

::: details 6. About 5% of requests through a load balancer time out, and retries succeed. Where do you look?
A steady fraction suggests one bad member of a group. Group failures by what they share: backend, source
port, response size, time since the connection was last used.

If they share a backend, it is a gray failure in that backend. If they fail fast after idle periods, it is
a keep-alive timeout mismatch. If a given source port always fails, a hashed path such as an ECMP link is
dropping packets. If only large responses fail, suspect packet size.

**Senior add-on:** retries hide this kind of fault by picking a new port or backend, so watch the retry
rate as a signal. Packet captures at both ends tell "lost on the path" from "ignored by the server".
:::

## Common misconceptions

- **"Server latency is user latency."** The server misses DNS, handshakes, the route and failed requests.
- **"High loss at a middle traceroute hop means that router drops my traffic."** Only loss that continues
  to the final hop is real.
- **"Traceroute shows the path."** It shows one forward path, often mixed across load-balanced branches,
  and none of the return path.
- **"RUM shows everyone."** It misses users who failed before the beacon was sent.
- **"`curl -w` times are per phase."** They are cumulative from the start of the request; subtract.

## Key takeaways

- Use **real-user monitoring** for truth and **synthetic probes** for fast, repeatable alerts; each covers
  the other's blind spot.
- **Slice** by network, place, protocol and version until the problem concentrates, and look at phases,
  not totals.
- Pass one **trace ID** (`traceparent`) through every hop, and send coarse timings back with
  **Server-Timing**. **NEL** reports failures RUM cannot see.
- Walk the path in order: **DNS, connection, TLS, server**, aimed at the same edge site as affected users.
- Read traceroute with care: **ICMP deprioritisation, asymmetric paths and load-balanced hops** all mislead.

## Review

<Flashcards id="observing-the-path" :cards="cards" />

<MarkDone id="observing-the-path" />

## Sources

- [Trace Context](https://www.w3.org/TR/trace-context/) (W3C Recommendation, 2020)
- [Server Timing](https://www.w3.org/TR/server-timing/) (W3C specification)
- [Network Error Logging](https://www.w3.org/TR/network-error-logging/) (W3C Working Draft, 2025)
- [Navigation Timing Level 2](https://www.w3.org/TR/navigation-timing-2/) and
  [Resource Timing](https://www.w3.org/TR/resource-timing/) (W3C specifications)
- [curl: write-out variables](https://everything.curl.dev/usingcurl/verbose/writeout) (documentation)
- [Slack's Outage on January 4th 2021](https://slack.engineering/slacks-outage-on-january-4th-2021/) (engineering blog, 2021)
- [More details about the October 4 outage](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) (Facebook engineering blog, 2021)
- [DST Root CA X3 Expiration (September 2021)](https://letsencrypt.org/docs/dst-root-ca-x3-expiration-september-2021/) (documentation, 2021)
