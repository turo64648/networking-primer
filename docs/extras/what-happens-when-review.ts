// Flashcards for the capstone chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Over TCP, how many round trips does a cold request wait before its first byte, and which?',
    a: 'About four: DNS, the TCP handshake, the TLS 1.3 handshake, and the request itself. QUIC merges transport and TLS, so three. Radio wake-up, the origin leg and server time come on top.',
  },
  {
    q: 'Why does a warm request skip DNS, and what does that mean for DNS changes?',
    a: 'It is sent on an already-open connection, so no lookup happens. A DNS change therefore does not move that client until the connection closes.',
  },
  {
    q: 'Why does ending TCP and TLS at a nearby PoP help even for uncacheable pages?',
    a: 'The handshake round trips cross only the short phone-to-PoP distance. The long leg to the origin uses connections that are already open, so it costs one round trip per request.',
  },
  {
    q: 'Why can the first request after a minute of idle be slow again on a phone?',
    a: 'The radio may have gone to sleep, a NAT or load balancer may have dropped the idle connection silently, and TCP may have shrunk its congestion window.',
  },
  {
    q: 'What does a session ticket save when the connection has closed?',
    a: 'TLS resumption skips the certificate exchange, and 0-RTT lets the request go in the first flight. 0-RTT data can be replayed, so only safe-to-repeat requests may use it.',
  },
  {
    q: 'What happens on a CDN miss in a tiered cache?',
    a: 'The PoP asks a larger regional tier or origin shield, then the origin over a warm connection. Simultaneous misses for the same object are collapsed into one origin fetch.',
  },
  {
    q: 'Name two ways a release can wreck a CDN hit ratio.',
    a: 'Fragmenting the cache key (new query parameters, cookies, a broad Vary header) or shortening the lifetime (Cache-Control changed to private, no-store or a short max-age).',
  },
  {
    q: 'When an origin region fails, what moves users away, and how fast?',
    a: 'The edge proxies: outlier detection and health checks mark the region down within seconds, and new requests go to the next healthy region. Users keep their PoP and connection.',
  },
  {
    q: 'Why is regional failover mainly a capacity problem?',
    a: 'Moving traffic takes seconds, but the surviving regions must absorb it with cold caches and pools. Without headroom, the overload spreads to them too.',
  },
  {
    q: 'How do anycast and DNS steering differ when a user-facing PoP fails?',
    a: 'Anycast moves users within seconds to a minute when routes are withdrawn, but breaks their connections. DNS steering leaves a long tail behind TTLs, stretched caches and pinned connections.',
  },
  {
    q: 'What are the steps of draining a server for a deploy?',
    a: 'Stop sending it new work (fail readiness, leave discovery), tell callers to move (GOAWAY or Connection: close), let in-flight requests finish, then stop the process.',
  },
  {
    q: 'Why do deploys often cause a short burst of 502 errors?',
    a: 'The process stops or closes connections before every proxy has learned it is leaving, so some requests hit a closed server. Waiting longer than discovery propagation fixes it.',
  },
  {
    q: 'Why should a proxy’s idle timeout to a backend be shorter than the backend’s?',
    a: 'Otherwise the backend can close an idle connection just as the proxy reuses it, and the request fails with a 502.',
  },
  {
    q: 'Why not use a DNS TTL of zero for instant failover?',
    a: 'Some caches ignore it, open connections never re-resolve, and every lookup goes to your authoritative servers. Keep a stable address and move what is behind it instead.',
  },
  {
    q: 'What changes when the request is a POST that places an order?',
    a: 'It is never cached, must not go in 0-RTT data, and must not be retried blindly. An idempotency key lets clients and proxies retry it safely.',
  },
]
