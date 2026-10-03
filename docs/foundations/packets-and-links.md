---
title: "2. Packets & Links"
---

<script setup>
import { cards } from './packets-and-links-review'
</script>

# 2. Packets & Links

Every request from a phone travels as small, independent packets, handed from one link to the next by
devices that know almost nothing about the request. This chapter covers how those packets are wrapped,
addressed and forwarded, and why their size limit causes some of the most confusing failures in production.

::: info Before you start
- A request crosses many networks between the phone and a server: home Wi-Fi or a mobile network, an ISP,
  the wider internet, a datacenter. [Chapter 1](/foundations/the-map) gives the whole path.
- **TCP** gives programs a reliable stream of bytes over an unreliable network. **UDP** sends single
  messages with no guarantees. [Chapter 3](/foundations/tcp-and-udp) covers both.
- Inside one machine, the kernel turns socket writes into packets and back. The
  [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers that path.

The chapter makes sense without them. All addresses in the examples are placeholders from the ranges
reserved for documentation.
:::

## Headers inside headers

**In short:** each layer wraps the data from the layer above in its own header. Switches read only the
outer header, routers read one layer deeper, and only the two ends read everything.

Your browser hands the operating system some bytes: an HTTPS request. The OS cuts them into pieces and puts
a small header in front of each one. That header says which program the bytes belong to (a port number) and
where they fit in the stream. TCP calls this piece a **segment**.

The OS then wraps the segment in a second header with the source and destination addresses of the two
machines. The result is a <Term id="packet">packet</Term>, and the addresses are
<Term id="ip-address">IP addresses</Term>. Finally, the network card wraps the packet once more, for the one
link it is about to cross, Wi-Fi or Ethernet. That outer layer is a <Term id="frame">frame</Term>.

Wrapping each layer inside the next is called <Term id="encapsulation">encapsulation</Term>. The receiver
unwraps in reverse order.

<PacketsEncapsulationDiagram />

The point of the layering is that each device only needs to understand its own layer:

| Device | Reads | Changes |
|---|---|---|
| **Switch or Wi-Fi access point** | The frame's addresses | Nothing in the packet (an access point converts Wi-Fi frames to Ethernet frames) |
| **Router** | The packet's destination address | Throws away the old frame and builds a new one; lowers the packet's hop counter |
| **Home router or carrier gateway doing address sharing** | The packet and the TCP or UDP ports | Also rewrites addresses and ports (NAT, [chapter 8](/internet/last-mile)) |
| **The server** | Everything | Unwraps all layers and hands the data to the program |

So the packet's IP addresses normally stay the same from end to end, while the frame around it is rebuilt at
every hop. Address sharing, covered in chapter 8, is the big exception.

Interviewers use layer numbers as shorthand. **Layer 2 (L2)** is the link: frames and the addresses of
network cards. **Layer 3 (L3)** is IP. **Layer 4 (L4)** is TCP or UDP, with ports. **Layer 7 (L7)** is the
application, such as HTTP. An "L4 load balancer" makes decisions using addresses and ports; an "L7 proxy"
reads the HTTP request.

::: details Going deeper: the OSI model and what "layer 7" really means
- The numbers come from the seven-layer OSI model (1984). Layers 5 and 6 (session, presentation) never
  matched real protocols well, so engineers mostly skip them. TLS sits awkwardly between 4 and 7.
- The TCP/IP model used by the internet's standards (RFC 1122, 1989) has four layers: link, internet,
  transport, application.
- Tunnels break the neat stack. A VPN or a datacenter overlay puts a whole packet, or a whole frame, inside
  another packet. The packet then carries two IP headers, and the outer one is what routers see.
  [Chapter 15](/backend/datacenter-fabric) covers overlays such as VXLAN.
- `tcpdump` on a busy server often shows "packets" of 30 or 60 kilobytes. They are not real packets. The
  network card splits and joins packets for the kernel (segmentation and receive offloads). See the
  [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking).
:::

## The local link: frames, MAC addresses and the gateway

**In short:** on one link, frames are delivered by hardware addresses. To send anything off the link, a
device finds its default gateway's hardware address and hands the packet to it.

Every network card has a hardware address, written like `3c:84:6a:12:34:56`. It is the
<Term id="mac-address">MAC address</Term> (media access control). It only means something on one link: one
Ethernet segment or one Wi-Fi network. A switch learns which MAC addresses sit behind which port, and
sends each frame only out of the right port.

Your phone wants to reach `203.0.113.10`, a server far away. It does not send a frame to the server: the
server is not on this link. It sends the frame to the router on its own network, which passes the packet
on. That router is the <Term id="default-gateway">default gateway</Term>. The phone learned its address when
it joined the network, usually from DHCP on IPv4 or router announcements on IPv6.

The phone knows the gateway's IP address but needs its MAC address to build a frame. On IPv4 it asks the
whole link: "who has `192.168.1.1`?" The gateway replies with its MAC address, and the phone caches the
answer. This is the <Term id="arp">Address Resolution Protocol (ARP)</Term>. IPv6 does the same job with
<Term id="ndp">Neighbour Discovery (NDP)</Term>, carried in ICMPv6 messages. NDP also lets routers announce
themselves and the network's address prefix.

The result: the destination IP address in the packet is the server's, but the destination MAC address in
the frame is the gateway's. Each router along the way repeats the trick for its own next hop.

### Try it: your address, your gateway, your neighbours

On Linux (macOS equivalents: `ifconfig`, `route -n get`, `arp -a`, `ndp -a`):

```text
$ ip -brief addr
lo        UNKNOWN  127.0.0.1/8 ::1/128
wlan0     UP       192.168.1.23/24 2001:db8:1:2:a1b2:c3d4:e5f6:7788/64 fe80::a1b2:c3ff:fed4:e5f6/64

$ ip route get 203.0.113.10
203.0.113.10 via 192.168.1.1 dev wlan0 src 192.168.1.23 uid 1000

$ ip neigh
192.168.1.1 dev wlan0 lladdr 3c:84:6a:12:34:56 REACHABLE
fe80::1 dev wlan0 lladdr 3c:84:6a:12:34:56 router STALE
```

(Trimmed and illustrative.) What to look for:

- `192.168.1.23/24` is your address and the size of your local network (explained in the next section).
- `via 192.168.1.1` in `ip route get` names the gateway the kernel would use. It also shows the interface
  and source address it would pick, which settles most "which interface does this go out of?" questions.
- `ip neigh` is the ARP and NDP cache. `REACHABLE` is fresh, `STALE` will be checked on next use, and
  `FAILED` means nobody answered: usually a wrong address or a dead link.

::: details Going deeper: ARP in production
- **Moving an address between machines.** When a floating IP address moves to a standby server (for
  example with keepalived), the new owner sends a **gratuitous ARP**: an unrequested "this address is now at
  my MAC". Neighbours update their caches at once. If it is lost or ignored, traffic keeps going to the old
  machine until the cache entry ages out, typically within tens of seconds to a few minutes, depending on
  the OS and device.
- Linux entries go `STALE` after about 30 seconds without confirmation, by default, and are re-checked on use
  rather than dropped.
- Cloud networks (AWS, Google Cloud, Azure) do not have a real shared link. Their virtual network answers ARP
  itself, so tricks that rely on gratuitous ARP often do not work there; moving an address uses the provider's
  API instead.
- Phones use a **randomised MAC address** per Wi-Fi network by default on recent iOS and Android versions,
  for privacy. Networks that identified devices by MAC address had to adapt.
- A Wi-Fi frame carries three or four MAC addresses (sender, receiver, access point, and sometimes the
  final destination), because the access point is a relay between the radio and the wired network.
:::

## IP addresses and prefixes

**In short:** an IP address has a network part and a host part, and a prefix length such as `/24` says where
the split is. Some ranges are private and cannot be reached from the internet.

An IPv4 address is 32 bits, written as four numbers: `192.168.1.23`. Routers do not track single addresses.
They track blocks of addresses that share their first bits. `192.168.1.0/24` means "every address whose first
24 bits match `192.168.1`": the 256 addresses from `192.168.1.0` to `192.168.1.255`.

This notation is <Term id="cidr">CIDR</Term> (classless inter-domain routing), and the number after the slash
is the **prefix length**. A smaller number means a bigger block. A `/16` has 65,536 addresses, a `/32` is one
address, and `/0` is every address.

The prefix also tells a device what is local. With `192.168.1.23/24`, the phone knows that `192.168.1.50` is
on its own link, so it uses ARP to reach it directly. Anything else goes to the default gateway.

A few ranges are worth knowing by sight:

| Range | Meaning |
|---|---|
| `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16` | <Term id="private-address">Private addresses</Term>: for internal networks, never routed on the internet |
| `100.64.0.0/10` | Shared space for carrier-grade address sharing (chapter 8) |
| `127.0.0.0/8`, `::1` | Loopback: this machine |
| `169.254.0.0/16`, `fe80::/10` | Link-local: valid on one link only; cloud metadata services use `169.254.169.254` |
| `fc00::/7` | IPv6 unique local addresses, the rough equivalent of private IPv4 ranges |

Private addresses exist because there are only about 4.3 billion IPv4 addresses. The central pool ran out in
2011. Most homes, offices and mobile networks give devices private addresses, and a gateway shares one or a
few public addresses among them. That sharing is <Term id="nat">network address translation (NAT)</Term>, and
[chapter 8](/internet/last-mile) covers it. IPv6, later in this chapter, is the long-term answer.

::: details Going deeper: address planning
- Overlapping private ranges are a classic problem. Two companies that merge, or a VPC that must peer with an
  office network, often both used `10.0.0.0/16`. Routing between them then needs renumbering or NAT. Plan
  cloud ranges so they do not collide.
- Cloud providers reserve a few addresses in every subnet. AWS, for example, reserves five per subnet, so a
  `/28` has 11 usable addresses, not 16 (per AWS documentation, as of 2025).
- Kubernetes clusters use separate ranges for nodes, pods and services, and pod ranges in large clusters
  consume addresses fast. [Chapter 16](/backend/reaching-the-service) covers service routing.
- Documentation ranges (`192.0.2.0/24`, `198.51.100.0/24`, `203.0.113.0/24`, `2001:db8::/32`) are reserved
  for examples like the ones in this book.
:::

## How a router chooses: longest-prefix match

**In short:** a router compares the destination address with every prefix in its table and uses the most
specific match. That one rule explains default routes, failover tricks and route hijacks.

A router holds a **routing table**: a list of prefixes, each with a next hop. Here is a small one:

| Prefix | Next hop |
|---|---|
| `0.0.0.0/0` | ISP uplink |
| `203.0.113.0/24` | Router B |
| `203.0.113.128/25` | Router C |

A packet for `203.0.113.200` matches all three entries. The router picks the one with the longest prefix,
`/25`, and sends it to router C. A packet for `203.0.113.5` matches the `/24` and the `/0`, so it goes to
router B. Anything else falls through to the `/0`, the **default route**. This rule is
<Term id="longest-prefix-match">longest-prefix match</Term>.

The rule has consequences beyond one router:

- **Specific overrides general.** You can send a slice of traffic somewhere else by adding a narrower route,
  without touching the broad one. VPN clients do this to capture some or all traffic.
- **Hijacks and leaks use it too.** On the internet, a network that wrongly announces a more specific prefix
  for your addresses attracts your traffic. [Chapter 9](/internet/internet-routing) covers how
  <Term id="bgp">BGP</Term> spreads these routes and how operators defend against this.
- **Hosts route too.** Your laptop has a routing table: usually a local prefix and a default route.
  `ip route get` asks the kernel which entry wins for a destination.

::: details Going deeper: speed and ties
- The full internet IPv4 table holds about a million prefixes (as of 2025), and IPv6 a few hundred thousand.
  Routers do the lookup in specialised memory (TCAM) or in tree structures, at hundreds of millions of
  lookups per second per chip. Table growth occasionally overflows older hardware.
- When several entries have the same prefix and cost, the router can spread traffic across all of them,
  usually by hashing the addresses and ports so each connection stays on one path. This is ECMP (equal-cost
  multi-path), covered in [chapter 11](/edge/l4-load-balancing) and [chapter 15](/backend/datacenter-fabric).
- Linux supports several routing tables chosen by rules (`ip rule`), which is how multi-homed hosts and VPNs
  send some traffic out a different interface.
:::

## TTL, ICMP and traceroute

**In short:** each packet carries a hop counter that every router lowers by one. When it reaches zero, the
packet is dropped and the router reports back with an ICMP message. Traceroute uses that report to map the
path.

Routing mistakes can create loops: router A sends to B, and B sends back to A. Without a limit, a packet
would circle forever. So the sender sets a counter in the IP header, often 64 on Linux and macOS and 128 on
Windows. Every router lowers it by one and drops the packet at zero. In IPv4 the field is called
<Term id="ip-ttl">time to live (TTL)</Term>; IPv6 calls it the **hop limit**. It has nothing to do with the
DNS TTL.

When a router drops a packet, it can tell the sender why. It uses the
<Term id="icmp">Internet Control Message Protocol (ICMP)</Term>, a small protocol for errors and tests. The
messages you meet most:

- **Echo request and reply**: what `ping` sends.
- **Time exceeded**: "your hop counter reached zero here".
- **Destination unreachable**: no route, port closed, or (one important subtype) "packet too big", covered in
  the next section.

<Term id="traceroute">Traceroute</Term> turns time-exceeded messages into a map. It sends probes with a hop
counter of 1, then 2, then 3. Each router that drops one reveals its address and a round-trip time.

```text
$ traceroute -n 203.0.113.10
 1  192.168.1.1     1.9 ms   1.7 ms   1.8 ms
 2  100.64.0.1      9.4 ms   8.8 ms   9.1 ms
 3  * * *
 4  198.51.100.9   12.1 ms  11.8 ms  12.4 ms
 5  203.0.113.10   24.6 ms  23.9 ms  24.2 ms
```

(Illustrative.) Hop 1 is the home router, hop 2 a carrier's gateway with a shared address. Hop 3 did not
answer, which is common and usually harmless: many routers limit or skip ICMP replies. On Linux,
`traceroute` sends UDP probes by default; `-I` uses ICMP echo and `-T` uses TCP SYNs (both need root).
`mtr` repeats traceroute continuously and shows loss per hop.

Read the output with care. A slow or lossy middle hop is often just a router that answers ICMP slowly,
while traffic through it is fine. Only loss that continues to the last hop matters. The return path can
also differ from the forward path. [Chapter 18](/operations/observing-the-path) covers reading traceroute in
debugging.

::: details Going deeper: ICMP types and filtering
- ICMP types: echo request 8 and reply 0; destination unreachable 3 (code 4 is "fragmentation needed");
  time exceeded 11. ICMPv6 uses different numbers: packet too big is type 2, time exceeded type 3, and
  neighbour discovery uses types 133 to 137.
- Blocking all ICMP is a common "security" rule that breaks things. On IPv6 it breaks neighbour discovery,
  and on both versions it breaks path MTU discovery (next section). RFC 4890 lists which ICMPv6 messages a
  firewall must let through.
- Routers rate-limit the ICMP messages they generate, often to a few hundred or thousand per second, and
  handle them on a slow control CPU. That is why traceroute's per-hop numbers are noisy.
:::

## MTU, fragmentation and black holes

**In short:** every link has a maximum packet size. Packets that are too big must be split or rejected, and
the sender learns the limit only through ICMP messages. When a firewall drops those messages, connections
open fine and then hang.

### The size limit

Every link has a <Term id="mtu">maximum transmission unit (MTU)</Term>: the largest packet it carries in one
frame. For Ethernet and most of the internet it is 1,500 bytes. That counts the IP header and everything
inside it, not the frame's own header.

Tunnels shrink it. A VPN, a mobile network's internal tunnels or a datacenter overlay each add headers of
their own, so less room is left inside. A path's MTU is its smallest link, and the sender usually cannot see
that link.

| Link or tunnel | Overhead | Packet room left on a 1,500-byte link |
|---|---|---|
| Plain Ethernet | none | 1,500 |
| PPPoE (some DSL and fibre) | 8 bytes | 1,492 |
| GRE tunnel over IPv4 | 24 bytes | 1,476 |
| VXLAN overlay over IPv4 | 50 bytes | 1,450 |
| WireGuard VPN over IPv6 | 80 bytes | 1,420 (its usual default) |

### Splitting and the "don't fragment" flag

In IPv4, a router that meets a packet too big for the next link can split it into pieces. This is
<Term id="fragmentation">fragmentation</Term>. The receiver puts the pieces back together. Fragmentation
works badly in practice:

- Losing one piece loses the whole packet.
- Pieces after the first carry no port numbers, so firewalls, NAT gateways and load balancers that look at
  ports often drop them or send them to the wrong server.
- Reassembly costs memory and has a long history of security bugs.

So modern senders avoid it. TCP marks its packets **don't fragment (DF)**. A router that cannot forward such
a packet drops it and sends back an ICMP "packet too big" message with the next link's MTU. The sender then
sends smaller packets. This process is <Term id="pmtud">path MTU discovery (PMTUD)</Term>. In IPv6 routers
never fragment at all, so every IPv6 sender relies on it.

### Black holes

Now add a firewall that drops all ICMP on the way back to the sender:

<PacketsBlackHoleDiagram />

The connection handshake uses small packets, so it succeeds. Small requests succeed too. The first
full-size packet, often a large response or a TLS certificate, vanishes. The "too big" message that would fix
it is dropped, so the sender keeps resending the same size until it gives up. This is a
<Term id="pmtud-black-hole">PMTUD black hole</Term>.

The symptoms are distinctive, and worth memorising for debugging interviews:

- `ping` works, the connection opens, then hangs on the first large transfer.
- Small API calls work; big responses, uploads or TLS handshakes with long certificate chains time out.
- It started after adding a VPN, tunnel, overlay or new firewall, or only affects users on one kind of network.

### The fixes: MSS clamping and probing

TCP announces the largest segment it accepts in its first packet, the **maximum segment size (MSS)**:
normally the MTU minus 40 bytes of IPv4 and TCP headers, so 1,460. A router at a tunnel entrance can rewrite
that value downward in passing connections, so neither end ever sends a packet too big for the tunnel. This
is <Term id="mss-clamping">MSS clamping</Term>, and almost every home router, VPN gateway and cloud VPN does
it. It is a router deliberately editing a TCP header: a pragmatic layering violation.

Clamping only helps TCP. UDP traffic, including <Term id="quic">QUIC</Term>, needs its own answer. The other
fix is for the sender to find the limit itself by probing: send a larger packet, see whether it is
acknowledged, and back off if not. Linux can do this for TCP when it suspects a black hole
(`net.ipv4.tcp_mtu_probing`). QUIC avoids most of the problem by requiring paths to carry at least 1,200-byte
UDP payloads, and probes upward from there ([chapter 7](/protocols/quic)).

### Try it: find the path MTU

```text
$ ping -M do -s 1472 -c 2 203.0.113.10
From 192.0.2.1 icmp_seq=1 Frag needed and DF set (mtu = 1420)

$ ping -M do -s 1392 -c 2 203.0.113.10
1400 bytes from 203.0.113.10: icmp_seq=1 ttl=56 time=24.1 ms

$ tracepath -n 203.0.113.10
 1?: [LOCALHOST]                      pmtu 1500
 1:  192.168.1.1                       1.8ms
 2:  192.0.2.1                         8.9ms pmtu 1420
     ...
     Resume: pmtu 1420 hops 6 back 6
```

(Illustrative.) `-M do` sets don't fragment, and `-s` is the data size: 1,472 bytes plus 8 of ICMP header and
20 of IP header makes a 1,500-byte packet. A "frag needed" reply names the limit. **No reply at all** for big
sizes while small ones work is the black-hole signature. On macOS, use `ping -D -s 1472`. For IPv6, subtract
48 instead of 28 (`ping -6 -M do -s 1452`). `tracepath` needs no root and reports where the MTU drops.

::: details Going deeper: numbers, standards and cloud MTUs
- PMTUD is RFC 1191 (1990) for IPv4 and RFC 8201 (2017) for IPv6. RFC 2923 (2000) describes black holes.
  Probing without ICMP is RFC 4821 for TCP and RFC 8899 (2020) for UDP-based protocols.
- IPv6 guarantees every link carries at least 1,280 bytes. IPv4's guaranteed minimum is far lower, but
  1,500 is near-universal on the internet.
- With TCP timestamps, typical on Linux, each segment carries 12 more header bytes, so a 1,460-byte MSS
  carries 1,448 bytes of data.
- Datacenters often use **jumbo frames** of about 9,000 bytes inside, for efficiency. AWS, for example,
  documents a 9,001-byte MTU inside a VPC but 1,500 for traffic leaving through an internet gateway or VPN
  (as of 2025). Google Cloud VPC networks default to 1,460 (as of 2025). Check your provider's current docs.
- Load balancers make PMTUD harder. A "too big" message is addressed to the load balancer's address and may be
  hashed to a different server than the one sending the large packets. Cloudflare's 2015 story below is an
  example.
- Large UDP messages, such as big DNS answers, hit fragmentation directly. That is why DNS moved to a
  1,232-byte default buffer ([chapter 4](/protocols/dns)).
:::

## IPv6: what changes

**In short:** IPv6 has enough addresses for every device to have a public one, so address sharing is no
longer needed. The ideas in this chapter stay the same; a few details change in ways that matter for
operations.

IPv6 addresses are 128 bits, written in hexadecimal groups: `2001:db8:1:2::10`. A run of zero groups is
shortened to `::`. A normal subnet is a `/64`, which holds more addresses than anyone will use. Networks
typically receive a `/48` or `/56` and split it into many `/64`s.

The main changes:

- **No address shortage, so no NAT needed.** Every device can have a globally reachable address. A firewall
  still blocks unsolicited inbound traffic; reachable does not mean open.
- **Devices pick their own addresses.** A phone hears the router's announcement of the `/64` and builds its
  own address in it (SLAAC, stateless address autoconfiguration). Phones also rotate temporary addresses for
  privacy, so one device has several IPv6 addresses at once.
- **A bigger, simpler header.** The fixed header is 40 bytes, twice IPv4's usual 20. It drops the header
  checksum, so routers do less work per packet. Options move to optional extension headers.
- **Routers never fragment.** Only the sender may split packets, so working PMTUD (and therefore ICMPv6) is
  required, not optional.
- **ARP is replaced by NDP**, which runs over ICMPv6. Blocking ICMPv6 breaks basic connectivity.

Adoption is uneven. By Google's public measurements, close to half of its users reached it over IPv6 in 2025,
with much higher shares in some countries and on large mobile networks. Several large mobile carriers run
IPv6-only networks and translate to reach IPv4 sites. [Chapter 8](/internet/last-mile) covers how that works,
and how <Term id="happy-eyeballs">Happy Eyeballs</Term> hides broken IPv6 paths. For a website, this means
serving over both versions: an AAAA record ([chapter 4](/protocols/dns)) and IPv6 on every public entry point.

::: details Going deeper: IPv6 details that come up
- Extension headers (for fragmentation, routing and so on) chain one after another. Many networks drop packets
  that carry them, so in practice IPv6 fragments are often lost (see Cloudflare's 2017 post in Sources).
- With 2<sup>64</sup> addresses per subnet, scanning a subnet is impractical, and rate limits or block lists
  keyed on single addresses fail. Operators key IPv6 limits on a `/64` or a wider prefix.
- Logging, geolocation, abuse systems and firewall rules written for IPv4 strings are a common source of
  IPv6 bugs. Store addresses in a type that handles both versions.
:::

## Why this matters in real systems

**MTU problems follow tunnels.** Every new layer of wrapping, from VPNs and service meshes to overlay
networks and cloud interconnects, eats into the packet size. Kubernetes network plugins, for example, set pod
MTU below the node's MTU when they use an overlay; a mismatch shows up as connections that hang on large
responses. Infrastructure teams check MTU first when "small requests work, big ones hang".

**Floating addresses depend on ARP.** On-premises load balancers and databases fail over by moving an IP
address to a standby machine and sending a gratuitous ARP. Switches or hosts that ignore it keep sending to
the dead machine until their cache ages out. In clouds the same job goes through the provider's API, which is
slower and has its own limits.

**Address planning is a design question.** Choosing VPC ranges, pod ranges and subnet sizes looks dull until
two networks that overlap must talk, or a cluster runs out of pod addresses. Large cloud users plan ranges
centrally, and some run IPv6 internally to escape the problem.

**IPv6 is the mobile default in many places.** A large share of mobile users reach websites over IPv6,
often on networks with no native IPv4 at all. A site without IPv6 forces them through the carrier's
translation layer, which adds a hop and shares addresses among many users ([chapter 8](/internet/last-mile)).

**How to look at it:**

```bash
ip -brief addr                       # addresses and prefix lengths
ip route get 203.0.113.10            # which route, gateway and source address wins
ip neigh                             # ARP / NDP cache
ping -M do -s 1472 203.0.113.10      # does a full 1,500-byte packet pass?
tracepath -n 203.0.113.10            # where does the path MTU drop?
sudo tcpdump -ni any 'icmp or icmp6' # are "too big" messages arriving?
```

## Where it breaks

**Cloudflare, 2015: "too big" messages sent to the wrong server.** Cloudflare's servers sit behind routers
that spread traffic with ECMP hashing. ICMP "packet too big" messages hashed differently from the TCP
connection they described, so they usually reached a server that had not sent the large packet. Some users on
tunnels, mainly IPv6 over IPv4, could not load sites. Cloudflare first lowered its IPv6 MTU to 1,280, then
built a daemon that copies these ICMP messages to every server. **Lesson:** load balancers must route ICMP
errors to the right machine, or PMTUD fails silently.
([Cloudflare, 2015](https://blog.cloudflare.com/path-mtu-discovery-in-practice/))

**Shine Solutions, 2019: one byte over the limit.** A web service called a partner's API through an IPsec VPN
from AWS. About 15% of requests failed with "unexpected end of file", with large latency spikes. The cause was
a black hole: security groups and network ACLs blocked ICMP "fragmentation needed" messages. A monitoring
agent's extra HTTP header had pushed some packets just over the tunnel's limit. Allowing ICMP type 3 fixed it.
**Lesson:** "allow no ICMP" firewall rules turn a harmless size change into an outage.
([Shine Solutions, 2019](https://shinesolutions.com/2019/10/21/black-holes-and-revelations/))

**SACK Panic, 2019: a tiny MSS crashes Linux.** In June 2019, Netflix disclosed Linux kernel bugs in TCP's
loss recovery (CVE-2019-11477 and related). An attacker could crash or slow a server by combining crafted
acknowledgements with a very small announced MSS. One recommended mitigation, until patches were applied, was
to drop connections announcing a low MSS. **Lesson:** values in a peer's headers, even the MSS, are attacker
input. ([Netflix advisory, 2019](https://github.com/Netflix/security-bulletins/blob/master/advisories/third-party/2019-001.md))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Your laptop sends a packet to a server on another network. What happens at layers 2 and 3?
The laptop sees from its prefix that the server is not local, so it uses its default gateway. It finds the
gateway's MAC address with ARP (or NDP on IPv6), from its cache if possible. It sends a frame addressed to the
gateway's MAC, holding a packet addressed to the server's IP.

The gateway strips the frame, looks up the destination with longest-prefix match, lowers the TTL, and builds a
new frame for the next hop. Each router repeats this. The IP addresses stay the same unless a NAT rewrites
them; the frame is rebuilt at every hop.

**Senior add-on:** mention that IPv4 routers also update the header checksum because the TTL changed, that
IPv6 dropped that checksum, and that NAT at a home router or carrier gateway rewrites addresses and ports. A
switch on the way only reads MAC addresses and changes nothing.
:::

::: details 2. Why do we need both MAC addresses and IP addresses?
A MAC address names a network card on one link. An IP address names a destination across the whole internet,
and is organised in prefixes that routers can aggregate. Routers could not hold a table of every card in the
world, but they can hold about a million prefixes.

The split also lets a device move: it keeps its hardware address and gets a new IP address on each network.

**Senior add-on:** ARP and NDP bridge the two, and their caches cause real failover issues: after a floating
IP moves, neighbours keep sending to the old MAC until a gratuitous ARP updates them or the entry ages out.
:::

::: details 3. A router has routes for 10.0.0.0/8, 10.1.0.0/16 and 0.0.0.0/0. Where does a packet for 10.1.2.3 go? Why does this rule matter?
To the `10.1.0.0/16` next hop: it is the longest prefix that matches. A packet for `10.9.9.9` would use the
`/8`, and `8.8.8.8` the default route.

The rule lets operators override broad routes with narrow ones: VPN split tunnels, traffic engineering,
moving part of a range to a new site.

**Senior add-on:** it is also the mechanism behind BGP hijacks: announcing a more specific prefix than the
owner attracts their traffic. That is why operators filter announcements and use RPKI
([chapter 9](/internet/internet-routing)). Equal-length matches can be split with ECMP.
:::

::: details 4. After you set up a site-to-site VPN, SSH works but HTTPS downloads hang after a few kilobytes. How do you find out why?
This is the classic MTU black hole. Small packets (the handshake, typed commands) fit through the tunnel;
full-size packets do not, and the ICMP "packet too big" message is not getting back.

Confirm with `ping -M do -s 1472` across the tunnel: small sizes work, big ones get no reply. Lower the size
until it passes to find the real MTU, or use `tracepath`. Run `tcpdump` for ICMP on the sender to see whether
"too big" messages arrive.

**Senior add-on:** fix the cause by allowing ICMP type 3 code 4 (and ICMPv6 packet too big) through firewalls
and security groups. Add MSS clamping at the tunnel ends so TCP never sends oversized packets, and set the
tunnel interface MTU correctly so UDP traffic is handled too. Enable TCP MTU probing as a safety net.
:::

::: details 5. You are designing an overlay network for a fleet of servers (VXLAN or WireGuard). How do you handle MTU?
Work out the overhead of the wrapping, such as 50 bytes for VXLAN over IPv4 or 60–80 for WireGuard. Then
choose one of two options. Raise the underlying network's MTU (jumbo frames), so the overlay keeps a full
1,500 bytes inside. Or lower the MTU inside the overlay by the overhead and tell every host and container.

Then make sure the edges cope: MSS clamping where overlay traffic meets the internet, ICMP allowed
everywhere, and monitoring for mismatches.

**Senior add-on:** raising the underlay MTU is cleaner for applications but must be set consistently on every
switch and host. Keeping 1,500 inside matters if traffic leaves for the internet unwrapped. Test with
don't-fragment pings at the exact boundary sizes, because a single misconfigured link creates a black hole
that only large transfers hit.
:::

::: details 6. How does traceroute work, and what can mislead you?
It sends probes with a hop counter of 1, 2, 3 and so on. Each router that drops a probe at zero sends back an
ICMP "time exceeded" message, revealing its address and the round-trip time to it.

It misleads in three ways. Routers answer ICMP slowly or not at all, so middle-hop delay and loss are often
fake. The return path may differ from the forward path. And with multiple equal paths, different probes may
take different routes.

**Senior add-on:** only loss or delay that persists to the destination is real. Use `mtr` for statistics and
TCP probes (`traceroute -T`) when UDP or ICMP is filtered. Tunnels and MPLS can hide hops entirely.
:::

::: details 7. Why is "block all ICMP" a bad firewall policy?
ICMP carries the error messages the network depends on. Without "packet too big", path MTU discovery fails and
connections hang on large transfers. On IPv6, neighbour discovery runs over ICMPv6, so blocking it breaks
basic reachability on the link.

**Senior add-on:** allow the error types (destination unreachable, packet too big, time exceeded) and the
needed NDP messages, and rate-limit echo if you must. RFC 4890 gives an ICMPv6 filtering policy.
:::

::: details 8. What changes for your service when you add IPv6 support?
Clients on IPv6, especially many mobile users, can reach you directly instead of through carrier
translation. You add AAAA records and IPv6 on every public entry point: load balancers, CDNs, health checks.

Then audit everything that handles addresses: logging, rate limiting, geolocation, allow lists, abuse
detection. Make sure ICMPv6 is allowed so PMTUD works.

**Senior add-on:** rate limits keyed on a single IPv6 address are trivially evaded; key them on a `/64` or
wider. Watch for a broken IPv6 path: Happy Eyeballs hides it as a small delay, so measure IPv6 success and
latency separately.
:::

## Common misconceptions

- **"The IP header is rewritten at every hop."** Only the hop counter and checksum change. The frame is
  rebuilt; the addresses stay the same unless a NAT rewrites them.
- **"MTU problems cause errors."** They usually cause silent hangs, because the error message is the thing
  being dropped.
- **"ICMP is just ping, so it is safe to block."** It carries the errors that path MTU discovery and IPv6
  neighbour discovery need.
- **"A slow hop in traceroute is the bottleneck."** Routers answer traceroute probes slowly by design; only
  delay that carries on to the destination is real.
- **"IPv6 means no firewall."** Public addresses are reachable in principle; a firewall still decides what
  gets in.

## Key takeaways

- Data travels as **segments inside packets inside frames**. Routers rebuild the frame and lower the hop
  counter; the IP addresses stay the same unless a NAT rewrites them.
- To leave the local network, a device finds its **default gateway's MAC address** with ARP or NDP.
- Routers forward by **longest-prefix match**: the most specific route wins.
- Every path has an **MTU**. Tunnels shrink it, and filtered ICMP turns it into a **black hole**: connections
  open, then hang. MSS clamping and probing are the fixes.
- **IPv6** removes the address shortage, makes ICMPv6 essential and forbids router fragmentation.

## Review

<Flashcards id="packets-and-links" :cards="cards" />

<MarkDone id="packets-and-links" />

## Sources

- [RFC 791: Internet Protocol](https://www.rfc-editor.org/rfc/rfc791) (RFC, 1981)
- [RFC 826: An Ethernet Address Resolution Protocol](https://www.rfc-editor.org/rfc/rfc826) (RFC, 1982)
- [RFC 1191: Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc1191) (RFC, 1990) and
  [RFC 8201: Path MTU Discovery for IPv6](https://www.rfc-editor.org/rfc/rfc8201) (RFC, 2017)
- [RFC 1918: Address Allocation for Private Internets](https://www.rfc-editor.org/rfc/rfc1918) (RFC, 1996)
- [RFC 2923: TCP Problems with Path MTU Discovery](https://www.rfc-editor.org/rfc/rfc2923) (RFC, 2000)
- [RFC 4632: Classless Inter-domain Routing (CIDR)](https://www.rfc-editor.org/rfc/rfc4632) (RFC, 2006)
- [RFC 4861: Neighbor Discovery for IPv6](https://www.rfc-editor.org/rfc/rfc4861) (RFC, 2007)
- [RFC 4890: Recommendations for Filtering ICMPv6 Messages in Firewalls](https://www.rfc-editor.org/rfc/rfc4890) (RFC, 2007)
- [RFC 8200: Internet Protocol, Version 6 (IPv6) Specification](https://www.rfc-editor.org/rfc/rfc8200) (RFC, 2017)
- [RFC 8899: Packetization Layer Path MTU Discovery for Datagram Transports](https://www.rfc-editor.org/rfc/rfc8899) (RFC, 2020)
- [Path MTU discovery in practice](https://blog.cloudflare.com/path-mtu-discovery-in-practice/) (Cloudflare engineering blog, 2015)
- [IP fragmentation is broken](https://blog.cloudflare.com/ip-fragmentation-is-broken/) (Cloudflare engineering blog, 2017)
- [Black Holes and Revelations](https://shinesolutions.com/2019/10/21/black-holes-and-revelations/) (engineering blog postmortem, 2019)
- [Netflix security advisory NFLX-2019-001 (SACK Panic)](https://github.com/Netflix/security-bulletins/blob/master/advisories/third-party/2019-001.md) (security advisory, 2019)
- [Google IPv6 statistics](https://www.google.com/intl/en/ipv6/statistics.html) (measurement, ongoing)
