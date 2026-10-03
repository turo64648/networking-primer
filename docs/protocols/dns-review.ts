// Flashcards for the DNS chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does the phone ask a recursive resolver instead of finding the answer itself?',
    a: 'The search takes several steps down the name tree. A shared resolver does it once, caches every step, and answers most questions from memory, so the phone needs one short round trip.',
  },
  {
    q: 'What does each level of the tree tell a resolver on a cold lookup?',
    a: 'The root points to the servers for the top-level domain (.com). Those point to the zone’s authoritative servers. Only the authoritative servers hold the actual record.',
  },
  {
    q: 'Why does DNS scale to the whole internet?',
    a: 'Control is split by delegation: each zone owner runs and changes its own records. Caching in resolvers absorbs most traffic, so authoritative servers see only a small share of lookups.',
  },
  {
    q: 'Why can users still reach an old address long after you changed a record?',
    a: 'Each cache layer keeps the old answer until its own TTL countdown ends. Some resolvers and runtimes stretch TTLs, and apps keep using open connections without looking the name up again.',
  },
  {
    q: 'What is the trade-off when choosing a TTL?',
    a: 'Short TTLs let you move traffic fast but cost more queries, more cold lookups and less protection if DNS goes down. Long TTLs are cheap and resilient but make mistakes slow to undo.',
  },
  {
    q: 'How do you prepare for a planned DNS change?',
    a: 'Lower the TTL at least one old-TTL period in advance, make the change, keep the old address serving until its traffic stops, then raise the TTL again.',
  },
  {
    q: 'Why might <code>dig</code> and your app see different answers?',
    a: '<code>dig</code> asks the resolver directly. The app goes through the OS, which may use <code>/etc/hosts</code>, an OS cache, and the app’s own cache. Use <code>getent</code> or <code>dscacheutil</code> to see the app’s view.',
  },
  {
    q: 'How can a newly created name be invisible to some users?',
    a: 'If someone looked it up before it existed, their resolver cached “does not exist”. That negative answer lasts for the time set by the zone’s SOA record, often minutes to hours.',
  },
  {
    q: 'Why can location-aware DNS send a user to a far-away server?',
    a: 'The authoritative server sees the resolver’s address, not the user’s. A user behind a distant resolver (a VPN, a company resolver, a far public resolver site) gets an answer for the resolver’s location.',
  },
  {
    q: 'What does EDNS Client Subnet fix, and what does it cost?',
    a: 'It lets the resolver pass part of the user’s address, so answers fit the user’s location. It leaks user location to authoritative servers and splits resolver caches by subnet.',
  },
  {
    q: 'Why is DNS a coarse load balancer?',
    a: 'One cached answer serves everyone behind a resolver, answers cannot be recalled before their TTL ends, clients reorder addresses and keep connections, and DNS cannot see load.',
  },
  {
    q: 'When does DNS use TCP instead of UDP?',
    a: 'When an answer is too big for UDP, the server sets the truncation flag and the client asks again over TCP. Zone transfers and some encrypted transports also use TCP.',
  },
  {
    q: 'What fails if a firewall blocks DNS over TCP?',
    a: 'Small answers still work, but large ones (DNSSEC-signed answers, names with many records) fail. The failure looks random by name, which makes it hard to diagnose.',
  },
  {
    q: 'What does an HTTPS record let a client do that A records do not?',
    a: 'Learn how to connect before connecting: which protocols the site supports (such as HTTP/3), address hints, and ECH keys. Without it, a client learns about HTTP/3 only after a first connection.',
  },
  {
    q: 'What do DoH and DoT protect, and what do they not?',
    a: 'They encrypt the hop from the device to the resolver, so the local network cannot read or change lookups. The resolver still sees everything, and they do not prove the records are genuine.',
  },
  {
    q: 'Why do network operators care about DoH?',
    a: 'It runs on port 443 and looks like web traffic, so DNS filtering and logging by the network stop working. Apps may pick other resolvers, which can break internal names and change location-aware answers.',
  },
  {
    q: 'What does DNSSEC prove, and what risk does it add?',
    a: 'It proves records were signed by the zone owner, which defeats forged answers. If signatures expire or keys change wrongly, validating resolvers return SERVFAIL and the domain vanishes for their users.',
  },
  {
    q: 'How do you keep a DNS provider outage from taking your site down?',
    a: 'Serve the zone from two independent providers listed in the NS records, kept in sync from code, and use TTLs long enough that cached answers cover short outages.',
  },
]
