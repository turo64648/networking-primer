---
title: "10. Steering Users & Failing Over"
---

<script setup>
import { cards } from './steering-review'
</script>

# 10. Steering Users & Failing Over

A large website runs in many places, so something must decide which place serves each user, and move users
when a place fails. This chapter compares the ways to make that decision and what happens when a whole region
goes dark. "Design global load balancing" and "a region dies, what happens?" are two of the most common
system design questions.

::: info Before you start
- **DNS** turns names into addresses. Answers are cached for a **TTL** chosen by the site, and the site's
  DNS servers see the user's resolver, not the user. [Chapter 4](/protocols/dns) covers both.
- With **anycast**, many sites announce the same addresses, and internet routing (BGP) sends each network to
  a nearby one. [Chapter 9](/internet/internet-routing) covers how.
- A **PoP** (point of presence) is a small site near users that accepts connections. A **region** is a
  large datacenter site that runs the application.

The chapter makes sense without them. Names, addresses and numbers in examples are placeholders.
:::

## The steering problem

**In short:** steering decides which site each user reaches. It weighs distance, health, spare capacity
and cost, and it must keep working while sites fail.

Picture a website with 100 PoPs and 3 regions. A user in Lisbon opens the app. Madrid is the closest PoP,
but it is busy. Paris is a little further and nearly idle. Which should she reach? And if Madrid catches
fire, how fast does she move, and where?

Choosing a site for each user is called <Term id="traffic-steering">traffic steering</Term>. When the
choice spans the whole world, people also call it **global load balancing**. It takes four inputs:

- **Proximity.** Fewer milliseconds of network delay means faster handshakes and faster pages.
- **Health.** A site that is down, or failing some requests, should get no users.
- **Capacity.** A site near its limit should take fewer new users, even if it is closest.
- **Cost.** Some links and sites are cheaper to serve from. This matters most for video and downloads.

There are often two steering decisions on one request. The first picks the PoP the phone connects to;
that is this chapter. The second picks the <Term id="region">region</Term> the PoP forwards to, which
[chapter 14](/backend/edge-to-origin) covers. The ideas are the same, but the second decision is made by
your own servers, with full control.

## Three levers: DNS, anycast and the client

**In short:** you can steer with the address DNS returns, with which site answers a shared address, or with
code in the app. They differ in precision, in speed of change and in who holds the decision.

<SteeringLeversDiagram />

### DNS-based steering

The site's authoritative DNS server returns a different address depending on who asks. A resolver in Spain
gets Madrid's address; one in Germany gets Frankfurt's. Chapter 4 explained the mechanism and its limits.
In short:

- **The unit is the resolver, not the user.** One answer to a big ISP resolver serves everyone behind it.
  <Term id="ecs">EDNS Client Subnet (ECS)</Term> narrows this to a slice of addresses, where resolvers send it.
- **Changes move at the speed of caches.** A new answer reaches users only as old ones expire, which takes a
  <Term id="dns-ttl">TTL</Term> or two, with a long tail of clients holding connections.
- **Control is precise.** You can send one resolver, one country or 7% of answers anywhere you like.

### Anycast steering

With <Term id="anycast">anycast</Term>, every PoP announces the same addresses. DNS returns one answer for
everyone, and internet routing decides which PoP each network reaches. Chapter 9 explained the mechanism.
What matters for steering:

- **Failover needs no client cooperation.** A PoP that dies stops announcing the routes. Within seconds to
  a minute or two, routers send its users to the next-best PoP. No cache has to expire.
- **The choice is BGP's, not yours.** BGP picks by network policy and path length, not by latency or load.
  Most users land somewhere reasonable, but some land far away, and you cannot fix one network's choice
  directly.
- **Your levers are blunt.** You can stop announcing at a PoP, announce to fewer neighbours, or make the
  path look longer. Each change moves a whole group of networks at once, and you cannot always predict
  which ones.
- **It soaks up attacks.** An attack on one address spreads across every PoP that announces it.

### Client-side steering

An app you control can make the choice itself. It fetches a list of servers, ranked for it by your own
service. It can measure them, race connections, and move to the next server as soon as one fails. No cache
and no BGP decision stands in the way.

This needs code on the client, so it fits mobile apps, video players and your own SDKs better than browsers.
Browsers can still be steered at the application level: the server can redirect to a site-specific name or
put site-specific URLs in the page.

The risks are on the client too. A stale list in an old app version can point at sites that no longer exist.
And millions of clients that all fail over at the same moment hit the next server together.

::: details Going deeper: client-side steering in the wild
- Netflix's public Open Connect overview (undated) describes the pattern for video. A steering service picks
  cache servers for each playback based on which files they hold, their health and their network distance.
  The client receives URLs for those servers and fetches from them.
- Microsoft's FastRoute (NSDI 2015) shows a mix of levers. Its PoPs sit in layers of anycast rings, each ring
  with its own address. When a PoP gets overloaded, its own DNS server starts handing out the address of an
  inner, larger ring instead. DNS moves load between rings; anycast picks the site within a ring.
:::

### Comparing the three

| | DNS-based | Anycast | Client-side |
|---|---|---|---|
| **Who decides** | Your DNS servers | Internet routing, shaped by you | The app, with your guidance |
| **Unit of control** | A resolver, or an ECS subnet | Groups of networks | One user |
| **Speed of failover** | Minutes, with a long tail | Seconds to a couple of minutes | As fast as the app notices |
| **Sees load and latency?** | Only through your measurements | No | Yes, its own |
| **Main weakness** | Caches and the resolver's location | Coarse, unpredictable control | Needs your code on the client |

In practice large systems combine them. A common pattern: anycast for the entry addresses, so failover is
fast and attacks spread out. DNS on top to pick between a few anycast address groups, or to move load away
from a busy area. And smart clients that retry on another address when a connection fails.

::: details Going deeper: regional anycast and other hybrids
- **Regional anycast** gives each continent or region its own anycast addresses. DNS picks the region; BGP
  picks the PoP within it. This limits how far a bad BGP choice can send a user. A 2023 SIGCOMM paper,
  "Regional IP Anycast: Deployments, Performance, and Potentials", measures how several large CDNs use it.
- Google's SRE book (2016) describes the general shape of its front end: DNS chooses a location, then a
  virtual address served by network load balancers spreads connections inside it.
- Microsoft researchers measured Bing traffic in 2015 ("Analyzing the Performance of an Anycast CDN"). Anycast
  worked well for most clients, but sent about 20% of them to a front end that was not the best one. A
  simple scheme using past measurements, with DNS overriding anycast for those clients, improved them.
:::

## Measuring users: building the map

**In short:** the best site for a user is the one with the lowest measured delay, not the closest on a map.
Large systems measure from real users, group the results by network, and turn them into a table that the
steering layer follows.

The naive way to steer is by geography. Look up the resolver's address in a location database, then pick the
nearest site. This often goes wrong:

- **Location databases are approximate.** They can be wrong by a country for mobile networks, VPNs and new
  address blocks.
- **Distance is not delay.** A network in Chile might reach Miami faster than Santiago, if its only good
  connection runs north. The path follows business deals between networks, not straight lines.
- **The resolver is not the user**, as chapter 4 showed.

So big providers measure instead. A small script in their web pages, or code in their apps, fetches a tiny
object from several candidate sites in the background. It reports how long each took. This is
<Term id="real-user-monitoring">real-user monitoring (RUM)</Term>. Millions of such reports per hour cover
nearly every network that has real users.

The results are grouped by network: usually by address block (such as a `/24`) or by the network's
<Term id="autonomous-system">autonomous system</Term> number. For each group, the system ranks sites by
measured delay, often at the median or 90th percentile. The output is a **map**: a table from "who is asking"
to "best sites, in order". DNS servers or a client steering service then follow the map, adjusted live for
health and capacity.

### Linking resolvers to users

DNS steering has an extra problem. The DNS server sees the resolver, but RUM measures users. The system
needs to know which users sit behind which resolver.

A neat trick solves it. The measurement script looks up a unique, random name, such as
`a8f3k2.probe.example.com`. The site's own DNS server sees which resolver asked for that name. The same
script then reports the user's address over HTTP. Joining the two tells you which users use which resolver.
With that link, you can choose the best site for "the users behind resolver X", not for X itself.

### Where measurement goes wrong

- **Sparse data.** Small networks produce few reports. Their map entries are noisy or borrowed from
  similar networks.
- **The map lags the network.** A new peering link or a fibre cut changes delays in minutes. A map rebuilt
  hourly or daily misses it.
- **Feedback loops.** Moving users to a site changes its load, and so its delay, and so the next map.
  Without damping, users swing back and forth.

::: details Going deeper: published mapping systems
- Akamai's "End-User Mapping" paper (SIGCOMM 2015) describes switching from per-resolver mapping to per-client
  mapping using ECS. For clients of public resolvers, it reports roughly halved round-trip and download times.
  The cost was about eight times more DNS queries, because answers could no longer be shared per resolver.
- Microsoft's Odin (NSDI 2018) describes a measurement system built on code in Microsoft's client
  applications. It measures delay to anycast and individual front ends from real users, and feeds traffic
  management and outage detection.
- Google Public DNS answers `o-o.myaddr.l.google.com` (TXT) with the address of the resolver that asked, and
  Akamai's `whoami.akamai.net` does the same with an A record. Both use the "who asked for this name" trick.
:::

## Health checks: knowing what is down

**In short:** steering is only as good as its view of which sites work. Probe from many places, judge by
real user errors as well, and design so that the checker can never take everything down at once.

A <Term id="health-check">health check</Term> is a regular test of whether a site can serve. A checker sends
a request every few seconds and marks the site down after several failures in a row. It marks it up again
after several successes. Requiring several results in a row keeps one dropped packet from moving traffic.

### What to check

- **Shallow checks** ask "does the server answer?", for example a TCP connect or a fixed `/health` page.
  They are cheap and stable, but miss a server that answers while its real work fails.
- **Deep checks** run a real request through the stack, including the services behind it. They catch more,
  but a slow shared database can make every site fail its check at once.

A common compromise: deep enough to prove the site can serve its own users, but not dependent on anything
shared by all sites.

### Where the checks run from

A check from one place cannot tell "the site is down" from "my path to it is down". So checkers run in
several locations, and a site is marked down only if most of them agree. Even then, probes miss partial
failures: a site that fails 5% of requests, or only for one ISP. That kind of half-broken state is a
<Term id="gray-failure">gray failure</Term>.

RUM helps here too. Error rates and timeouts from real users, broken down by site and network, catch gray
failures that probes miss. Mature systems combine both signals.

### When the checker is the problem

A health system that can mark every site down will, one day, do exactly that. A bad config, a broken
checker or a shared dependency makes all checks fail at once. Then steering has nowhere to send anyone.

The defence is to <Term id="fail-open">fail open</Term>: if every site looks down, assume the checks are
wrong and keep serving from all of them. Limit how much capacity automation may remove at once, such as "never
more than a third of sites". Facebook's 2021 outage showed the cost of skipping this: its DNS servers
withdrew themselves everywhere when they lost sight of the datacenters
([chapter 4](/protocols/dns#where-it-breaks) tells the story).

::: details Going deeper: settings in managed DNS services
- Amazon Route 53's documentation (as of 2025) states the fail-open rule directly: "If no record is healthy,
  all records are healthy." A record with no health check is always treated as healthy.
- Route 53 checkers run from several AWS locations, every 10 or 30 seconds, with a configurable number of
  failures (default 3) before marking an endpoint unhealthy. Other providers have similar knobs.
- Detection time is roughly interval × failure count, plus the time to update DNS answers. Then add the TTL
  and client behaviour on top.
:::

## When a region dies

**In short:** failover moves users fast or slowly depending on the lever, but it always moves load. The site
that receives it must have the spare capacity, or the failure spreads.

Moving users away from a failed site is <Term id="failover">failover</Term>. Here is what happens, step by
step, when one PoP or region suddenly loses power.

**In the first seconds**, every connection to it breaks. Requests in flight fail or time out. Clients with
good retry logic reconnect at once.

**With anycast**, routers there stop announcing routes as soon as they die, or their neighbours notice the
lost BGP sessions. Routes elsewhere converge within seconds to a minute or two. Reconnecting clients land at
the next-best PoP, using the same address.

**With DNS steering**, health checks need tens of seconds to declare the site down. The DNS servers then
return other addresses. Resolvers that cached the dead address keep handing it out until the TTL ends. Most
users move within a few minutes; a tail of clients with stretched TTLs or pinned addresses takes much longer.

**With client-side steering**, the app moves on its first failed connection, if it has a list of
alternatives.

### Where the load goes

Every failover moves load somewhere, and that is where the next failure starts.

<SteeringSpilloverDiagram />

With pure anycast, BGP decides who absorbs the traffic, usually the neighbouring PoPs. If all of a big PoP's
users land on one neighbour, that neighbour overloads, fails, and passes everyone on. This is a
**cascading failure**. The new arrivals also come all at once: thousands of reconnects, new TLS handshakes
and cold caches. A sudden rush of clients all doing the same thing is a
<Term id="thundering-herd">thundering herd</Term>.

Plan for it:

- **Keep spare capacity.** Size each area so it survives losing its biggest site. With N sites, each runs
  below (N−1)/N of capacity on a normal day.
- **Know where traffic will go.** Test which PoPs take over when each one fails, before it happens.
- **Run active-active.** In an <Term id="active-active">active-active</Term> setup, every site serves real
  traffic every day. A standby site that only takes traffic in an emergency often turns out to be broken.
- **Expect a surge behind the edge too.** Caches at the receiving PoP are cold, so more requests reach the
  origin ([chapter 13](/edge/cdns)). Slow clients retry, adding to load ([chapter 17](/operations/timeouts-retries-overload)).

### Failing back

Recovery is a second failover, in reverse. Moving everyone back at once is another thundering herd, onto a site
whose caches are empty. Move back slowly, in steps, and wait a while after health returns before starting.
Waiting also stops **flapping**: a site that goes up and down every minute should not drag users with it.

::: details Going deeper: capacity-aware anycast, as published
- Cloudflare described its Traffic Manager in 2023. Before it, engineers withdrew anycast routes by hand when
  a data center ran short of capacity. Traffic Manager does it automatically and moves only as much traffic
  as needed.
- The same post describes a Traffic Predictor. It pings addresses that recently used a data center over a
  special test anycast range, to learn where those users would go if it failed. Policies then also move
  traffic out of the backup sites ahead of time, to avoid a thundering herd.
:::

## Capacity-aware steering and evacuation

**In short:** the nearest healthy site is not always the right one. Good steering moves just enough users
away from busy sites, in small steps, and empties sites on purpose before maintenance.

A site can be healthy and still be the wrong choice. Maybe a flash crowd hits one country, or half a PoP's
servers are out for upgrades. Sending more users there makes everyone slower.

Capacity-aware steering adds a loop. Each site reports its load. When a site nears its limit, the steering
layer moves some of its users to the next-best site on the map. When load drops, they move back. The levers
are the same as before:

- **DNS:** lower the share of answers that point at the busy site, for a few resolvers at a time.
- **Anycast:** stop announcing some of the addresses at the busy site, so only part of its users move. This
  works only if users are spread across several address blocks.
- **Client-side:** reorder the list the steering service hands out.

Move in small steps and wait to see the effect before the next. DNS changes take a TTL to show up. A loop that
reacts faster than its own changes take effect will overshoot and oscillate.

### Planned evacuation

Sometimes you empty a site on purpose: for maintenance, a risky deploy, or a hurricane in the forecast.
Removing all traffic from a site is called a <Term id="drain">drain</Term>.

A safe drain is gradual. Shift a slice of users, check that the receiving sites cope, then shift more.
Existing connections are allowed to finish rather than being cut. Before draining, check that the rest of
the system can take the load.

Teams that drain often find their problems in calm conditions, not in a crisis. Some companies drain entire
regions on a regular schedule, so failover is a routine operation rather than a rare emergency.

::: details Going deeper: Facebook's Maelstrom (2018)
- Facebook's OSDI 2018 paper "Maelstrom" describes a system that drains traffic from failing datacenters. It
  models dependencies between services, so that each is moved in a safe order, and checks health as it goes.
- The paper reports that Facebook drained randomly chosen datacenters every week as a test. In one incident,
  fibre cuts removed most of a datacenter's backbone capacity. Maelstrom moved most user-facing traffic away
  in about 17 minutes and all traffic in about 1.5 hours.
:::

## Debugging: users reach the wrong site

**In short:** find out which site the user reached, which resolver they used, and what DNS and routing
did. Then decide which lever chose badly.

Most sites and CDNs say which PoP served a response, in a header or a debug page. Start there:

```bash
# Which PoP answered? Header names vary by provider (cf-ray, x-served-by, x-amz-cf-pop, ...)
curl -sI https://www.example.com/ | grep -iE 'cf-ray|x-served-by|x-amz-cf-pop|via'

# Cloudflare-fronted sites have a trace page; "colo" is the PoP code
curl -s https://www.cloudflare.com/cdn-cgi/trace | grep colo
```

Next, find out which resolver the user's machine uses, and what it is told:

```text
$ dig +short TXT o-o.myaddr.l.google.com @ns1.google.com
"198.51.100.53"
$ dig +short www.example.com
192.0.2.10
$ dig +short www.example.com @8.8.8.8 +subnet=203.0.113.0/24
192.0.2.80
```

(Illustrative.) The first line is the address of your resolver as Google's DNS servers see it. If that
resolver is far from you, DNS steering will pick for the wrong place. The last command asks what a user in
`203.0.113.0/24` would get, if the resolver passes the subnet on.

If DNS returns a good address but the user still reaches a far site, the address is probably anycast and
routing chose it. `traceroute` or `mtr` to that address shows the path, and the last hops' names often contain
a city code. Compare connection time to the site you expected, with `curl --resolve`:

```bash
curl -so /dev/null -w 'connect %{time_connect}s\n' https://www.example.com/
curl -so /dev/null -w 'connect %{time_connect}s\n' --resolve www.example.com:443:192.0.2.80 https://www.example.com/
```

[Chapter 18](/operations/observing-the-path) has a fuller method for debugging the path.

## Why this matters in real systems

**A global entry point for an API.** A typical design: one anycast address for `api.example.com`, served by
PoPs on every continent. Each PoP terminates TLS and forwards to the nearest healthy region over the
provider's own network. Users never see the regions, so a region can fail without any DNS change.

**Mobile apps hold connections for hours.** DNS failover does nothing for an app with an open HTTP/2 or QUIC
connection to a dying site, until that connection breaks. Apps that steer well notice errors and reconnect,
with jitter so they do not all reconnect at the same instant.

**ML serving and scarce GPUs.** When the expensive resource is GPU capacity, not network distance, steering
may send a user to a region thousands of kilometres away because it has free accelerators. An extra 100 ms
of network delay is small next to seconds of model time. Proximity becomes one input among several.

**Cost-aware steering for video.** Video providers often steer to a cache inside the user's own ISP, even
when another site is slightly faster. Traffic that stays inside the ISP is cheaper for both sides.

**Failover is a capacity plan.** "Can we lose region X?" is answered with numbers: peak load, the load
each other region would receive, and their headroom. Teams that cannot answer it have not really planned
failover.

## Where it breaks

**Cloudflare, 2020: one router attracts a backbone's traffic.** On 17 July 2020, an engineer changed a router's
configuration in Atlanta. The router began announcing routes to the rest of Cloudflare's backbone with a high
priority. Traffic from many locations headed to Atlanta, overwhelmed it, and Cloudflare's traffic dropped by
about 50% for 27 minutes. **Lesson:** routing decides where load goes; one bad announcement can steer far
more traffic to a site than it can carry.
([Cloudflare, 2020](https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/))

**Cloudflare, 2022: withdrawing the busiest sites.** On 21 June 2022, a routing policy change reached 19 data
centers. They made up about 4% of the network but handled about half of all requests. A reordered rule
withdrew their anycast prefixes, and those sites became unreachable for about 75 minutes. **Lesson:** a few
large sites can carry most of your traffic; roll changes out to them last and slowest.
([Cloudflare, 2022](https://blog.cloudflare.com/cloudflare-outage-on-june-21-2022/))

**Akamai, 2021: when the steering DNS fails.** On 22 July 2021, a configuration update triggered a bug in a DNS
component of Akamai's edge platform. Many large sites that relied on it, including airlines and banks, were
unreachable for up to about an hour, until the update was rolled back. **Lesson:** a DNS-based steering layer
is itself on the critical path; treat its configuration changes like code deploys, with staged rollouts.
([Akamai, 2021](https://www.akamai.com/blog/news/akamai-summarizes-service-disruption-resolved))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Design global load balancing for a service with users worldwide, 50 PoPs and 3 regions.
Start with the entry point. Give the service one or a few anycast addresses, announced from every PoP. That
gives fast failover and spreads attacks. Each PoP terminates connections and forwards requests to a region
over a private network.

Then add control. Run a measurement system from real users, and build a map of the best PoPs per network. Use
it to spot networks that anycast handles badly. Fix those with DNS, by handing them a different, regional
address. Feed in health checks from many vantage points, plus error rates from real traffic. Make the PoP
choose a region by health and load. Size each area so it survives losing its biggest site.

**Senior add-on:** name the failure modes. Fail open if every site looks unhealthy. Limit how much capacity
automation can remove at once. Move load in steps, slower than the DNS TTL, to avoid oscillation. Plan for the
thundering herd on failover and fail back slowly. Drain regions regularly to prove it works.
:::

::: details 2. A region dies at 2 a.m. Walk me through what happens to users.
Connections to the region break. In-flight requests fail; clients retry. If the region sits behind PoPs that
forward to it, the PoPs' health checks see failures within seconds and send requests to another region.
Users notice a burst of errors and a slower response, then recover.

If users connect to the region directly by DNS, health checks mark it down within tens of seconds, DNS
starts returning other addresses, and users move as cached answers expire. Most move within minutes. Some
take much longer: resolvers that stretch TTLs, apps that keep an old address.

**Senior add-on:** the receiving regions take a surge of new connections, TLS handshakes and cache misses at
once. If they lack headroom, they fail too: a cascading failure. Then the long tail: failback must be gradual.
Also mention what is out of the network's hands, such as whether the surviving regions have the data.
:::

::: details 3. When would you choose DNS-based steering over anycast, and the reverse?
DNS when you need precise control: per country, per ISP, weighted shifts during a migration. It also needs
nothing special from the network, so it suits a site using a few cloud regions.

Anycast when fast failover and attack absorption matter more than precision, and you run many PoPs with your
own routing. Failover does not wait for caches, and one address serves the whole world.

**Senior add-on:** most large systems use both. Anycast for the entry addresses, DNS to choose between
regional anycast groups or to override anycast for networks it serves badly. Measured data from real users
drives both.
:::

::: details 4. Users of one ISP in Brazil are reaching a PoP in Miami instead of São Paulo. How do you find out why?
First find out whether DNS or routing chose Miami. Check what address those users get. Ask their resolver if
possible, or a public one with ECS for their subnet. If DNS returns Miami's own address, the problem is in
DNS steering. If it returns the shared anycast address, routing chose Miami.

For DNS: check which resolver they use and where it is, and whether it sends ECS. Then check what your map
says for that resolver or subnet, and why. For anycast: run `traceroute` from that ISP, or use a looking
glass, and check how that ISP reaches your São Paulo PoP. Often the ISP has no direct connection to it there
and buys transit through the US.

**Senior add-on:** fixes depend on the cause. Peering with that ISP in São Paulo fixes the root cause.
Short-term, hand that ISP's resolvers a regional address in DNS, or adjust your announcements to that
network. Check RUM data before and after to confirm the delay actually improved.
:::

::: details 5. How do you design health checks so they cannot cause an outage?
Check from several places and require most of them to agree. Require several failures in a row before
marking a site down, and several successes before marking it up. Check what the site needs to serve its own
users, not shared systems every site depends on.

Then cap the damage. If every site looks down, fail open and keep serving from all of them. Limit how much
capacity automation can remove at once, and alert a human beyond that.

**Senior add-on:** combine probes with real-user error rates to catch gray failures. Treat health-check
config as code with staged rollout. Facebook's 2021 outage, where DNS servers all withdrew themselves at
once, is the classic example of a health check with too much power.
:::

::: details 6. You must take a region offline for a day of maintenance. How do you do it safely?
Check first that the other regions can absorb its peak load with headroom. Then shift traffic gradually:
lower its DNS weight or the share the steering layer sends it, in steps. Watch latency and errors at the
receiving regions after each step.

Let existing connections finish instead of cutting them. Wait for long-lived connections and DNS caches to
drain. Only then start the work. Bring it back the same way, slowly, because its caches start cold.

**Senior add-on:** if you do this often, automate it and do it regularly, even without maintenance. Regular
drains catch hidden dependencies and stale capacity plans. Facebook's 2018 Maelstrom paper describes weekly
drain tests of whole datacenters.
:::

::: details 7. Your mobile app talks to an API. How can the app itself help with steering and failover?
Ship a list of endpoints, refreshed from a config service, instead of one hostname. On connection failure,
try the next one immediately, rather than waiting for DNS to change. Race connections to two endpoints and
use the first that works. Report timings and errors back, so the server-side map improves.

**Senior add-on:** add guard rails. Use jittered backoff so millions of apps do not fail over at once. Keep a
safe default list in the app for when the config service is down. Let the server override the list, so a
bug in old app versions can be fixed without an update.
:::

## Common misconceptions

- **"Anycast always sends users to the nearest site."** BGP picks by network policy and path, not by delay.
  Most users land well; a minority lands far away.
- **"DNS failover takes one TTL."** Most traffic moves in a TTL or two. Stretched TTLs and long-lived
  connections make a long tail.
- **"Geography tells you the best site."** Delay depends on how networks connect, which RUM measures and a map
  does not show.
- **"Failover is about detecting the failure."** Detection is the easy half. Where the load goes, and whether
  that site survives it, decides the outcome.
- **"A standby region is safe."** One that never serves real traffic is often broken when you need it.

## Key takeaways

- Steering picks a site per user from **proximity, health, capacity and cost**. Levers are DNS, anycast and
  the client; large systems combine them.
- **DNS** gives precise control but moves at the speed of caches. **Anycast** fails over fast but gives
  coarse control. **Clients** you control react fastest.
- Good maps come from **measuring real users**, grouped by network, not from geography.
- Health checks need **many vantage points, hysteresis and fail-open**, plus real-user error rates for gray
  failures.
- **Failover moves load.** Keep headroom, know where traffic will land, move in steps, fail back slowly, and
  drain regularly.

## Review

<Flashcards id="steering" :cards="cards" />

<MarkDone id="steering" />

## Sources

- [Analyzing the Performance of an Anycast CDN](https://conferences2.sigcomm.org/imc/2015/papers/p531.pdf) (paper, IMC 2015)
- [FastRoute: A Scalable Load-Aware Anycast Routing Architecture for Modern CDNs](https://www.usenix.org/system/files/conference/nsdi15/nsdi15-paper-flavel.pdf) (paper, NSDI 2015)
- [End-User Mapping: Next Generation Request Routing for Content Delivery](https://dl.acm.org/doi/10.1145/2829988.2787500) (paper, SIGCOMM 2015)
- [Odin: Microsoft's Scalable Fault-Tolerant CDN Measurement System](https://www.usenix.org/conference/nsdi18/presentation/calder) (paper, NSDI 2018)
- [Maelstrom: Mitigating Datacenter-level Disasters by Draining Interdependent Traffic Safely and Efficiently](https://www.usenix.org/conference/osdi18/presentation/veeraraghavan) (paper, OSDI 2018)
- [Load Balancing at the Frontend](https://sre.google/sre-book/load-balancing-frontend/) (Site Reliability Engineering book, Google, 2016)
- [RFC 7871: Client Subnet in DNS Queries](https://www.rfc-editor.org/rfc/rfc7871) (RFC, 2016)
- [How Cloudflare's systems dynamically route traffic across the globe](https://blog.cloudflare.com/meet-traffic-manager/) (engineering blog, 2023)
- [Open Connect Overview](https://openconnect.netflix.com/Open-Connect-Overview.pdf) (documentation, Netflix, undated)
- [How Amazon Route 53 chooses records when health checking is configured](https://docs.aws.amazon.com/Route53/latest/DeveloperGuide/health-checks-how-route-53-chooses-records.html) (documentation, AWS)
- [Cloudflare outage on July 17, 2020](https://blog.cloudflare.com/cloudflare-outage-on-july-17-2020/) (incident report, 2020)
- [Cloudflare outage on June 21, 2022](https://blog.cloudflare.com/cloudflare-outage-on-june-21-2022/) (incident report, 2022)
- [Akamai Summarizes Service Disruption](https://www.akamai.com/blog/news/akamai-summarizes-service-disruption-resolved) (incident summary, 2021)
