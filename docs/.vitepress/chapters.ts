// Single source of truth for the book's structure.
// Used by the sidebar (config.mts), the home page chapter list, and stub pages.

export interface Chapter {
  id: string
  num: string
  title: string
  link: string
  ready: boolean
  topics: string[]
}

export interface Part {
  title: string
  chapters: Chapter[]
}

export const parts: Part[] = [
  {
    title: 'I. Foundations',
    chapters: [
      {
        id: 'the-map', num: '1', title: 'The Map: One Request, End to End', link: '/foundations/the-map', ready: true,
        topics: ['Every hop from phone to first app server, and who owns it', 'Cold vs warm requests', 'A latency budget in orders of magnitude', 'Why distance and round trips dominate', 'How the rest of the book follows the path'],
      },
      {
        id: 'packets-and-links', num: '2', title: 'Packets & Links', link: '/foundations/packets-and-links', ready: true,
        topics: ['Frames, ARP / NDP and the default gateway', 'IP addresses, CIDR and longest-prefix match', 'MTU, fragmentation, PMTUD black holes, MSS clamping', 'IPv6 and why it matters on mobile', 'Encapsulation: headers inside headers'],
      },
      {
        id: 'tcp-and-udp', num: '3', title: 'TCP & UDP as Protocols', link: '/foundations/tcp-and-udp', ready: true,
        topics: ['Reliability: sequence numbers, ACKs, loss recovery', 'Flow control vs congestion control', 'Slow start, CUBIC and BBR', 'Head-of-line blocking', 'Why some protocols build on UDP'],
      },
    ],
  },
  {
    title: 'II. Protocols the Client Speaks',
    chapters: [
      {
        id: 'dns', num: '4', title: 'DNS', link: '/protocols/dns', ready: true,
        topics: ['Stub, recursive and authoritative resolvers', 'Caching, TTLs and negative caching', 'EDNS Client Subnet and location-aware answers', 'HTTPS / SVCB records', 'DNS over HTTPS and TLS'],
      },
      {
        id: 'tls', num: '5', title: 'TLS', link: '/protocols/tls', ready: true,
        topics: ['The TLS 1.3 handshake and its round trips', 'Session resumption, 0-RTT and replay', 'Certificates, chains and validation', 'Certificate operations: ACME, rotation, expiry', 'SNI, ECH and terminating TLS at the edge'],
      },
      {
        id: 'http', num: '6', title: 'HTTP', link: '/protocols/http', ready: true,
        topics: ['Semantics: methods, status codes, idempotency', 'Caching headers: Cache-Control, ETag, Vary', 'HTTP/1.1 vs HTTP/2 multiplexing', 'Connection reuse and keep-alive', 'Long-lived connections: WebSockets, gRPC streams'],
      },
      {
        id: 'quic', num: '7', title: 'QUIC & HTTP/3', link: '/protocols/quic', ready: true,
        topics: ['Why QUIC runs over UDP', 'Combined transport and TLS handshake', 'Streams without head-of-line blocking', 'Connection IDs and migration', 'Discovery (Alt-Svc, HTTPS records) and fallback when UDP is blocked'],
      },
    ],
  },
  {
    title: 'III. Reaching the Internet',
    chapters: [
      {
        id: 'last-mile', num: '8', title: 'The Last Mile & Mobile', link: '/internet/last-mile', ready: true,
        topics: ['Wi-Fi and cellular: where the latency comes from', 'Radio states and the slow first request', 'NAT and carrier-grade NAT', 'IPv6-only mobile networks: NAT64, 464XLAT', 'Happy Eyeballs and network switches'],
      },
      {
        id: 'internet-routing', num: '9', title: 'Internet Routing', link: '/internet/internet-routing', ready: true,
        topics: ['Autonomous systems and BGP', 'Transit, peering and internet exchanges', 'Anycast', 'Route leaks, hijacks and RPKI', 'Absorbing volumetric DDoS'],
      },
    ],
  },
  {
    title: 'IV. The Edge',
    chapters: [
      {
        id: 'steering', num: '10', title: 'Steering Users & Failing Over', link: '/edge/steering', ready: true,
        topics: ['DNS-based vs anycast vs client-side steering', 'Measuring users: RUM-based mapping', 'Health checks and regional failover', 'Capacity-aware steering and evacuation', 'Failure modes of each approach'],
      },
      {
        id: 'l4-load-balancing', num: '11', title: 'L4 Load Balancing', link: '/edge/l4-load-balancing', ready: true,
        topics: ['ECMP and why it is not enough', 'Consistent hashing and Maglev-style tables', 'Direct server return and the return path', 'QUIC and connection-ID-aware balancing', 'Connection draining and deploys'],
      },
      {
        id: 'l7-proxies', num: '12', title: 'L7 Proxies', link: '/edge/l7-proxies', ready: false,
        topics: ['Terminating TLS and HTTP at the edge', 'Routing, health checks and outlier detection', 'Rate limiting, bots and L7 DDoS', 'Long-lived connections during deploys', 'Common proxies: Envoy, NGINX, HAProxy'],
      },
      {
        id: 'cdns', num: '13', title: 'CDNs', link: '/edge/cdns', ready: false,
        topics: ['What a CDN caches and why it helps', 'Cache keys and hit ratio', 'Tiered caching and origin shield', 'Purging and serving stale content', 'Dynamic content through a CDN'],
      },
    ],
  },
  {
    title: 'V. Behind the Edge',
    chapters: [
      {
        id: 'edge-to-origin', num: '14', title: 'Edge to Origin', link: '/backend/edge-to-origin', ready: false,
        topics: ['Private WANs vs the public internet', 'Traffic engineering on the backbone', 'Split TCP and warm connections to origin', 'Choosing an origin region', 'Securing the edge-to-origin hop'],
      },
      {
        id: 'datacenter-fabric', num: '15', title: 'The Datacenter Fabric', link: '/backend/datacenter-fabric', ready: false,
        topics: ['Clos (leaf-spine) topologies', 'BGP inside the datacenter', 'ECMP, hashing and elephant flows', 'Overlays: VXLAN', 'MTU and encapsulation overhead'],
      },
      {
        id: 'reaching-the-service', num: '16', title: 'Reaching the Service', link: '/backend/reaching-the-service', ready: false,
        topics: ['Virtual IPs and internal load balancing', 'Service discovery', 'Sidecars and service meshes', 'Kubernetes service routing', 'Handoff to the server’s kernel'],
      },
    ],
  },
  {
    title: 'VI. Operating the Path',
    chapters: [
      {
        id: 'timeouts-retries-overload', num: '17', title: 'Timeouts, Retries & Overload', link: '/operations/timeouts-retries-overload', ready: false,
        topics: ['Timeouts and deadline propagation', 'Retries, backoff, jitter and retry budgets', 'Hedged requests', 'Load shedding and circuit breaking', 'Retry storms and metastable failures'],
      },
      {
        id: 'observing-the-path', num: '18', title: 'Observing & Debugging the Path', link: '/operations/observing-the-path', ready: false,
        topics: ['Real-user monitoring vs synthetic probes', 'Tracing across hops: traceparent, Server-Timing', 'dig, curl -w, mtr, tcpdump: a method', 'What traceroute does and does not tell you', 'Worked debugging scenarios'],
      },
    ],
  },
  {
    title: 'Capstone & Appendix',
    chapters: [
      {
        id: 'what-happens-when', num: 'C', title: 'What Happens When…', link: '/extras/what-happens-when', ready: false,
        topics: ['…you open a URL on your phone (cold)', '…the connection is already warm', '…the CDN has it, and when it does not', '…a region fails', '…a deploy happens mid-request'],
      },
      {
        id: 'question-bank', num: 'A', title: 'Interview Question Bank', link: '/extras/question-bank', ready: false,
        topics: ['All questions, indexed by chapter', 'Design and debugging curveballs'],
      },
    ],
  },
  {
    title: 'Extras',
    chapters: [
      {
        id: 'global-edge-design', num: 'E1', title: 'Designing a Global Edge', link: '/extras/global-edge-design', ready: false,
        topics: ['A system design walkthrough', 'Requirements, capacity and PoP placement', 'Steering, balancing and caching choices', 'Failure handling', 'How interviewers probe it'],
      },
      {
        id: 'privacy-relays', num: 'E2', title: 'Privacy Relays & VPNs', link: '/extras/privacy-relays', ready: false,
        topics: ['VPNs and what they change on the path', 'MASQUE and two-hop privacy relays', 'Effects on steering, geolocation and abuse handling'],
      },
      {
        id: 'push-and-realtime', num: 'E3', title: 'Push & Real-Time to Phones', link: '/extras/push-and-realtime', ready: false,
        topics: ['Why phones cannot keep many connections open', 'The push relay pattern (APNs, FCM)', 'Long-lived connections at scale'],
      },
    ],
  },
]

export const allChapters: Chapter[] = parts.flatMap((p) => p.chapters)
