// Glossary terms owned by the L4 Load Balancing chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

const chapter = '/edge/l4-load-balancing'

export const terms: Record<string, GlossaryEntry> = {
  'vip': {
    term: 'Virtual IP (VIP)',
    def: 'A public address shared by a service rather than owned by one machine. Load balancers receive its traffic and pass it to real servers.',
    chapter,
  },
  'l4-load-balancer': {
    term: 'Layer-4 (L4) load balancer',
    def: 'A balancer that picks a backend per connection using only protocol, addresses and ports. It does not decrypt TLS or read HTTP.',
    chapter,
  },
  'ecmp': {
    term: 'ECMP (equal-cost multi-path)',
    def: 'Router feature that spreads flows across several equally good next hops by hashing addresses and ports, so each flow keeps one path.',
    chapter,
  },
  'consistent-hashing': {
    term: 'Consistent hashing',
    def: 'A way to map keys to servers so that adding or removing one server moves only about that server’s share of keys, not nearly all of them.',
    chapter,
  },
  'maglev-hashing': {
    term: 'Maglev table',
    def: 'A consistent-hashing lookup table from Google’s 2016 Maglev paper. Backends take turns claiming slots in their own preference order, giving near-equal shares and one lookup per packet.',
    chapter,
  },
  'connection-tracking': {
    term: 'Connection tracking',
    def: 'Keeping a table of which backend each flow was sent to, so existing flows stay put when the backend set changes.',
    chapter,
  },
  'daisy-chaining': {
    term: 'Second-chance forwarding (daisy chaining)',
    def: 'Each bucket names a current and a previous backend. A backend that gets a packet for a connection it does not know forwards it to the previous one, so balancers need no per-flow state.',
    chapter,
  },
  'ip-in-ip': {
    term: 'IP-in-IP',
    def: 'Encapsulation that wraps a whole IP packet inside another IP header, used by load balancers to deliver packets to a backend unchanged.',
    chapter,
  },
  'direct-server-return': {
    term: 'Direct server return (DSR)',
    def: 'The backend replies to the client directly from the VIP, so response traffic skips the load balancer.',
    chapter,
  },
  'quic-lb': {
    term: 'QUIC-LB',
    def: 'An IETF draft for encoding an encrypted server identity inside QUIC connection IDs, so any load balancer can route a migrated connection.',
    chapter,
  },
}
