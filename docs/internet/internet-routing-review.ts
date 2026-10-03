// Flashcards for the Internet Routing chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does no single router know the whole internet’s map?',
    a: 'The internet is tens of thousands of independent networks. Each learns only what its neighbours announce over BGP: which prefixes they reach and through which chain of networks.',
  },
  {
    q: 'What two jobs does the AS path do in BGP?',
    a: 'It prevents loops, because a router drops routes that already contain its own AS number. It also acts as a rough distance measure: fewer networks usually means a more direct route.',
  },
  {
    q: 'How does a BGP router choose between several routes to the same prefix?',
    a: 'First by local preference, which encodes business policy. Then by shortest AS path, then by tie-breakers such as the nearest exit. Latency and load are not part of the choice.',
  },
  {
    q: 'Why are internet paths often asymmetric?',
    a: 'Each direction is chosen by different routers with their own policies, and networks hand traffic off at the exit nearest to them (hot-potato routing). Traceroute shows only the forward path.',
  },
  {
    q: 'What is the difference between transit and peering?',
    a: 'Transit is paid and gives routes to the whole internet. Peering is usually free and gives routes only to the peer and its customers.',
  },
  {
    q: 'Why does a network not pass its peers’ routes to its other peers or providers?',
    a: 'It would carry traffic between parties who do not pay it. Networks pass all routes to paying customers, but only customer routes to peers and providers.',
  },
  {
    q: 'Why do large websites build PoPs with private links and exchange ports?',
    a: 'To reach users in one hop into their ISP. That is cheaper than transit at their volume, usually faster, and gives more control. Transit remains for the rest and as a fallback.',
  },
  {
    q: 'Why do large content networks add an egress controller on top of BGP?',
    a: 'BGP does not know link capacity or latency, so it can overload a preferred peering link. A controller measures load and performance and injects BGP overrides to move some prefixes to other routes.',
  },
  {
    q: 'How does anycast decide which site a user reaches?',
    a: 'Every site announces the same prefix. Each user’s network picks its best BGP route, so the user reaches that route’s site. Best means policy and fewest networks, not shortest distance.',
  },
  {
    q: 'How does anycast fail over, and how fast?',
    a: 'A site stops announcing the prefix and its users move to the next-best site as BGP converges, typically within seconds to a minute or so. No DNS change or client action is needed.',
  },
  {
    q: 'Why does TCP over anycast mostly work, and when does it break?',
    a: 'Routes stay stable for most users for hours, so packets keep reaching the same site. If a route changes mid-connection, packets reach a site with no state for it and the connection resets.',
  },
  {
    q: 'Why is a more-specific hijack so effective?',
    a: 'Routers forward using the most specific matching prefix. A bogus /24 inside a real /22 wins wherever it spreads, whatever its AS path.',
  },
  {
    q: 'What is the difference between a route leak and a hijack?',
    a: 'A hijack announces a prefix the network does not hold. A leak passes a real route to neighbours that should not get it, so traffic detours through the wrong network.',
  },
  {
    q: 'What does RPKI route origin validation stop, and what does it miss?',
    a: 'It drops routes from an AS not authorised to originate the prefix, or more specific than allowed. It misses route leaks and attackers who forge the correct origin, because it checks only the origin.',
  },
  {
    q: 'Why does anycast help against volumetric DDoS?',
    a: 'Each site receives only the attack traffic from its own catchment. Spread across many sites, one huge attack becomes many smaller ones that each site can filter.',
  },
  {
    q: 'Why can a firewall in your datacenter not stop a volumetric attack?',
    a: 'The attack fills the links into the datacenter before traffic reaches the firewall. Filtering must happen upstream: at the edge of a large network, at a scrubbing centre, or in providers’ routers.',
  },
  {
    q: 'What does remote triggered blackholing cost you?',
    a: 'Providers drop all traffic to the target address, good and bad. It saves the rest of the network but completes the outage for that one address.',
  },
]
