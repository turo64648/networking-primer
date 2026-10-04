// Flashcards for the Privacy Relays & VPNs extra. Strings may contain inline HTML.

export const cards = [
  {
    q: 'What does a VPN change about the source address a website sees?',
    a: 'The site sees the VPN server’s egress address, not the user’s. Location databases then place the user where that egress is.',
  },
  {
    q: 'Why does a VPN tunnel reduce the usable packet size?',
    a: 'Each packet is wrapped in an outer IP and UDP header plus the VPN’s own header and encryption tag. Those bytes come out of the path’s MTU, typically 60–100 bytes.',
  },
  {
    q: 'Why do small requests work but large transfers hang on some VPNs?',
    a: 'Packets bigger than the real path MTU are dropped. If the “too big” messages are filtered, path MTU discovery never adapts, so only small packets get through. MSS clamping or a lower tunnel MTU fixes it.',
  },
  {
    q: 'Why can a tunnel with too little room break QUIC entirely?',
    a: 'QUIC requires paths to carry UDP payloads of at least 1,200 bytes. If the tunnel leaves less, QUIC fails and the browser falls back to TCP.',
  },
  {
    q: 'Why does a one-hop VPN move trust rather than remove it?',
    a: 'The VPN operator sees both the user’s real address and every destination. Whoever could watch the local network before, the VPN operator can now watch instead.',
  },
  {
    q: 'What does each hop of a two-hop privacy relay know?',
    a: 'The ingress knows who the user is (their address) but not where they go. The egress knows the destination but sees only the ingress’s address.',
  },
  {
    q: 'How does the ingress relay avoid learning the destination?',
    a: 'The client opens a second encrypted QUIC connection to the egress, through the ingress. The destination request travels inside it, so the ingress sees only encrypted traffic to the egress.',
  },
  {
    q: 'What can a two-hop relay not protect against?',
    a: 'Collusion between the two operators, timing correlation by someone watching both sides, and identification at the site itself through logins, cookies or fingerprinting.',
  },
  {
    q: 'What is CONNECT-UDP and why does it matter?',
    a: 'An HTTP request (RFC 9298) asking a proxy to forward UDP datagrams to a target. It lets clients run QUIC and HTTP/3 to the website through a relay.',
  },
  {
    q: 'Why build relays on HTTP/3 instead of a custom VPN protocol?',
    a: 'It looks like normal HTTPS, so it is hard to block selectively. One QUIC connection carries many tunnels without head-of-line blocking, and survives network changes.',
  },
  {
    q: 'How does Oblivious HTTP hide who sent a request?',
    a: 'The client encrypts the whole request to the target’s public key and sends it via a relay. The relay sees the sender but not the content; the gateway sees the content but not the sender.',
  },
  {
    q: 'When is Oblivious HTTP a poor fit?',
    a: 'For browsing, streams or anything with a login session. A cookie or account re-identifies the user, and OHTTP has no long-lived connection.',
  },
  {
    q: 'Why do per-address rate limits misbehave with relay traffic?',
    a: 'One egress address carries many users, so a household-sized limit throttles innocent users. One user may also rotate across egress addresses, so blocking one address does not stop them.',
  },
  {
    q: 'How should a site rate-limit traffic from privacy relays?',
    a: 'Recognise egress ranges from published lists, give them higher per-address limits, and key the real limits on accounts, sessions or attestation tokens such as Privacy Pass.',
  },
  {
    q: 'How do relays help websites keep geolocation useful?',
    a: 'They place egress near users and publish geofeeds mapping each egress range to a coarse location. Location database vendors and sites read those feeds.',
  },
  {
    q: 'Is serving a relay user from the site near the egress a mistake?',
    a: 'Usually not. Their packets really exit there, so the site near the egress is often the fastest for that path, even if the user is elsewhere.',
  },
]
