// Flashcards for the Datacenter Fabric chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why did datacenters move from trees of switches to leaf-spine fabrics?',
    a: 'Most traffic is between servers. A tree funnels traffic between branches through a few core switches, grows only by buying bigger boxes, and loses half its capacity when one core switch fails. Leaf-spine gives many equal paths and grows with identical small switches.',
  },
  {
    q: 'What makes a leaf-spine fabric a leaf-spine fabric?',
    a: 'Every rack switch (leaf) connects to every spine, and leaves and spines never connect among themselves. Any two racks are two hops apart, through any spine.',
  },
  {
    q: 'What happens to a two-tier fabric when you run out of spine ports?',
    a: 'You add a tier: racks are grouped into pods that are small leaf-spine fabrics, and the pods connect to planes of super-spines in the same every-to-every pattern.',
  },
  {
    q: 'What is oversubscription, and why accept it?',
    a: 'The ratio of a switch’s server-facing capacity to its uplink capacity, such as 3:1. It saves money on spines and optics, betting that servers rarely all send off-rack at full speed at once.',
  },
  {
    q: 'Which workloads break the oversubscription bet?',
    a: 'Bulk data movement (backups, rebalancing, shuffles) and ML training, which send large synchronized flows. Training fabrics are usually built non-blocking.',
  },
  {
    q: 'What is incast, and how does it show up?',
    a: 'Many servers answer one caller at the same instant and overflow the shallow buffer on the link to the caller’s rack. Lost replies wait for a TCP timeout, so fan-out calls get tail-latency spikes while average utilization looks low.',
  },
  {
    q: 'Why does ECMP hash per connection instead of spreading packets one by one?',
    a: 'Paths have slightly different queues, so per-packet spreading reorders packets, and TCP treats reordering as loss. Hashing the addresses and ports keeps each connection on one path.',
  },
  {
    q: 'Why can one transfer not use the whole fabric’s capacity?',
    a: 'ECMP puts each connection on one path, so it is capped by one link’s speed. Bulk tools open several connections so the hash spreads them.',
  },
  {
    q: 'How do elephant flows hurt latency-sensitive traffic?',
    a: 'Hashing balances connection counts, not bytes. Two elephants on one uplink saturate it while siblings idle, and the small requests sharing that link wait behind their queues.',
  },
  {
    q: 'Why do many large fabrics run BGP instead of OSPF or IS-IS?',
    a: 'BGP keeps state small and changes local, runs on simple point-to-point sessions, and gives per-link policy for draining. Link-state protocols flood every change to every router.',
  },
  {
    q: 'Why do all spines in an RFC 7938 fabric share one AS number?',
    a: 'BGP drops routes whose AS path already contains its own number. A path through spine, leaf, spine would contain the spines’ shared number twice, so it is rejected and routes stay strictly up then down.',
  },
  {
    q: 'What problems does an overlay such as VXLAN solve?',
    a: 'Tenants with overlapping addresses, and VMs that move between racks but keep their IP. The underlay routes only between tunnel endpoints, and each tenant gets its own virtual network.',
  },
  {
    q: 'Why not stretch one big layer-2 network across racks instead of using an overlay?',
    a: 'Broadcasts flood everywhere, and loop prevention blocks redundant links, which throws away the many paths that make Clos useful.',
  },
  {
    q: 'Why does VXLAN cause “small requests work, large responses hang”?',
    a: 'It adds 50 bytes per packet. If any underlay link still has a 1,500-byte MTU, full-size inner packets are dropped while small ones fit. Fix with jumbo frames on the underlay or an inner MTU of 1,450.',
  },
  {
    q: 'How do you keep VXLAN traffic spread across ECMP paths?',
    a: 'The tunnel endpoint puts a hash of the inner packet into the outer UDP source port, so different inner connections look like different flows to the fabric.',
  },
  {
    q: 'Why is a lossy link hard to find in an ECMP fabric?',
    a: 'Routing stays up, and only connections hashed onto that path suffer, so failures look random across hosts. Probing with varied source ports and watching per-interface error counters exposes it.',
  },
  {
    q: 'What are the steps of a safe switch drain?',
    a: 'Check that the rest can carry peak and nothing nearby is already down; make the switch’s routes less preferred; confirm its traffic falls to zero; do the work; undrain gradually and verify.',
  },
  {
    q: 'Why should drain tooling refuse some drains?',
    a: 'Most network failures happen during management operations. A tool that can remove too much capacity at once turns one mistaken command into a full outage.',
  },
]
