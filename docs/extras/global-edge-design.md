---
title: "E1. Designing a Global Edge"
---

<script setup>
import { cards } from './global-edge-design-review'
</script>

# E1. Designing a Global Edge

"Design the global edge for a large website or API" is a common senior system-design question for
infrastructure roles. This chapter walks through how a strong candidate answers it, one decision at a time,
and links to the chapter that explains each piece in depth.

::: info Before you start
- This is a walkthrough, not a new topic. Each decision is stated with its options and trade-offs in a sentence
  or two, then links to the chapter that owns it.
- The **edge** is everything between the user's network and your origin: the sites near users, how users
  reach them, and what runs there. [Chapter 1](/foundations/the-map) gives the whole path.
- Part IV ([steering](/edge/steering), [L4](/edge/l4-load-balancing), [L7](/edge/l7-proxies),
  [CDNs](/edge/cdns)) and [chapter 14](/backend/edge-to-origin) carry most of the weight.

Every number below is an assumption chosen for the exercise. In an interview, say them out loud as
assumptions and round freely.
:::

## How a strong answer is shaped

**In short:** agree on requirements, size the problem in orders of magnitude, sketch the path end to end, then
go deep where the interviewer pulls. Spend real time on failures and safe change; that is where seniority shows.

A weak answer lists components: "a CDN, a load balancer, some servers". A strong answer follows one request
from the user to the origin and justifies each hop. It names the trade-off at every choice, and it says what
breaks and how the design survives.

A workable order, for a 45-minute slot:

1. **Requirements and assumptions** (5 minutes): what is served, to whom, with what goals.
2. **Scale estimates** (5 minutes): requests, bandwidth, connections, attack headroom.
3. **Sketch the path** (10 minutes): sites, steering, the layers inside a site, the way back to the origin.
4. **Deep dives** (15 minutes): wherever the interviewer points, usually caching, steering or TLS.
5. **Failures, change and operations** (10 minutes): losing capacity, rolling out config, observing, attacks.

Keep checking in: "I'll assume X; shout if you want something different." Interviewers reward candidates who
make the problem concrete and then adapt.

## Requirements and assumptions

**In short:** pin down what is served (cacheable pages, images, video, an API, long-lived streams), where the
users are, and the goals for latency, availability and security. Each answer changes the design.

Ask a handful of questions, then state assumptions if the interviewer leaves them open:

- **What do we serve?** A media-heavy site is mostly cacheable bytes. An API is mostly uncacheable, small
  requests. Long-lived connections (WebSockets, server-sent events, streamed model output) behave differently
  again during deploys and failover.
- **Who are the users and where?** Global consumer traffic, mostly phones, is the hard case. It means slow,
  lossy last miles and many networks, some IPv6-only ([chapter 8](/internet/last-mile)).
- **Latency goal.** For example: most users within about 20–30 ms round trip of a site, and a target on the
  95th-percentile time to first byte for cached and uncached requests.
- **Availability goal.** For example: 99.99% at the edge, so losing any one site, or one origin region, must
  not cause a user-visible outage.
- **Security.** Absorb large attacks, protect the origin, keep private keys safe.

A good default to state: "A global consumer site plus a mobile API, hundreds of millions of daily users,
mostly phones, worldwide. Static assets and media are cacheable; the API and personalised pages are not."
Note what is out of scope: the storage and services behind the first application server.

## Back-of-the-envelope scale

**In short:** turn users into requests per second, bandwidth and new connections per second, then add
headroom for peaks, for losing a site, and for attacks. Orders of magnitude are enough.

Work through it on the whiteboard. These are illustrative assumptions, not facts about any company:

| Quantity | Assumption | Result |
|---|---|---|
| Daily users | 500 million | |
| Requests per user per day | about 50 (pages, assets, API calls) | about 25 billion a day, about 300,000 per second on average |
| Peak to average | 2–3 times | about 1 million requests per second at peak |
| Average response | about 100 KB across media and API | about 100 GB/s, roughly **1 Tbps** of peak delivery |
| New connections | 10–20% of requests start a new connection | **100,000–200,000 TLS handshakes per second** |

Then say what the numbers imply:

- **Capacity is not the hard part at the average.** The design is driven by peaks, by losing your biggest
  site, and by attacks. Public reports describe attacks of several terabits per second, growing each year,
  which is far above this site's own traffic.
- **Handshakes cost more CPU than requests.** Connection reuse and
  <Term id="session-resumption">session resumption</Term> matter for cost as well as latency.
- **Origin load depends on the cache.** At a 95% <Term id="cache-hit-ratio">cache hit ratio</Term> for
  cacheable traffic, the origin sees one request in twenty of those. Most origin load will be the uncacheable
  API.
- **Long-lived connections set memory.** If the app holds one open connection per active phone, tens of
  millions of concurrent connections is the number to size proxy memory for.

## Sketching the path

**In short:** users are steered to a nearby site, called a point of presence (PoP). Inside it, routers, an L4
balancer tier and an L7 proxy and cache tier handle each request. Misses travel over a backbone to an origin
region. A control plane pushes configuration, certificates and the steering map to everything.

<EdgeDesignOverviewDiagram />

Draw this early and keep pointing at it. Each later section is one box or one arrow of the sketch. The
control plane at the bottom matters as much as the data path: most large edge outages start there, not in the
packet path.

## Where to put PoPs

**In short:** put a few dozen large <Term id="pop">PoPs</Term> in the metros where networks meet, add smaller
ones for the long tail, and consider caches inside large ISPs. Size each region so it can absorb the loss of
its largest site.

A PoP helps by being close in **round-trip time**, not on a map. The cheapest place to be close to many
networks is a metro with a large <Term id="ixp">internet exchange point (IXP)</Term>, where you can
<Term id="peering">peer</Term> with hundreds of networks. See
[chapter 9](/internet/internet-routing#who-connects-to-whom-transit-peering-and-exchanges).

The usual options, often combined:

- **Large metro PoPs** (tens): most users, most peering, big caches. Good hit ratios because traffic is
  concentrated.
- **Small PoPs** (hundreds): lower latency for the long tail. Smaller caches and less headroom, so more
  misses and less ability to absorb attacks.
- **Caches embedded in ISP networks:** servers placed inside a large access network. The best latency and no
  transit cost for heavy, cacheable traffic such as video. You give up control of power, space and upgrades.

State a capacity rule. For example: "Each region runs at most about 50–60% of its capacity at peak, so it can
absorb the loss of its largest PoP plus a spike." That headroom is the cost of availability; say so. Use
measured latency from real users to decide where the next PoP goes, not population maps.

## Steering users to a PoP

**In short:** choose between DNS-based steering, <Term id="anycast">anycast</Term>, and steering in your own
app. Most large edges combine them: anycast for robustness and attack spreading, DNS for fine control and
capacity moves, the app where you own the client.

The trade-offs, in one line each ([chapter 10](/edge/steering#three-levers-dns-anycast-and-the-client)):

| Lever | Strength | Weakness |
|---|---|---|
| **DNS** (a <Term id="geodns">location-aware answer</Term>) | Per-site, per-resolver control; can weigh capacity | Sees the resolver, not the user; changes wait for TTLs and caches |
| **Anycast** (many sites announce one address) | Fast failover by routing; spreads attacks across all sites | Routing, not you, picks the site; hard to shed part of a site's load |
| **Client** (the app picks from a list) | Measures real latency, retries elsewhere | Only works where you ship the client |

A strong default to state: "Anycast for the DNS servers and for the edge addresses, so attacks spread and a
dead site drops out of routing. Several anycast address ranges, each announced from a group of sites, so DNS
can move users between groups for capacity. The map comes from
<Term id="real-user-monitoring">real-user measurements</Term>, not geography." Then mention the
[measurement map](/edge/steering#measuring-users-building-the-map) and
<Term id="ecs">EDNS Client Subnet</Term> for resolvers far from their users.

For an API with its own mobile app, add client-side steering: the app gets a short list of endpoints, measures
them, and fails over by itself.

## Inside a PoP: L4 and L7 layers

**In short:** routers spread packets across an L4 balancer tier, which picks an L7 server with consistent
hashing and lets it reply directly. The L7 tier terminates TLS and HTTP, applies security rules, serves from
cache and forwards misses.

**L4 tier** ([chapter 11](/edge/l4-load-balancing)). Routers already spread flows with
<Term id="ecmp">ECMP</Term>, but adding or removing a path reshuffles flows and breaks connections. So a
software <Term id="l4-load-balancer">L4 load balancer</Term> tier sits behind them. It uses a
<Term id="maglev-hashing">consistent-hash table</Term> so any balancer sends a given flow to the same server,
and a change moves few flows. With <Term id="direct-server-return">direct server return</Term>, replies skip
the balancer, which matters because responses are much bigger than requests. For HTTP/3, the balancer routes
on the QUIC connection ID so phones that change networks keep their connection
([chapter 11](/edge/l4-load-balancing#quic-and-connection-id-aware-balancing)).

**L7 tier** ([chapter 12](/edge/l7-proxies)). A <Term id="reverse-proxy">reverse proxy</Term> terminates
TLS, speaks HTTP/1.1, HTTP/2 and HTTP/3 to clients, and applies the
<Term id="waf">web application firewall</Term>, <Term id="rate-limiting">rate limits</Term> and bot rules. It
routes each request by host and path, serves from cache, or forwards to the origin.

One design choice to name: **separate tiers or one server that does everything.** Separate L4, L7 and cache
fleets can be sized and upgraded independently. Running every function on every server makes any server a
spare for any job and keeps capacity planning simple, at the cost of noisy-neighbour effects between functions.
Both patterns exist at scale; pick one and give the reason.

::: details Going deeper: dated examples of the L4 pattern
Maglev, described in Google's 2016 NSDI paper, is a software L4 balancer that uses consistent hashing and
connection tracking behind router ECMP. Katran, which Meta open-sourced in 2018, does the same job with
eBPF/XDP in the Linux kernel. GitHub's GLB, described in 2016, chose a stateless design so any balancer can
handle any flow. [Chapter 11](/edge/l4-load-balancing#why-this-matters-in-real-systems) has more.
:::

## TLS and certificates

**In short:** terminate TLS at the PoP to save round trips. Automate certificate issuance and rotation, keep
private keys out of small or less-trusted sites where you can, and share resumption keys so returning users
skip the full handshake.

Terminating TLS near the user turns each handshake round trip into a short local one instead of a long one to
the origin ([chapter 5](/protocols/tls)). Points a senior candidate makes:

- **Automate certificates end to end** with <Term id="acme">ACME</Term>. Lifetimes are shrinking: under the CA/Browser
  Forum schedule agreed in 2025, the maximum is 200 days from March 2026, falling to 47 days by 2029.
  Manual renewal at that rate is an outage waiting to happen. Monitor expiry from outside, too.
- **Two certificate authorities**, so a problem at one CA does not block issuance or revocation.
- **Key placement.** Every server that terminates TLS needs the private key or access to it. Options: keys on
  every PoP server (simple, larger exposure), or keys kept in a few secure sites with PoPs asking a key
  server to sign each handshake (smaller exposure, an extra dependency and round trip on new handshakes).
- **Resumption across servers.** Session tickets only help if every server in a PoP, ideally every PoP, can
  decrypt them. Distribute ticket keys centrally and rotate them often, since a leaked key weakens
  <Term id="forward-secrecy">forward secrecy</Term>.
- **0-RTT only for safe requests.** Early data can be replayed, so accept it only for idempotent requests
  ([chapter 5](/protocols/tls)).

Modern clients prefer ECDSA certificates, which are cheaper to sign with than RSA; serving both keeps old
clients working.

## Caching

**In short:** cache everything that is the same for many users, with a clean cache key. Add a regional tier
and an origin shield so misses are collapsed, serve stale content when the origin struggles, and purge by tag
in seconds.

The levers, each owned by [chapter 13](/edge/cdns):

- **Cache key and hit ratio.** Normalise the <Term id="cache-key">cache key</Term>: drop tracking query
  parameters, avoid varying on headers with many values. A messy key splits one object into thousands of
  copies. Never cache personalised responses under a shared key.
- **Tiers.** On a miss, a PoP asks a regional <Term id="tiered-cache">parent cache</Term>, and one
  <Term id="origin-shield">origin shield</Term> per origin asks the origin. Small PoPs then get the hit ratio
  of a large one, and the origin sees one request per object instead of one per PoP.
- **Collapsing and stale content.** <Term id="request-collapsing">Request collapsing</Term> sends one
  request to the origin when many users miss on the same object.
  <Term id="stale-while-revalidate">Stale-while-revalidate</Term> and stale-if-error keep serving when the
  origin is slow or down.
- **Invalidation.** Prefer versioned URLs for assets, so they never need a purge. For the rest, purge by
  <Term id="surrogate-key">tag</Term> and design the purge system to reach every PoP in seconds.

For the uncacheable API, say what the edge still gives: short handshakes, a warm connection to the origin,
rate limiting and attack filtering. A cache hit is not the only win.

## The edge-to-origin path

**In short:** end the user's connection at the PoP and reuse warm, pooled connections to the origin. Carry the
traffic on a private backbone where you have one, pick the origin region per request, and make the origin
accept only your edge.

The decisions ([chapter 14](/backend/edge-to-origin)):

- **<Term id="split-tcp">Split connections</Term>.** The phone's slow-start and loss recovery happen over a
  short path; the long haul uses a connection that is already open and warmed up.
- **<Term id="connection-pool">Connection pools</Term>** of long-lived HTTP/2 or HTTP/3 connections to each
  origin, so most user requests pay no handshake on the second leg.
- **Private backbone or public internet.** A private backbone gives predictable latency and control during
  congestion, at high fixed cost. The public internet is cheaper and good enough for smaller players, often
  with several transit providers
  ([chapter 14](/backend/edge-to-origin#private-backbone-or-public-internet)).
- **Origin choice.** At least two origin regions. The edge picks the nearest healthy one with spare capacity,
  and fails over per request if one stops answering
  ([chapter 14](/backend/edge-to-origin#choosing-an-origin-region)).
- **Securing the hop.** Encrypt it, authenticate the edge to the origin with
  <Term id="mtls">mutual TLS</Term> or an <Term id="origin-tunnel">origin tunnel</Term>, and refuse traffic
  that does not come from the edge. Otherwise attackers go around your defences to the origin.

## Failure handling and evacuation

**In short:** list failure domains from one server to the whole planet, and give each a response. Moving
users away from a failure only works if the place they move to has room, so steering must know capacity.

Walk up the failure domains ([chapter 10](/edge/steering#when-a-region-dies)):

| Failure | Who notices | Response |
|---|---|---|
| One server | L4 health checks | Consistent hashing moves only its flows; drain it for deploys |
| Part of a PoP (a rack, a router, a link) | Routers, L4 control plane | Remaining servers take the load if the PoP has headroom; otherwise shed some users to neighbours |
| A whole PoP | Anycast routing, DNS health checks | Withdraw its routes or stop answering with it; neighbours absorb its users |
| An origin region | Edge health checks, error rates | Edge sends misses to another region; caches serve stale content meanwhile |
| A global config or software change | Everywhere at once | Staged rollout and fast rollback (next section) |

Points that separate a strong answer:

- **Evacuate with capacity in mind.** Anycast moves a dead site's users to whatever is next in routing, which
  may be one small PoP. Steering that knows each site's spare capacity spreads them out
  ([chapter 10](/edge/steering#capacity-aware-steering-and-evacuation)). Move load gradually so caches
  warm up and connection storms stay small.
- **Cap what health checks can remove.** A broken checker looks like a broken fleet. Never let automation
  withdraw more than a set fraction of capacity at once; above that, <Term id="fail-open">fail open</Term>
  and page a human.
- **Watch for gray failures.** A site that answers health checks but fails real requests is worse than a dead
  one. Judge health by real-user error rates, not only by probes.
- **Shed load before collapse.** Under overload, reject lower-priority work early, cap retries, and keep the
  edge from amplifying them ([chapter 17](/operations/timeouts-retries-overload)).
- **Static stability.** If the control plane fails, PoPs keep serving with the last known good configuration.
  The data path must never need the control plane to be up.

## Changing the edge safely

**In short:** most global edge outages come from a change pushed everywhere at once. Treat every config,
rule and data file like code: validate it, roll it out in stages with automatic checks, and keep a fast,
tested rollback.

A config change at the edge can reach hundreds of PoPs in seconds, which makes it the biggest
<Term id="failure-domain">failure domain</Term> in the design. The pattern:

- **Validate before shipping.** Schema and size checks, and a test run against real traffic samples.
- **Stage the rollout:** one canary server, one canary PoP, a small region, then the rest. Wait long enough at
  each stage for errors and CPU to show up.
- **Gate on health.** Compare error rates, latency and crash counts between new and old; stop and roll back
  automatically.
- **Make bad input safe.** A proxy that receives a malformed or oversized file should keep the last good
  version and alert, not crash.
- **Keep an emergency path that skips the stages,** for blocking an active attack. Use it rarely, and give
  it the same validation.

Machine-generated data, such as bot-detection features or blocklists, needs the same discipline as code. It
often changes every few minutes, which is exactly why it gets skipped.

## Observability

**In short:** measure what users see (real-user monitoring), probe from outside (synthetics), and break every
metric down by PoP, network and origin. Make it possible to answer "which PoP, which network, which hop?" in
minutes.

Name the signals ([chapter 18](/operations/observing-the-path)):

- **Real-user monitoring** and <Term id="network-error-logging">Network Error Logging</Term>: what phones
  actually experience, including failures that never reach you.
- **<Term id="synthetic-monitoring">Synthetic probes</Term>** from many networks: catch outages when
  traffic is low, and check each PoP and each anycast range directly.
- **Per-PoP golden signals:** requests per second, error rate by class, latency percentiles, cache hit
  ratio, handshake rate, CPU, origin latency.
- **Tracing across hops:** a trace ID added at the edge, and <Term id="server-timing">Server-Timing</Term>
  headers, so a slow request splits into edge time, backbone time and origin time.
- **Routing and DNS views:** BGP monitoring for your prefixes (to catch leaks and hijacks) and which PoP
  each resolver or network is being sent to.

Sample full request logs, keep aggregates for everything, and alert on symptoms users feel, not on every
host metric.

## DDoS and abuse

**In short:** spread volumetric attacks across all PoPs with anycast and drop them as early as possible.
Answer cacheable floods from cache, and stop application-layer attacks with rate limits, bot detection and
per-connection work limits. Hide the origin.

Split the answer by layer ([chapter 9](/internet/internet-routing#absorbing-volumetric-ddos),
[chapter 12](/edge/l7-proxies#l7-ddos-and-bots)):

- **Volumetric attacks** (floods of packets, often amplified through open services): anycast spreads the
  flood over every site, so each site sees a fraction. Drop known-bad traffic at the routers and in fast
  packet filters on each server. Have upstream filtering or a
  <Term id="scrubbing-center">scrubbing service</Term> for attacks bigger than your links.
- **Protocol attacks** (SYN floods, connection exhaustion): SYN cookies, connection limits, short idle
  timeouts.
- **Application-layer attacks:** requests that look valid. Use <Term id="bot-management">bot management</Term>,
  rate limits keyed on more than IP address (carrier NAT puts many users behind one address), challenges,
  and caching. Limit work per connection too: the HTTP/2 Rapid Reset attack of 2023 needed only a few
  connections.
- **Protect the origin:** it accepts only edge traffic, and its addresses are never published.

The headroom argument from the estimates matters here: the edge's spare capacity, not the site's normal
traffic, decides how big an attack you absorb.

## Why this matters in real systems

**Peering-edge control at Google and Meta.** Espresso (Google, SIGCOMM 2017) and Edge Fabric (Facebook,
SIGCOMM 2017) both describe the same pattern: keep BGP at the peering edge, but let a measurement-driven
controller choose which link carries traffic to each user network. Both papers explain it as a fix for BGP's
blindness to capacity and performance ([chapter 9](/internet/internet-routing#steering-outbound-traffic-by-measurement)).

**Caches inside ISPs for video.** Netflix's Open Connect programme, described in its public documentation,
gives free cache appliances to ISPs that carry enough Netflix traffic. Popular content is filled overnight, so
peak-hour video comes from inside the user's own network. It is the "embedded cache" option from PoP
placement, taken to its end.

**Long-lived streams for AI APIs.** Model-serving APIs often stream output for tens of seconds over
server-sent events or HTTP/2 streams. That changes the edge design: proxy memory is sized by concurrent
streams, deploys must drain for minutes ([chapter 12](/edge/l7-proxies#long-lived-connections-during-deploys)),
and request-per-second figures understate the load.

## Where it breaks

The edge chapters tell these incidents in full; here is what each teaches about design.

**Cloudflare, 2019: one rule, every PoP.** A new web firewall rule with a badly behaved regular expression
was deployed globally at once and drove CPU to 100% on proxy servers worldwide.
**Lesson:** stage every rule change, even "just a rule". ([Cloudflare, 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/), [chapter 12](/edge/l7-proxies#where-it-breaks))

**Fastly, 2021: a valid customer setting triggered a latent bug.** A customer's configuration change hit a
bug shipped weeks earlier, and most of Fastly's network returned errors for under an hour.
**Lesson:** a shared edge is a shared failure domain; contain each tenant's config. ([Fastly, 2021](https://www.fastly.com/blog/summary-of-june-8-outage), [chapter 13](/edge/cdns#where-it-breaks))

**Facebook, 2021: health checks withdrew every site.** A backbone outage made every DNS site decide it was
unhealthy and withdraw its anycast routes together. **Lesson:** cap what automation can withdraw, and keep a
way in that does not depend on the failed system. ([Facebook engineering, 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/), [chapter 9](/internet/internet-routing#where-it-breaks))

**Cloudflare, 2025: a generated data file crashed the proxy.** A bot-management feature file grew past a
limit in the proxy after an upstream database change, and was pushed across the network.
**Lesson:** machine-generated config needs validation, staging and a safe fallback like code does. ([Cloudflare, 2025](https://blog.cloudflare.com/18-november-2025-outage/), [chapter 12](/edge/l7-proxies#where-it-breaks))

## How interviewers probe it

Interviewers rarely let you finish the sketch. They pick a box and push. Answer each question out loud before
you open the model answer.

::: details 1. A PoP loses half its capacity. What happens, and what do you do?
First, what users see. With anycast, routing still sends the PoP its full share of users, so the remaining
half is overloaded unless the site had more than 50% headroom. Latency rises and errors follow.

The response, in order: shed load inside the site so it stays healthy for the users it keeps. Then move part
of its users, not all, to neighbouring sites that have room. With DNS steering, lower its weight; with anycast,
move users between anycast groups, or withdraw one of the site's ranges. Move gradually so neighbours' caches
warm up. Check that the neighbours can actually take it; a full evacuation onto one small PoP spreads the
outage.

**Senior add-on:** this is why steering needs capacity awareness, not just health. A binary "up or down" model
handles a dead site but not a half-dead one. Also ask why it lost half: a gray failure (servers passing checks
but failing requests) needs real-user error rates to detect.
:::

::: details 2. How do you roll out a configuration change safely across hundreds of PoPs?
Treat config as code. Validate it (schema, size, a test run against sampled traffic). Roll out in stages: one
server, one canary PoP, a small region, then everywhere, waiting at each stage. Compare error rates, latency and
crashes against the old version, and roll back automatically on regression.

Make the proxies robust to bad input: keep the last good version and alert, rather than crash. Keep rollback
fast and tested; a rollback that takes an hour is not a rollback.

**Senior add-on:** name the hard cases. Emergency changes (blocking an attack) need a fast path that still
validates. Generated data (bot features, blocklists) changes often and is easy to forget. A bug can be latent
for weeks until a specific config triggers it, as in Fastly's 2021 outage, so the stage gates must watch
real traffic, not only the deploy moment.
:::

::: details 3. An origin region goes down. Walk me through it.
The edge sees errors or timeouts from that region's origin. Its health checks and per-request error rates mark
the region unhealthy, and the edge sends misses to the next region. Meanwhile caches serve stale content for
cacheable objects, so many users notice nothing.

The surviving region must have room. Plan origin capacity so any one region can fail at peak. Watch for retry
storms: clients and the edge both retrying can multiply load on the survivor.

**Senior add-on:** distinguish the edge from the origin. Edge failover (PoPs) is about steering; origin
failover is a per-request routing decision inside the edge, and can be fast. The slow part is often state
behind the origin, which is out of scope here but worth naming.
:::

::: details 4. Traffic jumps 10 times in five minutes for a live event. Does your design cope?
For cacheable content, mostly yes: request collapsing and the origin shield turn a flood of misses into one
origin request per object. Make sure the event's pages and video segments are cacheable, even for a few
seconds.

The risks are the uncacheable API and the steering layer. Rate-limit and prioritise at the edge, shed
non-critical work, and pre-scale the origin if you know the date. Check that no single PoP gets a disproportionate
share, for example because a big ISP's routing all lands in one site.

**Senior add-on:** micro-caching (one to a few seconds) for "dynamic" pages that are the same for everyone is
often the cheapest win. Pre-warm caches and connection pools before the event.
:::

::: details 5. Users in one country say the site is slow. How do you find out why?
Start with data split by PoP and network: real-user latency for that country, which PoP each network is
reaching, and whether the slow part is connection setup, edge time or origin time (Server-Timing helps).

Common causes: steering sends them to a distant PoP (a resolver far from users, or an anycast route through
another continent), congestion on one peering link, or a slow origin path. Confirm with a traceroute or
`mtr` from that network and a check of which PoP answers. Fix by changing the steering map, adding peering or
capacity, or adjusting BGP announcements.

**Senior add-on:** "slow" is a distribution. Look at the 95th percentile by network, not the country average.
One large mobile carrier can be the whole story.
:::

::: details 6. Would you build this or buy a CDN?
Most companies should buy. A commercial CDN already has PoPs, peering, attack capacity and operations
teams. Build when traffic is large enough that the bandwidth bill exceeds the cost of a network and team, or
when you need control the vendor cannot give (custom protocols, deep integration with your backbone).

A middle path is common: several CDNs behind your own steering, or your own edge for the main domains and a
CDN for spillover and attack absorption.

**Senior add-on:** a single CDN is a single failure domain. A multi-CDN setup needs your own steering and
health checks, and every CDN must be kept warm and tested, or failover will fail when you need it.
:::

::: details 7. A multi-terabit attack hits. What breaks first?
Usually the links into the busiest PoPs, before any server. Anycast spreads the flood across all sites, so
the question is whether each site's links and filters can carry its share. Drop attack traffic at routers
and in fast server-side filters; send what remains to upstream filtering if links fill.

Meanwhile protect the origin: it should be unreachable except through the edge.

**Senior add-on:** application-layer attacks are harder than big floods because they look like users and cost
CPU per request. Defences there are rate limits, bot signals, challenges, caching, and limits on work per
connection.
:::

## Common misconceptions

- **"More PoPs is always better."** Each extra PoP splits traffic and lowers cache hit ratio, and adds an
  operational burden. Latency gains flatten once most users are within a few tens of milliseconds.
- **"Anycast sends users to the nearest site."** BGP picks the shortest policy path, which can be far away.
- **"Failover is a health check."** It is also a capacity question: the users must fit somewhere.
- **"An API gets nothing from the edge."** It still gains shorter handshakes, warm origin connections and
  attack filtering.
- **"The data path is the risk."** Most large edge outages start with a config or data change in the control
  plane.

## Key takeaways

- Follow one request end to end and justify each hop; state numbers as assumptions in orders of magnitude.
- Combine steering levers: anycast for robustness and attack spreading, DNS or the client for control.
- Cache aggressively with clean keys, tiers, collapsing and stale serving; the origin sees what is left.
- Design for losing your largest site: headroom, capacity-aware evacuation, caps on automation.
- Treat every config and data push like code: validate, stage, gate on health, roll back fast.

## Review

<Flashcards id="global-edge-design" :cards="cards" />

<MarkDone id="global-edge-design" />

## Sources

- [Maglev: A Fast and Reliable Software Network Load Balancer](https://research.google/pubs/maglev-a-fast-and-reliable-software-network-load-balancer/) (paper, NSDI 2016)
- [Taking the Edge off with Espresso](https://research.google/pubs/taking-the-edge-off-with-espresso-scale-reliability-and-programmability-for-global-internet-peering/) (paper, SIGCOMM 2017)
- [Engineering Egress with Edge Fabric](https://research.facebook.com/publications/engineering-egress-with-edge-fabric/) (paper, SIGCOMM 2017)
- [Netflix Open Connect](https://openconnect.netflix.com/) (documentation)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) (RFC, 2022) and [RFC 5861: Stale content extensions](https://www.rfc-editor.org/rfc/rfc5861) (RFC, 2010)
- [RFC 8555: ACME](https://www.rfc-editor.org/rfc/rfc8555) (RFC, 2019)
- [Static stability using Availability Zones](https://aws.amazon.com/builders-library/static-stability-using-availability-zones/) (Amazon Builders' Library, engineering article)
- [Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) (Google SRE book, 2016)
- Incident reports: [Cloudflare 2019](https://blog.cloudflare.com/details-of-the-cloudflare-outage-on-july-2-2019/), [Fastly 2021](https://www.fastly.com/blog/summary-of-june-8-outage), [Facebook 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/), [Cloudflare 2025](https://blog.cloudflare.com/18-november-2025-outage/)
