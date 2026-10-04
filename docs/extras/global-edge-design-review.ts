// Flashcards for the Designing a Global Edge extra. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why should you state scale numbers as assumptions in orders of magnitude?',
    a: 'The design depends on rough sizes, not exact figures: requests, bandwidth, handshakes and attack headroom. Stated assumptions keep the discussion concrete and let the interviewer redirect you.',
  },
  {
    q: 'Why do peaks, site loss and attacks drive edge capacity more than average traffic?',
    a: 'Average load is easy to serve. The edge must survive a peak while its largest site is down, and absorb attacks that can be far bigger than its normal traffic.',
  },
  {
    q: 'Why does TLS handshake rate matter for edge cost?',
    a: 'A full handshake costs much more CPU than serving a request on an open connection. Connection reuse and session resumption cut both cost and latency.',
  },
  {
    q: 'Why place large PoPs in metros with big internet exchanges?',
    a: 'There you can peer with many networks cheaply, so you are close in round-trip time to most users. Being close on a map does not matter if the path is long.',
  },
  {
    q: 'What is the trade-off of adding many small PoPs?',
    a: 'Lower latency for the long tail, but traffic is split, so cache hit ratios fall and each site has less headroom to absorb failures or attacks.',
  },
  {
    q: 'Why do many large edges combine anycast with DNS steering?',
    a: 'Anycast fails over by routing and spreads attacks across every site. DNS adds fine control, so you can move part of the load between groups of sites for capacity.',
  },
  {
    q: 'Why put a software L4 balancer tier behind router ECMP?',
    a: 'ECMP reshuffles flows when a path changes, breaking connections. A consistent-hash L4 tier sends each flow to the same server from any balancer and moves few flows on a change.',
  },
  {
    q: 'Why must session ticket keys be shared across servers?',
    a: 'A returning user may land on a different server. Resumption only works if that server can decrypt the ticket, so keys are distributed centrally and rotated often.',
  },
  {
    q: 'How do tiered caching and an origin shield protect the origin?',
    a: 'A PoP miss goes to a regional parent, and one shield per origin asks the origin. The origin sees about one request per object instead of one per PoP.',
  },
  {
    q: 'What does an uncacheable API still gain from the edge?',
    a: 'Short handshakes near the user, warm pooled connections to the origin, and rate limiting and attack filtering before traffic reaches the origin.',
  },
  {
    q: 'Why must the origin accept only traffic from the edge?',
    a: 'Otherwise attackers can go around the edge’s caching, rate limits and attack filtering and hit the origin directly.',
  },
  {
    q: 'Why is "fail over to the next site" not enough when a PoP fails?',
    a: 'The users must fit somewhere. Anycast may push them all onto one small neighbour, so steering needs to know spare capacity and move load gradually.',
  },
  {
    q: 'Why cap what automated health checks can remove?',
    a: 'A broken checker looks like a broken fleet. Without a cap it can withdraw every site at once, as in Facebook’s 2021 outage.',
  },
  {
    q: 'What does static stability mean for an edge?',
    a: 'If the control plane fails, PoPs keep serving with their last known good configuration. The data path never needs the control plane to be up.',
  },
  {
    q: 'How do you roll out an edge config change safely?',
    a: 'Validate it, stage it from one server to one PoP to a region to everywhere, gate each stage on error and latency metrics, and keep a fast tested rollback.',
  },
  {
    q: 'Why does generated data, such as bot-detection files, need the same care as code?',
    a: 'It is pushed everywhere often and can break every proxy at once, as in Cloudflare’s 2025 outage. Proxies should reject bad input and keep the last good version.',
  },
]
