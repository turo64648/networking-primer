// Glossary terms owned by the Edge to Origin chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'split-tcp': {
    term: 'Split TCP',
    def: 'Ending the client’s TCP connection at a proxy near it, and using a separate connection from the proxy onward. Each leg gets a shorter round trip, so handshakes and loss recovery are faster.',
    chapter: '/backend/edge-to-origin',
  },
  'private-wan': {
    term: 'Private WAN',
    def: 'A long-distance network an operator owns or leases for its own traffic between sites, instead of crossing the public internet. Also called a private backbone.',
    chapter: '/backend/edge-to-origin',
  },
  'cold-potato-routing': {
    term: 'Cold-potato routing',
    def: 'Carrying traffic on your own network as far as possible before handing it to another network. The opposite of hot-potato routing.',
    chapter: '/backend/edge-to-origin',
  },
  'traffic-engineering': {
    term: 'Traffic engineering',
    def: 'Placing traffic on network paths on purpose, by demand, capacity and priority, instead of sending everything on the shortest path.',
    chapter: '/backend/edge-to-origin',
  },
  'software-defined-networking': {
    term: 'Software-defined networking (SDN)',
    def: 'Running a network from a central program that computes routes and installs them in switches and routers, instead of each device deciding alone.',
    chapter: '/backend/edge-to-origin',
  },
  'origin-tunnel': {
    term: 'Origin tunnel',
    def: 'A connection the origin opens outbound to the edge, which then carries requests back in. The origin needs no public inbound address, so attackers cannot reach it directly.',
    chapter: '/backend/edge-to-origin',
  },
}
