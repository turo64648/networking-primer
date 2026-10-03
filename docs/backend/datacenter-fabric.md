---
title: "15. The Datacenter Fabric"
---

<script setup>
import { cards } from './datacenter-fabric-review'
</script>

# 15. The Datacenter Fabric

Once a request reaches the datacenter, it still has to cross the network inside the building to reach a
server, and every call that server makes crosses it again. Interviewers for infrastructure and SRE roles probe
how that network is built, why it rarely becomes the bottleneck, and what happens when part of it fails.

::: info Before you start
Packets carry addresses, and each router forwards them by looking up the destination in a table
([chapter 2](/foundations/packets-and-links)). Every link has a maximum packet size, and packets that are too
big can vanish silently ([chapter 2](/foundations/packets-and-links#mtu-fragmentation-and-black-holes)).
Networks tell each other which addresses they can reach using BGP ([chapter 9](/internet/internet-routing)).
A router can spread traffic over several equal paths by hashing each connection's addresses and ports
([chapter 11](/edge/l4-load-balancing)).
:::

## Why datacenters stopped building trees

**In short:** most datacenter traffic flows between servers, not to the internet. A tree of ever-bigger
switches chokes at the top. A mesh of many identical small switches gives every pair of racks many equal
paths, and grows by adding more boxes.

Picture a page load at a large website. The request arrives from the internet once. The first application
server then calls dozens of other services: a cache, a database, a ranking service, a feature store. Each
answer travels server to server inside the building. Traffic between servers is often called
**east-west** traffic; traffic to and from the internet is **north-south**. Large operators report east-west
traffic many times larger than north-south.

The classic design was a **tree**. Servers in a rack plug into a switch at the top of the rack. Those
switches connect to a pair of bigger aggregation switches, which connect to a pair of huge core switches.
This worked when most traffic went up and out to users. For east-west traffic it fails in three ways:

- **The top is a bottleneck.** Two racks under different aggregation switches must go through the core.
  The core has far less capacity than all the servers below it combined.
- **Growth means bigger boxes.** To add capacity, you buy a larger, more expensive core switch. There is a
  largest box you can buy.
- **Failures are big.** Losing one of two core switches halves the capacity of the whole building.

Datacenters replaced the tree with a pattern from 1950s telephone exchanges, the
<Term id="clos-topology">Clos network</Term>. In its common two-tier form, called
<Term id="leaf-spine">leaf-spine</Term>, it looks like this:

- Each rack has one switch, the <Term id="top-of-rack-switch">top-of-rack (ToR) switch</Term>, also called
  a **leaf**.
- Above the leaves sits a row of **spine** switches.
- **Every leaf connects to every spine**, and leaves never connect to each other, nor spines to each other.

<FabricLeafSpineDiagram />

Now any two racks are exactly two switch hops apart: leaf, any spine, leaf. With four spines there are four
equal paths, and the network spreads traffic across all of them. That spreading is
<Term id="ecmp">equal-cost multi-path (ECMP)</Term> routing, covered below. The design has three properties
that interviewers want to hear:

- **Scale out, not up.** All switches are the same small, cheap model. Need more capacity between racks?
  Add spines. Need more racks? Add leaves, up to the spines' port count.
- **Predictable latency.** Every rack-to-rack path has the same number of hops.
- **Small failures.** Losing one of N spines removes 1/N of the capacity between racks. Nothing becomes
  unreachable.

### Growing past one tier of spines

A spine switch has a fixed number of ports, say 64. That caps a two-tier fabric at 64 leaves. Bigger
buildings add a third tier. Racks are grouped into **pods**: each pod is a small leaf-spine fabric of its
own. The pods' upper switches then connect to a layer of **super-spines**, again every pod to every
super-spine plane. Any two racks in different pods are now at most four switch hops apart, with very many
equal paths. The same rules apply at each tier; it is a Clos network built from Clos networks.

::: details Going deeper: Clos, fat trees and two published fabrics
- **Origin.** Charles Clos described multistage non-blocking switching networks for telephone exchanges in
  1953. A <Term id="bisection-bandwidth">bisection bandwidth</Term> view is the useful modern measure: cut
  the servers into two equal halves, and ask how much traffic can cross the cut. A non-blocking Clos lets
  every server send at full speed to the other half at once.
- **Fat tree.** Al-Fares, Loukissas and Vahdat (SIGCOMM 2008) showed how to build a full-bisection fabric
  from identical commodity switches. A three-tier "k-ary fat tree" built from k-port switches connects
  k³/4 servers, for example about 27,000 servers from 48-port switches.
- **Facebook, 2014.** Facebook's 2014 post on its "data center fabric" describes pods of 48 racks, each with
  four "fabric switches", and four independent planes of spine switches, each scalable to 48 switches.
  Each top-of-rack switch had 4 × 40G uplinks. The post says machine-to-machine traffic was several orders
  of magnitude larger than traffic to the internet. Its 2019 F16 post describes the next step: each rack
  connected to 16 planes over 100G links, for four times the capacity of the earlier design.
- **Google, 2015 and 2022.** Google's 2015 Jupiter paper describes a decade and five generations of Clos
  fabrics built from merchant switch chips with a logically centralized control plane. The 2015 generation
  connected more than 30,000 servers at 40 Gb/s, about 1 Pb/s in total. The 2022 update describes
  replacing the spine layer with optical circuit switches, which connect aggregation blocks directly in a
  mesh. Google reported about 30% lower cost and 40% lower power than the earlier design. Treat these as
  dated descriptions, not the current setup.
:::

## Oversubscription: how much the fabric can carry

**In short:** a rack switch usually has less capacity going up to the spines than going down to its servers.
The ratio is the oversubscription. It is a cost decision, and it decides what happens when many racks talk at
once.

Take a top-of-rack switch with 48 servers at 25 Gb/s each. That is 1.2 Tb/s facing down. Suppose it has four
100 Gb/s uplinks to the spines: 0.4 Tb/s facing up. If every server sent to other racks at full speed, only a
third of that traffic would fit. That ratio, 3:1 here, is called
<Term id="oversubscription">oversubscription</Term>. A fabric with as much capacity up as down is
**non-blocking**, or 1:1.

Oversubscription is a bet that servers do not all send off-rack at full speed at the same time. For most web
workloads, the bet holds: traffic is bursty, and much of it is small requests. It saves a lot of money,
because spines and optics are a large share of a fabric's cost. Ratios around 2:1 to 4:1 at the rack are
common published figures; Facebook's 2014 fabric started at 4:1 between racks, with room to grow to 1:1.

When the bet fails, packets queue at the uplinks and then drop. Some workloads break it on purpose:

- **Bulk data movement**, such as backups, data pipelines and rebalancing a storage cluster.
- **Machine learning training**, where thousands of accelerators exchange gradients at the same moment.
  These fabrics are usually built non-blocking, often as a separate network using RDMA
  ([OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking)).

There is also a quieter pattern: many senders answering one receiver at once. A service fans a query out
to 100 servers, and all 100 replies arrive at the same instant. They converge on the one link to the
caller's rack and overflow its small switch buffer. The replies lose packets, and TCP waits for a timeout
before resending. This is called <Term id="incast">incast</Term>. It shows up as a tail-latency spike on
fan-out calls, even though average link use looks low.

::: details Going deeper: incast and datacenter congestion control
- Datacenter switch chips often have shallow buffers, a few to tens of megabytes shared by all ports, so a
  burst of replies can overflow them in microseconds.
- A lost packet with no further data behind it waits for TCP's retransmission timeout. Linux's minimum is
  200 ms, which dwarfs a sub-millisecond request. Some operators lower it inside the datacenter.
- DCTCP (RFC 8257, 2017) has switches mark packets with Explicit Congestion Notification (ECN) when queues
  start to build. Senders slow down in proportion to how many packets are marked, keeping queues short
  before they overflow. The RFC limits it to networks under one administrator.
- Application fixes: limit fan-out width, add small random delays to replies, or fetch in batches.
:::

## ECMP, hashing and elephant flows

**In short:** every switch hashes each packet's addresses and ports to pick one of its equal uplinks, so one
connection always takes one path. This keeps packets in order, but a few huge connections can pile onto the
same link while others sit idle.

### How a switch picks a path

A leaf with four uplinks sees four equally good routes to another rack. It picks one per packet by hashing
the packet's <Term id="four-tuple">source and destination addresses and ports</Term> (plus the protocol)
and taking the result modulo four. All packets of one connection share these fields, so they hash the same
way and follow one path. Different connections land on different paths, roughly evenly. Chapter 11 covered
the same mechanism when routers spread traffic across load balancers
([chapter 11](/edge/l4-load-balancing)).

Why not spread packets evenly, one by one? Because paths differ slightly in queue length, so packets would
arrive out of order. TCP reads a run of out-of-order packets as loss and slows down. Per-connection hashing
avoids that.

In the fabric, a hash change is harmless for correctness. When a link fails and the switch rehashes,
some connections move to another path. Switches keep no state about connections, so nothing breaks, unlike a
load balancer that must find the same backend again. The connection may see a brief burst of reordering or
loss.

### Elephants and mice

Most datacenter connections are small and short: an RPC, a cache read. Call them **mice**. A few are long and
huge, such as a backup or a replica copy moving gigabytes. Those are
<Term id="elephant-flow">elephant flows</Term>.

Hashing balances the **number** of connections across paths, not the **bytes**. Two elephants that hash onto
the same 100 Gb/s uplink share it at about 50 Gb/s each, while the other three uplinks run nearly empty. The
mice that happen to share that link wait behind the elephants' queues and see high latency. Averages look
fine; tail latency does not.

Two consequences come up in interviews:

- **One connection cannot go faster than one link.** A single TCP connection over a fabric of 100 Gb/s links
  tops out at 100 Gb/s, whatever the total capacity. Bulk transfer tools open several parallel connections
  for this reason, and so that the hash spreads them.
- **Where load comes from matters.** A link that is hot at 95% while its siblings sit at 30% is a hashing
  problem, not a capacity problem. Adding spines will not fix it.

::: details Going deeper: fixing ECMP's blind spots
- **Hash polarization.** If every tier uses the same hash function and inputs, the upper tier can receive
  only flows that already hashed alike and reuse just a few of its links. Switches mix in a per-device seed
  to avoid it.
- **Weighted ECMP.** After a link failure, some paths have less capacity than others. Plain ECMP still
  splits evenly. Weighted ECMP gives paths shares in proportion to their capacity.
- **Flowlets.** A burst of packets separated from the next by a gap longer than the path delay difference
  can switch path without reordering. CONGA (SIGCOMM 2014) and later designs use flowlets to move traffic
  off congested paths.
- **Packet spraying and adaptive routing.** Some fabrics, especially ML training fabrics, spray packets of
  one flow across all paths and reorder at the receiver, or let switches pick the least loaded path.
- **Overlays and entropy.** Encapsulated traffic (see below) would all look like one flow between two
  tunnel endpoints. Encapsulations put a hash of the inner packet into the outer source port, so the
  fabric can still spread it.
:::

## BGP inside the datacenter

**In short:** many large fabrics run BGP between every pair of connected switches, with each switch or
tier in its own private network number. BGP was built for the internet, but its simplicity and per-link
control suit huge, regular fabrics.

Every switch needs a routing table that says how to reach every rack's addresses. Switches build it by talking
to their neighbours with a routing protocol. Inside one organization, the textbook choice is a link-state
protocol such as OSPF or IS-IS: every router floods a description of its links to all others, and each
computes the full map.

At datacenter scale, many operators use <Term id="bgp">BGP</Term> instead, the protocol networks use to
exchange routes across the internet. RFC 7938 (2016), written by engineers from Facebook, Microsoft and
Arista, describes the pattern:

- **Only external BGP, on every link.** Each leaf runs a BGP session with each spine it connects to. There is
  no second protocol.
- **Network numbers as tiers.** Each switch, or each tier, gets its own private
  <Term id="autonomous-system">autonomous system (AS) number</Term>, as if it were a separate network. All
  spines in one fabric typically share one number.
- **Each leaf announces its rack's prefix.** For example, `10.1.7.0/24`. Every other leaf learns that prefix
  from each spine and installs all those routes as equal paths.

Why BGP?

- **Smaller blast radius.** In a link-state protocol, every link change floods to every router, which all
  recompute. In BGP, a change spreads only as far as it alters someone's best path.
- **One protocol, simple state.** BGP runs on plain point-to-point links. Each switch has a handful of
  sessions with known neighbours, which is easy to monitor and debug.
- **Per-link policy.** Operators can filter or de-prefer routes on any session. That is how they drain
  switches, as described below.

Sharing one AS number across all spines has a neat side effect. BGP rejects any route whose AS path already
contains its own number, as a loop guard. So a leaf can never learn a path that goes spine, leaf, spine:
the second spine sees its own number and drops it. Routes stay strictly up-then-down.

::: details Going deeper: RFC 7938 details
- **Private AS numbers.** The 16-bit private range 64512–65534 runs out in large fabrics, so the RFC also
  points to the 32-bit private range. Top-of-rack numbers can be reused across clusters, with a BGP option
  that accepts its own AS in a path.
- **Multipath across AS paths.** Routes to the same prefix arrive with different AS paths (through different
  spines). Switches need a "multipath relax" setting to treat them as equal for ECMP.
- **Fast failure detection.** BGP's default timers detect a dead neighbour in tens of seconds. On
  point-to-point fibre, the session drops as soon as the link goes down. For failures where the link stays
  up, operators add Bidirectional Forwarding Detection (BFD), which detects loss in well under a second.
- **Centralized override.** Facebook's 2014 post describes "distributed control, centralized override":
  switches run BGP normally, and a central controller can inject routes to steer traffic. Google's Jupiter,
  per its 2015 paper, instead used a centralized control plane of its own.
- Many fabrics now run BGP sessions over IPv6 link-local addresses, so links need no configured addresses
  ("BGP unnumbered").
:::

## Overlays: VXLAN

**In short:** an overlay wraps each server or VM packet inside another packet addressed between two
switches or hosts. The fabric only routes between those endpoints, and tenants get their own private networks
that can span any rack.

The fabric above routes by rack prefix. That raises two problems for clouds and virtualized clusters:

- **Tenants overlap.** Two customers both use `10.0.0.0/16`. The fabric cannot route both.
- **VMs move.** A VM migrated to another rack should keep its IP address. But that address belongs to the old
  rack's prefix.

The old answer was to stretch one big layer-2 network (one broadcast domain) across many racks with VLANs.
That brings back the problems Clos removed: broadcasts flood everywhere, and loop-prevention protocols block
redundant links instead of using them all.

The modern answer is an <Term id="overlay-network">overlay network</Term>. The physical leaf-spine fabric,
called the <Term id="underlay-network">underlay</Term>, stays a plain routed IP network. On top of it,
each tenant's packet is wrapped, by <Term id="encapsulation">encapsulation</Term>, in an outer packet
addressed to the machine where the destination lives. The fabric routes the outer packet like any other.
The far end unwraps it and delivers the original.

The common format is <Term id="vxlan">Virtual Extensible LAN (VXLAN)</Term>. The device that wraps and
unwraps is a <Term id="vtep">VXLAN tunnel endpoint (VTEP)</Term>. It can be the top-of-rack switch, in
hardware, or software on each host: the hypervisor in a cloud, or the network plugin in a Kubernetes
cluster. Each outer packet carries a 24-bit network identifier, so the fabric can tell about 16 million
tenant networks apart, against 4,094 for VLANs.

A VTEP must know which VTEP to send each destination to. Early VXLAN learned this by flooding unknown
traffic over multicast. Modern fabrics distribute the mapping with BGP itself, using an extension called
<Term id="evpn">EVPN</Term>: each VTEP announces "these MAC and IP addresses live behind me".

::: details Going deeper: VXLAN, EVPN and Geneve
- **VXLAN** is RFC 7348 (2014). It runs over UDP, destination port 4789. The outer UDP source port is
  derived from a hash of the inner packet, which gives ECMP the variety it needs.
- **EVPN** is RFC 7432 (2015) for MPLS networks; RFC 8365 (2018) applies it to overlays such as VXLAN.
  It also lets one server connect to two leaves for redundancy without older proprietary protocols.
- **Geneve** (RFC 8926, 2020) is a newer encapsulation with extensible option fields, used by some
  software-defined networking stacks. Clouds often use their own encapsulations and do not always publish
  them.
- The [chapter 16](/backend/reaching-the-service) story continues from here: virtual IPs, service
  discovery and meshes all sit on top of this layer.
:::

## MTU and encapsulation overhead

**In short:** VXLAN adds 50 bytes to every packet. Either the underlay carries bigger packets, or every
workload must use a smaller maximum size. Get it wrong and small requests work while large ones hang.

Every link has a <Term id="mtu">maximum transmission unit (MTU)</Term>: the largest packet it carries,
1,500 bytes by default on Ethernet. Chapter 2 explained what goes wrong when a packet is too big: a router
drops it and should send back an error, and if that error is filtered, the packet vanishes
([chapter 2](/foundations/packets-and-links#mtu-fragmentation-and-black-holes)).

Encapsulation makes every packet bigger. VXLAN over IPv4 adds an outer Ethernet header (14 bytes), outer IP
header (20), UDP header (8) and VXLAN header (8): 50 bytes. A full 1,500-byte packet from a VM becomes a
1,550-byte IP packet on the underlay.

<FabricVxlanMtuDiagram />

There are two fixes, and real fabrics usually use the first:

- **Raise the underlay MTU.** Configure every fabric link for <Term id="jumbo-frame">jumbo frames</Term>,
  typically around 9,000 bytes. Inner packets keep their 1,500 bytes, with plenty of room.
- **Lower the inner MTU.** Give VMs or containers an MTU of 1,450. Kubernetes network plugins in VXLAN
  mode commonly do this. It works anywhere, at a small cost in efficiency.

The failure mode is the classic black hole. The TCP handshake and small requests fit, so health checks pass.
A large response fills full-size packets, which are dropped somewhere in the underlay. The connection
stalls until it times out. The symptom is "small API calls work, big downloads or large queries hang".
It is often limited to one path, because one misconfigured link sits behind only some ECMP choices.

The usual guards: make the underlay MTU large and **uniform** everywhere, check it with automation after
every change, and clamp the TCP maximum segment size at tunnel edges
(<Term id="mss-clamping">MSS clamping</Term>, chapter 2).

::: details Going deeper: the exact numbers
- 50 bytes is for an IPv4 outer header. An IPv6 outer header is 20 bytes bigger, so 70. A VLAN tag on the
  inner frame adds 4 more.
- Jumbo-frame sizes vary by vendor: 9,000 and 9,216 are common. Some clouds offer around 9,000 bytes inside
  a virtual network (AWS offers 9,001 within a VPC, as of 2025), but traffic leaving that network falls back
  to 1,500 or less.
- Test a path's MTU from Linux with a "don't fragment" ping. The payload is the MTU minus 28 bytes of IP and
  ICMP headers: `ping -M do -s 1472 10.0.0.2` tests 1,500; `ping -M do -s 8972` tests 9,000. On macOS use
  `ping -D -s 1472`.
:::

## Failure domains and draining a switch

**In short:** design so that any single switch, rack or power feed fails without visible impact, and take
switches out of service on purpose before working on them. Most fabric outages happen during changes, not
from hardware alone.

### Failure domains

A <Term id="failure-domain">failure domain</Term> is the set of things that fail together when one component
fails. In a fabric:

- **One top-of-rack switch** usually takes its whole rack offline, unless servers connect to two leaves.
  Schedulers therefore spread a service's replicas across racks.
- **One spine** removes 1/N of the capacity between racks. With 4 spines that is 25%; with 16, about 6%.
  This is a reason to build wider fabrics with more, smaller spines.
- **A power feed, a row, a pod, a whole plane** can each fail together. Placement rules spread replicas
  across these too.

The hardest failures are not clean. A link that drops 1% of packets, or one bad optic that corrupts some
frames, keeps routing up and passes basic checks. This is a <Term id="gray-failure">gray failure</Term>.
Because of ECMP, only connections that hash onto the bad path suffer. A service sees a small fraction of
slow or failed requests with no pattern by client or server. Operators find these with continuous probing
between many pairs of servers, varying ports to cover different paths, and by watching error counters on
every interface.

### Draining a switch

To replace a spine or upgrade its software, operators first <Term id="drain">drain</Term> it: they move
traffic off it before touching it. In a BGP fabric, the switch makes its routes less attractive. It can
lengthen its AS path, or tag routes with a "graceful shutdown" marker that neighbours treat as lowest
preference. Neighbours shift traffic to the other spines without dropping packets. Only then does work
start.

A safe drain follows a fixed sequence, usually run by automation:

1. **Check capacity first.** Will the remaining spines carry the peak traffic? Is anything else in the same
   failure domain already drained or broken? Refuse if not.
2. **Drain and verify.** Apply the drain, then confirm the switch's traffic counters fall to near zero.
3. **Do the work.**
4. **Undrain and verify.** Check links, sessions, error counters and the MTU before letting traffic back,
   one switch at a time.

The safety check in step 1 is the most important part. A drain tool that can drain everything at once is a
single command away from a full outage.

## Why this matters in real systems

**Tail latency hides in the fabric.** A fan-out service calls 100 backends and waits for the slowest. One
elephant flow on one uplink, or one lossy optic behind one ECMP path, is enough to raise its p99. When p99
rises with no change in code, look at the fabric's hottest links and error counters, not averages.

**Placement is a network decision.** Putting all replicas of a service in one rack makes the top-of-rack
switch a single point of failure. Putting a chatty pair of services in different pods sends their traffic
through the most oversubscribed tier. Schedulers at large companies know the fabric's topology for this
reason.

**Bulk jobs need limits.** A data pipeline that copies petabytes at full speed can fill uplinks and hurt
latency-sensitive services that share them. Teams rate-limit bulk transfers, run them in a lower-priority
traffic class, or put them on separate capacity.

**ML training changes the fabric.** Training jobs send synchronized bursts of huge flows between
accelerators. They are built as separate non-blocking fabrics with RDMA, often with packet spraying or
adaptive routing instead of plain ECMP
([OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking)).

**How to look at it (Linux):**

```bash
ip -d link show                       # MTU of each interface; VXLAN devices show "vxlan id ... dstport 4789"
ping -M do -s 1472 10.0.2.15          # does a full 1,500-byte packet reach the host without fragmenting?
ip -s link show eth0                  # RX/TX errors and drops on one interface
# Try different ECMP paths by changing the source port; one slow port suggests one bad path
for p in 40001 40002 40003 40004; do
  curl --local-port $p -o /dev/null -s -w "$p %{time_connect}s\n" http://10.0.2.15/
done
```

Illustrative output of the loop, where one path is lossy:

```text
40001 0.000412s
40002 0.000398s
40003 1.004871s      # SYN lost once and resent after about 1 s: suspect the path this hash picks
40004 0.000405s
```

## Where it breaks

**Google, 2016: most failures happen during changes.** Google's SIGCOMM 2016 paper "Evolve or Die" analysed
103 post-mortems of failures in its datacenter and wide-area networks over two years. It found that a large
share happened while a management operation, such as a drain or upgrade, was in progress nearby. Nearly 90%
had high impact, such as heavy packet loss or black holes to whole datacenters or parts of them.
**Lesson:** the riskiest moment for a fabric is maintenance, so make drains automatic, checked and
reversible. ([ACM, 2016](https://dl.acm.org/doi/10.1145/2934872.2934891))

**AWS us-east-1, 2021: congestion between two networks.** On 7 December 2021, an automated activity to
scale capacity triggered a surge of connection activity. It overwhelmed the devices connecting AWS's internal
network, which hosts services such as monitoring and internal DNS, to its main network. The congestion also
impaired monitoring, so engineers had less visibility while fixing it. The event lasted about seven hours.
**Lesson:** links between network domains are oversubscribed choke points, and your monitoring should not
depend on the network it monitors. ([AWS, 2021](https://aws.amazon.com/message/12721/))

**Facebook, 2021: a capacity check that took everything down.** On 4 October 2021, a command meant to assess
the capacity of Facebook's global backbone instead disconnected all its datacenters. Facebook wrote that an
audit tool should have stopped the command, but a bug let it through. This was the backbone, not the
datacenter fabric, but the same rule applies to drains. **Lesson:** maintenance tooling needs a hard limit on
how much capacity it can remove at once.
([Facebook engineering, 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Why do modern datacenters use leaf-spine instead of a traditional tree of switches?
Most traffic in a datacenter is between servers. In a tree, traffic between racks in different branches
goes through a few core switches, which become the bottleneck. Growing means buying bigger core boxes, and
losing one core switch loses half the capacity.

In leaf-spine, every rack switch connects to every spine. Any two racks are two hops apart with many equal
paths. You grow by adding identical cheap switches, and losing one spine costs 1/N of the capacity.

**Senior add-on:** mention ECMP as the thing that makes the many paths usable, the three-tier version with
pods and super-spines for larger buildings, and that oversubscription is chosen per tier as a cost decision.
:::

::: details 2. What is oversubscription, and how would you choose it?
It is the ratio of a switch's capacity facing servers to its capacity facing the spines. A rack with 1.2
Tb/s of server ports and 0.4 Tb/s of uplinks is 3:1. It bets that servers do not all send off-rack at full
speed at once.

Choose it from the workload. Web and RPC traffic is bursty and tolerates 2:1 to 4:1. Storage rebalancing,
analytics shuffles and ML training saturate links and need close to 1:1.

**Senior add-on:** design so the ratio can improve later, by leaving spine ports and uplinks free. Watch the
uplinks' p99 utilization and drops, not averages, and remember incast: a fan-out can overflow one link even
when the fabric is mostly idle.
:::

::: details 3. Design the network for a new datacenter with about 10,000 servers.
Start from the servers: say 40 per rack, so about 250 racks, each with a top-of-rack switch. 250 leaves is
more than one spine's port count, so use three tiers. Group racks into pods of, say, 32 with their own pod
spines. Then connect every pod to a set of super-spine planes. Choose oversubscription per tier from the
workload, perhaps 3:1 at the rack and closer to 1:1 above.

Use a plain routed IP underlay with BGP on every link and ECMP everywhere. Add a VXLAN or host-based overlay
if tenants or VMs need their own networks, with jumbo frames on the underlay. Plan failure domains: dual
power, replicas spread across racks and pods, and enough spare spine capacity to drain one switch at peak.

**Senior add-on:** talk about operations as much as topology. Automated, capacity-checked drains, continuous
probing between server pairs to catch gray failures, uniform MTU checks, and border switches that connect
the fabric to the backbone, sized as the choke point they are.
:::

::: details 4. A backup job between two servers runs at 100 Gb/s even though the fabric has terabits free. Why?
A single TCP connection is hashed onto one path. ECMP never splits it, so it can go no faster than the
slowest link on that path, here 100 Gb/s. The rest of the fabric's capacity is reachable only by other
connections.

To go faster, open several connections so that the hash spreads them across paths, or use a transfer tool
that does.

**Senior add-on:** big flows also hurt others. Two elephants hashed onto one uplink saturate it while
siblings idle, and the mice on that link see high latency. Fixes include rate-limiting bulk traffic,
weighted or flowlet-based balancing, and in ML fabrics, packet spraying.
:::

::: details 5. Why would anyone run BGP inside a datacenter? How are AS numbers assigned?
BGP keeps state small and changes local. Each switch has a few sessions on point-to-point links, and a
change spreads only as far as it changes someone's best route. Link-state protocols flood every change to
every router. BGP also gives per-link policy, which is how you drain a switch, and it is one protocol to run
and debug.

Following RFC 7938, each leaf gets its own private AS number (or numbers are reused across clusters), and all
spines in a fabric share one. Every leaf announces its rack prefix, and every other leaf installs the
routes from all spines as equal paths.

**Senior add-on:** the shared spine AS uses BGP's loop check to block spine-leaf-spine paths. You need
multipath across different AS paths, and BFD or link-down detection for fast failover, because default BGP
timers take tens of seconds.
:::

::: details 6. About 1% of calls between two services time out. Both services look healthy. How do you find out why?
Find the pattern first. Do failures cluster by client host, server host, or rack? If not, suspect the
network path. With ECMP, one bad link or optic affects only connections that hash onto it, so failures look
random across hosts.

Probe the path from a client to a server many times with different source ports, which picks different
paths, and look for one port range that is slow or lossy. Check interface error and drop counters along the
fabric, and the switch-level loss monitoring if you have it. If a link shows errors, drain it and see if the
timeouts stop.

**Senior add-on:** this is a gray failure: the link is up, so routing keeps using it. Also check MTU if
failures correlate with large responses, and incast if they correlate with fan-out bursts. Long term, run
continuous all-pairs probing and alert on per-link error rates, not just link up or down.
:::

::: details 7. After moving a service onto a VXLAN overlay, small requests work but large responses hang. What happened?
VXLAN adds 50 bytes to each packet. A full-size 1,500-byte packet becomes 1,550 bytes on the underlay. If an
underlay link still has a 1,500-byte MTU, those packets are dropped. Small packets fit, so handshakes, health
checks and small requests succeed, and large responses stall.

Confirm with a "don't fragment" ping of increasing size between the hosts. Fix it by raising the underlay
MTU to jumbo frames everywhere, or by lowering the inner MTU to 1,450.

**Senior add-on:** check that the MTU is uniform on every fabric link, because one bad link behind one ECMP
path makes the failure intermittent. Clamp the TCP MSS at tunnel edges, and do not rely on ICMP "too big"
messages reaching the sender.
:::

::: details 8. How do you safely take a spine switch out of service for maintenance?
Drain it first. Make its BGP routes less preferred, for example by lengthening the AS path or with a
graceful-shutdown tag. Neighbours shift traffic to other spines. Confirm its traffic counters fall to near
zero, then work on it.

Before draining, check that the remaining spines can carry peak traffic and that nothing else in the same
failure domain is already down or drained. Afterwards, undrain gradually and check errors, sessions and
MTU before restoring full traffic.

**Senior add-on:** the dangerous part is the tooling. Most network outages happen during management
operations, so the drain system must refuse unsafe drains, limit how many run at once, and be easy to roll
back.
:::

## Common misconceptions

- **"Total fabric capacity is what one transfer gets."** One connection is hashed onto one path and is
  limited by one link.
- **"ECMP balances load."** It balances connection counts. A few elephant flows can overload one link while
  others idle.
- **"BGP is only for the internet."** Many of the largest datacenter fabrics run BGP on every link.
- **"Oversubscription is a design flaw."** It is a deliberate cost trade-off; the flaw is choosing it without
  knowing the workload.
- **"A link is either up or down."** Gray failures, such as a lossy optic, keep routing up while hurting a
  fraction of traffic.

## Key takeaways

- Leaf-spine (Clos) fabrics give every pair of racks many equal paths and grow by adding identical switches.
- Oversubscription is a cost bet on traffic patterns; bulk and ML traffic break it, and incast breaks it
  locally.
- ECMP keeps each connection on one path, so one connection is capped by one link and elephants collide.
- Large fabrics often run eBGP on every link (RFC 7938); overlays like VXLAN add tenants and 50 bytes per
  packet.
- Design for small failure domains, and make drains checked and automatic: most outages happen during
  changes.

## Review

<Flashcards id="datacenter-fabric" :cards="cards" />

<MarkDone id="datacenter-fabric" />

## Sources

- [RFC 7938: Use of BGP for Routing in Large-Scale Data Centers](https://www.rfc-editor.org/rfc/rfc7938) (RFC, 2016)
- [RFC 7348: Virtual eXtensible Local Area Network (VXLAN)](https://www.rfc-editor.org/rfc/rfc7348) (RFC, 2014)
- [RFC 7432: BGP MPLS-Based Ethernet VPN](https://www.rfc-editor.org/rfc/rfc7432) (RFC, 2015) and
  [RFC 8365: A Network Virtualization Overlay Solution Using EVPN](https://www.rfc-editor.org/rfc/rfc8365) (RFC, 2018)
- [RFC 8926: Geneve: Generic Network Virtualization Encapsulation](https://www.rfc-editor.org/rfc/rfc8926) (RFC, 2020)
- [RFC 8257: Data Center TCP (DCTCP)](https://www.rfc-editor.org/rfc/rfc8257) (RFC, 2017)
- [RFC 8326: Graceful BGP Session Shutdown](https://www.rfc-editor.org/rfc/rfc8326) (RFC, 2018)
- [A Scalable, Commodity Data Center Network Architecture](https://dl.acm.org/doi/10.1145/1402958.1402967) (Al-Fares et al., SIGCOMM paper, 2008)
- [Jupiter Rising: A Decade of Clos Topologies and Centralized Control in Google's Datacenter Network](https://dl.acm.org/doi/10.1145/2785956.2787508) (SIGCOMM paper, 2015)
- [The evolution of Google's Jupiter data center network](https://cloud.google.com/blog/topics/systems/the-evolution-of-googles-jupiter-data-center-network) (Google Cloud blog on the SIGCOMM 2022 Jupiter Evolving paper, 2022)
- [Introducing data center fabric, the next-generation Facebook data center network](https://engineering.fb.com/2014/11/14/production-engineering/introducing-data-center-fabric-the-next-generation-facebook-data-center-network/) (engineering blog, 2014)
- [Reinventing Facebook's data center network (F16, Minipack)](https://engineering.fb.com/2019/03/14/data-center-engineering/f16-minipack/) (engineering blog, 2019)
- [Evolve or Die: High-Availability Design Principles Drawn from Google's Network Infrastructure](https://dl.acm.org/doi/10.1145/2934872.2934891) (SIGCOMM paper, 2016)
- [Summary of the AWS Service Event in the Northern Virginia (US-EAST-1) Region](https://aws.amazon.com/message/12721/) (incident report, 2021)
- [More details about the October 4 outage](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) (Facebook engineering blog, 2021)
