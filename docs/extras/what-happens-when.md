---
title: "C. What Happens When…"
---

<script setup>
import { cards } from './what-happens-when-review'
</script>

# C. What Happens When…

This chapter follows five events from start to finish, along the whole path from a phone to an application
server. Each step links to the chapter that explains it. "What happens when you type a URL and press Enter?"
is the classic opening question in networking interviews, and at senior level it is really a test of whether
you can connect the pieces and say where they break.

::: info Before you start
- This chapter is a map, not a textbook. It names each step in a sentence or two and links to where the book
  explains it. Follow a link when a step is unfamiliar.
- Each step carries a rough cost in orders of magnitude. Real numbers depend on distance, network and load;
  treat them as a sense of scale, not measurements.
- Each walkthrough ends with a table of **where it can be slow or fail**, and how you would see it. That is
  where interviews usually go next.
- [Chapter 1](/foundations/the-map) draws the same path in one picture. The OS Primer's
  [capstone](https://turo64648.github.io/os-primer/extras/what-happens-when) covers what happens inside the
  server once the packet arrives.
:::

## How to use these walkthroughs

**In short:** give the whole path first in a few plain stages, then go deeper wherever the interviewer
points, and always say what could be slow or fail.

A good answer has a shape:

1. **Name the big stages in one breath.** "The phone wakes its radio and looks up the name. It connects to
   a nearby edge site and sets up encryption. The edge serves from cache or forwards over its backbone to an
   origin region. A load balancer and a proxy pick a server, and the response comes back."
2. **Walk through each stage**, naming the mechanism and its cost in round trips.
3. **Offer depth, do not dump it.** "I can go deeper on how the edge picks the origin region."
4. **Say where it goes wrong.** That turns a recital into engineering.

Three ideas carry almost every walkthrough:

- **Round trips times distance.** Most of the wait is the number of exchanges that must wait for a reply,
  times the <Term id="rtt">round-trip time</Term> of the hop they cross ([Chapter 1](/foundations/the-map)).
- **Caches and reuse.** DNS caches, open connections, session tickets and CDN copies each remove round
  trips. A <Term id="cold-request">cold request</Term> has none of them.
- **Indirection that can be re-pointed.** A name, an anycast address, a virtual IP and a load balancer's
  backend list each sit between the client and a server, so failures and deploys can move traffic without
  the client knowing.

<CapstonePathDiagram />

## …you open a URL on your phone, cold

**In short:** the radio wakes, DNS finds a nearby edge site, the phone spends a round trip each on TCP and
TLS (or one on QUIC), and the edge forwards the request over a warm connection to an origin region, where
two layers of load balancing pick a server.

You tap a link to `https://www.example.com/feed` on a phone on 4G. Nothing is cached: no DNS answer, no
connection, no session ticket. The page is dynamic, so the CDN cannot answer it.

1. **The radio wakes.** An idle phone's cellular radio is asleep. Before the first packet leaves, it must
   reconnect to the network and get a channel. *Tens to hundreds of milliseconds, depending on the network*
   ([Chapter 8](/internet/last-mile)).
2. **The app checks its caches.** The browser and the operating system have no DNS answer. *Microseconds.*
3. **The stub resolver asks the recursive resolver.** The phone asks for A, AAAA and often HTTPS records in
   parallel, usually to the carrier's <Term id="recursive-resolver">recursive resolver</Term>. *One round
   trip over the radio: tens of milliseconds* ([Chapter 4](/protocols/dns)).
4. **The resolver finds the answer.** If its cache is cold, it walks root, `.com` and the site's
   authoritative servers. The site's name is a CNAME to its <Term id="cdn">CDN</Term>, whose servers return
   the address of a site near the resolver. *Nothing on a cache hit; tens to hundreds of milliseconds on a
   full miss* ([Chapter 4](/protocols/dns), [Chapter 10](/edge/steering)).
5. **The phone picks an address family.** It races IPv6 against IPv4 with
   <Term id="happy-eyeballs">Happy Eyeballs</Term>. On an IPv6-only carrier, IPv4-only sites go through
   NAT64. *Usually no added delay; up to a few hundred milliseconds if one family is broken*
   ([Chapter 8](/internet/last-mile)).
6. **Packets cross the carrier and the internet.** They leave the radio network through the carrier's
   gateway, often through carrier-grade NAT, then cross networks chosen by BGP.
   <Term id="anycast">Anycast</Term> delivers them to a nearby <Term id="pop">PoP</Term> (point of presence).
   *Most of the round-trip time to the PoP: roughly 20–60 ms on 4G to a PoP in the same metro*
   ([Chapter 8](/internet/last-mile), [Chapter 9](/internet/internet-routing)).
7. **The transport handshake.** Over TCP, the three-way handshake costs one round trip. If the HTTPS record
   advertised HTTP/3, the phone may use QUIC instead, which folds transport and encryption into one round
   trip. *One RTT to the PoP* ([Chapter 3](/foundations/tcp-and-udp), [Chapter 7](/protocols/quic)).
8. **The PoP's L4 load balancer picks a machine.** Routers spread flows across load balancers with ECMP;
   each balancer hashes the flow to an edge server and forwards the packets. *Microseconds*
   ([Chapter 11](/edge/l4-load-balancing)).
9. **TLS.** The edge proxy reads the site name from SNI, sends its certificate, and both sides agree on keys.
   The phone checks the certificate chain. This is <Term id="tls-termination">TLS termination</Term> at the
   edge. *One more RTT over TCP; already done over QUIC* ([Chapter 5](/protocols/tls)).
10. **The HTTP request reaches the L7 proxy.** The proxy parses the request, applies rate limits and bot
    checks, looks up the cache key, misses, and routes it to the origin. *Sub-millisecond of proxy work, plus
    the RTT to send the request* ([Chapter 6](/protocols/http), [Chapter 12](/edge/l7-proxies),
    [Chapter 13](/edge/cdns)).
11. **The edge forwards to an origin region.** It picks a healthy region and sends the request over a
    <Term id="connection-pool">pooled</Term>, already-open connection, often on a private backbone. No new
    handshake. This is <Term id="split-tcp">split TCP</Term>: the slow handshakes happen only on the short
    phone-to-PoP leg. *One RTT across the backbone: a few ms in the same region, 50–150 ms or more across
    an ocean* ([Chapter 14](/backend/edge-to-origin)).
12. **The origin's front door.** Another L4 balancer and L7 proxy layer receive the request, often
    re-encrypting inside the region. *Sub-millisecond* ([Chapter 11](/edge/l4-load-balancing),
    [Chapter 12](/edge/l7-proxies)).
13. **Across the datacenter fabric.** Packets cross a leaf-spine fabric, hashed across equal paths, often
    wrapped in an overlay such as VXLAN. *Microseconds per hop* ([Chapter 15](/backend/datacenter-fabric)).
14. **To one application server.** Service discovery, a <Term id="vip">virtual IP</Term> or a sidecar proxy
    picks an instance. The server's kernel accepts the connection and wakes the app.
    *Sub-millisecond* ([Chapter 16](/backend/reaching-the-service),
    [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking)).
15. **The app works and responds.** *Milliseconds to hundreds of milliseconds, the one term the network
    cannot shrink.* The response retraces the path. On a new connection, <Term id="slow-start">slow
    start</Term> limits the first flight to about 14 KB, so a large response needs extra round trips
    ([Chapter 3](/foundations/tcp-and-udp)).
16. **The page fetches its pieces.** Scripts, images and API calls reuse the same HTTP/2 or HTTP/3
    connection, and most static files come from the CDN's cache (the third walkthrough).

**The rough total.** Count the waits on the radio: DNS, TCP, TLS and the request make four round trips over
TCP, three over QUIC. With a 50 ms radio RTT, a radio wake-up and a cross-country origin, the time to first
byte is often several hundred milliseconds to over a second. Server time and the origin leg add to that; the
handshakes are what the edge saves.

::: details Going deeper: see the stages with curl
`curl` reports when each stage finished, counted from the start:

```bash
curl -so /dev/null https://www.example.com/ -w \
  'dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first byte %{time_starttransfer}  total %{time_total}\n'
```

```text
dns 0.031  tcp 0.058  tls 0.112  first byte 0.287  total 0.301
```

(Illustrative.) Here TCP took about one RTT after DNS (27 ms), TLS about two more (54 ms, an older TLS or a
long chain), and the server plus origin leg about 175 ms. Run it twice: the DNS time drops on the second run.
[Chapter 18](/operations/observing-the-path) turns this into a debugging method.
:::

### Where it can be slow or fail

| Step | What goes wrong | How you see it |
|---|---|---|
| Radio | Idle radio, weak signal, crowded cell | First request slow, later ones fast; varies by place and time |
| DNS | Resolver far from the user, so the CDN picks a far PoP; cold cache; NXDOMAIN cached | High `time_namelookup`; users routed to a distant PoP |
| Address family | Broken IPv6 or NAT64 path | A fixed few-hundred-ms delay on some networks |
| Path to PoP | Route leak, congested peering link, MTU black hole | High RTT in `mtr`; small requests work and large ones hang |
| QUIC | UDP blocked or throttled on the network | Clients fall back to TCP after a delay; HTTP/3 share drops |
| TLS | Expired or wrong certificate, clock wrong on phone, missing intermediate | Handshake errors on some clients only |
| Edge to origin | Origin region far away or overloaded | High first byte time on cache misses only |
| Server | Slow app, queueing, overload | High first byte time everywhere; `Server-Timing` shows it |

## …the same request, warm

**In short:** with an open connection, a request costs one round trip to the PoP plus the origin leg and
server time. Warm state is fragile: idle timers on the radio, NATs and load balancers quietly take it away.

A minute later, you pull to refresh. The app still holds its HTTP/2 or HTTP/3 connection to the PoP.

1. **The radio may still be awake.** It stays in a high-power state for seconds after traffic, then steps
   down. If it has gone idle, step 1 of the cold walkthrough comes back. *Zero, or tens to hundreds of ms*
   ([Chapter 8](/internet/last-mile)).
2. **No DNS lookup.** The app sends on the existing connection, so it does not ask DNS at all. Even if the
   site changed its DNS, this client keeps reaching the old PoP until the connection closes
   ([Chapter 4](/protocols/dns)).
3. **No handshakes.** The request goes out as a new stream on the open connection,
   <Term id="multiplexing">multiplexed</Term> with any others. *One RTT to the PoP, tens of ms on 4G*
   ([Chapter 6](/protocols/http)).
4. **The congestion window may be open.** A connection that recently sent a lot can send a large response in
   one flight. After an idle period, many TCP stacks shrink the window again ([Chapter 3](/foundations/tcp-and-udp)).
5. **The rest is the same as before.** The edge uses its warm pool to the origin, and the origin's balancers
   pick a server. *Origin RTT plus server time* ([Chapter 14](/backend/edge-to-origin)).

Two half-warm cases matter in practice:

- **The connection closed, but the phone kept a session ticket.** It still looks up the name and opens a
  connection, but <Term id="session-resumption">session resumption</Term> skips the certificate. With
  <Term id="zero-rtt">0-RTT</Term> the request rides in the first flight. 0-RTT data can be replayed, so
  servers accept it only for requests that are safe to repeat ([Chapter 5](/protocols/tls)).
- **The phone switched from Wi-Fi to cellular.** A TCP connection is tied to the old address and dies. A
  QUIC connection can carry on with <Term id="connection-migration">connection migration</Term>, if the
  load balancer routes by connection ID ([Chapter 7](/protocols/quic),
  [Chapter 11](/edge/l4-load-balancing)).

### Where it can be slow or fail

| Step | What goes wrong | How you see it |
|---|---|---|
| Open connection | A NAT or load balancer dropped it after an idle timeout, without telling either end | Request hangs until a timeout, then succeeds on retry |
| Open connection | Server sent GOAWAY or closed it during a deploy | Brief errors or retries in client logs |
| Pinned to old PoP | Connection outlives a DNS or steering change | Traffic keeps arriving at a drained site |
| Lossy radio | One lost packet stalls all HTTP/2 streams on TCP | Latency spikes under loss; HTTP/3 clients fare better |
| Network switch | TCP connection dies on Wi-Fi to cellular | A new cold-ish connection, visible as a latency spike |
| 0-RTT | Replayed or rejected early data | Server must refuse non-idempotent requests in 0-RTT |

## …the CDN has it, and when it does not

**In short:** on a hit, the PoP answers from memory or disk in about one RTT to the user. On a miss, it
asks a larger cache tier, then the origin, and collapses duplicate misses into one fetch.

The page needs `https://static.example.com/app.3f9c.js`, a versioned file with a long cache lifetime.

1. **The request reaches the PoP** over the warm connection. *One RTT* ([Chapter 6](/protocols/http)).
2. **The proxy builds the cache key**: by default the host, path and query string, plus any headers the
   response's `Vary` names ([Chapter 13](/edge/cdns)).
3. **Hit: the PoP serves its copy.** It checks the copy is still fresh by its `Cache-Control` lifetime and
   sends it. *Under a millisecond to a few ms inside the PoP.* Done.
4. **Miss: ask the next tier.** With <Term id="tiered-cache">tiered caching</Term>, the PoP asks a larger
   regional cache, and on a miss there an <Term id="origin-shield">origin shield</Term>. *Tens of ms*
   ([Chapter 13](/edge/cdns)).
5. **Collapse duplicates.** If a thousand users miss on the same object at once,
   <Term id="request-collapsing">request collapsing</Term> sends one request to the origin and makes the rest
   wait for it ([Chapter 13](/edge/cdns)).
6. **Fetch from the origin** over a warm connection, through the origin's balancers to a server, as in the
   cold walkthrough. A stale copy can be revalidated with a conditional request; a `304 Not Modified` saves
   the body. *Origin RTT plus server time* ([Chapter 14](/backend/edge-to-origin),
   [Chapter 6](/protocols/http)).
7. **Store and serve.** Each tier stores the response if its headers allow it, then sends it on. The next
   user at this PoP gets a hit.

If the origin is slow or down when a copy expires, <Term id="stale-while-revalidate">stale-while-revalidate</Term>
and <Term id="serve-stale">serve-stale</Term> rules let the PoP keep answering with the old copy
([Chapter 13](/edge/cdns)).

### Where it can be slow or fail

| Step | What goes wrong | How you see it |
|---|---|---|
| Cache key | Random query strings, cookies or `Vary: User-Agent` split one object into many | <Term id="cache-hit-ratio">Hit ratio</Term> drops; origin load rises |
| Freshness | `Cache-Control` missing or too short; `no-store` by accident | Every request is a miss in the `x-cache` style headers |
| Purge | Purging everything at once | A <Term id="thundering-herd">thundering herd</Term> of misses to the origin |
| Shield | Shield site or its link overloaded | Misses slow everywhere at once |
| Origin | Origin down with no stale rules | 5xx errors on misses, hits still fine |
| Wrong content | A personalised response cached as public | Users see each other's data; the worst CDN bug |

## …a region fails mid-day

**In short:** in-flight requests to the region fail; health checks notice within seconds; the edge sends new
requests to another region. How long users suffer depends on which layer steers them, and the surviving
regions must absorb the load.

At 14:00 one origin region loses power. Users' PoPs are fine.

1. **In-flight requests fail.** The edge's pooled connections to the region time out or reset. Users whose
   requests were in flight see an error or a slow retry. *Up to the edge's request timeout: often seconds*
   ([Chapter 14](/backend/edge-to-origin), [Chapter 17](/operations/timeouts-retries-overload)).
2. **The edge notices.** <Term id="outlier-detection">Outlier detection</Term> on real requests reacts
   fastest; active <Term id="health-check">health checks</Term> confirm after a few failed probes. *Seconds
   to tens of seconds* ([Chapter 12](/edge/l7-proxies), [Chapter 10](/edge/steering)).
3. **New requests go to the next region.** The edge's origin selection marks the region down and picks the
   next-best healthy one. Users keep their PoP and their connection; they only pay the longer origin leg.
   *Tens of ms more per request* ([Chapter 14](/backend/edge-to-origin)).
4. **Retries.** The edge or client retries <Term id="idempotency">idempotent</Term> requests in another
   region. A `POST` is retried only if it carries an <Term id="idempotency-key">idempotency key</Term>.
   Retry budgets keep retries from multiplying load ([Chapter 17](/operations/timeouts-retries-overload),
   [Chapter 6](/protocols/http)).
5. **The survivors take the load.** Traffic jumps in the remaining regions. Their caches and connection
   pools are cold for the new users, and autoscaling takes minutes. Capacity-aware steering spills the excess
   to farther regions; load shedding drops the least important work first ([Chapter 10](/edge/steering),
   [Chapter 17](/operations/timeouts-retries-overload)).
6. **Fail back slowly.** When the region returns, the edge moves traffic back in steps, so a half-recovered
   region does not flap ([Chapter 10](/edge/steering)).

If the failure is a **user-facing PoP** instead, the lever matters more. With anycast, the PoP withdraws its
routes and BGP moves users to the next PoP within seconds to a minute; their connections break and must
reconnect, because the new PoP has no state for them. With DNS steering, the address stops being returned,
but cached answers and open connections keep some users on the dead site for a TTL or much longer
([Chapter 9](/internet/internet-routing), [Chapter 10](/edge/steering)).

<CapstoneFailoverDiagram />

### Where it can be slow or fail

| Step | What goes wrong | How you see it |
|---|---|---|
| Detection | <Term id="gray-failure">Gray failure</Term>: the region passes health checks but fails real requests | Errors and latency with all checks green |
| Detection | A health check that marks every region down at once | A total outage caused by the safety mechanism |
| Retries | Every layer retries; load multiplies | Load on survivors several times normal; a retry storm that outlasts the failure |
| Capacity | Survivors lack headroom for the moved traffic | Cascading overload; the outage spreads region by region |
| DNS lever | Long TTLs, stretched caches, pinned connections | A long tail of users on the dead site |
| State | Sessions or data held only in the failed region | Logouts or missing data (replication is out of this book's scope) |

## …a deploy happens while requests are in flight

**In short:** a safe rollout drains each server before stopping it: stop sending new work, tell clients to
move, let in-flight requests finish, then stop. Errors come from races between those steps and from
connections that never finish on their own.

The team rolls out a new version of the application, a few servers at a time.

1. **Pick a batch and drain it.** The deploy system marks some servers as leaving. Their readiness checks
   start failing on purpose, and service discovery removes them. *Seconds for the change to reach every
   proxy and balancer* ([Chapter 16](/backend/reaching-the-service), [Chapter 12](/edge/l7-proxies)).
2. **Stop new requests, finish old ones.** Proxies stop picking these servers. Requests already running
   continue. Each server sends HTTP/2 <Term id="goaway">GOAWAY</Term>, or `Connection: close` on HTTP/1.1,
   so callers open new connections elsewhere ([Chapter 6](/protocols/http)).
3. **Keep existing flows in place.** An L4 balancer with connection tracking or consistent hashing keeps
   current connections on the old servers while new ones go elsewhere ([Chapter 11](/edge/l4-load-balancing)).
4. **Wait out the drain period.** Short requests finish in milliseconds. WebSockets and gRPC streams do not
   finish by themselves; they are closed at the deadline, and clients reconnect with jitter.
   *Drain timeouts are typically tens of seconds to minutes* ([Chapter 12](/edge/l7-proxies)).
5. **Stop the old process.** It receives a termination signal, closes its listening socket and exits.
6. **Start and warm the new one.** The new version starts, fills its caches and connection pools, passes
   readiness, and is added back. Good balancers ramp its share up slowly instead of sending it a full share
   at once ([Chapter 12](/edge/l7-proxies)).
7. **Repeat**, watching error rates after each batch. Old and new versions serve side by side for the whole
   rollout, so they must understand each other's requests.

The same steps apply when the proxies themselves are upgraded, one level up: an edge proxy drains by
sending GOAWAY to phones, and an anycast PoP drains by withdrawing its routes
([Chapter 12](/edge/l7-proxies), [Chapter 10](/edge/steering)).

<L7DrainTimelineDiagram />

### Where it can be slow or fail

| Step | What goes wrong | How you see it |
|---|---|---|
| Drain | Process exits before every proxy learns it is leaving | A burst of 502 or 503 errors and connection resets at each batch |
| Keep-alive | Backend closes an idle connection just as the proxy reuses it | Rare 502s all day, worse during deploys; fix with the proxy's idle timeout below the backend's |
| Long-lived streams | Thousands of clients cut at the drain deadline reconnect at once | A reconnect spike on the remaining servers |
| Retries | Proxy retries a non-idempotent request that had already run | Duplicate orders or messages |
| Warm-up | New instances get full traffic while cold | Latency spike after each batch |
| Bad version | The new code is broken | Errors grow batch by batch unless a canary stops the rollout |

## Why this matters in real systems

**The handshakes are where the edge earns its keep.** Every large site ends TCP and TLS near the user and
crosses the long distance on warm connections. That turns several long round trips into short ones, which
matters most on mobile networks with high RTT ([Chapter 14](/backend/edge-to-origin)).

**Mobile apps fight to stay warm.** Apps open connections at startup, keep one multiplexed connection per
host, and use QUIC to survive network switches. The cold walkthrough is what an app sees after it has been in
the background ([Chapter 8](/internet/last-mile), [Chapter 7](/protocols/quic)).

**Failover is a capacity problem dressed as a routing problem.** Moving traffic takes seconds at the edge.
Having somewhere to put it takes planning: regions run with enough headroom to absorb a neighbour
([Chapter 10](/edge/steering)).

**Deploys are the most common "failure".** Most days nothing breaks, but every deploy drains and replaces
servers. Small errors at each batch, multiplied by many deploys a day, are a real share of a site's error
budget ([Chapter 12](/edge/l7-proxies)).

**Debugging follows the same path.** When something is slow, split the time by stage: DNS, connect, TLS,
first byte, transfer. Then ask which hop owns that stage ([Chapter 18](/operations/observing-the-path)).

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. What happens when you type a URL into your phone's browser and press Enter?
The browser parses the URL and checks its caches. With no cached answer, the phone's radio wakes and the
stub resolver asks the recursive resolver for the name. The site's DNS, usually a CDN's, returns the
address of a nearby edge site. The phone opens a TCP connection and runs a TLS handshake (or one QUIC
handshake), then sends the HTTP request.

At the edge site, an L4 balancer picks a proxy, which ends TLS, checks the cache and, on a miss, forwards
the request over a warm connection to an origin region. There another balancer and proxy pick a server,
which runs the app and responds. The browser then fetches the page's other files on the same connection.

**Senior add-on:** put costs on it. Over TCP the phone waits four round trips before the first byte (DNS,
TCP, TLS, request), three over QUIC, on top of radio wake-up, the origin leg and server time. Name the
indirections (CNAME, anycast, virtual IPs, backend lists) and say they are where failover and deploys
happen. Offer to go deeper on any hop.
:::

::: details 2. Where does the time go on a cold mobile request, and how would you cut it?
Mostly round trips on a slow, variable radio link: radio wake-up, DNS, TCP, TLS, then the request. The
origin leg and server time add to that.

To cut it: end connections near the user at a CDN or edge site, so handshakes cross a short distance. Use
TLS 1.3 and HTTP/3 to cut handshake round trips. Publish HTTPS records so clients can start with QUIC. Reuse
connections and session tickets. Cache what can be cached at the edge, and keep warm connections to the
origin.

**Senior add-on:** in the app, preconnect at startup and keep one multiplexed connection per host. Keep the
first response small enough to fit slow start's first flight. Measure with real-user timing split by stage,
not with lab tests on fast Wi-Fi.
:::

::: details 3. The second request is fast. Why is the first request after the app sits idle for a minute slow again?
The second request reused everything: DNS answer, connection, open congestion window, awake radio.

After a minute idle, several of those decay. The radio drops to a low-power state and must wake. A NAT or
load balancer may have dropped the idle connection without telling anyone, so the request hangs until a
timeout and then reconnects. TCP may shrink its congestion window after idle.

**Senior add-on:** check the idle timeouts at every hop (carrier NAT, edge balancer, proxy) and make
client keep-alives or connection lifetimes shorter than the shortest one. QUIC with connection IDs survives
some of this; nothing fixes the radio wake-up except doing work before the user asks.
:::

::: details 4. Design: you are launching a global, latency-sensitive website. Walk through the path you would build.
Put PoPs near users, reached by anycast or DNS steering, with a CDN cache in each. End TCP and TLS there. Run
L4 balancers in front of L7 proxies at each PoP. Keep warm connections from PoPs to two or more origin
regions over a backbone or a good transit path. In each region, put balancers and proxies in front of the
app servers, with service discovery and health checks.

Plan the failure modes: health checks and outlier detection at each layer, enough headroom per region to
absorb one failed region, retry budgets, and draining for deploys.

**Senior add-on:** explain the steering choice (anycast for fast failover and DDoS absorption, DNS for
finer control), cache keys and lifetimes per content type, and what is measured: real-user latency by
stage and by network. [Designing a Global Edge](/extras/global-edge-design) works this through.
:::

::: details 5. An origin region fails. What do users see, and what decides how long it lasts?
Users with requests in flight to that region see an error or a slow retry. Within seconds the edge's health
checks and outlier detection mark it down and send new requests to another region. After that, users pay
only the longer distance to the new region.

How long it lasts depends on detection speed, on whether retries are safe and bounded, and on whether the
surviving regions have spare capacity.

**Senior add-on:** if a user-facing site fails, the lever decides the tail. Anycast moves users within
seconds to a minute but breaks their connections. DNS steering leaves a long tail behind TTLs, stretched
caches and pinned connections. Watch for retry storms and gray failures that pass health checks.
:::

::: details 6. How do you deploy a new version without dropping requests?
Drain servers before stopping them. Remove a batch from service discovery or fail its readiness check, wait
until every proxy has stopped sending it new requests, and let in-flight requests finish. Send GOAWAY or
`Connection: close` so callers move to other servers. Then stop the process, start the new version, warm
it, and add it back gradually.

**Senior add-on:** the gaps are races and long-lived connections. Wait longer than discovery takes to
propagate before closing the listener. Set proxy idle timeouts below backend idle timeouts. Give streams a
drain deadline and make clients reconnect with jitter. Retry only idempotent requests, and roll out with a
canary that can stop the deploy.
:::

::: details 7. p99 latency doubled for mobile users in one country. Nothing was deployed. How do you find out why?
Narrow it down by stage and by group. Split real-user timing into DNS, connect, TLS and first byte. Then
split by carrier, PoP and origin region.

If DNS or connect time rose, look at the network side: did users move to a different PoP (steering or a
route change), or did RTT to the same PoP rise (a congested peering link)? `mtr` from an affected network,
BGP looking glasses and the carrier's resolver all help. If first byte time rose with normal connect time,
look behind the edge: origin region, backbone, server.

**Senior add-on:** one carrier only points to its resolver (steering users to a far PoP), its peering with
you, or its UDP handling (QUIC falling back to TCP). Compare HTTP/3 share before and after.
:::

::: details 8. After each deploy, about 1% of requests fail with 502 for a minute. Why?
Most likely the drain is racing the shutdown. The old process exits, or closes idle connections, while some
proxies still think it is healthy and send it requests. Those requests get a reset, and the proxy returns
502.

Check the timing: when does the server stop accepting, versus when does each proxy stop sending? Check the
proxy's access logs for upstream resets and which backends they name.

**Senior add-on:** fixes: fail readiness first and wait longer than discovery propagation before closing
the listener; send GOAWAY; set proxy idle timeouts below the backend's; let the proxy retry requests that
never reached the app (connection refused), which is safe even for `POST`.
:::

::: details 9. After a release, the CDN hit ratio fell from 95% to 60% and the origin is overloaded. How do you investigate?
Something split or shortened the cached objects. Compare the cache key and response headers before and
after: a new query parameter (tracking IDs, cache busters), a new `Vary` header, a cookie now included in the
key, or `Cache-Control` changed to a short lifetime or `private`.

Look at the URLs that miss most. If many near-identical URLs each have a few requests, the key is
fragmented. If the same URLs miss repeatedly, the lifetime is the problem.

**Senior add-on:** while you fix it, protect the origin: turn on stale serving and request collapsing,
normalise or strip the offending parameter at the edge, and roll back the release if needed.
:::

::: details 10. Curveball: why not set the DNS TTL to zero for instant failover?
Some resolvers and runtimes enforce a minimum TTL and ignore zero. Clients with open connections do not
ask DNS again at all. And every lookup becomes a full trip to your authoritative servers, which adds latency
for users and makes your DNS provider a hard dependency for every request.

**Senior add-on:** for fast failover, keep the address stable and move what is behind it: anycast, a global
load balancer, or edge proxies that switch origin regions. Use DNS for coarse steering with TTLs of tens of
seconds to minutes.
:::

::: details 11. Curveball: the site works on Wi-Fi but hangs for some users on cellular. What could it be?
Something about that carrier's path. Common causes: a broken IPv6 or NAT64 path that Happy Eyeballs does
not fully hide; an MTU black hole where small requests work and large ones hang; UDP throttled so QUIC
stalls before falling back; or a carrier NAT with a short idle timeout killing connections.

Reproduce on that carrier, then compare IPv4 with IPv6, small responses with large ones, and HTTP/3 with
HTTP/2.

**Senior add-on:** "hangs" rather than "fails" points to silently dropped packets: MTU black holes or dead
NAT mappings. Errors that appear only after a few seconds point to a fallback path.
:::

::: details 12. Curveball: what changes if the request is a POST that places an order?
It cannot be cached, so every one goes to the origin. It is not safe to repeat, so it must not go in TLS
0-RTT data, and proxies and clients must not retry it blindly after a timeout.

**Senior add-on:** add an idempotency key so the server can recognise a retry and return the first result.
That lets the client retry safely after a lost response, and lets failover and deploys stay clean.
:::

## Common misconceptions

- **"DNS is looked up for every request."** Only for new connections. A warm connection skips DNS, which is
  also why DNS changes do not move it.
- **"Bandwidth decides page speed."** On a cold request, round trips decide it; bandwidth matters only for
  large transfers.
- **"The CDN only helps with static files."** Dynamic requests gain from short handshakes and warm
  connections to the origin.
- **"Failover is instant once health checks notice."** Detection is seconds; the long tail is cached DNS,
  pinned connections, retries and cold capacity.
- **"A graceful shutdown means no errors."** Only if the drain outlasts discovery propagation and every
  long-lived connection is handled.

## Key takeaways

- A cold request waits about four round trips over TCP before its first byte (three over QUIC), plus radio
  wake-up, the origin leg and server time.
- The edge exists to make those round trips short: it ends connections near the user and reuses warm
  connections to the origin.
- Warm state (connections, tickets, caches) is what makes requests fast, and idle timeouts quietly destroy
  it.
- Failures and deploys use the same indirections: names, anycast addresses, virtual IPs, backend lists.
- For every hop, know what can be slow or fail and how you would see it; that is where the interview goes.

## Review

<Flashcards id="what-happens-when" :cards="cards" />

<MarkDone id="what-happens-when" />
