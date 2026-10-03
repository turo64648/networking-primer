---
title: 9. Internet Routing
---

<script setup>
import { cards } from './internet-routing-review'
</script>

# 9. Internet Routing

The internet is tens of thousands of independent networks that agree to carry each other's traffic. How
they tell each other which addresses they can reach decides the path every request takes, how fast it is,
and who can break it. Interviewers ask about it because it explains anycast, outages that take whole
companies offline, and how large sites survive attacks of terabits per second.

::: info Before you start
- An **IP address** identifies a machine. A **prefix** such as `203.0.113.0/24` is a block of addresses
  that share their first bits. [Chapter 2](/foundations/packets-and-links) covers both.
- Each router forwards a packet by looking up the destination in a table of prefixes. When several match,
  it uses the most specific one. [Chapter 2](/foundations/packets-and-links) explains this lookup.
- [Chapter 1](/foundations/the-map) shows where this chapter sits: between the phone's network and the
  website's edge.

The chapter makes sense without them. Addresses and network numbers in the examples are placeholders.
:::

## Networks of networks

**In short:** the internet is made of independently run networks, each with its own number. They connect
to each other in pairs, and nobody controls the whole map.

Your phone's mobile operator runs one network. The website runs another. Between them may sit one or two
large carriers that move traffic across continents. Each is a separate company with its own routers, its
own policies and its own bills to pay.

Each such network is an <Term id="autonomous-system">autonomous system (AS)</Term>: a set of addresses and
routers run by one organisation under one routing policy. Each AS has a number, its **AS number** (ASN),
such as `AS64500`. More than 70,000 are visible on the internet (as of 2025). Most are small companies,
universities and local ISPs; a few hundred carry most of the traffic.

Inside an AS, the owner decides how to route, often with a protocol that knows the whole internal map.
Between ASes nobody has the whole map. Each AS only learns what its neighbours tell it. The protocol they
use to tell each other is the <Term id="bgp">Border Gateway Protocol (BGP)</Term>.

::: details Going deeper: who hands out numbers
- Five **regional internet registries** (RIRs), such as ARIN in North America and RIPE NCC in Europe,
  allocate address blocks and AS numbers. Holding a block does not make the internet route it to you;
  only BGP announcements do that.
- AS numbers were 16 bits until 4-byte AS numbers arrived (RFC 6793, 2012). `64512–65534` and
  `4200000000–4294967294` are private, like private IP ranges. Datacenter fabrics use them heavily
  ([chapter 15](/backend/datacenter-fabric)).
:::

## How BGP works

**In short:** each network tells its neighbours "I can reach these prefixes, through this chain of
networks". Each router picks one best route per prefix, mostly by business preference and then by the
shortest chain.

Two neighbouring ASes connect a router on each side and open a BGP session between them. It is a long-lived
TCP connection on port 179. Over it, each side sends **announcements**: "I can reach `203.0.113.0/24`".
When a route stops working, it sends a **withdrawal**: "I can no longer reach it".

Each announcement carries the list of ASes it has passed through: the <Term id="as-path">AS path</Term>.
Suppose the website, AS 64510, announces its prefix to a carrier, AS 64496. The carrier passes it on to the
phone's ISP, AS 64500, adding its own number. The ISP now knows:

```text
203.0.113.0/24   AS path: 64496 64510   (via the carrier, ending at the website)
```

The AS path does two jobs. It prevents loops: a router that sees its own AS number in a path drops it. And
it is a rough distance measure: fewer ASes usually means a more direct route. BGP passes on routes and
their paths, not a full map, so it is called a **path-vector** protocol.

### Choosing the best route

A router often learns several routes to the same prefix from different neighbours. It uses exactly one.
The choice follows a fixed list of rules, in order. The ones that matter in practice:

1. **Highest local preference.** A number the router's own operator sets on each route. It encodes business
   policy: "prefer routes from customers, then free peers, then paid providers". This is
   <Term id="local-preference">local preference</Term>, and it beats everything else.
2. **Shortest AS path.** Among equally preferred routes, the one through the fewest networks.
3. **Several tie-breakers**, including the internal cost to reach the exit. Routers prefer the exit closest
   to themselves, which hands traffic to the next network as early as possible. This is called
   <Term id="hot-potato-routing">hot-potato routing</Term>.

Notice what is missing: latency, bandwidth, packet loss and link load. Plain BGP does not measure any of
them. It picks routes by policy and by counting networks. A path through two ASes can cross an ocean twice,
and a path through four can stay in one city.

### Consequences you see in production

- **Paths are asymmetric.** Each direction is chosen by different routers with different preferences.
  Traffic from the phone to the site and the replies often take different networks.
  <Term id="traceroute">Traceroute</Term> shows only the forward path.
- **The table is large.** The full internet table holds about a million IPv4 prefixes plus hundreds of
  thousands of IPv6 prefixes (mid-2020s). Every router that carries it needs memory and fast lookup
  hardware for all of them.
- **Changes take time to settle.** A withdrawal spreads AS by AS. Each router may briefly try other routes
  before giving up. Global agreement often takes seconds to minutes, and packets can loop or be dropped
  meanwhile.
- **Trust is the default.** A plain BGP router believes what its neighbours announce. Filtering is a
  configuration choice, covered in the leaks and hijacks section below.

::: details Going deeper: sessions, timers and attributes
- BGP-4 is RFC 4271 (2006). **eBGP** runs between ASes; **iBGP** spreads external routes among the routers
  inside one AS.
- A session that stays silent for the **hold time** (often 90 or 180 seconds by default) is declared dead,
  and all its routes are withdrawn. Operators add BFD, a fast liveness check, to detect failures in well
  under a second.
- **MED** (multi-exit discriminator) lets a neighbour suggest which of several links to use into its
  network. Many networks ignore it from peers.
- **Communities** are tags attached to routes. Providers publish meanings such as "do not announce this to
  Asia" or "lower my local preference". They are the main remote-control tool for inbound traffic.
- Routers rate-limit updates to a neighbour (a minimum advertisement interval, often around 30 seconds for
  eBGP by default). That is one reason convergence takes tens of seconds or more.
:::

## Who connects to whom: transit, peering and exchanges

**In short:** a network either pays another to reach the whole internet (transit) or swaps traffic with
it for free (peering). Big content networks peer with as many access ISPs as they can, so most of their
traffic never touches a paid carrier.

Every connection between two ASes has a business relationship behind it. Two kinds dominate:

- <Term id="transit">Transit</Term>: a customer pays a provider to carry its traffic to and from the
  whole internet. The provider announces the customer's prefixes to everyone and gives the customer
  routes to everywhere. Billing is usually by bandwidth.
- <Term id="peering">Peering</Term>: two networks exchange traffic between their own users and customers,
  usually without payment. A peer does not give you routes to the rest of the internet, only to itself
  and its customers.

These relationships shape which routes each network passes on. A network tells its customers about every
route it has, because customers pay for that. It tells its peers and providers only about its own
customers' routes. Carrying traffic between two parties who do not pay you would cost money for nothing.
So a typical path climbs from the user's ISP towards bigger networks, crosses at most one peering link, and
then descends towards the destination.

At the top sit a handful of **tier-1 networks**. They reach every destination through peering alone and
buy transit from no one.

### Where networks meet

Two networks need a physical meeting place. There are two common forms:

- A <Term id="pni">private network interconnect (PNI)</Term>: a dedicated cable between two networks'
  routers, usually in the same colocation building. It gives capacity reserved for those two networks.
- An <Term id="ixp">internet exchange point (IXP)</Term>: a shared switch in a building where hundreds of
  networks connect. One port lets a network peer with many others. Large exchanges sit in cities such as
  Frankfurt, Amsterdam, London and São Paulo.

Many exchanges run a **route server**. A network opens one BGP session to it instead of one session per
peer, and learns routes from everyone who joined.

<RoutingInterconnectDiagram />

### How a large website connects

A large website or CDN does not sit behind one ISP. It runs <Term id="pop">points of presence (PoPs)</Term>
in dozens of cities. Each PoP connects to many networks at once:

- **Private links** to the biggest access ISPs, where traffic volume justifies a dedicated cable.
- **Exchange ports** to peer with hundreds of smaller networks.
- **Two or more transit providers**, for every destination it cannot reach by peering, and as a fallback.

The result is that the website reaches most users in one AS hop: from its own network straight into the
user's <Term id="isp">ISP</Term>. That is shorter, often cheaper, and gives the website more control.
This change, from a strict hierarchy to big content networks peering directly with access ISPs, is often
called the **flattening** of the internet.

Some providers go one step further and place cache servers inside ISPs' own networks. That is a CDN topic,
covered in [chapter 13](/edge/cdns).

::: details Going deeper: prices, preferences and the 95th percentile
- Transit is commonly billed on the **95th percentile** of five-minute traffic samples over a month. The
  busiest 5% of samples are ignored, so short bursts are free, and sustained peaks set the bill.
- A typical policy, as described for Facebook's PoPs in its 2017 Edge Fabric paper: prefer peer routes over
  transit routes with local preference; break ties by AS path length; then prefer private peers over
  exchange peers over route-server peers.
- **Paid peering** exists: an access ISP may charge a content network for a direct link. Disputes over who
  pays have occasionally congested links between large networks for months.
:::

## Steering outbound traffic by measurement

**In short:** BGP does not know link capacity or latency. Large content networks keep BGP but add a
controller that watches link load and measured performance, and overrides BGP's choice where needed.

A content network sends far more than it receives: videos, images and pages flow out to users. So the
direction it cares about most is outbound, and it controls that direction completely: its own routers
choose which neighbour to hand each packet to.

Two problems appear at scale. First, the preferred route may not have enough capacity. A private link to an
ISP might be 100 Gbit/s, while evening demand to that ISP's users is 150. BGP will happily send all of it
down the preferred link, and the link congests. Second, the preferred route may simply be slower than an
alternative, because BGP's tie-breakers are rough guesses.

The common pattern is an **egress controller**:

1. Collect every route each edge router has learned, not only the best one.
2. Measure traffic per destination prefix, and the capacity of each outgoing link.
3. Predict which links will overload if BGP's choice stands. Move some prefixes to their next-best route
   until every link is under a safe limit.
4. Push the overrides into the routers as ordinary BGP routes with higher local preference. If the
   controller dies, the overrides expire and plain BGP takes over again.
5. Optionally, send a small share of real traffic down alternative routes, measure latency, and prefer
   faster routes.

This keeps BGP as the safety net while adding the two things it lacks: load and performance.

::: details Going deeper: Edge Fabric (Facebook, 2017)
- Facebook's SIGCOMM 2017 paper describes **Edge Fabric**, in production for over four years by then. Each
  PoP had several peering routers connected to transit providers, private peers and exchange peers.
- The paper reports that, without intervention, 10% of egress interfaces across 20 PoPs would at some point
  have been sent about twice their capacity by BGP policy. At all but one studied PoP, more than 80% of
  traffic went to peers rather than transit.
- Every 30 seconds by default, Edge Fabric read all routes through BGP monitoring sessions (BMP), read
  traffic samples (sFlow or IPFIX), projected interface load, and detoured prefixes from interfaces above
  roughly 95% utilisation. It injected overrides over BGP with a high local preference.
- To measure alternatives, it sent a small random share of production flows down other routes. At four
  PoPs, about 5% of destination prefixes could have improved median latency by 20 ms or more on BGP's
  second choice.
- Google described a similar idea, **Espresso**, at the same conference. Both describe 2017 designs, not
  necessarily today's systems.
:::

How the website steers traffic coming **in**, and which PoP each user reaches, is a separate problem. One
answer is anycast, next. The other is DNS, and [chapter 10](/edge/steering) compares them.

## Anycast

**In short:** many sites announce the same address range. BGP then delivers each user's packets to
whichever site is "best" from that user's network, usually a nearby one. If a site withdraws, its users
move to the next-best site.

Normally one prefix is announced from one place. With <Term id="anycast">anycast</Term>, a website announces
the same prefix, such as `203.0.113.0/24`, from every PoP at once. Every router on the internet sees
several routes to it and picks one by the usual BGP rules. Different users' networks pick different sites.

The set of users that ends up at one site is that site's **catchment**. Nobody assigns it directly. It
falls out of thousands of other networks' route choices.

<RoutingAnycastDiagram />

### What anycast gives you

- **One address everywhere.** Clients need no location logic. DNS can return the same answer to everyone,
  so caching problems with location-aware DNS disappear.
- **Proximity, roughly.** Most users reach a nearby site, because nearby networks usually have the
  shortest AS path. But "best" is about policy and AS hops, not distance. A user's ISP may prefer a paid
  route to a faraway site over a peering route to a near one.
- **Failover through routing.** A site that stops announcing the prefix loses its catchment within seconds
  to a minute or so, as BGP converges. No client change and no DNS TTL wait.
- **Attack absorption.** A distributed attack is split across every site, each taking only its catchment's
  share. More on this below.

### What it costs

- **Coarse load control.** You cannot say "send 10% fewer users to Frankfurt". You can stop announcing
  there, announce to fewer neighbours, or make the route look longer by repeating your AS number in the
  path (**AS path prepending**). Each moves an unpredictable chunk of users.
- **Route changes break connections.** Anycast does not keep a user on a site. If a route changes
  mid-connection, the packets arrive at a site that has never heard of the connection. TCP gets a reset;
  QUIC fails too, because the new site has no state for the connection. In practice routes are stable
  for most users for hours, so this is rare, but it happens during maintenance and route churn.
- **Health checks must be local and careful.** Each site must withdraw when it cannot serve. But if every
  site withdraws at once, the service disappears from the internet. The Facebook 2021 outage below is this
  failure.
- **Debugging is harder.** "Which site served this user?" depends on the user's network. You need a way to
  ask the server, such as a response header naming the site.

Anycast is a near-perfect fit for short exchanges such as DNS: the root servers and large public resolvers
use it. Many CDNs and cloud load balancers use it for HTTP too. Others give each PoP its own addresses
and steer users with DNS. Choosing between them is [chapter 10](/edge/steering)'s subject. What happens
inside a site, once packets arrive, is [chapter 11](/edge/l4-load-balancing)'s.

::: details Going deeper: anycast tricks
- **Covering prefix.** Facebook's 2017 paper describes announcing each PoP's own specific prefix from only
  that PoP, plus a broader covering prefix from all PoPs. If the specific route fails to spread somewhere,
  the covering route still delivers the traffic rather than dropping it.
- **Several anycast prefixes with different footprints.** Announcing prefix A from all sites and prefix B
  from a subset gives DNS a lever to shift users between them.
- **Regional anycast.** Announcing a prefix only within one continent's sites limits how far a user can be
  pulled by an odd route.
- Most networks drop IPv4 routes longer than `/24` and IPv6 routes longer than `/48`. So anycast is
  announced in blocks at least that large, and you cannot anycast a single address on its own.
:::

### Try it: which site are you hitting?

Cloudflare's `1.1.1.1` is anycast. It exposes a small diagnostic page that names the site that answered:

```text
$ curl -s https://1.1.1.1/cdn-cgi/trace
ip=198.51.100.23
colo=LHR
http=http/2
...
```

(Trimmed and illustrative.) `colo` is an airport code for the site that served you. Run it from a phone on
mobile data and from home Wi-Fi: the two networks may reach different sites. Many CDNs return a similar
header, so checking response headers is a quick way to see which PoP served a user.

## Route leaks and hijacks

**In short:** BGP believes what neighbours say. A network can announce addresses it does not own (a hijack)
or pass on routes it should have kept to itself (a leak), and traffic follows. Filtering and RPKI catch
some of this, not all.

Because BGP trusts by default, a mistake in one network can redirect traffic for another network's users
worldwide. Two kinds of mistake are common.

A <Term id="bgp-hijack">BGP hijack</Term> is an announcement for a prefix by a network that does not hold
it. Often the hijacker announces a **more specific** prefix. Remember the forwarding rule: when several
prefixes match, routers use the most specific (<Term id="longest-prefix-match">longest-prefix match</Term>).
So a bogus `/24` inside a real `/22` wins everywhere it spreads, regardless of AS path length.

A <Term id="route-leak">route leak</Term> is a real route passed on to the wrong neighbours. A typical case:
a small network has two providers. It learns a route from one and, by mistake, announces it to the other.
The second provider prefers routes from customers, so it sends traffic for that destination through the
small network, which cannot carry it.

Both are usually accidents: a typo, a missing filter, an optimisation tool gone wrong. Some hijacks are
deliberate, to intercept traffic or to steal from users.

### Defences

- **Prefix filters on customers.** A provider accepts from each customer only the prefixes it registered.
  This is the single most effective defence, because most leaks enter through a customer link.
  Registrations live in routing registries (IRR databases), whose data quality is uneven.
- **Maximum-prefix limits.** A session that suddenly carries far more routes than usual is shut down.
- <Term id="rpki">RPKI</Term> (Resource Public Key Infrastructure): address holders publish signed
  statements saying which AS may announce their prefixes, and how specific the announcement may be. Each
  statement is a <Term id="roa">route origin authorisation (ROA)</Term>.
- <Term id="rov">Route origin validation (ROV)</Term>: routers check each announcement against ROAs. A route
  from the wrong origin AS, or more specific than allowed, is **invalid** and is dropped.

RPKI only checks the **origin**: the last AS in the path. It stops accidental hijacks and many more-specific
announcements. It does not stop route leaks, where the origin is correct and only the middle of the path is
wrong. Nor does it stop an attacker who fakes the correct origin at the end of the path. Newer work, such as
ASPA, aims at those.

Adoption has grown fast but is incomplete. ROAs cover roughly two-thirds of announced prefixes as of
mid-2026, by Hurricane Electric's count; IPv4 coverage passed half in May 2024. Several of the largest
transit networks drop invalid routes, which shields much of the internet even where smaller networks do
not validate. Check current figures before quoting them; they change every month.

::: details Going deeper: RPKI details
- RPKI is RFC 6480 (2012); origin validation is RFC 6811 (2013). A ROA lists a prefix, an origin AS, and a
  **maxLength**: the most specific announcement allowed. Setting maxLength looser than needed lets a
  hijacker announce a valid-looking more-specific with your origin forged at the end.
- Routes with no ROA are **not found**, not invalid, and are accepted. ROV helps only for prefixes with
  ROAs.
- **ASPA** (Autonomous System Provider Authorisation) lets an AS publish its providers, so routers can spot
  paths that go "up, down and up again", the shape of a leak. It is an IETF draft, with registries starting
  to accept ASPA objects in late 2025.
- **BGP roles** (RFC 9234, 2022) mark each session as customer, peer or provider, so routers block leaks
  automatically. Support varies by vendor.
- Cloudflare's [isbgpsafeyet.com](https://isbgpsafeyet.com) tests whether your current ISP drops RPKI-invalid
  routes.
:::

### Try it: who announces an address?

```bash
# Which AS announces this address, and from which prefix? (Team Cymru's public service)
whois -h whois.cymru.com " -v 1.1.1.1"

# Is this route RPKI-valid? (RIPEstat public API)
curl -s 'https://stat.ripe.net/data/rpki-validation/data.json?resource=AS13335&prefix=1.1.1.0/24'

# Show AS numbers along the path (mtr; may need root or sudo on some systems)
mtr -z -r -c 10 example.com
```

The `whois` reply gives the origin AS and the prefix that covers the address. The RIPEstat reply contains a
`status` of `valid`, `invalid` or `unknown`. Web tools such as bgp.tools and bgp.he.net show which networks
see a prefix, and through which paths.

## Absorbing volumetric DDoS

**In short:** a large attack is more traffic than any single link can carry. Defences spread it across many
sites with anycast, filter it close to its sources, or divert it through scrubbing centres, and as a last
resort drop all traffic to the target address.

A <Term id="ddos">distributed denial-of-service (DDoS)</Term> attack floods a target from many machines at
once. The volumetric kind aims to fill the target's links: if the pipe into a datacenter is 100 Gbit/s and
the attack sends 500, legitimate packets are lost before any server sees them. No firewall behind that
pipe can help, because the damage happens upstream.

Much of this traffic comes from <Term id="amplification-attack">amplification attacks</Term>. The attacker
sends small UDP requests to public servers, such as open DNS resolvers or badly configured memcached
servers, with the victim's address forged as the source. The servers send much larger replies to the
victim. This works because many networks do not check that outgoing packets carry their own source
addresses. Botnets of hacked routers, cameras and TV boxes add direct floods. The largest publicly
reported attacks reached tens of terabits per second, usually for under a minute (2025).

### The defences

- **Capacity and anycast.** With anycast, each site receives only the attack traffic from its own
  catchment. Spread across a hundred sites, a huge attack becomes many manageable ones. This is the main
  reason large CDNs can absorb what would flatten a single datacenter.
- **Filtering at the edge.** Each site drops traffic that cannot be legitimate before it reaches servers:
  UDP from port 11211 (memcached replies) to a web server, packets to unused ports, known bad patterns.
  Routers and specialised packet processors do this at line rate.
- <Term id="scrubbing-center">Scrubbing centres</Term>: a protection provider announces the victim's
  prefix, often as a more-specific route, so the internet sends traffic to the provider instead. The
  provider filters it and forwards the clean part to the victim through a tunnel or private link.
- **Pushing filters upstream.** BGP can carry filter rules to a provider's routers ("drop UDP to this
  address from port 123"), with a mechanism called **Flowspec**. It stops traffic before it fills your links.
- <Term id="rtbh">Remote triggered blackholing (RTBH)</Term>: the victim tags a route for one address with
  a special community, and providers drop **all** traffic to it. It saves the rest of the network by
  sacrificing that address. The attacker gets the outage they wanted for that one address.

Application-layer attacks, such as floods of valid-looking HTTP requests, are a different problem. They are
covered in [chapter 12](/edge/l7-proxies).

::: details Going deeper: standards
- The well-known BLACKHOLE community is `65535:666` (RFC 7999, 2016). Providers usually accept it only for
  the customer's own prefixes, and often only for `/32` (IPv4) or `/128` (IPv6) routes.
- Flowspec is RFC 8955 (2020). A bad Flowspec rule spreads like any BGP route, so a mistake can drop
  traffic widely.
- Source address validation by networks, so forged sources never leave, is BCP 38 (RFC 2827, 2000).
  Deployment is still incomplete, which is why reflection keeps working.
:::

## Why this matters in real systems

**"The internet is slow" is often a routing change.** A latency jump for users of one ISP, with no change on
your side, is often a BGP change. A peering link went down, and traffic now detours through a transit
provider in another city. Large providers watch latency per destination network and per PoP so they spot
this in minutes, not from user complaints.

**Peering is capacity planning.** Evening peaks to a big access ISP can exceed the private links to it.
Something must decide which traffic overflows to transit, or the links congest and video stalls. That is
the job of egress controllers like Edge Fabric, and of the capacity team adding links ahead of demand.

**Anycast health checks are a shared fate.** A site withdraws its routes when it cannot serve. If the
condition that triggers withdrawal is shared by all sites, such as "cannot reach the backbone" or a bad
config push, every site withdraws together. Design withdrawals so some sites always stay announced.

**Protect your prefixes before an incident.** Publish ROAs with tight maxLength values. Announce the most
specific prefixes you can (`/24` for IPv4), so nobody can win with a more specific one. Monitor public BGP
data for unexpected origins of your prefixes, and keep provider contacts ready.

**ML and cloud traffic follow the same rules.** A model-serving endpoint behind a cloud's global load
balancer usually sits behind anycast addresses. Users in a region with poor peering to that cloud see worse
latency, whatever the GPUs do. Cloud providers' "premium" and "standard" network tiers differ mainly in
where traffic enters or leaves their backbone.

## Where it breaks

**Pakistan Telecom and YouTube, 2008: a more-specific wins.** On 24 February 2008, Pakistan Telecom
announced `208.65.153.0/24`, intending to block YouTube inside Pakistan. YouTube announced
`208.65.152.0/22`. Pakistan Telecom's provider, PCCW, passed the route to the rest of the internet, and the
more-specific `/24` won almost everywhere. YouTube was unreachable for most of the world for about two
hours. YouTube fought back by announcing the `/24` and then two `/25`s, until PCCW withdrew the route.
**Lesson:** without customer filtering, one network's local block becomes a global outage.
([RIPE NCC case study, 2008](https://www.ripe.net/publications/news/industry-developments/youtube-hijacking-a-ripe-ncc-ris-case-study))

**Amazon Route 53, 2018: a hijack to steal cryptocurrency.** On 24 April 2018, for about two hours, eNet
(AS10297) announced more-specific `/24`s from Amazon's Route 53 DNS address space. Hurricane Electric passed
them on; several other carriers rejected them. Some users' resolvers then got answers from the attacker's DNS servers, which sent
`myetherwallet.com` to a phishing site. The site had an invalid TLS certificate; users who clicked past
the warning lost cryptocurrency. **Lesson:** a hijack of a DNS provider redirects every site it serves, and
TLS certificate checks are the last line of defence.
([Cloudflare, 2018](https://blog.cloudflare.com/bgp-leaks-and-crypto-currencies/))

**Verizon, 2019: a route leak through a customer.** On 24 June 2019, a small ISP's "BGP optimizer" tool
created more-specific routes for many networks' prefixes, including Cloudflare's. A customer of that ISP
leaked them to Verizon, which accepted and spread them. Traffic for large parts of the internet funnelled
through small networks that could not carry it, for hours. **Lesson:** filter customers'
announcements, and never let route-generating tools speak to the outside world.
([Cloudflare, 2019](https://blog.cloudflare.com/how-verizon-and-a-bgp-optimizer-knocked-large-parts-of-the-internet-offline-today/))

**Facebook, 2021: every site withdrew at once.** On 4 October 2021, a maintenance command cut Facebook's
backbone. Its DNS servers, announced by anycast, are designed to withdraw their routes when they cannot
reach the datacenters. Every site did so at the same moment, so Facebook's names stopped resolving
worldwide for about six hours. **Lesson:** an anycast health check that can trigger at every site together
turns redundancy into a single switch.
([Facebook engineering, 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/))

**GitHub, 2018: memcached amplification.** On 28 February 2018, GitHub received an attack peaking at about
1.35 Tbit/s, made of amplified memcached replies. It moved its traffic to its scrubbing provider, Akamai,
by withdrawing its BGP announcements from its transit providers, and the attack was mitigated within about ten minutes. **Lesson:**
have a tested, fast path to diverting traffic through scrubbing before you need it.
([GitHub, 2018](https://github.blog/news-insights/company-news/ddos-incident-report/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. How does a packet from my phone find its way to a website's server across different companies' networks?
Each network is an autonomous system. Networks connect in pairs and use BGP to tell each other which
address ranges they can reach, and through which chain of networks. Every router builds a table from these
announcements. Each router forwards the packet using the most specific matching prefix, hop by hop.

The phone's ISP has learned a route to the website's prefix, from a peer, an exchange or a transit
provider. It hands the packet to that neighbour, which does the same, until it reaches the website's
network.

**Senior add-on:** route choice is driven by business policy (local preference) before path length, and
ignores latency and load. Paths are asymmetric, and each network decides only its own next hop.
:::

::: details 2. What is the difference between transit and peering? Why would a large website peer?
Transit is paid: a provider carries your traffic to and from the whole internet. Peering is usually free:
two networks exchange traffic only between their own users and customers.

A large website peers to reach users directly, in one hop into their ISP. That is cheaper than paying
transit for the volume, usually faster, and gives more control and visibility.

**Senior add-on:** peering capacity is limited and demand is bursty, so large networks need something to
overflow traffic to other routes when a peering link fills. Facebook's 2017 Edge Fabric paper describes
such a controller. Peering also has costs: ports, colocation, and negotiation.
:::

::: details 3. How does anycast work? What happens to a TCP connection when the route changes?
Many sites announce the same prefix. Each network on the internet picks its best BGP route, so each user
reaches one site, usually a nearby one. If a site withdraws its announcement, its users move to the
next-best site as BGP converges.

If a route changes in the middle of a connection, the packets arrive at a different site that has no
record of it. The connection breaks, usually with a reset. Routes are stable enough for most users that
this is rare, which is why TCP over anycast works in practice.

**Senior add-on:** "best" is about AS hops and policy, so catchments can be far from optimal. Load control
is coarse: prepending, selective announcement, or withdrawal. Sites need local, independent health checks
that cannot all trip together.
:::

::: details 4. Design how a new global service connects to the internet.
Start with PoPs in the regions where users are. In each, buy two or more transit providers for
reachability and redundancy. Add peering at local exchanges, and private links to the largest access ISPs
as traffic grows.

Get your own address space and AS number, publish ROAs, and announce `/24`s or larger. Choose between
anycast addresses at every PoP and per-PoP addresses with DNS steering. Plan DDoS defence: enough edge
capacity, filtering, a scrubbing provider on standby, and blackholing as the last resort.

**Senior add-on:** add monitoring of public BGP for your prefixes, per-ISP latency dashboards, and an
egress controller once peering links start to fill. Make sure no single automation can withdraw every
PoP's routes at once.
:::

::: details 5. Users of one ISP in one country report high latency since this morning. Nothing changed on your side. How do you find out why?
First, confirm and scope it with real-user data: which ISP, which PoP, since when. Then compare the paths.
Run traceroute or `mtr` from your PoP towards those users, and ideally from their side using public
measurement probes or a looking glass in that ISP.

Look at BGP: has the route your PoP uses to reach that ISP changed? A peering link might be down, sending
traffic through a transit provider via another city. Also check the reverse direction, which can differ.

**Senior add-on:** with anycast, check whether those users now reach a different, farther PoP. Fixes
include contacting the ISP, adjusting local preference, prepending or withdrawing announcements, or
steering those users with DNS while the issue lasts.
:::

::: details 6. What is the difference between a route leak and a hijack? What does RPKI protect against?
A hijack is an announcement for a prefix by a network that does not hold it. A leak is a real route passed
to neighbours who should not have received it, so traffic detours through the wrong network.

RPKI lets address holders publish which AS may originate their prefixes, and how specific the routes may
be. Routers doing route origin validation drop routes from the wrong origin. That stops most accidental
hijacks and more-specific hijacks.

**Senior add-on:** RPKI checks only the origin. It does not stop leaks, where the origin is correct, or an
attacker who forges the right origin. Customer prefix filters, ASPA and BGP roles target those. Loose
maxLength settings weaken ROAs.
:::

::: details 7. Your prefix is being hijacked right now. What do you do?
Confirm it with public BGP data: which AS is announcing, which prefix, how widely it is seen. Announce
more-specific prefixes yourself, down to `/24`, so longest-prefix match brings traffic back where your
announcements reach.

Contact your transit providers and the hijacker's upstreams to filter the bad route. Make sure your ROAs
exist and are tight, so networks doing validation drop the hijack.

**Senior add-on:** if the hijacked prefix is already a `/24`, you cannot win by being more specific, because
most networks drop longer routes. Then RPKI and upstream filtering are the only levers. YouTube in 2008
used more-specifics to recover.
:::

::: details 8. How would you absorb a multi-terabit DDoS attack?
No single site can, so spread it. Anycast the service across many sites, so each takes only its catchment's
share. Filter obviously bad traffic at the edge, such as UDP amplification replies to a web service.

For a site with limited capacity, divert traffic through a scrubbing provider by BGP announcement. Use
Flowspec to push filters to providers' routers, and blackholing for one address as a last resort.

**Senior add-on:** the bottleneck is usually links, not servers, so filtering must happen before the
congested link. Know which defences cost legitimate traffic: blackholing drops everything for the target.
:::

## Common misconceptions

- **"BGP picks the fastest path."** It picks by business policy, then AS path length. It does not measure
  latency or load.
- **"Anycast sends users to the nearest site."** To the site with the best BGP route from their network,
  which is usually but not always nearby.
- **"Anycast breaks TCP."** It works in practice because routes are stable for most users. Connections
  break only when a route changes mid-connection.
- **"RPKI stops route leaks."** It checks only the origin AS. Leaks keep the correct origin.
- **"The path back is the same as the path there."** Each direction is chosen by different networks.
- **"A firewall stops volumetric DDoS."** The attack fills the links before reaching the firewall.

## Key takeaways

- The internet is a mesh of **autonomous systems** that exchange routes with **BGP**. Routes are chosen by
  business policy first, then by the number of networks, not by speed.
- Networks either buy **transit** or **peer**. Large websites peer directly with access ISPs from many
  PoPs, and steer outbound traffic with controllers that see load and latency.
- **Anycast** announces one prefix from many sites; BGP picks each user's site. It gives simple failover
  and spreads attacks, at the cost of coarse control.
- BGP trusts by default. **Leaks and hijacks** redirect traffic; customer filters and **RPKI** reduce
  them, and RPKI only checks the origin.
- Volumetric **DDoS** is absorbed by spreading (anycast), filtering early, scrubbing, and blackholing as a
  last resort.

## Review

<Flashcards id="internet-routing" :cards="cards" />

<MarkDone id="internet-routing" />

## Sources

- [RFC 4271: A Border Gateway Protocol 4 (BGP-4)](https://www.rfc-editor.org/rfc/rfc4271) (RFC, 2006)
- [RFC 6480: An Infrastructure to Support Secure Internet Routing](https://www.rfc-editor.org/rfc/rfc6480) (RFC, 2012)
- [RFC 6811: BGP Prefix Origin Validation](https://www.rfc-editor.org/rfc/rfc6811) (RFC, 2013)
- [RFC 9234: Route Leak Prevention and Detection Using Roles](https://www.rfc-editor.org/rfc/rfc9234) (RFC, 2022)
- [RFC 7999: BLACKHOLE Community](https://www.rfc-editor.org/rfc/rfc7999) (RFC, 2016)
- [RFC 8955: Dissemination of Flow Specification Rules](https://www.rfc-editor.org/rfc/rfc8955) (RFC, 2020)
- [RFC 2827 (BCP 38): Network Ingress Filtering](https://www.rfc-editor.org/rfc/rfc2827) (RFC, 2000)
- [Engineering Egress with Edge Fabric](https://research.facebook.com/publications/engineering-egress-with-edge-fabric/) (paper, SIGCOMM 2017)
- [RPKI and ASPA adoption report](https://bgp.he.net/report/rpki_and_aspa) (live data, Hurricane Electric, checked 2026)
- [Exploring the latest RPKI ROV adoption numbers](https://www.kentik.com/blog/exploring-the-latest-rpki-rov-adoption-numbers/) (engineering blog, Kentik, 2023)
- [YouTube hijacking: a RIPE NCC RIS case study](https://www.ripe.net/publications/news/industry-developments/youtube-hijacking-a-ripe-ncc-ris-case-study) (case study, 2008)
- [BGP leaks and cryptocurrencies](https://blog.cloudflare.com/bgp-leaks-and-crypto-currencies/) (engineering blog, Cloudflare, 2018)
- [How Verizon and a BGP optimizer knocked large parts of the internet offline](https://blog.cloudflare.com/how-verizon-and-a-bgp-optimizer-knocked-large-parts-of-the-internet-offline-today/) (engineering blog, Cloudflare, 2019)
- [More details about the October 4 outage](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) (Facebook engineering blog, 2021)
- [February 28th DDoS incident report](https://github.blog/news-insights/company-news/ddos-incident-report/) (GitHub blog, 2018)
- [2025 Q4 DDoS threat report](https://blog.cloudflare.com/ddos-threat-report-2025-q4/) (report, Cloudflare, 2026)
