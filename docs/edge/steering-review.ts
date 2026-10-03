// Flashcards for the Steering Users & Failing Over chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'What inputs does traffic steering weigh when choosing a site for a user?',
    a: 'Network delay to the site, whether the site is healthy, how much spare capacity it has, and the cost of serving from it.',
  },
  {
    q: 'What are the three levers for steering users, and who makes the decision with each?',
    a: 'DNS (your authoritative servers choose the address), anycast (internet routing chooses the site for a shared address) and the client (your app chooses from a list you give it).',
  },
  {
    q: 'Why does DNS-based failover leave a long tail of users on the dead site?',
    a: 'Resolvers keep the old answer until its TTL ends, some stretch TTLs, and apps keep open connections or cached addresses without looking the name up again.',
  },
  {
    q: 'Why does anycast fail over faster than DNS?',
    a: 'When a site stops announcing its routes, routers send its users elsewhere within seconds to a couple of minutes. No cache has to expire and the address does not change.',
  },
  {
    q: 'What is the main weakness of anycast steering?',
    a: 'BGP chooses by network policy and path, not delay or load. Some users land far away, and your levers (withdrawing, prepending) move whole groups of networks at once.',
  },
  {
    q: 'Why do large systems combine anycast and DNS?',
    a: 'Anycast gives fast failover and spreads attacks. DNS adds precise control on top: choosing between regional anycast addresses, or overriding anycast for networks it serves badly.',
  },
  {
    q: 'Why is geography a poor guide to the best site?',
    a: 'Location databases are approximate, and delay follows how networks connect, not straight lines. A network may reach a far site faster than a near one.',
  },
  {
    q: 'How does real-user monitoring build a steering map?',
    a: 'Pages or apps fetch small objects from several sites and report the timings. Results are grouped by network, and each group gets a ranked list of sites.',
  },
  {
    q: 'How can a provider learn which users sit behind which resolver?',
    a: 'A script looks up a unique random name; the provider’s DNS server sees which resolver asked. The script also reports the user’s address over HTTP, and the two are joined.',
  },
  {
    q: 'Why should health checks run from several places and need several failures in a row?',
    a: 'One location cannot tell a dead site from a broken path to it, and one lost packet should not move traffic. Agreement and repeated failures avoid false alarms and flapping.',
  },
  {
    q: 'What does “fail open” mean for health checks, and why do it?',
    a: 'If every site looks down, assume the checks are wrong and keep serving from all sites. Otherwise a broken checker or config can take everything offline at once.',
  },
  {
    q: 'What is a gray failure, and how do you catch it?',
    a: 'A site that passes probes but fails some real requests, or only for some networks. Real-user error rates per site and network catch what probes miss.',
  },
  {
    q: 'Why can failing over one site cause a cascading failure?',
    a: 'Its users all land on neighbouring sites at once, with new handshakes and cold caches. A neighbour without headroom overloads and fails, pushing everyone onward.',
  },
  {
    q: 'How do you keep failover from overloading the receiving sites?',
    a: 'Keep enough headroom to lose the biggest site, know in advance where its traffic will land, split it across several sites, and move load in steps.',
  },
  {
    q: 'Why fail back slowly after a site recovers?',
    a: 'Moving everyone back at once is another thundering herd onto a site with empty caches, and a site that flaps would drag users back and forth.',
  },
  {
    q: 'Why should capacity-aware steering move load in small steps?',
    a: 'Changes take time to show up, often a DNS TTL. A loop that reacts faster than its changes take effect overshoots and makes load swing between sites.',
  },
  {
    q: 'Why drain regions regularly, even without maintenance?',
    a: 'Regular drains prove failover works and expose hidden dependencies and stale capacity plans in calm conditions, instead of during a real outage.',
  },
]
