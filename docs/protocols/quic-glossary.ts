// Glossary terms owned by the QUIC & HTTP/3 chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'http3': {
    term: 'HTTP/3',
    def: 'The version of HTTP that runs over QUIC instead of TCP. Each request and response travels on its own QUIC stream.',
    chapter: '/protocols/quic',
  },
  'quic-stream': {
    term: 'QUIC stream',
    def: 'An ordered, reliable flow of bytes inside a QUIC connection. A connection carries many streams, and a lost packet delays only the streams whose data it carried.',
    chapter: '/protocols/quic',
  },
  'connection-id': {
    term: 'Connection ID',
    def: 'An identifier in each QUIC packet that names the connection, chosen by the endpoint that receives it. It lets a server recognise a connection after the client’s address or port changes.',
    chapter: '/protocols/quic',
  },
  'connection-migration': {
    term: 'Connection migration',
    def: 'Moving a live QUIC connection to a new network path, for example from Wi-Fi to cellular, without a new handshake. The client starts it; the server checks the new path before sending much on it.',
    chapter: '/protocols/quic',
  },
  'alt-svc': {
    term: 'Alt-Svc',
    def: 'An HTTP response header that tells the client the same site is available another way, such as “HTTP/3 on UDP port 443”. The client remembers it for a time the server sets.',
    chapter: '/protocols/quic',
  },
  'qpack': {
    term: 'QPACK',
    def: 'The header compression used by HTTP/3. It replaces HTTP/2’s HPACK and is designed so that a lost packet rarely blocks other requests.',
    chapter: '/protocols/quic',
  },
  'amplification-limit': {
    term: 'Amplification limit',
    def: 'A QUIC rule that a server may send at most three times the bytes it has received from an address until it knows the address is real. It stops attackers using servers to flood a forged victim.',
    chapter: '/protocols/quic',
  },
  'middlebox': {
    term: 'Middlebox',
    def: 'A device on the path that inspects or changes traffic instead of only forwarding it: firewalls, NATs, load balancers, traffic shapers.',
    chapter: '/protocols/quic',
  },
  'protocol-ossification': {
    term: 'Protocol ossification',
    def: 'When middleboxes come to depend on how a protocol looks today, so any change to it breaks on real networks. QUIC encrypts most of its headers to prevent it.',
    chapter: '/protocols/quic',
  },
}
