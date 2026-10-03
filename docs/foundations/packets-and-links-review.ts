// Flashcards for the Packets & Links chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why is data wrapped in layers of headers?',
    a: 'Each device only needs to read its own layer. Switches read the frame, routers read the IP header, and only the two ends read TCP and the data, so each part of the network stays simple.',
  },
  {
    q: 'What does a router change in a packet it forwards?',
    a: 'It throws away the old frame and builds a new one for the next link, and lowers the hop counter (updating the IPv4 checksum). The IP addresses stay the same unless a NAT rewrites them.',
  },
  {
    q: 'Your phone sends a packet to a far-away server. Whose MAC address is on the frame?',
    a: 'The default gateway’s. The packet carries the server’s IP address, but the frame only needs to reach the next router on the local link.',
  },
  {
    q: 'Why do we need both MAC and IP addresses?',
    a: 'MAC addresses name cards on one link and cannot be aggregated. IP addresses are organised in prefixes, so routers can reach the whole internet with about a million table entries.',
  },
  {
    q: 'Why can traffic keep going to a dead machine after its floating IP moves?',
    a: 'Neighbours still have the old MAC address in their ARP cache. A gratuitous ARP from the new owner updates them; otherwise the entry has to age out.',
  },
  {
    q: 'How does a device decide whether a destination is local?',
    a: 'It compares the destination with its own address and prefix length. Inside the prefix it uses ARP or NDP to deliver directly; otherwise it sends to the default gateway.',
  },
  {
    q: 'How does a router pick between overlapping routes?',
    a: 'Longest-prefix match: of all entries that contain the destination, it uses the most specific. The default route, /0, matches everything and so is used last.',
  },
  {
    q: 'Why does a more specific route announcement let someone hijack traffic?',
    a: 'Routers prefer the longest matching prefix, so a wrongly announced narrower prefix beats the owner’s broader one wherever it spreads.',
  },
  {
    q: 'What is the IP hop counter for, and how does traceroute use it?',
    a: 'It stops packets circling forever in a routing loop. Traceroute sends probes with counters of 1, 2, 3…, and each router that drops one reports back, revealing the path.',
  },
  {
    q: 'Why is a slow middle hop in traceroute often harmless?',
    a: 'Routers generate ICMP replies slowly and rate-limit them, while forwarding real traffic quickly. Only delay or loss that continues to the destination is real.',
  },
  {
    q: 'Why do senders avoid IP fragmentation?',
    a: 'Losing one fragment loses the whole packet, and fragments after the first have no port numbers, so firewalls, NAT and load balancers often drop or misroute them.',
  },
  {
    q: 'How does path MTU discovery work?',
    a: 'The sender marks packets “don’t fragment”. A router that cannot forward one drops it and returns an ICMP “packet too big” message with the limit, and the sender shrinks its packets.',
  },
  {
    q: 'What does a PMTUD black hole look like to users?',
    a: 'Connections open and small requests work, but large responses, uploads or TLS handshakes hang. The ICMP message that would shrink the packets is being filtered.',
  },
  {
    q: 'How does MSS clamping fix MTU problems, and where does it fall short?',
    a: 'A router at the tunnel lowers the MSS announced in TCP setup, so neither end sends oversized packets. It does nothing for UDP traffic such as QUIC.',
  },
  {
    q: 'How do you test the path MTU from Linux?',
    a: 'Use <code>ping -M do -s 1472</code> (1,472 + 28 header bytes = 1,500) and lower the size until replies come back, or run <code>tracepath</code>. No reply for big sizes while small ones work points to a black hole.',
  },
  {
    q: 'Why does IPv6 make working ICMP mandatory?',
    a: 'Routers never fragment IPv6 packets, so senders depend on “packet too big” messages. Neighbour discovery, which replaces ARP, also runs over ICMPv6.',
  },
  {
    q: 'What should change in your service when you add IPv6?',
    a: 'Add AAAA records and IPv6 on every entry point, then fix address handling: logs, geolocation, allow lists, and rate limits keyed on a /64 rather than one address.',
  },
]
