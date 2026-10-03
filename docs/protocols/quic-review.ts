// Flashcards for the QUIC & HTTP/3 chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why was it so hard to improve TCP directly?',
    a: 'TCP lives in OS kernels, so changes reach users only through OS updates. Middleboxes inspect TCP and drop unfamiliar packets, so new options often fail on real paths.',
  },
  {
    q: 'Why does QUIC run over UDP rather than as a new IP protocol?',
    a: 'Firewalls and NATs pass UDP almost everywhere but drop unknown protocol numbers. UDP adds only ports and a checksum, so QUIC can do everything else itself in user space.',
  },
  {
    q: 'Why does QUIC encrypt most of its own header?',
    a: 'Middleboxes cannot depend on fields they cannot read, so the protocol can keep changing without breaking on real networks. It also prevents tampering and protects privacy.',
  },
  {
    q: 'How does QUIC save a round trip on a new connection?',
    a: 'Its first packet already carries the TLS ClientHello, so the transport and encryption handshakes happen together. The request leaves after one round trip instead of two.',
  },
  {
    q: 'What is the risk of 0-RTT, and how is it contained?',
    a: 'Data sent before the handshake completes can be replayed by someone who copies it. Clients send only safe, repeatable requests as 0-RTT, and servers may refuse it or answer <code>425 Too Early</code>.',
  },
  {
    q: 'How does QUIC stop servers being used to amplify attacks?',
    a: 'The client’s first packet must be at least 1200 bytes, and the server sends at most three times what it received until the address is validated. Under attack it can demand a Retry token.',
  },
  {
    q: 'Why does one lost packet stall all HTTP/2 requests?',
    a: 'HTTP/2’s streams share one TCP byte stream, which must be delivered in order. Every byte after the gap waits for the resend, whatever request it belongs to.',
  },
  {
    q: 'How do QUIC streams avoid that?',
    a: 'Each piece of data is labelled with its stream and position. A loss holds back only the streams whose data was in the lost packet; the others are delivered.',
  },
  {
    q: 'What head-of-line blocking does HTTP/3 not remove?',
    a: 'Order inside a single stream, the congestion window shared by all streams, and possible coupling through header compression, which QPACK is designed to limit.',
  },
  {
    q: 'Why does QUIC give resent data a new packet number?',
    a: 'So an acknowledgement always says exactly which transmission arrived. TCP reuses sequence numbers for resends, which makes round-trip measurement ambiguous.',
  },
  {
    q: 'Why does a TCP connection die when a phone moves from Wi-Fi to cellular, but a QUIC one can survive?',
    a: 'TCP identifies a connection by addresses and ports, which change. QUIC identifies it by a connection ID in each packet, so the server recognises it on the new path.',
  },
  {
    q: 'Why does the server validate a new path before using it?',
    a: 'Otherwise an attacker could forge a source address and make the server flood a victim. The server sends a random challenge and waits for the client to echo it.',
  },
  {
    q: 'Why does a migrating client switch to a fresh connection ID?',
    a: 'Keeping the same ID would let an observer link the old and new networks to one user. The server hands out spare IDs in advance for this.',
  },
  {
    q: 'Why do connection IDs matter for load balancers?',
    a: 'A balancer that hashes the four-tuple sends a migrated connection to the wrong server. Servers can encode their identity in the IDs they issue, so the balancer can route by ID instead.',
  },
  {
    q: 'How does a browser learn that a site supports HTTP/3?',
    a: 'From an <code>Alt-Svc</code> header on an earlier TCP response, or from an HTTPS DNS record with <code>alpn="h3"</code>, which works on the first visit.',
  },
  {
    q: 'Why is partial UDP blocking worse than full blocking?',
    a: 'Full blocking makes the QUIC handshake fail, and the race picks TCP quickly. If the handshake succeeds and later packets vanish, the client has committed to QUIC and the page hangs.',
  },
  {
    q: 'Why does QUIC cost more CPU than TCP?',
    a: 'It runs in user space, crosses into the kernel for packets, encrypts every packet itself and handles acknowledgements in the application, with far less hardware offload than kernel TCP.',
  },
  {
    q: 'Why can you not turn off HTTP/3 instantly by removing the Alt-Svc header?',
    a: 'Clients cache the hint for its <code>ma</code> lifetime, like a DNS TTL, and keep trying QUIC until it expires. Shorten the lifetime before a planned shutdown.',
  },
]
