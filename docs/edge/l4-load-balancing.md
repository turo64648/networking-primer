---
title: 11. L4 Load Balancing
---

<script setup>
import { cards } from './l4-load-balancing-review'
</script>

# 11. L4 Load Balancing

Once a packet reaches a site, something must pick which of hundreds of servers handles it, without ever
breaking a connection that is already open. That is the job of a layer-4 load balancer, and interviewers
use it to probe hashing, state, failure handling and how deploys avoid dropping users.

::: info Before you start
- A TCP or UDP connection is identified by four numbers: source and destination IP address and port
  ([chapter 3](/foundations/tcp-and-udp)).
- **Anycast** announces one address from many places, and routers deliver each packet to a nearby one
  ([chapter 9](/internet/internet-routing)).
- QUIC labels each connection with **connection IDs**, so a connection can survive a change of address
  ([chapter 7](/protocols/quic)).

The chapter makes sense without them. Addresses and names in the examples are placeholders.
:::

## What an L4 load balancer does

**In short:** it receives packets for one public address and spreads them across many servers, one
connection at a time, by looking only at addresses and ports.

A large site publishes one address, say `192.0.2.10`, but needs hundreds of servers behind it. That shared
public address is a <Term id="vip">virtual IP (VIP)</Term>: no single machine owns it. Something has to take
each packet sent to the VIP and pass it to one real server, the **backend**. And every packet of one
connection must reach the same backend, or the connection breaks.

A <Term id="l4-load-balancer">layer-4 (L4) load balancer</Term> does this using only the packet's outer
headers. It reads the protocol and the <Term id="four-tuple">four-tuple</Term> (source and destination IP
and port). It does not decrypt <Term id="tls">TLS</Term> or read HTTP. All packets with the same four-tuple
form one **flow**, and the balancer's single promise is that a flow keeps going to the same backend.

Large sites put this tier in front of their [L7 proxies](/edge/l7-proxies), which terminate TLS and route
HTTP requests. The split exists for good reasons:

- **Cost per packet.** An L4 balancer does a hash and a table lookup per packet. It holds no TLS keys and no
  buffers. One machine can keep up with a fast network card.
- **Any protocol.** TCP, UDP and QUIC all have addresses and ports, so one tier fronts them all.
- **Freedom behind it.** The L7 fleet can grow, shrink and be redeployed behind a VIP that never changes.
- **The client's address survives.** Backends see the real client IP, which logging, rate limits and abuse
  handling need.

The cost: an L4 balancer balances **connections, not requests**. One busy HTTP/2 or gRPC connection stays on
one backend for its whole life, however many requests it carries. Spreading requests is the
[L7 proxy](/edge/l7-proxies)'s job.

::: details Going deeper: software balancers and fast packet paths
Large sites mostly run L4 balancing as software on ordinary servers, not as dedicated appliances. To keep up,
they process packets before the kernel's normal network stack (XDP) or bypass the kernel entirely (DPDK), and
spread work across cores with receive-side scaling. The
[OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers all three. Linux also ships a
built-in L4 balancer, IPVS, managed with `ipvsadm`.
:::

## ECMP, and why it is not enough

**In short:** routers can already spread flows across several next hops by hashing. But their hashing moves
many flows whenever the set changes, and it knows nothing about health or load, so it only gets packets to
the balancers.

A router that has several equally good paths to an address can use all of them. It hashes each packet's
addresses and ports and picks a path from the result. The same flow always produces the same hash, so it
sticks to one path. This is <Term id="ecmp">equal-cost multi-path routing (ECMP)</Term>.

So why not let the router spread flows straight across the backends? Each backend could announce the VIP to
the router over <Term id="bgp">BGP</Term>, and ECMP would do the rest. Small deployments do this. At scale,
three problems appear:

- **Changes move most flows.** Many routers pick a path as roughly `hash mod N`. When N changes from 10 to 9,
  almost every flow gets a different answer. Each moved TCP connection lands on a server that has never seen
  it, and that server resets it.
- **No real health or load signal.** A backend stays in the set while its BGP session is up, even if the
  application on it is broken or overloaded. The router cannot weight servers by size or load.
- **Limited size.** Routers support only a limited number of paths per address, set by the hardware.

The standard answer is two tiers. Routers use ECMP to spread flows across a small tier of L4 balancers,
which all announce the same VIP. The balancers then choose backends with a smarter scheme. ECMP changes still
move flows between balancers, when one is added, removed or fails. So the scheme must make **every balancer
pick the same backend for the same flow**. Then it does not matter which balancer a flow lands on.

<L4PathDiagram />

::: details Going deeper: resilient ECMP
- RFC 2992 (2000) analyses the common "hash-threshold" method. It moves fewer flows than plain `hash mod N`,
  but a change still moves a large share of them.
- Some switches offer **resilient** or "sticky" hashing. They keep a table of buckets and refill only the
  failed path's buckets, so other flows stay put. Support and limits vary by vendor and hardware.
- <Term id="icmp">ICMP</Term> error messages carry only addresses, not the original ports, in their outer header. ECMP may send them
  to a different machine from the one holding the flow. That matters for path MTU discovery (see "Where it
  breaks").
:::

## Choosing a backend: consistent hashing

**In short:** hash each flow into a large table that maps to backends. Build the table so that removing a
backend changes only that backend's share, and every balancer builds the identical table.

The simplest balancer would compute `hash(four-tuple) mod N` and pick that backend. It has the same flaw as
ECMP: when one of ten backends fails, about nine in ten flows change backend, not one in ten. A balancer
needs a scheme where a change moves only the flows that must move. That property is called
<Term id="consistent-hashing">consistent hashing</Term>. Three designs are common:

| Scheme | How it picks | Strength | Weakness |
|---|---|---|---|
| **Hash ring** | Backends and flows are points on a circle; a flow goes to the next backend clockwise | Classic and well known | Uneven unless each backend gets many points |
| **Rendezvous hashing** | Score every backend as `hash(flow, backend)`; take the highest | Simple, very even, minimal movement | Cost grows with the number of backends, unless results are precomputed into a table |
| **Maglev-style table** | Precompute a large table of slots, each naming a backend; a flow hashes to one slot | One lookup per packet, very even | A change moves slightly more than the minimum |

### How a Maglev table is built

The <Term id="maglev-hashing">Maglev table</Term> comes from Google's 2016 paper on its load balancer. The
table has M slots, where M is a prime much larger than the number of backends. Each backend gets its own
pseudo-random order of preferred slots, derived from hashing its name. Then the backends take turns: each
claims its next preferred slot that is still empty, until the table is full.

Taking turns gives every backend almost exactly the same number of slots. Because each backend's preference
order depends only on its own name, removing one backend mostly frees its own slots. The others keep nearly
all of theirs.

### Try it: how many flows move

This toy builds a Maglev-style table for 10 backends, removes one, and counts how many of 100,000 flows
change backend. It compares the result with plain `hash mod N`.

```python
# Run: python3 maglev.py   (toy Maglev-style table; compares it with "hash mod N")
import hashlib

M = 65537  # table size: a prime, much larger than the number of backends

def h(s, salt):
    return int.from_bytes(hashlib.sha256(f"{salt}:{s}".encode()).digest()[:8], "big")

def build_table(backends):
    # Each backend gets its own preference order over the slots.
    offset = {b: h(b, "offset") % M for b in backends}
    skip = {b: h(b, "skip") % (M - 1) + 1 for b in backends}
    nxt = {b: 0 for b in backends}
    table, filled = [None] * M, 0
    while True:
        for b in backends:  # backends take turns claiming their next free slot
            while True:
                slot = (offset[b] + nxt[b] * skip[b]) % M
                nxt[b] += 1
                if table[slot] is None:
                    break
            table[slot] = b
            filled += 1
            if filled == M:
                return table

flows = [f"203.0.113.{i % 250}:{40000 + i}" for i in range(100_000)]
backends = [f"backend-{i}" for i in range(10)]
after = [b for b in backends if b != "backend-3"]  # backend-3 fails

t1, t2 = build_table(backends), build_table(after)
maglev = sum(t1[h(f, "flow") % M] != t2[h(f, "flow") % M] for f in flows)
modn = sum(backends[h(f, "flow") % 10] != after[h(f, "flow") % 9] for f in flows)
lost = sum(t1[h(f, "flow") % M] == "backend-3" for f in flows)

print(f"flows on the failed backend:  {lost / len(flows):.1%}")
print(f"flows moved, Maglev table:    {maglev / len(flows):.1%}")
print(f"flows moved, hash mod N:      {modn / len(flows):.1%}")
```

```text
flows on the failed backend:  10.0%
flows moved, Maglev table:    10.2%
flows moved, hash mod N:      89.9%
```

What to look for: the failed backend's 10% of flows must move, since that server is gone. The Maglev table
moves only a fraction of a percent more. `hash mod N` moves nine in ten, so nearly every open connection would
break.

::: details Going deeper: Maglev details
- In the paper, each backend's preference order comes from two hashes of its name: a starting slot (offset)
  and a step size (skip). Because M is prime, stepping by any skip visits every slot.
- Weights are supported by letting heavier backends claim slots more often.
- The paper chooses M much larger than the number of backends (it evaluates M = 65,537) so that every
  backend's share is close to equal. The table is rebuilt on every backend change.
- Maglev deliberately trades a little extra movement for even balance. The extra flows that move are
  protected by connection tracking, covered next.
:::

## Connection state: track, or stay stateless

**In short:** a balancer can remember which backend each flow went to, which protects flows when backends
change but not when flows move between balancers. Or it can keep no state and let backends pass stray
packets to the right place.

Consistent hashing alone still breaks a few flows on every change, as the toy showed. Two families of
designs close that gap.

### Connection tracking

The balancer keeps a table: this flow went to that backend. Each packet checks the table first, and only new
flows use the hash. This is <Term id="connection-tracking">connection tracking</Term>. A flow that started on
backend B stays there even after the hash table changes, so adding a backend breaks nothing.

The limits are real:

- **State is local.** If ECMP moves a flow to another balancer, that balancer has no record of it. It falls
  back to the hash, which is why the hash must also be consistent across balancers.
- **Memory is an attack surface.** A flood of fake connection attempts fills the table. Designs bound it, for
  example with a cache that drops the least recently used entries.
- **Timeouts are guesses.** TCP has a clear start and end, but UDP does not. The balancer must guess when an
  idle UDP flow is over.

### Stateless designs with a second chance

The other family keeps no per-flow state in the balancer at all. The table maps each bucket to **two**
backends: the current owner and the previous one. A packet goes to the current owner first. If that backend
has no connection matching the packet, and the packet is not the start of a new connection, it forwards the
packet to the previous owner. This is <Term id="daisy-chaining">second-chance forwarding</Term> (the research
paper that introduced it calls it daisy chaining).

<L4SecondChanceDiagram />

Now the backends' own connection tables are the state, and they already exist. Balancers can come and go at
any time, because they are all interchangeable. The cost is a small amount of extra forwarding after each
change, and a module on every backend that checks for unknown packets.

| | Connection tracking | Stateless with second chance |
|---|---|---|
| Survives a backend change | Yes, on the same balancer | Yes, through forwarding |
| Survives a flow moving between balancers | Only if the hash agrees | Yes |
| Memory per flow in the balancer | Yes | None |
| Extra machinery | Table size and timeouts | Redirect module on each backend |

::: details Going deeper: what the public designs say
- **Maglev** (Google, 2016 paper) combines a consistent table with a local connection tracking table on each
  balancer.
- **Katran** (Meta, open-sourced 2018) uses an extended Maglev hash and a small connection cache that evicts
  the least recently used entries. The blog notes that hashing can be cheaper than a cache lookup, and Katran
  can run in a compute-only mode without the cache.
- **GLB Director** (GitHub, 2018) builds a table of 65,536 rows with rendezvous hashing. Each row has a
  primary and a secondary backend, and a module on each backend forwards packets it cannot match to the
  secondary. GitHub's blog describes the director tier as completely stateless for TCP flows.
- **Unimog** (Cloudflare, 2020) uses the same two-slot idea, credited to the Beamer paper (NSDI 2018). It runs
  on every edge server rather than on separate balancer machines, and adjusts the table from measured server
  load.
:::

## Delivering packets and the return path

**In short:** the balancer wraps each packet in a new header to reach the backend, and the backend replies to
the client directly. Replies, which are most of the bytes, never pass through the balancer.

A balancer cannot rewrite the destination to the backend's address and send it on, at least not cheaply.
Then the reply would come from the backend's address, which the client never contacted. The balancer would
have to sit on the return path to rewrite it back, as a <Term id="nat">NAT</Term> does. That doubles its
traffic, makes it stateful and makes it a bottleneck.

Instead, most large-scale balancers leave the original packet untouched and **wrap** it. They add a new
outer IP header addressed to the backend, a form of <Term id="encapsulation">encapsulation</Term>. The
simplest form puts a whole IP packet inside another, called <Term id="ip-in-ip">IP-in-IP</Term>. The backend
unwraps it and finds a packet addressed to the VIP from the client.

The backend has the VIP configured on a local interface, usually the loopback, so it accepts the packet. It
replies from the VIP to the client, straight through the normal network. This is
<Term id="direct-server-return">direct server return (DSR)</Term>.

DSR fits web traffic well. Requests are small and responses are large, often by a factor of ten or more. The
balancer only handles the incoming side, so a few balancers can front a large fleet. The costs:

- **Smaller packets.** The outer header takes 20 or more bytes. Without care, full-size packets no longer fit
  the link's <Term id="mtu">MTU</Term>, so sites raise the MTU inside the datacenter or lower the
  <Term id="mss">MSS</Term> clients use. [Chapter 2](/foundations/packets-and-links) covers both.
- **The balancer sees half the conversation.** It never sees replies, so it cannot measure response times or
  notice a backend that accepts connections but never answers.
- **Every backend needs setup.** The VIP on loopback, the tunnel device, and kernel settings so the backend
  does not answer address lookups for the VIP itself.
- **ICMP errors go astray.** "Packet too big" messages are addressed to the VIP. The balancer must route them
  to the backend that holds the flow, using the original header copied inside the message.

### Try it: look at a DSR backend

On a Linux machine set up as a DSR backend (needs root for `tcpdump`):

```text
$ ip addr show lo
1: lo: <LOOPBACK,UP,LOWER_UP> mtu 65536
    inet 127.0.0.1/8 scope host lo
    inet 192.0.2.10/32 scope global lo

$ sudo tcpdump -ni eth0 -c 2 'ip proto 4'
IP 10.0.1.5 > 10.0.2.17: IP 198.51.100.7.51234 > 192.0.2.10.443: Flags [S] ...
IP 10.0.1.5 > 10.0.2.17: IP 198.51.100.7.51234 > 192.0.2.10.443: Flags [.] ...
```

(Trimmed and illustrative.) The VIP `192.0.2.10/32` sits on the loopback. Each captured packet shows two
headers: the outer one from the balancer (`10.0.1.5`) to this backend, and the inner one from the client to
the VIP. `ip proto 4` matches IP-in-IP; designs that wrap in UDP or GRE need a different filter. Replies
leave with source `192.0.2.10` and no outer header.

::: details Going deeper: encapsulation choices
- **IP-in-IP** adds 20 bytes for IPv4. Katran (2018) uses it, and varies the outer source address per flow so
  the backend's receive-side scaling spreads flows across cores.
- **GRE** adds a small extra header. The Maglev paper (2016) uses GRE.
- **UDP-based** wrapping (GUE) gives routers and NICs a port pair to hash on and room for extra data. GLB
  Director (2018) stores the secondary backend's address in it, and Unimog (2020) uses it too.
- Linux IPVS supports all three delivery styles: NAT, direct routing on the same network segment, and
  tunnelling. Direct routing rewrites only the destination MAC address, which needs balancer and backend on
  one network segment.
:::

## QUIC and connection-ID-aware balancing

**In short:** a QUIC connection can change its addresses and ports mid-flight, which breaks hashing on the
four-tuple. The fix is to hash on the connection ID instead, ideally with the backend's identity encoded
inside it.

Everything so far assumes a flow's four-tuple never changes. QUIC breaks that on purpose. A phone moves from
Wi-Fi to cellular, or a NAT box on the path picks a new port, and the next packet arrives from a new address.
QUIC carries on because every packet names its connection with a <Term id="connection-id">connection
ID</Term>, not by its addresses. This is <Term id="connection-migration">connection migration</Term>,
covered in [chapter 7](/protocols/quic).

A balancer hashing on the four-tuple sends the migrated packet to a different backend, which has never heard
of the connection. Migration then fails. Worse, NAT rebinding happens without the user moving at all.

So the balancer must route QUIC by connection ID. That is harder than it sounds:

- **The first packets carry a client-chosen ID.** It is random and means nothing to the balancer, so it
  hashes the first packets in the normal way.
- **The server then picks the IDs** the client will use from then on. If those IDs are random too, the
  balancer would need a table from ID to backend, shared across every balancer.
- **IDs must not be linkable.** QUIC gives a migrating client fresh IDs so an observer cannot tie its old and
  new paths together. A plain server number inside every ID would undo that.

The clean answer is to let the backend **encode its own identity** in the IDs it hands out. Any balancer can
then read the backend from the ID, with no shared table. The IETF draft for this is called
<Term id="quic-lb">QUIC-LB</Term>. It encrypts the server identity inside the ID with a key the balancers and
servers share, so outsiders see random bytes. Packets with unreadable IDs fall back to four-tuple hashing.

::: details Going deeper: the QUIC-LB draft
- The draft is draft-ietf-quic-load-balancers. Its latest revision, 21, dates from August 2025. As of 2026
  it is an expired Internet-Draft, not an RFC, so check its status before relying on it.
- The first byte of a routable ID holds three **config rotation** bits, so balancers and servers can switch to
  a new key or format gradually. The remaining bits can encode the ID's length, because short-header QUIC
  packets do not carry it and a balancer must know where the ID ends.
- After the first byte comes the server ID and a nonce. They are encrypted with AES as one block if they total
  16 bytes, and with a four-round Feistel construction for other lengths. A plaintext mode exists too.
- Before QUIC-LB, designs used their own schemes. Cloudflare's 2020 Unimog post describes extracting the
  connection ID from QUIC packets and using it in place of the four-tuple.
:::

## Health checks

**In short:** the balancer's control plane probes every backend and removes the ones that fail. The hard
parts are deciding what "failed" means, and not removing too much at once.

A balancer must stop sending new flows to a dead backend. Its management software, the **control plane**,
does this by probing each backend
regularly: open a TCP connection, or fetch a status URL over HTTP. A backend that fails several probes in a
row is removed from the table, and one that passes several in a row is added back. Requiring several results
stops a single lost probe from flapping a server in and out.

What the probe tests matters most:

- **A TCP probe** proves the port is open. The process may still return errors on every request.
- **An HTTP status URL** proves more, if it exercises the real serving path. If it also checks every
  dependency, one shared database hiccup marks every backend unhealthy at once.
- **Probes from the balancer** cover the balancer's own view. With DSR, that view is only the inbound half.

The second hard part is **blast radius**. If a bug makes health checks fail everywhere, a naive balancer
removes every backend and serves nothing, even though the backends are fine. Mature designs cap how much
capacity health checks can remove in a short time. When most backends look unhealthy, they **fail open**:
keep sending to all of them, on the theory that the checks are probably wrong.

The balancers need health checks too. Each one announces the VIP over BGP only while it is healthy, so the
router's ECMP stops sending to a balancer that withdraws. Health checks that look at responses, not just
probes, and eject servers based on real errors are the [L7 proxy](/edge/l7-proxies)'s domain. Health checks
between whole sites and regions are [chapter 10](/edge/steering)'s.

## Draining and deploys

**In short:** to take a backend out without breaking users, stop sending it new connections, let existing ones
finish, then remove it. Long-lived connections never finish by themselves, so they need a deadline and a nudge.

A deploy restarts every backend, a few at a time. Removing a backend from the table abruptly breaks its open
connections. **Connection draining** avoids that. The backend is marked as draining: the balancer stops
picking it for new flows but keeps delivering packets for existing ones. When its connection count reaches
zero, or a timeout expires, it is removed and restarted.

How draining works depends on the state design:

- **With connection tracking**, the balancer keeps routing tracked flows to the draining backend. A flow that
  moves to another balancer loses that protection.
- **With second-chance forwarding**, the draining backend moves from first to second place in its buckets.
  New flows go to the new first choice. Packets for old flows bounce off it and reach the draining backend.
  GLB Director's 2018 post describes draining exactly this way.

The trouble is long-lived connections: WebSockets, gRPC streams, HTTP/2 connections from mobile apps. They
can stay open for hours, longer than any deploy wants to wait. So draining ends in two steps. First the
server asks clients to reconnect, for example with an HTTP/2 GOAWAY frame
([chapter 6](/protocols/http)). After a deadline, it closes whatever is left. Clients must reconnect
smoothly, or every deploy becomes a burst of errors and a reconnect storm.

Deploying the **balancers themselves** follows the same pattern one tier up. Withdraw one balancer's BGP
announcement, wait for ECMP to move its flows, then upgrade it. Because every balancer computes the same
backend for a flow, the moved flows land on the same servers. Changing the backend table needs care too:
balancers that briefly disagree send the same flow to different backends, so the rollout must be fast and
the state design must tolerate the gap.

### Try it: watch a backend drain

On the backend, count established connections on port 443 while it drains:

```text
$ watch -n 5 "ss -Htn state established '( sport = :443 )' | wc -l"
1874
...
212
...
3
```

(Illustrative.) Most short connections finish within seconds. The slow tail is long-lived clients. If the
count stays flat, something is still sending new flows, or clients are not reacting to the request to
reconnect.

::: details Going deeper: timeouts in practice
- Drain timeouts are a trade-off between deploy speed and broken connections. Values from tens of seconds to
  several minutes are common. AWS load balancers, for example, call it a deregistration delay, with a default
  of 300 seconds (as of 2025).
- A backend restarting on the same machine can also hand its listening socket to the new process, so the
  kernel keeps accepting connections during the switch. The
  [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers sockets and the accept
  queue.
:::

## Why this matters in real systems

**The L4 tier is the anchor of an edge site.** Anycast brings a user to a nearby site
([chapter 9](/internet/internet-routing)). Inside it, routers spread flows over L4 balancers, which pick an
L7 proxy, which picks an application server. Each layer can change without the one in front noticing, which
is what lets a large site deploy many times a day.

**ML serving and long-lived streams load unevenly.** An inference service behind an L4 balancer receives
connections, not requests. A few clients holding busy gRPC streams can pin most of the load on a few servers,
while others sit idle. The usual fix is request-level balancing in an L7 proxy or the client, plus connection
lifetimes capped at minutes so they rebalance.

**Mobile users migrate constantly.** Phones switch networks and NATs rebind ports. A QUIC deployment whose
balancer hashes on the four-tuple loses connections at exactly the moments migration was designed for. Sites
adopting HTTP/3 need connection-ID-aware routing at the L4 tier.

**Cloud network load balancers are this pattern as a service.** They keep the client's source address, pass
any protocol through, and leave TLS to the backend. When a team needs end-to-end TLS, very high connection
counts or non-HTTP protocols, the L4 balancer is the right choice.

**How to look at it:**

```bash
sudo ipvsadm -Ln --stats                              # Linux IPVS: VIPs, backends, counters (root)
ip -d link show type ipip                             # is there an IP-in-IP tunnel device?
ss -Htn state established '( sport = :443 )' | wc -l  # connections on a backend
sudo tcpdump -ni eth0 'ip proto 4'                    # wrapped packets arriving at a backend
curl -o /dev/null -s -w '%{remote_ip}\n' https://example.com/  # which VIP you reached
```

## Where it breaks

**GitHub, 2016: maintenance broke git clones.** GitHub's post introducing its load balancer explains the
problem it set out to fix. When a balancer was removed from an ECMP group, about 1/N of connections were
reassigned to others, which did not share connection state, so those connections were cut. Without
connection syncing, planned maintenance also disrupted connections. Git cannot resume a severed clone.
**Lesson:** design so that any balancer can handle any flow, then maintenance stops being an outage.
([GitHub, 2016](https://github.blog/2016-09-22-introducing-glb))

**Cloudflare, 2015: ECMP sent ICMP to the wrong server.** After a network change, ECMP routed ICMP "packet too
big" messages by address only, so they often reached a different server from the one holding the TCP flow.
Path MTU discovery broke, and users on IPv6 tunnels, which have smaller MTUs, saw connections fail. Cloudflare's fix
broadcast these ICMP messages to all servers in the site. **Lesson:** anything that spreads flows must also
route the error messages about those flows.
([Cloudflare, 2015](https://blog.cloudflare.com/path-mtu-discovery-in-practice/))

**AWS Network Load Balancer, 2025: flapping health checks removed capacity.** On 20 October 2025, during a
wider AWS outage in us-east-1, new EC2 instances joined the NLB health-check system before their network
setup had propagated. Health checks alternated between failing and passing, so healthy NLB nodes and targets
were removed and re-added repeatedly, and automatic failover took capacity out of service. Engineers disabled
automatic health-check failover to restore it, and AWS added a limit on how much capacity health-check
failures can remove. **Lesson:** cap what health checks can take away; a broken checker looks like a broken
fleet. ([AWS, 2025](https://aws.amazon.com/message/101925/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. What does an L4 load balancer do, and how is it different from an L7 one?
An L4 balancer looks only at protocol, addresses and ports. It picks a backend per connection and makes sure
every packet of that connection goes there. It does not decrypt TLS or read HTTP.

An L7 balancer terminates the connection, reads each request and can route by path, header or cookie. It can
retry requests and balance per request, but costs far more per byte.

**Senior add-on:** large sites stack them: anycast, ECMP to an L4 tier, then an L7 proxy fleet. The L4 tier
gives a stable VIP and keeps client addresses; L7 does the smart routing. L4 balances connections, so
long-lived multiplexed connections can load backends unevenly.
:::

::: details 2. Why not use ECMP from the router straight to the backends?
Router hashing usually moves most flows when the set of paths changes, so every backend failure or deploy
breaks many unrelated connections. The router also knows nothing about application health or load, and
supports a limited number of paths.

**Senior add-on:** ECMP is still the first step, spreading flows across the balancer tier. The balancers must
then make that rehash harmless: every balancer computes the same backend for a flow, through a consistent
table, and ideally keeps no state that only it knows.
:::

::: details 3. Explain consistent hashing. Why does a Maglev table beat a hash ring for a packet balancer?
With `hash mod N`, changing N remaps nearly every flow. Consistent hashing remaps only about the share of the
backend that changed. A ring does it by placing backends and flows on a circle.

A Maglev table precomputes a large array of slots, each naming a backend, built so that each backend gets an
almost equal share. Lookup is one hash and one array read per packet.

**Senior add-on:** rings need many virtual points per backend to balance evenly, and lookup is a search. Maglev
gives near-perfect balance and constant-time lookup, at the cost of slightly more movement on change, which
connection tracking or second-chance forwarding covers. Rendezvous hashing is another option, often
precomputed into a table as GLB does.
:::

::: details 4. Design the L4 load balancing tier for a large edge site.
Announce the VIPs from a tier of software balancers over BGP; routers spread flows across them with ECMP.
Each balancer hashes the four-tuple into the same consistent table of backends, built from a shared list.
Wrap packets to the backends and reply with direct server return, so balancers handle only inbound traffic.

Add a control plane: health checks on backends, removal limits so it fails open, and draining for deploys.
Each balancer withdraws its BGP route when unhealthy.

**Senior add-on:** choose between connection tracking and stateless second-chance forwarding, and explain
the trade. Handle QUIC by routing on connection IDs with an encoded server ID. Handle ICMP "packet too big"
messages and the MTU cost of encapsulation. Plan for floods: stateless designs do not fill up, stateful ones
need bounded tables. Roll out table changes quickly so balancers do not disagree for long.
:::

::: details 5. What is direct server return, and what does it cost?
The balancer wraps the client's packet and sends it to the backend. The backend, which has the VIP on its
loopback, replies to the client directly. Replies skip the balancer.

Since responses are usually much bigger than requests, the balancer handles a fraction of the bytes.

**Senior add-on:** the costs are encapsulation overhead and MTU care, setup on every backend, and a balancer
that sees only half of each connection, so it cannot measure latency or detect a backend that never replies.
ICMP errors addressed to the VIP need special routing back to the right backend.
:::

::: details 6. Why does QUIC need special handling in an L4 balancer?
QUIC connections can change their addresses and ports when a phone switches networks or a NAT rebinds.
A balancer that hashes the four-tuple sends the next packet to a different backend, which drops it.

The balancer must route on the connection ID instead. The backends embed an encrypted server identity in
the IDs they issue, so any balancer can decode the right backend without a shared table.

**Senior add-on:** the client's first packets use a random ID, so they are hashed normally. The server ID
must be encrypted so migrated paths cannot be linked. The IETF QUIC-LB draft defines this, including config
rotation bits for changing keys. Unreadable IDs fall back to four-tuple hashing.
:::

::: details 7. During every deploy, users see a spike of connection resets. How do you find out why?
First check whether resets line up with backend restarts or with changes to the balancer tier. Capture on a
restarted backend with `tcpdump 'tcp[tcpflags] & tcp-rst != 0'` and check whether it sends resets for
connections it does not know. That means flows were moved to it mid-connection.

Then check draining. Is the backend marked as draining before it stops? Does the drain wait long enough? Do
long-lived clients get asked to reconnect, and do they?

**Senior add-on:** look at the state design. With connection tracking, a balancer restart or ECMP change in
the same window loses state. With stateless hashing, any table change moves flows. Check whether all
balancers got the new table at the same time, since disagreement sends one flow to two backends.
:::

::: details 8. Health checks are failing on half the fleet but users see no errors. What do you do?
Suspect the checker before the fleet. Look at what the probe tests and from where. A shared dependency in
the health URL, a network change between balancer and backends, or a broken checker all produce this.

Make sure the system fails open: it should stop removing capacity when too much looks unhealthy at once.

**Senior add-on:** separate liveness (can this server serve?) from dependency health. Rate-limit how much
capacity health checks can remove. The AWS NLB incident in October 2025 is a public example of flapping
checks removing healthy capacity.
:::

::: details 9. One backend receives far more load than the others, though the table is even. Why?
Equal slots mean equal numbers of flows, not equal work. A few connections may carry much more traffic, for
example busy HTTP/2 or gRPC connections, or one big client behind a NAT.

Check connection counts and bytes per connection on that backend.

**Senior add-on:** fixes are request-level balancing in an L7 proxy or the client, capping connection
lifetimes so clients rebalance, or load-aware tables like Unimog's (2020), which adjust bucket ownership from
measured server load.
:::

## Common misconceptions

- **"A load balancer spreads requests."** An L4 balancer spreads connections. Many requests on one connection
  all go to one backend.
- **"ECMP is load balancing enough."** It spreads flows but breaks many of them on every change and ignores
  health.
- **"Consistent hashing means no connections break."** It limits how many move. Tracking or second-chance
  forwarding protects the rest.
- **"The balancer sees all the traffic."** With DSR, replies bypass it entirely.
- **"Draining is instant."** Long-lived connections can last hours unless the server asks clients to
  reconnect.

## Key takeaways

- Routers use **ECMP** to spread flows over an L4 tier; the balancers must make any rehash harmless by
  choosing backends **consistently**.
- **Maglev-style tables** give even balance and one lookup per packet; a backend change moves little more
  than its own share.
- **Connection tracking** or **second-chance forwarding** protects the flows that would still move.
- **Encapsulation plus DSR** keeps balancers off the return path, at a cost in MTU and visibility.
- **QUIC** needs routing on connection IDs; **health checks** and **draining** decide whether deploys and
  failures break users.

## Review

<Flashcards id="l4-load-balancing" :cards="cards" />

<MarkDone id="l4-load-balancing" />

## Sources

- [Maglev: A Fast and Reliable Software Network Load Balancer](https://www.usenix.org/conference/nsdi16/technical-sessions/presentation/eisenbud) (paper, NSDI, 2016)
- [Stateless Datacenter Load-balancing with Beamer](https://www.usenix.org/conference/nsdi18/presentation/olteanu) (paper, NSDI, 2018)
- [RFC 2992: Analysis of an Equal-Cost Multi-Path Algorithm](https://www.rfc-editor.org/rfc/rfc2992) (RFC, 2000)
- [RFC 9000: QUIC, A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000) (RFC, 2021)
- [QUIC-LB: Generating Routable QUIC Connection IDs](https://datatracker.ietf.org/doc/draft-ietf-quic-load-balancers/) (Internet-Draft, revision 21, 2025)
- [Open-sourcing Katran, a scalable network load balancer](https://engineering.fb.com/2018/05/22/open-source/open-sourcing-katran-a-scalable-network-load-balancer/) (engineering blog, 2018)
- [Introducing the GitHub Load Balancer](https://github.blog/2016-09-22-introducing-glb) (engineering blog, 2016)
- [GLB: GitHub's open source load balancer](https://github.blog/2018-08-08-glb-director-open-source-load-balancer/) (engineering blog, 2018)
- [Unimog: Cloudflare's edge load balancer](https://blog.cloudflare.com/unimog-cloudflares-edge-load-balancer/) (engineering blog, 2020)
- [Path MTU discovery in practice](https://blog.cloudflare.com/path-mtu-discovery-in-practice/) (engineering blog, 2015)
- [AWS post-event summary: October 2025 disruption in US-EAST-1](https://aws.amazon.com/message/101925/) (incident report, 2025)
