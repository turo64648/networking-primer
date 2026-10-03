---
title: 16. Reaching the Service
---

<script setup>
import { cards } from './reaching-the-service-review'
</script>

# 16. Reaching the Service

The request is inside the datacenter now, but it still has to find one healthy server out of thousands,
and that server's address changes every time someone deploys. This chapter covers that last hop: virtual
IPs, service discovery, service meshes and Kubernetes Services. It is where most "it works on my machine but
times out in production" puzzles live, so interviewers probe it often.

::: info Before you start
- A **load balancer** spreads connections across many servers behind one address. [Chapter 11](/edge/l4-load-balancing)
  covers balancing by packet (layer 4) and [chapter 12](/edge/l7-proxies) balancing by HTTP request (layer 7).
- **DNS** turns names into addresses, and caches answers for a time-to-live (TTL). [Chapter 4](/protocols/dns)
  covers it.
- Inside the datacenter, servers sit in racks joined by a fabric of switches, and packets are sometimes
  wrapped in an outer header to cross it. [Chapter 15](/backend/datacenter-fabric) covers the fabric.

The chapter makes sense without them. Addresses, names and outputs in the examples are placeholders.
:::

## The problem: a moving target

**In short:** the edge proxy knows the name of the service it wants, not which machines run it. Something
must turn that name into a healthy server's address, fast, while servers come and go.

The edge proxy from [chapter 12](/edge/l7-proxies) has decided that `/api/cart` goes to the cart service. The
cart service is 300 copies of one program, each copy called an **instance**. Every deploy replaces them. An
autoscaler adds and removes some every few minutes. Machines fail. Any address list written down this
morning is wrong by lunch.

So the last hop needs two things. First, a way to learn which instances exist and are healthy right now.
That is <Term id="service-discovery">service discovery</Term>. Second, a way to pick one instance for each
connection or request. That is load balancing, which [chapter 11](/edge/l4-load-balancing) and
[chapter 12](/edge/l7-proxies) cover in depth.

Inside a datacenter the same problem repeats for every call between services, not only for the request from
the edge. A single user request can cross this hop many times. This chapter follows the first crossing only:
from the edge proxy to the first application server's network card.

There are three common designs, and real systems mix them:

<ServiceBalancingModelsDiagram />

- **A central load balancer** behind a stable address. Callers know one address and nothing else.
- **Client-side balancing.** Each caller learns the instance list and picks an instance itself.
- **A sidecar proxy** next to each instance. A small local proxy does the discovery and balancing on the
  program's behalf.

The rest of the chapter takes these in turn, then shows how Kubernetes implements them.

## Internal VIPs and load balancers

**In short:** give the service one stable virtual address and put a load balancer behind it. Callers stay
simple, but every call pays for an extra hop and all callers share the balancer's limits.

The oldest answer is the same as at the edge. The service gets a <Term id="vip">virtual IP (VIP)</Term>: an
address that belongs to no single machine. A load balancer owns it and forwards each connection to a healthy
instance. Callers look up `cart.internal` in DNS, get the VIP, and never learn about instances at all.

Internal load balancers use the same techniques as edge ones, recapped here from
[chapter 11](/edge/l4-load-balancing):

- Routers spread packets for the VIP across several balancer machines with <Term id="ecmp">ECMP</Term>
  (equal-cost multipath): hashing each flow's addresses and ports onto one of several equal routes.
- Each balancer picks an instance with <Term id="consistent-hashing">consistent hashing</Term>, so a balancer
  failure or a change in the instance list moves few existing connections.
- Many use <Term id="direct-server-return">direct server return</Term>: the reply goes straight from the
  instance to the caller, skipping the balancer.
- Health checks remove dead instances, and <Term id="drain">draining</Term> lets deploys finish
  existing connections before an instance leaves.

What changes inside the datacenter is the trade-off. The good side: any program in any language can call a
VIP, and the instance list lives in one place. The bad side:

- **An extra hop.** Each call crosses the balancer. For a layer-7 balancer that means another full proxy,
  with its own connection handling and its own queue.
- **A shared dependency.** The balancer's capacity and failures affect every caller. Teams often run one
  internal balancer per service or per group of services to limit the blast radius.
- **Coarse balancing for long connections.** A layer-4 balancer picks an instance once per connection.
  Callers that hold a few long-lived connections (see below) pin all their load onto a few instances.

### Long-lived connections defeat connection balancing

This is the most common surprise at this hop. A caller using <Term id="grpc">gRPC</Term> or any
<Term id="http2">HTTP/2</Term> client opens **one** connection and sends thousands of requests over it. A
layer-4 balancer sees one connection and sends it to one instance. Ten callers with one connection each
use ten instances out of 300, and the other 290 sit idle.

New instances added by the autoscaler get no traffic either, because no new connections arrive. The fix is
to balance **requests**, not connections. Either put a layer-7 proxy in the path, or let the caller hold
connections to many instances and spread requests across them. Both are covered below. A blunter fix is to
make servers close connections after a maximum age, so callers reconnect and get rebalanced.

::: details Going deeper: cloud internal load balancers
- Cloud providers sell internal layer-4 and layer-7 load balancers that give a private VIP inside a virtual
  network. Many implement the layer-4 kind inside the provider's virtual network software on each host,
  rather than as separate boxes, so there is no extra visible hop. Details differ by provider and change over
  time; check the current documentation for limits on connections and idle timeouts.
- Idle timeouts on internal balancers cause a classic bug: the balancer silently forgets a connection after,
  say, a few minutes of silence. The next request on that pooled connection fails or hangs. Set client
  keep-alives or pool idle timeouts shorter than the balancer's.
:::

## Service discovery

**In short:** instances must be listed somewhere callers can read. DNS is the universal, slow-to-change
option. A registry with watches pushes changes in seconds, but becomes a critical dependency.

### DNS-based discovery

The simplest registry is DNS itself. There are two flavours:

- **Name to VIP.** `cart.internal` returns the load balancer's VIP. The answer rarely changes, so caching
  does no harm. The balancer handles everything else.
- **Name to instances.** `cart.internal` returns the addresses of the instances themselves, perhaps a few
  dozen. The caller connects to one of them directly. **SRV** records can also carry each instance's port.

Every language and tool can use DNS, which is its big strength. But it inherits DNS's caching problems from
[chapter 4](/protocols/dns): answers live for a TTL, some runtimes cache longer, and nothing tells the caller
when the list changes. Answers also carry no health, load or weight. And a DNS answer has a size limit, so a
service with 2,000 instances cannot list them all.

So DNS discovery works best with stable answers: VIPs, or small sets that change slowly. With short TTLs
and many callers, internal DNS servers also take a heavy query load, often far higher than public DNS sees.

### Registry-based discovery

A <Term id="service-registry">service registry</Term> is a small, highly available database of who is
running where. ZooKeeper, etcd and Consul are common examples, and Kubernetes keeps its own list in its API
server. The usual flow:

1. An instance starts and registers itself: "cart, `10.1.4.7:8080`, healthy".
2. It renews that entry every few seconds. The entry is a **lease**: if renewals stop, the registry deletes
   it after a timeout. A crashed instance therefore disappears without anyone removing it.
3. Callers do not poll. They open a **watch**: "tell me whenever the cart list changes". Changes reach them
   within about a second.

This fixes DNS's weaknesses: updates are pushed, entries carry health and metadata (zone, version, weight),
and lists can be any size. The price is a client library or agent that speaks the registry's protocol, and
one more system that must never go down.

### When the registry fails

A registry is now on the path of every call, even if no packet passes through it. Two rules keep it from
becoming a single point of failure:

- **Fail static.** If callers lose the registry, they keep using their last known list. A slightly stale
  list is far better than an empty one.
- **Distrust sudden emptiness.** If the registry suddenly says a service has zero instances, or lost 80% of
  them at once, it is more likely broken than true. Good clients keep the old list and alert.

Health checks inside the registry follow the same logic. If a network partition cuts the registry off from
half the instances, their leases all expire at once. Netflix's Eureka registry, as its documentation
describes, has a "self-preservation" mode for this: when too many renewals stop at once, it stops expiring
entries.

::: details Going deeper: how the registry agrees with itself
- ZooKeeper, etcd and Consul replicate their data across 3 or 5 machines and use a consensus protocol so all
  copies agree. Writes need a majority, so a 5-node cluster survives 2 failures. Consensus itself is out of
  scope for this book.
- Because every write goes through consensus, registries handle modest write rates. Heartbeats from every
  instance in a large fleet can overload them. Large systems often put a caching layer or per-host agent
  between instances and the registry.
- Eureka took the opposite trade-off: it favours availability over agreement, and replicas may briefly
  disagree.
:::

## Where the balancing happens

**In short:** a central proxy keeps clients simple, a client library avoids the extra hop and sees the most,
and a sidecar gives library-like behaviour to programs in any language. Each moves cost to a different place.

Once a caller has a fresh instance list, someone must pick an instance per request. The three designs from
the start of the chapter put that choice in different places.

<Term id="client-side-load-balancing">Client-side load balancing</Term> puts it inside the caller's
process. A library holds connections to many instances and picks one per request. Because it sees every
response, it can use smart policies: send to the instance with fewer outstanding requests, or pick two at
random and take the less busy one (<Term id="power-of-two-choices">power of two choices</Term>, from
[chapter 12](/edge/l7-proxies)). There is no extra hop.

The cost is that the library must exist, and behave the same, in every language the company uses. Fixing a
bug means rebuilding and redeploying every service. Companies that standardise on one or two languages
often accept this. gRPC ships client-side balancing, and Twitter's Finagle library was an early, widely
copied example.

The table compares the three designs.

| | Central load balancer | Client library | Sidecar proxy |
|---|---|---|---|
| Extra network hops | One (the balancer) | None | None on the network; two local proxy passes |
| Works for any language | Yes | Only where the library exists | Yes |
| Balances per request | Only if layer 7 | Yes | Yes |
| Where updates roll out | Balancer fleet | Every service's build | Proxy fleet, separate from apps |
| Main cost | Shared capacity and failure point | Library sprawl | CPU, memory and latency per instance |

### Subsetting

Client-side balancing has a scaling trap. If 1,000 callers each hold a connection to all 1,000 instances,
that is a million connections. Each costs memory on both ends, and health checks multiply too.

The fix is **subsetting**: each caller connects to a small subset, say 20 to 50 instances, chosen so that
every instance gets a similar number of callers. Google's SRE book describes a deterministic scheme for this.
Too small a subset brings back the imbalance problem; too large brings back the connection count.

## Sidecars and service meshes

**In short:** put a small proxy next to every instance and route all its traffic through it. You get
discovery, balancing, encryption and metrics for every language, at the cost of CPU, memory, latency and a
lot of moving parts.

A <Term id="sidecar-proxy">sidecar proxy</Term> runs beside each instance, on the same host and usually in
the same network namespace. The program sends its request to what it thinks is the cart service. Firewall
rules on the host quietly redirect the connection to the local sidecar. The sidecar picks a cart instance,
opens a connection to it, and on the far side another sidecar receives it and hands it to the cart program.

A fleet of these proxies, plus a central system that configures them, is a
<Term id="service-mesh">service mesh</Term>. Istio and Linkerd are the best-known open-source meshes, and
most meshes use Envoy as the proxy. The central system is the mesh's
<Term id="control-plane">control plane</Term>: it watches the registry and pushes instance lists, routes and
policies to every sidecar. The sidecars themselves, which carry the traffic, are the **data plane**.

### What a mesh gives you

- **Request-level balancing for everyone**, with retries, timeouts and
  <Term id="outlier-detection">outlier detection</Term> (ejecting instances that return errors), without
  touching application code.
- **Encryption and identity.** Sidecars wrap every call in <Term id="mtls">mutual TLS (mTLS)</Term>, where
  both sides present certificates. Each certificate names the workload ("cart service, production"), not an
  IP address, so policies like "only checkout may call payments" survive address changes.
- **Uniform telemetry.** Every call gets the same metrics and tracing headers.
- **Traffic shifting.** Send 1% of requests to a new version, or mirror traffic to a test copy, by changing
  configuration.

### What a mesh costs

These costs come up in every serious design discussion:

- **Latency.** Each call now passes through two extra proxies, one on each side. Each pass adds work in user
  space and two more trips through the kernel's network stack. Typical figures are sub-millisecond at the
  median and more at the tail, but they depend heavily on the proxy, its configuration and the load. Measure
  your own.
- **CPU and memory.** One proxy per instance adds up. A fleet of 10,000 instances runs 10,000 proxies.
  Each holds its own copy of the routing configuration, which can reach hundreds of megabytes if every
  sidecar is told about every service.
- **Control-plane scale.** Every deploy changes instance lists, and the control plane must push each change
  to every sidecar that cares. Meshes need configuration scoping ("this sidecar only talks to these five
  services") to keep this sane.
- **Startup and shutdown order.** If the program starts before its sidecar is ready, its first calls fail.
  If the sidecar exits first on shutdown, in-flight calls fail. Batch jobs used to hang because the sidecar
  never exited.
- **Debugging.** A timeout may now come from the app, either sidecar, or the control plane's configuration.
  Retries configured in both the app and the mesh multiply each other ([chapter 17](/operations/timeouts-retries-overload)).

### Alternatives to a sidecar per instance

Because of these costs, newer designs move the proxy out of each instance:

- **Proxyless.** The client library talks to the control plane directly, using the same configuration
  protocol the sidecars use (<Term id="xds">xDS</Term>, Envoy's API). gRPC supports this. You get mesh
  features without the extra hops, but only in languages the library supports.
- **One proxy per node.** A shared proxy on each host handles encryption and layer-4 work for all its
  instances. Istio's ambient mode does this with a per-node component, adding optional layer-7 proxies only
  for services that need them.
- **No mesh.** A good RPC library plus a central layer-7 proxy at a few choke points covers many companies.

::: details Going deeper: one large-scale example
Meta's ServiceRouter paper (OSDI 2023) describes a mesh serving a very large fleet in which about 99% of
calls go through a routing library embedded in each service, rather than sidecars. Sidecar and remote proxies
are kept for services that cannot use the library. The paper's argument is cost: at that scale, a proxy per
instance would use a large amount of hardware. It is one company's design at one point in time, not a rule.
:::

## Kubernetes Services

**In short:** a Kubernetes Service gives a set of pods a stable virtual address. No machine owns that
address: rules on every node rewrite it to a real pod's address, once per connection, and the kernel's
connection tracking remembers the choice.

Kubernetes is where most engineers meet this hop today, so interviewers expect the details.

### Pods, Services and EndpointSlices

Kubernetes runs programs in <Term id="pod">pods</Term>. Each pod gets its own IP address, and pods come and
go constantly. A <Term id="kubernetes-service">Service</Term> selects a group of pods by label ("all pods
with `app=cart`") and gives them one stable name and address.

That address is the <Term id="cluster-ip">ClusterIP</Term>, such as `10.96.0.20`. It comes from a range
reserved for Services, and cluster DNS maps `cart.shop.svc.cluster.local` to it.

Kubernetes keeps the current list of the Service's pod addresses in objects called
<Term id="endpointslice">EndpointSlices</Term>. A pod joins the list only when its
<Term id="readiness-probe">readiness probe</Term> passes: a check, such as an HTTP request to `/ready`, that
the kubelet (the agent on each node) runs every few seconds. A pod that fails it leaves the list but keeps
running.

### How a ClusterIP works

Here is the surprising part. No machine and no network interface has the ClusterIP. Nothing answers for it.
Instead, a program called <Term id="kube-proxy">kube-proxy</Term> runs on **every** node. It watches
Services and EndpointSlices and programs the node's kernel with rules like: "a new connection to
`10.96.0.20:80` should go to one of these pod addresses, chosen at random".

<ServiceClusterIpDiagram />

Follow a connection from a client pod on node A:

1. The client connects to `10.96.0.20:80`. The packet leaves the pod and enters node A's kernel.
2. The kernel's packet filter, <Term id="netfilter">netfilter</Term>, matches kube-proxy's rules. It picks
   a pod, say `10.244.2.7:8080` on node B, and rewrites the packet's destination. Rewriting the destination
   address is <Term id="dnat">destination NAT (DNAT)</Term>.
3. The kernel records the choice in its <Term id="connection-tracking">connection tracking</Term> table
   (conntrack). Every later packet of this connection gets the same rewrite without re-running the rules.
4. The packet crosses the fabric to node B as an ordinary pod-to-pod packet, using routes or an overlay
   ([chapter 15](/backend/datacenter-fabric)).
5. The pod's reply comes back to node A. Conntrack rewrites its source from `10.244.2.7:8080` back to
   `10.96.0.20:80`, so the client sees a reply from the address it called.

Two consequences matter in practice. First, the balancing happens **on the caller's node**, at connection
time. There is no central balancer to monitor, and no extra hop. Second, it is pure layer-4 balancing, once
per connection. The gRPC problem from earlier applies in full: one long-lived connection to a ClusterIP
pins to one pod.

For gRPC inside a cluster, the usual answer is a <Term id="headless-service">headless Service</Term>: one
with no ClusterIP. Its DNS name returns the pod addresses themselves, so a client-side
balancer can connect to all of them. Remember the DNS caveats: the client must re-resolve to see new pods.

### kube-proxy modes: iptables, IPVS, nftables

kube-proxy can program the kernel in several ways. The choice matters at scale:

- **iptables mode** (long the default on Linux). Each Service becomes a chain of rules, and each pod a rule
  that matches with a probability, so the choice is random. A new connection walks the rules in order, so
  cost grows with the number of Services. Worse, updates historically rewrote large parts of the table,
  which took seconds to minutes in clusters with tens of thousands of Services.
- **IPVS mode** uses the kernel's built-in layer-4 load balancer, which looks Services up in a hash table and
  offers more algorithms (round robin, least connections). It scales better, but still relies on iptables
  for some jobs and has had its own gaps.
- **nftables mode** uses netfilter's newer interface, with map lookups and incremental updates. It became
  generally available in Kubernetes 1.33 (2025), and the project positions it as the future default.

All three still use conntrack and DNAT, so the behaviour above holds for each.

### eBPF replacements

<Term id="ebpf">eBPF</Term> lets small, verified programs run inside the Linux kernel at hook points, such as
when a packet arrives or a socket connects. Networking plugins such as Cilium use it to replace kube-proxy
entirely.

The key trick is **socket-level balancing**. When a pod calls `connect()` to a ClusterIP, an eBPF program
swaps in a pod address right then, inside the socket. From then on the socket talks directly to the pod.
No packet ever carries the ClusterIP, so there is no per-packet rewrite and no conntrack entry for it.

For traffic entering from outside the cluster, the same plugins can balance in eBPF at the network card's
driver level, with consistent hashing and direct server return, much like the edge balancers of
[chapter 11](/edge/l4-load-balancing). The cost is a more complex, newer data path that fewer engineers know
how to debug. `iptables -L` no longer shows you what happens; you need the plugin's own tools.

### Traffic from outside the cluster

The edge proxy usually sits outside the cluster. To reach pods it has three common paths:

- **NodePort or LoadBalancer Services.** Every node listens on a port, and an external load balancer
  spreads traffic across nodes. The node that receives the packet may forward it to a pod on **another**
  node. That costs a hop and, by default, rewrites the source address too, so the pod sees the node's
  address instead of the caller's.
- **`externalTrafficPolicy: Local`** tells nodes to send only to their own pods. It keeps the source address
  and removes the second hop. But nodes without a ready pod must fail the external balancer's health check,
  and load is spread by node, not by pod.
- **Pod-direct.** Many cloud load balancers and ingress controllers send straight to pod addresses read from
  EndpointSlices, skipping node ports entirely. This is usually the best path when it is available.

::: details Going deeper: Kubernetes networking details
- Pod networking comes from a **CNI plugin** (Container Network Interface). It gives each pod an address
  and makes pod addresses reachable across nodes, with routes announced over BGP, an overlay such as VXLAN,
  or the cloud provider's own network.
- Conntrack has a fixed maximum size (`net.netfilter.nf_conntrack_max`). When it fills, the kernel logs
  `nf_conntrack: table full, dropping packet` and new connections fail. Nodes with many short connections,
  or DNS servers, hit this first.
- `sessionAffinity: ClientIP` pins each client address to one pod. It is coarse and rarely what you want.
- Topology-aware routing can make kube-proxy prefer pods in the caller's own zone, saving cross-zone
  latency and cloud transfer fees, at the risk of uneven load when zones are unbalanced.
- Kubernetes added native sidecar containers (stable in 1.33, 2025), which start before the main container
  and stop after it. They fix most of the startup and shutdown ordering problems described for meshes.
:::

### Cluster DNS and the ndots trap

Every pod's `/etc/resolv.conf` points at the cluster's DNS service (usually CoreDNS) and lists **search
domains**:

```text
$ kubectl exec -it some-pod -- cat /etc/resolv.conf
search shop.svc.cluster.local svc.cluster.local cluster.local
nameserver 10.96.0.10
options ndots:5
```

(Illustrative.) `ndots:5` means: if a name has fewer than five dots, try it with each search domain first.
So a lookup of `api.example.com` (two dots) first tries `api.example.com.shop.svc.cluster.local`, then two
more variants, each failing with NXDOMAIN, before trying the real name. With A and AAAA lookups in parallel,
one external lookup can become eight queries.

That multiplies load on cluster DNS and adds latency to every external call. Fixes: write external names
with a trailing dot (`api.example.com.`), lower `ndots` in the pod's DNS config, or run a DNS cache on each
node (NodeLocal DNSCache).

::: details Going deeper: the five-second DNS delay
A long-standing Kubernetes symptom is DNS lookups that sometimes take exactly 5 seconds. One well-documented
cause was a race in the Linux kernel's connection tracking. The C library sends the A and AAAA queries at the
same moment from the same UDP socket, both get rewritten by DNAT to the DNS Service, and one could be dropped
while its conntrack entry was being created. The resolver then waits its default 5-second timeout and
retries. Kernel fixes, the `single-request-reopen` resolver option and node-local DNS caches (which avoid
DNAT for DNS) all reduce it. The 5-second number is the C library's default timeout, which is the clue.
:::

## Changing the list without dropping requests

**In short:** removing an instance is not instant. Every caller, proxy and node must learn about it, and
until they do, they keep sending. Graceful shutdown must outlast that propagation delay.

When a pod is told to stop, two things start at the same moment: Kubernetes sends the pod its shutdown
signal, and it removes the pod from the EndpointSlices. The removal then spreads to every node's
kube-proxy, every ingress controller and every mesh sidecar. That takes from well under a second to
several seconds in a busy cluster.

If the program exits at once on the signal, callers that have not heard yet still send it new connections.
They get refused connections or resets: a burst of errors on every deploy. The standard fix:

1. On the shutdown signal, keep serving. Many teams add a short delay (a `preStop` sleep of several seconds).
2. Fail the readiness probe, so the pod leaves every list.
3. Finish in-flight requests. For HTTP/2 and gRPC, send GOAWAY so clients open new connections elsewhere.
4. Exit before the hard deadline (`terminationGracePeriodSeconds`, 30 seconds by default).

New pods have the mirror problem. A readiness probe that passes before caches are warm or connections to
dependencies are open sends real traffic to an instance that will be slow. Make readiness mean "ready to
serve at full speed".

This is the same draining idea as [chapter 11](/edge/l4-load-balancing) and [chapter 12](/edge/l7-proxies),
with one difference: there is no single balancer to drain. Every caller is its own balancer, so the system
is only as fast as its slowest watcher.

## The handoff to the server's kernel

**In short:** the last packet of this book's journey arrives at the server's network card, addressed to a
pod or process. From there the operating system takes over.

After all the rewriting, the packet's destination is a real address: an instance's IP and port. It crosses
the fabric to the host, arrives at the network card, and the kernel delivers it. For a pod, that means one
more internal step across a virtual cable (a **veth pair**) into the pod's own network namespace, or an eBPF
redirect that skips most of that path.

What happens next is inside one machine: the driver, the kernel's receive path, the TCP handshake completing,
and the connection waiting in the listening socket's queue until the program calls `accept()`. The
[OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers that path, and its
[capstone walkthrough](https://turo64648.github.io/os-primer/extras/what-happens-when) follows a server
accepting a connection step by step.

One detail crosses the boundary: **who is the caller?** After the edge proxy, the internal balancer, maybe
kube-proxy and maybe a sidecar, the source address on the packet is rarely the user's. Proxies pass the
original address in an `X-Forwarded-For` header or in the PROXY protocol's header, as described in
[chapter 12](/edge/l7-proxies). Servers should trust those only from known proxies.

## Try it: look at the last hop

On a Kubernetes cluster, with `kubectl` access:

```bash
kubectl get svc cart -n shop                     # the ClusterIP and ports
kubectl get endpointslices -n shop -l kubernetes.io/service-name=cart   # ready pod addresses
kubectl exec -it some-pod -n shop -- getent hosts cart   # what DNS returns from inside a pod
```

On a node, as root, to see what kube-proxy programmed:

```bash
iptables -t nat -L KUBE-SERVICES -n | grep 10.96.0.20   # iptables mode
nft list table ip kube-proxy | grep 10.96.0.20           # nftables mode
ipvsadm -Ln -t 10.96.0.20:80                            # IPVS mode
conntrack -L -d 10.96.0.20 2>/dev/null | head            # live connections and their chosen pod
sysctl net.netfilter.nf_conntrack_count net.netfilter.nf_conntrack_max
```

Illustrative `conntrack` line:

```text
tcp 6 86390 ESTABLISHED src=10.244.1.5 dst=10.96.0.20 sport=51234 dport=80
    src=10.244.2.7 dst=10.244.1.5 sport=8080 dport=51234 [ASSURED]
```

The first half is the packet as the client sent it, to the ClusterIP. The second half is the reply as it
really arrives, from pod `10.244.2.7`. That one line shows the DNAT and which pod this connection is pinned
to. With an eBPF replacement, these tables are empty for Service traffic; use the plugin's tools instead
(for Cilium, `cilium service list`).

To check whether a gRPC client is pinned, look at its open connections: `ss -tn` inside the client pod
showing one connection to one pod address means all its requests go to that one pod.

## Why this matters in real systems

**The autoscaler that did nothing.** A team scales a gRPC service from 20 to 60 pods under load, and latency
does not improve. The callers hold long-lived connections through a ClusterIP, so the 40 new pods get no
traffic. Switching to a headless Service with client-side balancing, or adding a maximum connection age,
fixes it. This is one of the most common gRPC-on-Kubernetes stories.

**Deploys that cause error spikes.** Every rollout shows a short burst of connection resets. The cause is
pods exiting before every node and proxy has removed them from its list. A `preStop` delay and proper
draining make deploys invisible.

**DNS as the hidden bottleneck.** In large clusters, cluster DNS often becomes the busiest internal service,
driven by short TTLs, `ndots:5` expansion and conntrack pressure on DNS traffic. Node-local caches are a
common fix.

**Choosing a mesh for encryption alone.** Many teams adopt a mesh mainly for mTLS between services. Others
find the per-pod cost too high and use per-node proxies, a proxyless library, or encryption in the network
layer instead. Interviewers like candidates who can state the cost, not just the features.

**ML serving.** Inference requests vary from milliseconds to many seconds, so round-robin across model
servers queues short requests behind long ones. Teams use request-level, load-aware balancing (fewest
outstanding requests, or queue depth reported by servers) rather than connection-level balancing.

## Where it breaks

**Monzo, 2017: an empty Service crashed the mesh.** On 27 October 2017, the bank Monzo had a cluster outage
of about 1 hour 21 minutes, during which many payments failed. Its talk lists three causes, including an
incompatibility between Kubernetes and its Linkerd mesh. A Service scaled to zero reported its empty instance
list in a format the mesh could not parse, so restarted Linkerd proxies failed to start, taking all traffic
with them. **Lesson:** the discovery data path is as critical as the traffic path; test how proxies handle
empty and unusual lists.
([KubeCon 2018 talk slides](https://speakerdeck.com/obeattie/anatomy-of-a-production-kubernetes-outage-kubecon-eu-2018))

**Reddit, 2023: a label rename removed cluster routing.** On 14 March 2023, Reddit was down for 314 minutes
after upgrading Kubernetes from 1.23 to 1.24. Its pod network (Calico) used a few route reflectors, chosen
by a node label that 1.24 removed. After the upgrade, no node matched, the route reflectors vanished, and
pod-to-pod routing stopped. The setup was old and undocumented. **Lesson:** cluster networking configuration
must be in code and in upgrade checklists.
([Reddit engineering, 2023](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/))

**Datadog, 2023: an OS update deleted pod routes.** On 8 March 2023, an automatic systemd security update on
Datadog's nodes caused `systemd-networkd` to delete routes managed by the Cilium network plugin. Tens of
thousands of nodes across several regions lost connectivity in the same hour, and full recovery took over a
day. **Lesson:** anything else on the node that touches routes can break the pod network; roll out OS
changes gradually.
([Datadog, 2023](https://www.datadoghq.com/blog/2023-03-08-multiregion-infrastructure-connectivity-issue/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. How does a request to a Kubernetes ClusterIP reach a pod?
The client connects to the ClusterIP. No machine owns that address. On the client's own node, kube-proxy
has programmed kernel rules that pick a ready pod at random and rewrite the destination to the pod's address.
Connection tracking remembers the choice, so all later packets and the replies are rewritten consistently.
The packet then travels to the pod's node as normal pod traffic.

**Senior add-on:** the choice happens once per connection, on the caller's node, so it is layer-4 balancing
with no central component. iptables mode walks rules linearly and updates slowly at very large scale; IPVS
and nftables use hash or map lookups. eBPF replacements translate the address at `connect()` time and skip
per-packet NAT and conntrack.
:::

::: details 2. You scaled a gRPC service from 10 to 40 pods and load is still uneven. Why?
gRPC uses HTTP/2, which sends many requests over one long-lived connection. A ClusterIP or any layer-4
balancer picks a pod once per connection. Existing connections stay on the old pods, and the new pods get
almost nothing.

Fixes: client-side balancing over a headless Service, so each client connects to many pods and spreads
requests; a layer-7 proxy or mesh sidecar that balances per request; or a maximum connection age on the
server so clients reconnect periodically.

**Senior add-on:** client-side balancing needs re-resolution or a watch to see new pods, and subsetting at
large scale. Check with `ss -tn` from a client pod, and look at per-pod request rates, not CPU alone.
:::

::: details 3. Compare DNS-based and registry-based service discovery.
DNS works with every language and tool, and needs nothing new. But answers are cached for a TTL or longer,
nothing tells callers about changes, answers carry no health or weight, and large lists do not fit.

A registry keeps live entries with leases, so crashed instances disappear on their own, and callers watch for
changes and hear about them within seconds. It needs client libraries or agents, and it becomes a critical
dependency.

**Senior add-on:** many systems combine them: DNS for stable VIPs, a registry or the Kubernetes API for
fast-changing instance lists. Clients must fail static when the registry is down and distrust sudden mass
removals.
:::

::: details 4. Design how services in a large company find and call each other.
Start with requirements: number of services and languages, call rates, latency budget, security needs. A
reasonable design: a replicated registry (or the Kubernetes API) as the source of truth, with health from
readiness checks and leases. Callers get instance lists by watch, keep a last-known-good copy, and balance
per request with a policy like power of two choices. Use subsetting so connection counts stay bounded.

For delivery, pick by language mix. With one or two languages, a shared RPC library is cheapest. With many,
use sidecars or per-node proxies, or a proxyless library where available. Add mTLS with workload identity,
and a central layer-7 proxy only at boundaries such as the edge.

**Senior add-on:** discuss failure: what happens when the registry or control plane is down (keep serving
from cache), how deploys drain, zone-aware routing to cut cross-zone traffic, and retry budgets so the
mesh does not amplify an overload.
:::

::: details 5. What does a service mesh give you, and what does it cost?
It gives every service, in any language, request-level balancing, retries, timeouts, outlier detection,
mTLS with workload identity, uniform metrics and traffic shifting, without code changes.

It costs two extra proxy passes per call (latency, mostly at the tail), CPU and memory for a proxy per
instance, a control plane that must push frequent updates to every proxy, startup and shutdown ordering
issues, and harder debugging.

**Senior add-on:** mention the alternatives: proxyless gRPC with xDS, per-node proxies such as Istio's
ambient mode, or a strong RPC library. The right answer depends on the language mix and how much of the mesh
you actually use. Retries in both app and mesh multiply.
:::

::: details 6. Every deploy causes a short spike of 502s and connection resets. How do you find the cause?
Line up the errors with pod lifecycle events. If errors start when old pods get their shutdown signal, the
pods are probably exiting before callers have removed them from their lists. Check whether the program exits
immediately on the signal, whether there is a `preStop` delay, and whether in-flight requests finish.

If errors appear when new pods start, readiness is passing too early. Also check proxy and pool idle timeouts:
a pooled connection to a dead pod produces resets on first use.

**Senior add-on:** propagation of EndpointSlice changes to every kube-proxy, ingress and sidecar takes
seconds, and there is no central balancer to drain. Add a delay before shutdown, send GOAWAY for HTTP/2,
fail readiness first, and keep the grace period longer than the slowest drain.
:::

::: details 7. Pods see intermittent 5-second delays on external HTTP calls. What do you check?
Five seconds is the C library's default DNS timeout, so suspect DNS. Look at the pod's `/etc/resolv.conf`.
With `ndots:5`, an external name is first tried with each search domain, multiplying queries. Check cluster
DNS latency and errors, and its pods' load.

Then check for dropped DNS packets. A known kernel conntrack race could drop one of the parallel A and AAAA
queries, and a full conntrack table drops packets outright.

**Senior add-on:** fixes include trailing dots or lower `ndots`, NodeLocal DNSCache (which also avoids DNAT
for DNS), the `single-request-reopen` option, newer kernels, and raising `nf_conntrack_max`. Confirm with
`tcpdump` on port 53 and the kernel log.
:::

::: details 8. Why might a pod see the wrong client IP address, and how do you fix it?
Each proxy or NAT step on the way may replace the source address. A NodePort or LoadBalancer Service with the
default policy can forward traffic to a pod on another node and rewrite the source to the first node's
address. Proxies open new connections, so the server sees the proxy's address.

Fixes: `externalTrafficPolicy: Local` keeps the source address at layer 4. At layer 7, proxies pass the
original address in `X-Forwarded-For` or the PROXY protocol.

**Senior add-on:** `Local` spreads load per node, not per pod, and needs health checks so nodes without pods
get no traffic. Only trust forwarded-address headers from known proxies, or clients can spoof them.
:::

::: details 9. When would you choose IPVS, nftables or an eBPF data path over iptables mode?
iptables mode is fine for small and medium clusters. As Services grow into the thousands, rule walks and
especially slow rule updates hurt: new endpoints take long to apply.

IPVS uses hash lookups and more balancing algorithms. nftables, generally available since Kubernetes 1.33,
uses map lookups and incremental updates and is the intended successor. An eBPF plugin such as Cilium
removes per-packet NAT for in-cluster traffic and can add consistent hashing and direct server return for
external traffic.

**Senior add-on:** the eBPF path is faster but newer, and debugging needs different tools. Whatever you choose,
set the mode explicitly so an upgrade does not change it underneath you.
:::

## Common misconceptions

- **"The ClusterIP is a load balancer somewhere."** No machine owns it; every node rewrites it locally.
- **"A Kubernetes Service balances requests."** It balances connections. HTTP/2 and gRPC pin to one pod.
- **"Removing a pod from a Service is instant."** It takes seconds to reach every node and proxy.
- **"A service mesh is free."** It costs latency, CPU, memory and operational complexity on every call.
- **"If the registry is down, callers should stop."** They should keep using their last known list.
- **"Short DNS TTLs make DNS discovery as fast as a registry."** Runtimes and pools cache past the TTL, and
  DNS never pushes changes.

## Key takeaways

- The last hop needs **discovery** (who is alive) and **balancing** (who gets this request). Central
  balancers, client libraries and sidecars put the balancing in different places, each with its own cost.
- **DNS discovery** is universal but slow to change. **Registries** push changes fast but must fail static.
- **Connection-level balancing breaks with long-lived connections.** Balance requests for gRPC and HTTP/2.
- A **ClusterIP** is a rewrite rule on every node, applied once per connection and remembered by conntrack.
  eBPF data paths do the rewrite at `connect()` instead.
- Removing an instance takes time to propagate. **Drain longer than the propagation delay.**

## Review

<Flashcards id="reaching-the-service" :cards="cards" />

<MarkDone id="reaching-the-service" />

## Sources

- [Kubernetes documentation: Virtual IPs and Service Proxies](https://kubernetes.io/docs/reference/networking/virtual-ips/) (documentation, current as of 2026)
- [Kubernetes documentation: Service](https://kubernetes.io/docs/concepts/services-networking/service/) (documentation)
- [Kubernetes documentation: DNS for Services and Pods](https://kubernetes.io/docs/concepts/services-networking/dns-pod-service/) (documentation)
- [Envoy documentation: xDS protocol](https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol) (documentation)
- [Cilium documentation: Kubernetes without kube-proxy](https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/) (documentation)
- [Google SRE book, ch. 20: Load Balancing in the Datacenter](https://sre.google/sre-book/load-balancing-datacenter/) (book, 2016)
- [ServiceRouter: Hyperscale and Minimal Cost Service Mesh at Meta](https://www.usenix.org/conference/osdi23/presentation/saokar) (paper, OSDI 2023)
- [Anatomy of a Production Kubernetes Outage](https://speakerdeck.com/obeattie/anatomy-of-a-production-kubernetes-outage-kubecon-eu-2018) (Monzo, conference talk, 2018)
- [You Broke Reddit: The Pi-Day Outage](https://www.reddit.com/r/RedditEng/comments/11xx5o0/you_broke_reddit_the_piday_outage/) (engineering blog, 2023)
- [2023-03-08 incident: multi-region infrastructure connectivity issue](https://www.datadoghq.com/blog/2023-03-08-multiregion-infrastructure-connectivity-issue/) (Datadog, incident report, 2023)
