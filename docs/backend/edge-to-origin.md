---
title: "14. Edge to Origin"
---

<script setup>
import { cards } from './edge-to-origin-review'
</script>

# 14. Edge to Origin

When the edge cannot answer a request by itself, it sends the request on to the site's own servers, often a
continent away. How that second leg is built (which connections, over whose network, to which region, and
how it is locked down) decides much of the latency users feel and is a favourite topic in design interviews.

::: info Before you start
The phone connects to a nearby edge site that ends its TCP and TLS connections there
([chapter 12](/edge/l7-proxies)). A CDN at that site answers what it can from cache ([chapter 13](/edge/cdns)).
New TCP connections cost a round trip to open and start slowly ([chapter 3](/foundations/tcp-and-udp)).
Between networks, BGP picks routes ([chapter 9](/internet/internet-routing)).
:::

## The second leg

**In short:** a request that misses the edge cache, or is dynamic, travels a second time: from the edge site
to the origin. That leg uses different connections, often a different network, and different rules.

A user in Lisbon opens your app. Their phone connects to an edge site in Lisbon, a
<Term id="pop">point of presence (PoP)</Term>. An image may come straight from the PoP's cache. But the
request "show my feed" cannot be cached. The PoP must ask the application servers, which live in a
datacenter region in, say, Virginia. Those servers are the <Term id="origin">origin</Term>: the place where
the real answer is made.

So every uncached request has two legs. The first runs from the phone to the PoP: short, but over the user's
network, which you do not control. The second runs from the PoP to the origin: long, but entirely under the
operator's control. This chapter is about the second leg.

Four choices shape it:

- **Connections:** does the PoP open a new connection per request, or reuse warm ones?
- **Network:** does the traffic cross the public internet, or the operator's own private network?
- **Destination:** which origin region gets the request?
- **Trust:** how does the origin know the request really came from the edge?

## Split TCP: ending the connection near the user

**In short:** the phone's connection ends at the nearby PoP, and the PoP uses a separate connection to the
origin. Handshakes and loss recovery then happen over short round trips. The gain is large only if the
PoP-to-origin connection is already open.

Take the Lisbon user again. The round trip from the phone to the Lisbon PoP is about 20 ms. The round trip
from Lisbon to Virginia is roughly 100–150 ms, depending on the route. Without an edge, the phone talks to
Virginia directly. A new HTTPS request then needs three long round trips: one for the TCP handshake, one for
TLS 1.3, and one for the request and response. That is roughly half a second before the first byte.

Now put a PoP in the middle. The phone does the TCP and TLS handshakes with the PoP, over 20 ms round trips.
The PoP forwards the request over a connection to the origin that it opened long ago. Only the request and
response cross the ocean. The first byte arrives in roughly 200 ms instead of 500 ms. Splitting one long
connection into two, joined at a proxy, is called <Term id="split-tcp">split TCP</Term>. Ending TLS at the
PoP is <Term id="tls-termination">TLS termination</Term> ([chapter 5](/protocols/tls)).

<OriginSplitTcpDiagram />

The catch is in "opened long ago". If the PoP has no open connection to the origin, it must do its own TCP
and TLS handshakes across the ocean first. Then the user saves almost nothing on the first byte. Split TCP
pays off through **warm connections**, the subject of the next section.

Split TCP helps after the first byte too:

- **Slow start ramps faster.** A new TCP connection doubles its sending window once per round trip
  ([chapter 3](/foundations/tcp-and-udp)). Over a 20 ms round trip it reaches full speed about seven times
  sooner than over a 140 ms one.
- **Loss is repaired locally.** Mobile links lose packets. The PoP resends a lost packet after a short
  round trip, without the origin noticing.
- **Each leg can use its own settings.** The phone leg might use QUIC and a congestion controller tuned for
  mobile. The origin leg might use large windows tuned for a clean, long, fat pipe.

::: details Going deeper: what split TCP costs
- **State at the edge.** The PoP holds two connections and buffers per request. A slow phone can pin
  memory at the PoP while the origin's answer waits in a buffer.
- **The edge sees everything.** To end TLS, the PoP needs the site's private key or a delegated
  credential. Every byte is plaintext inside the PoP. This is a trust decision, not only a performance one.
- **No end-to-end acknowledgement.** When the PoP acknowledges data, the origin has not received it yet.
  Applications that need "the server has it" must confirm at the HTTP layer.
- **Protocols differ per leg.** As of 2025, many CDNs speak HTTP/3 to phones but HTTP/1.1 or HTTP/2 over
  TCP to origins. A feature on one leg (like 0-RTT) does not carry over to the other.
:::

## Warm, pooled, multiplexed connections

**In short:** the PoP keeps a pool of long-lived connections to each origin and reuses them for many users'
requests. Reuse skips handshakes and slow start. Its main failure modes are idle-timeout mismatches and
too many connections at the origin.

A PoP serves thousands of users who want the same origin. It keeps a
<Term id="connection-pool">connection pool</Term>: a set of open connections to the origin, handed to one
request after another. A request that finds an idle connection skips both handshakes. The connection's
<Term id="congestion-window">congestion window</Term> (how much it may send before waiting for
acknowledgements) is already large from earlier traffic, so large responses also start at full speed.

Two ways to share connections:

- **HTTP/1.1 pools.** One request at a time per connection, so the PoP keeps many connections open, often
  hundreds per origin under load.
- **HTTP/2 or gRPC.** <Term id="multiplexing">Multiplexing</Term> carries many requests at once as separate
  streams on one connection ([chapter 6](/protocols/http)). The PoP needs only a handful of connections.

Multiplexing over a long path has a cost. TCP delivers bytes in order, so one lost packet stalls every
stream on that connection: <Term id="head-of-line-blocking">head-of-line blocking</Term>. On a clean
backbone loss is rare, so this is usually fine. On a lossy public path, operators spread load over several
connections rather than one.

### Where pools go wrong

**Idle timeouts that do not match.** The origin's server closes connections idle for, say, 60 seconds.
If the PoP keeps idle connections for 90 seconds, it will sometimes send a request on a connection the origin
has just closed. The request fails, and the user sees a 502 error. The rule: the client side of a pool (here,
the PoP) must time out idle connections **before** the server side does. HTTP/2's
<Term id="goaway">GOAWAY</Term> frame lets a server say "no new requests here" cleanly, which helps during
deploys.

**Too many connections at the origin.** Every PoP, and every proxy process in every PoP, keeps its own pool.
With 200 PoPs, 50 processes each and 10 connections per process, the origin holds 100,000 connections.
That costs memory at the origin and its load balancers. Fixes: multiplex, share pools across processes,
or route all misses through a few regional tiers (an origin shield, [chapter 13](/edge/cdns)) so only they
talk to the origin.

**Cold pools after a restart.** A deploy or failover empties the pools. Every request then pays for
handshakes at once, and the origin's TLS handshake load jumps. This is a quiet form of
<Term id="thundering-herd">thundering herd</Term>. Warm pools gradually, and keep spare TLS capacity at the
origin.

::: details Going deeper: tuning a pool
- **Slow start after idle.** By default, Linux shrinks a connection's congestion window after it has been
  idle for about one retransmission timeout (`net.ipv4.tcp_slow_start_after_idle = 1`). A pooled
  connection that sat idle for a second then ramps up again. Proxies that talk to origins often set it to 0.
- **Initial window.** Since about 2011 (Linux 2.6.39) the default initial congestion window is 10 segments. Some operators raise it
  on the origin leg, where they control both ends.
- **Keep-alive probes.** NAT devices and firewalls on the path drop idle connections silently. TCP or
  HTTP/2 PING keep-alives detect dead connections before a user request lands on one.
- **Sockets and ports.** Large pools run into per-host limits such as ephemeral ports and file descriptors.
  The [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers the kernel side.
:::

## Private backbone or public internet

**In short:** the PoP can reach the origin across the public internet, or carry the traffic on the
operator's own long-distance network. A private network gives control over capacity and latency, at a
large cost and with a large blast radius.

There are two ways to get bytes from Lisbon to Virginia.

**Over the public internet.** The PoP sends packets to its internet providers. They hand them across
other networks until they reach the origin's network. Each network routes to suit itself. A common habit
is <Term id="hot-potato-routing">hot-potato routing</Term>: hand traffic to the next network at the nearest
exit, to save your own capacity. Nobody optimises the whole path for you. It works, it costs little, and
its latency and loss vary with congestion you cannot see.

**Over a private backbone.** Large operators lease or own long-distance fibre between their PoPs and
datacenters. This is a <Term id="backbone">backbone</Term>, also called a <Term id="private-wan">private
WAN</Term> (wide area network). The PoP puts the request on the backbone in Lisbon, and it stays inside one
operator's network until Virginia. Carrying traffic on your own network as far as possible, instead of
handing it off early, is <Term id="cold-potato-routing">cold-potato routing</Term>.

<OriginBackboneDiagram />

| | Public internet | Private backbone |
|---|---|---|
| **Latency** | Varies with other networks' routing and congestion | Predictable; the operator picks the paths |
| **Capacity** | Shared, not guaranteed | Planned and owned |
| **Priorities** | Every packet is equal | User traffic can come before bulk copies |
| **Cost** | Low | Fibre, routers, operations staff |
| **Failure** | Many independent paths | One operator's mistake can affect all paths |

A middle path exists. Some CDNs measure several routes across the public internet between their own PoPs.
They then relay traffic through other PoPs when that is faster than the direct route. This is an
**overlay**: the operator's routing on top of other people's networks.

### What this means for cloud users

Cloud providers sell this choice. Google Cloud, for example, offers a "Premium" network tier that carries
traffic on Google's backbone close to the user, and a cheaper "Standard" tier that hands it to the public
internet near the region. Other providers offer accelerators that bring users onto the backbone at a nearby
PoP. Interviewers like this framing: you are buying cold-potato routing.

::: details Going deeper: Meta's Express Backbone (2017)
Facebook's engineering blog described in 2017 why it split its backbone in two. For about ten years, one
"classic backbone" had carried both user-facing traffic and server-to-server copies between datacenters.
Bursts of machine-to-machine traffic could hurt user traffic. Facebook built a separate network for
datacenter-to-datacenter traffic, the Express Backbone, in under a year. The post names centralized traffic
engineering and MPLS segment routing as design choices. A 2023 SIGCOMM paper on the same network says it
carries all datacenter-to-datacenter traffic and is built as several parallel planes.

The pattern: separate traffic users wait for from bulk traffic, either with priorities or with separate
networks.
:::

## Traffic engineering on the backbone

**In short:** shortest-path routing overloads some long links and leaves others idle. Traffic engineering
places flows on links deliberately, often from a central controller, so expensive links run full without
hurting user traffic.

Picture three routes from Europe to the US: two cheap and short, one longer. Plain routing protocols send
everything on the shortest route. That route congests while the others sit idle. Long-distance links are
among the most expensive things an operator buys, so idle capacity is wasted money. Placing traffic on
paths on purpose, by demand and capacity, is <Term id="traffic-engineering">traffic engineering</Term>.

### The central-controller pattern

The approach big operators have published works like this:

1. **Classify traffic by priority.** User requests (feed, search, inference) come first. Bulk copies (backups,
   index copies, log shipping) come last and can wait.
2. **Collect demand.** Each site reports how much it wants to send where, per class.
3. **Compute an allocation centrally.** A controller sees the whole network and decides how much traffic
   of each class goes on which paths. High-priority traffic gets its share first. Bulk traffic fills
   what is left.
4. **Program the routers.** The controller installs paths (tunnels) and the share of traffic for each.
5. **Repeat** every few seconds to minutes as demand and failures change.

Building networks this way, with routers following a central program, is
<Term id="software-defined-networking">software-defined networking (SDN)</Term>. The payoff is
utilization. Bulk traffic soaks up every spare gap, and it backs off first when a link fails.

The older alternative is distributed: each router reserves bandwidth for its own tunnels (MPLS with RSVP-TE).
No router sees the whole picture, so the result is less efficient and harder to predict after failures.

### What can go wrong

Central control moves risk from many small routers to one program and its inputs:

- **A bad input or bad config reaches every site at once.** Roll out changes to a fraction of the network,
  watch, then continue.
- **The controller can fail.** Routers must keep forwarding on their last good paths, with local fast
  reroute around a cut fibre, until the controller returns.
- **Updates can congest briefly.** Routers apply new paths at slightly different times, so traffic can pile
  onto one link mid-change. Published designs leave spare room to avoid this.
- **Losing capacity hurts everyone at once.** If a change silently removes half a region's capacity, user
  traffic and bulk traffic fight for what remains.

::: details Going deeper: published systems
- **Google B4.** The SIGCOMM 2013 paper describes B4, Google's private WAN between datacenters, with
  centralized traffic engineering on OpenFlow-controlled switches. It reports running many links at near
  100% utilization, with all links averaging about 70% over long periods. B4 started out carrying copy
  traffic that could tolerate loss.
- **B4 After.** The SIGCOMM 2018 follow-up describes five years of growth: about 100 times more traffic,
  and a move from a 99% availability target for copy traffic to 99.99% for some services. It needed a
  hierarchical topology and new traffic engineering to get there. The paper also says B4 had become larger,
  and was growing faster, than Google's connection to the public internet.
- **Microsoft SWAN.** The SIGCOMM 2013 paper describes a central controller for traffic between
  datacenters. It decides how much each service may send, and leaves a small amount of spare capacity on
  links so path updates never congest. In a testbed and simulations of two production networks, it carried
  about 60% more traffic than the practice of the time.
- **Google Espresso.** The SIGCOMM 2017 paper is about the peering edge, where Google meets other networks,
  not the inter-datacenter WAN. It moves routing decisions from big routers to software on servers, and
  picks exits by measured performance. In 2017 it served over 22% of Google's traffic to the internet.
  [Chapter 9](/internet/internet-routing) covers this measurement-driven exit choice.
:::

## Choosing an origin region

**In short:** the edge decides, for each request, which origin region to send it to. Nearest healthy region
is the default, but data location, capacity and cost often override it.

[Chapter 10](/edge/steering) covers how users reach a PoP. This is the next decision: which
<Term id="region">region</Term> the PoP forwards to. Common setups, from simple to complex:

- **One origin.** Every PoP sends misses to one region. Simple, but users far away pay the long leg, and
  one region failure takes the site down.
- **Nearest healthy region.** Each PoP has a ranked list of regions, by measured latency. It sends to the
  first one whose <Term id="health-check">health checks</Term> pass. This needs
  <Term id="active-active">active-active</Term> regions that can all serve any request.
- **The region that owns the data.** A user's account, chat or shopping cart may live in one region.
  Sending the request elsewhere means a slow cross-region hop behind the origin, or stale data. The PoP
  routes by a key in the request, such as a user ID or a cookie that names the home region.
- **Capacity-aware.** The PoP spreads load by region capacity, not only distance. This matters when one
  region holds scarce hardware, such as GPUs for model serving.

### Failing over between regions

When a region fails, the PoP moves its traffic to the next region on its list. That is
<Term id="failover">failover</Term>. Three details decide whether it goes well:

- **Detect fast, but not too fast.** Require several failed checks from several PoPs, so one bad path does
  not empty a healthy region.
- **Retry only what is safe.** The PoP may resend a failed GET to another region. It must not blindly resend
  a payment. Only <Term id="idempotency">idempotent</Term> requests, or requests with an idempotency key,
  are safe to retry ([chapter 17](/operations/timeouts-retries-overload)).
- **Check the backup can take it.** The next region inherits all the traffic, and its connection pools are
  cold. Plan capacity for the loss of your largest region.

A partial failure is harder than a dead region. A region that answers health checks but times out on real
requests is a <Term id="gray-failure">gray failure</Term>. Base decisions on real request errors and latency
too, not only on a health-check URL.

## Securing the edge-to-origin hop

**In short:** encrypt the second leg, and make the origin accept traffic only from your edge. Otherwise
attackers who find the origin's address skip the edge's DDoS and request filtering entirely.

The edge does more than speed things up. It absorbs <Term id="ddos">DDoS</Term> attacks, filters bad
requests and enforces rate limits. All of that is useless if attackers can reach the origin directly. Origin
addresses leak more often than teams expect: old DNS records, mail servers on the same host, certificates
in public logs, or plain scanning of cloud address ranges.

So the second leg needs two things: **encryption**, and **proof** that a request came from your edge.

### Encryption

The PoP opens a fresh TLS connection to the origin and checks the origin's certificate, like any client.
A common mistake is to encrypt but skip the check ("trust any certificate"). That leaves the leg open to
anyone who can intercept it. A private backbone does not remove the need: large operators, Google among them by its own documentation, encrypt
traffic between their own sites.

### Proving the request came from the edge

The options, from weakest to strongest:

- **A secret header.** The edge adds a header with a shared secret, and the origin rejects requests without
  it. Easy, but the secret leaks through logs and is hard to rotate.
- **IP allowlists.** The origin's firewall accepts only the edge's published address ranges. On a shared
  CDN this is weak: every other customer of that CDN sends from the same ranges.
- **Mutual TLS.** In <Term id="mtls">mutual TLS (mTLS)</Term>, the PoP also presents a client certificate,
  and the origin checks it. The connection itself proves who connected. On a shared CDN, insist on a
  certificate specific to you, not one the CDN uses for all customers.
- **No inbound path at all.** The origin opens outbound connections to the edge (a tunnel), or connects
  over a private interconnect. It has no public address to attack. An outbound tunnel is an
  <Term id="origin-tunnel">origin tunnel</Term>.

Combine them: mTLS or a tunnel for proof, plus a firewall that drops everything else.

### Passing the user's identity along

The origin sees the PoP's address, not the user's. The PoP passes the user's IP address in a header such as
`X-Forwarded-For`. The origin must trust that header only on connections it knows came from the edge. If
the origin is reachable directly, anyone can forge it, and per-user rate limits or geolocation break.

::: details Going deeper: certificates on the origin leg
- The origin's certificate can come from a private certificate authority that only your edge trusts, since
  browsers never see it. Some CDNs issue such origin certificates.
- With mTLS, rotate client certificates before they expire, and alert well ahead. An expired client
  certificate fails every request from every PoP at once.
- Managed cloud storage behind a CDN often uses signed requests from the CDN instead of mTLS. Check what
  your provider supports.
:::

## Try it: see the two legs

`curl -w` breaks a request into phases. Compare a request through the edge with one straight to the origin.
These commands work on stock Linux and macOS. Output below is illustrative.

```bash
# Through the edge (CDN hostname), then directly to an origin you are allowed to test
curl -so /dev/null -w 'connect %{time_connect}  tls %{time_appconnect}  first byte %{time_starttransfer}\n' \
  https://www.example.com/api/feed
curl -so /dev/null -w 'connect %{time_connect}  tls %{time_appconnect}  first byte %{time_starttransfer}\n' \
  --resolve www.example.com:443:203.0.113.20 https://www.example.com/api/feed
```

```text
connect 0.021  tls 0.043  first byte 0.215    # via a nearby PoP, warm pool to origin
connect 0.142  tls 0.285  first byte 0.431    # direct to a distant origin
```

Look at the gap between `tls` and `first byte`. Through the edge, it holds the whole second leg plus server
time. If that gap is far bigger than one PoP-to-origin round trip plus server time, suspect a cold pool,
a far region, or a slow origin. Many CDNs add a response header naming the PoP and cache status; check yours.

On a proxy host you run, look at the pooled connections to the origin (`-i` shows TCP details):

```bash
ss -tni dst 203.0.113.20     # look for rtt and cwnd on each connection
sysctl net.ipv4.tcp_slow_start_after_idle    # Linux only; 1 means windows shrink after idle
```

To test that an origin enforces mTLS, connect without and with a client certificate:

```bash
openssl s_client -connect origin.example.com:443 -servername origin.example.com </dev/null
openssl s_client -connect origin.example.com:443 -servername origin.example.com \
  -cert edge-client.pem -key edge-client.key </dev/null
```

The first should fail the handshake or get a refusal. The second should succeed.

## Why this matters in real systems

- **Dynamic content through a CDN.** Even pages that cannot be cached get faster behind a CDN. The gain
  comes from short handshakes near the user and warm connections over a good path, not from caching.
- **Cloud network tiers.** Choosing between a provider's premium and standard network tier is choosing
  between its backbone and the public internet for the long leg. For users far from your region, the
  difference shows in tail latency.
- **Separating user traffic from bulk copies.** Facebook's 2017 Express Backbone post describes exactly
  this split. The same idea appears as priority classes in B4 and SWAN: user requests first, replication
  and backups in the gaps.
- **Model serving.** GPUs sit in a few regions. A PoP may forward an inference request to a far region with
  spare GPUs rather than the nearest, full one. Tokens stream back over a long-lived connection, so warm,
  multiplexed origin connections matter even more.
- **Mobile APIs.** Phones on lossy networks benefit most from split TCP: loss is repaired over the short leg,
  while the long leg stays clean.

## Where it breaks

- **Facebook, 2021.** A command during routine maintenance took down the backbone connections between
  Facebook's datacenters. Its DNS servers then withdrew their routes, and the sites vanished from the
  internet for hours. Chapters [1](/foundations/the-map), [4](/protocols/dns) and
  [9](/internet/internet-routing) tell the full story. [Postmortem](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/).
  Lesson: the backbone is a single shared dependency; audit tools and recovery access must not rely on it.
- **Google, June 2019.** A configuration change meant for a few servers in one region was applied to more
  servers across several neighbouring regions. Those regions stopped using more than half of their network
  capacity. Traffic did not fit in what remained, and YouTube, Gmail and Google Cloud slowed or failed in
  parts of the US. [Google's update](https://cloud.google.com/blog/topics/inside-google-cloud/an-update-on-sundays-service-disruption).
  Lesson: scope network config changes tightly, and expect congestion to slow your own fix.
- **Cloudflare, July 2020.** While fixing congestion on one backbone link, engineers changed a router's
  configuration in Atlanta. The router attracted traffic meant for other sites and was overwhelmed. Sites
  connected to the backbone failed for about 27 minutes, and traffic across the network dropped by about
  half. [Postmortem](https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/). Lesson: one site
  must not be able to pull in other sites' traffic; guard routing changes on the backbone.

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Why is a dynamic, uncacheable API faster through a CDN than directly to the origin?
The phone's TCP and TLS handshakes happen with a nearby PoP, over short round trips. The PoP forwards the
request over a connection to the origin that is already open and already up to speed. So only the request
and response cross the long distance, instead of three round trips. Loss on the mobile link is repaired
locally, and the long leg may run on a private backbone.

**Senior add-on:** the gain depends on warm pools. A PoP with no open connection must do its own handshakes
to the origin, and the user saves little on the first byte. Low traffic per PoP, short idle timeouts or a
restart all mean cold pools. Tiered caching that funnels misses through a few PoPs keeps pools warm.
:::

::: details 2. Users get occasional 502 errors from the edge, but the origin's logs show no errors. How do you find out why?
Start with the edge's logs. Find out which upstream error it records: connection reset, refused, or timeout.
Then check whether the failures land on reused connections. A classic cause is idle timeouts: the origin
closes idle connections sooner than the edge's pool does. The edge then sends a request on a connection the
origin has just closed, and the origin never logs a request.

Compare the two idle timeouts. Correlate errors with connection age and idle time. Capture packets at the
origin and look for a request arriving just after the origin sent its FIN.

**Senior add-on:** fix it by making the pool's idle timeout shorter than every hop behind it, including load
balancers and NAT devices in between. Retry idempotent requests once on a fresh connection. Also check
deploys: if errors cluster at origin restarts, the origin is not draining connections or sending GOAWAY.
:::

::: details 3. Design the network path from a global edge to two origin regions.
Users reach the nearest PoP. Each PoP keeps warm, multiplexed connections to both regions over a private
backbone, or over the public internet with a measured overlay if there is no backbone. Each PoP ranks the
regions by measured latency and sends to the best healthy one. Requests for data homed in one region go to
that region.

The origin leg uses TLS with certificate checks and mTLS. The origin accepts connections only from the edge,
behind a firewall or through an outbound tunnel. Failover needs health checks from several PoPs, retries
only for idempotent requests, and enough capacity in each region to take all traffic.

**Senior add-on:** add a tier of a few shield PoPs to cut origin connections and keep pools warm. On a
backbone, give user traffic priority over bulk copies. Roll out routing and certificate changes to a few
PoPs first, and alert on client certificate expiry. Test region evacuation regularly.
:::

::: details 4. What is split TCP? What does it give up?
The client's TCP connection ends at a proxy near it, and the proxy opens a separate connection onward. Each
leg has a shorter round trip, so handshakes, slow start and loss recovery are faster.

It gives up end-to-end semantics. An acknowledgement from the proxy does not mean the server has the data.
The proxy holds state and buffers for every connection. With TLS, the proxy must terminate encryption, so it
sees plaintext and needs the site's keys.

**Senior add-on:** each leg can then use its own protocol and tuning: QUIC to the phone, HTTP/2 over TCP to
the origin. Features such as 0-RTT apply per leg, and a slow client can pin buffers at the edge.
:::

::: details 5. When is a private backbone worth it compared with the public internet?
A backbone gives predictable latency, capacity you plan, and priorities between traffic classes. It is
worth it when you move a lot of traffic between your own sites, or when tail latency on the long leg costs
you money. It costs fibre, hardware and staff, so smaller companies rent it, through a cloud provider's
premium tier or a CDN.

**Senior add-on:** the backbone also concentrates risk. One bad config can affect every path, as Facebook's
2021 and Cloudflare's 2020 outages showed. Keep out-of-band access, stage changes, and keep the option to
fall back to the public internet for critical traffic.
:::

::: details 6. Why do backbone operators use central traffic engineering?
Plain shortest-path routing overloads the best links and leaves others idle, and long links are expensive.
A central controller sees demand and capacity everywhere, so it can place traffic on many paths, give user
traffic its share first, and fill the rest with bulk transfers.

**Senior add-on:** Google's B4 (2013) and Microsoft's SWAN (2013) papers describe this pattern and report
much higher utilization than before. The risks move to the controller and its inputs. Routers must keep
forwarding when the controller fails. Updates must avoid brief congestion. Changes must roll out in stages.
:::

::: details 7. An attacker is flooding your origin directly, bypassing your CDN. What do you do now, and what should you have done?
Now: block everything at the origin's firewall except the edge's address ranges, and ask your cloud or
network provider for upstream filtering. If possible, move the origin to a new address that is not published
anywhere.

For the future: never expose the origin. Accept only mTLS connections with a certificate specific to you,
or use an outbound tunnel so the origin has no public listener. Check for leaks: old DNS records, mail
servers, certificate logs.

**Senior add-on:** IP allowlists on a shared CDN admit every other customer of that CDN. Also check that
the origin trusts `X-Forwarded-For` only from the edge, or attackers can fake user addresses.
:::

::: details 8. One region fails. What happens on the edge-to-origin leg, and what can go wrong?
PoPs see failing health checks and real request errors, and move traffic to the next region on their
lists. In-flight requests fail. The edge may retry idempotent ones in the new region.

What can go wrong: the backup region lacks capacity. Its pools are cold, so TLS handshakes spike. Data
homed in the failed region is not available. Non-idempotent retries cause duplicates. A gray failure may
never trip the health checks.

**Senior add-on:** plan capacity for losing the largest region. Pre-warm connections to backup regions.
Move traffic in steps, and fail back slowly. Watch the backbone too: moving a region's traffic shifts load
onto different long links.
:::

## Common misconceptions

- **"Split TCP always makes the first request faster."** Only if the PoP already has a warm connection to the
  origin. A cold PoP adds its own handshakes.
- **"Uncached traffic gains nothing from a CDN."** Short handshakes, warm connections and a better path
  often cut hundreds of milliseconds.
- **"Traffic on our own backbone does not need encryption."** Fibre can be tapped, and links may cross
  third-party equipment. Google, for one, documents encrypting traffic between its sites.
- **"An IP allowlist of CDN ranges protects the origin."** Every customer of that CDN shares those ranges.
- **"One multiplexed connection is always best."** Over a lossy path, one lost packet stalls every stream on
  it. Spread load over several connections.

## Key takeaways

- Uncached requests take a **second leg** from the PoP to the origin, and it is fully under the operator's
  control.
- **Split TCP** makes handshakes and loss recovery short, but the first-byte gain comes from **warm pooled
  connections**. Keep the pool's idle timeout below the origin's.
- A **private backbone** gives predictable latency and priorities. **Central traffic engineering** fills it
  efficiently, and concentrates risk in config and controllers.
- The edge picks an **origin region** by health, latency, where the data lives and capacity. Retry only
  idempotent requests on failover.
- **Lock the origin down**: verified TLS, mTLS or a tunnel, and no direct public path.

## Review

<Flashcards id="edge-to-origin" :cards="cards" />

<MarkDone id="edge-to-origin" />

## Sources

- [B4: Experience with a Globally-Deployed Software Defined WAN](https://research.google/pubs/b4-experience-with-a-globally-deployed-software-defined-wan/) (paper, SIGCOMM 2013)
- [B4 and After: Managing Hierarchy, Partitioning, and Asymmetry for Availability and Scale in Google's Software-Defined WAN](https://dl.acm.org/doi/10.1145/3230543.3230545) (paper, SIGCOMM 2018)
- [Achieving High Utilization with Software-Driven WAN (SWAN)](https://www.microsoft.com/en-us/research/publication/achieving-high-utilization-with-software-driven-wan/) (paper, SIGCOMM 2013)
- [Taking the Edge off with Espresso: Scale, Reliability and Programmability for Global Internet Peering](https://research.google/pubs/taking-the-edge-off-with-espresso-scale-reliability-and-programmability-for-global-internet-peering/) (paper, SIGCOMM 2017)
- [Building Express Backbone: Facebook's new long-haul network](https://engineering.fb.com/2017/05/01/data-center-engineering/building-express-backbone-facebook-s-new-long-haul-network/) (engineering blog, 2017)
- [EBB: Reliable and Evolvable Express Backbone Network in Meta](https://dl.acm.org/doi/10.1145/3603269.3604860) (paper, SIGCOMM 2023)
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113) (RFC, 2022)
- [RFC 8446: TLS 1.3](https://www.rfc-editor.org/rfc/rfc8446) (RFC, 2018)
- [More details about the October 4 outage](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) (Facebook engineering blog, 2021)
- [An update on Sunday's service disruption](https://cloud.google.com/blog/topics/inside-google-cloud/an-update-on-sundays-service-disruption) (Google Cloud blog, 2019)
- [Cloudflare outage on July 17, 2020](https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/) (incident report, 2020)
