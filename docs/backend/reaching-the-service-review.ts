// Flashcards for the Reaching the Service chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'What two jobs does the last hop inside the datacenter need?',
    a: 'Service discovery: learning which instances exist and are healthy right now. Load balancing: picking one of them for each connection or request.',
  },
  {
    q: 'What does an internal VIP buy you, and what does it cost?',
    a: 'Callers in any language need only one stable address, and the instance list lives in one place. Every call pays an extra hop, and all callers share the balancer’s capacity and failures.',
  },
  {
    q: 'Why does a layer-4 balancer spread gRPC traffic badly?',
    a: 'gRPC sends many requests over one long-lived HTTP/2 connection, and a layer-4 balancer picks a backend once per connection. A few connections pin all load onto a few instances, and new instances get nothing.',
  },
  {
    q: 'Why is DNS a weak fit for fast-changing instance lists?',
    a: 'Answers are cached for a TTL or longer, nothing tells callers when the list changes, answers carry no health or weight, and very large lists do not fit in a response.',
  },
  {
    q: 'How does a registry notice that an instance crashed?',
    a: 'Each instance holds a lease that it renews every few seconds. If renewals stop, the lease expires and the registry removes the entry, with no one having to delete it.',
  },
  {
    q: 'What should callers do when the registry is unreachable or suddenly reports almost no instances?',
    a: 'Fail static: keep using the last known list. A sudden mass removal is more likely a registry or network fault than a real event.',
  },
  {
    q: 'What does client-side load balancing gain, and what does it cost?',
    a: 'No extra hop, and the client sees every response, so it can balance by load. But the library must exist in every language, and fixes require redeploying every service.',
  },
  {
    q: 'Why do large client-side balancing setups use subsetting?',
    a: 'If every caller connects to every instance, connections grow as callers times instances. Each caller connects to a small, evenly spread subset instead.',
  },
  {
    q: 'How does a sidecar get the application’s traffic without code changes?',
    a: 'Firewall rules on the host redirect the program’s outgoing and incoming connections to the local proxy, which does discovery, balancing and encryption on its behalf.',
  },
  {
    q: 'Name the main costs of a sidecar service mesh.',
    a: 'Two extra proxy passes per call, CPU and memory for a proxy per instance, a control plane that must push frequent updates everywhere, startup and shutdown ordering issues, and harder debugging.',
  },
  {
    q: 'What is a proxyless mesh?',
    a: 'The client library itself speaks the mesh’s configuration protocol (xDS) to the control plane, getting mesh features without sidecar hops, but only in languages the library supports.',
  },
  {
    q: 'Who owns a Kubernetes ClusterIP?',
    a: 'Nobody. kube-proxy on every node programs kernel rules that rewrite connections to the ClusterIP into a real pod address, so the balancing happens on the caller’s node.',
  },
  {
    q: 'What role does conntrack play for a ClusterIP connection?',
    a: 'The rules pick a pod only for the first packet. Conntrack remembers the choice, rewrites every later packet the same way, and rewrites replies back to the ClusterIP.',
  },
  {
    q: 'Why did large clusters move away from kube-proxy’s iptables mode?',
    a: 'New connections walk rule chains whose length grows with the number of Services, and updates rewrote large parts of the table, which became slow with tens of thousands of Services.',
  },
  {
    q: 'How does an eBPF data path such as Cilium avoid per-packet NAT for Services?',
    a: 'It swaps the ClusterIP for a pod address at <code>connect()</code> time inside the socket, so packets carry the pod address from the start and need no conntrack entry for the Service.',
  },
  {
    q: 'Why does <code>ndots:5</code> slow down external lookups from pods?',
    a: 'Names with fewer than five dots are tried with each search domain first, so one external lookup becomes several failing queries before the real one, doubled for A and AAAA.',
  },
  {
    q: 'Why do deploys cause errors if a pod exits as soon as it gets its shutdown signal?',
    a: 'Removal from EndpointSlices takes seconds to reach every node, ingress and sidecar. Until then they still send new connections to the exiting pod.',
  },
  {
    q: 'What does <code>externalTrafficPolicy: Local</code> trade?',
    a: 'It keeps the client’s source address and avoids a second hop between nodes. But load is spread per node, not per pod, and nodes without a ready pod must fail health checks.',
  },
]
