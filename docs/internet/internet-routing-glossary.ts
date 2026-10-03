// Glossary terms owned by the Internet Routing chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

const chapter = '/internet/internet-routing'

export const terms: Record<string, GlossaryEntry> = {
  'autonomous-system': {
    term: 'Autonomous system (AS)',
    def: 'A network run by one organisation under one routing policy, identified by an AS number. The internet is tens of thousands of them, connected in pairs.',
    chapter,
  },
  'as-path': {
    term: 'AS path',
    def: 'The list of autonomous systems a BGP route has passed through. It prevents loops and serves as a rough distance measure.',
    chapter,
  },
  'local-preference': {
    term: 'Local preference',
    def: 'A value a network sets on BGP routes it learns, to encode business policy such as “prefer customers, then peers, then paid providers”. It is checked before AS path length.',
    chapter,
  },
  'hot-potato-routing': {
    term: 'Hot-potato routing',
    def: 'Handing traffic to the next network at the exit closest to where it entered your network. It is cheap for the sender and makes internet paths asymmetric.',
    chapter,
  },
  transit: {
    term: 'Transit',
    def: 'A paid service in which a provider carries a customer’s traffic to and from the whole internet.',
    chapter,
  },
  peering: {
    term: 'Peering',
    def: 'Two networks exchanging traffic between their own users and customers, usually without payment. A peer does not give routes to the rest of the internet.',
    chapter,
  },
  ixp: {
    term: 'Internet exchange point (IXP)',
    def: 'A shared switch, usually in a colocation building, where many networks connect so they can peer with each other through one port.',
    chapter,
  },
  pni: {
    term: 'Private network interconnect (PNI)',
    def: 'A dedicated link between two networks’ routers, giving capacity reserved for traffic between them.',
    chapter,
  },
  'bgp-hijack': {
    term: 'BGP hijack',
    def: 'An announcement of a prefix by a network that does not hold it, by mistake or on purpose. A more-specific hijack wins by longest-prefix match wherever it spreads.',
    chapter,
  },
  'route-leak': {
    term: 'Route leak',
    def: 'A real BGP route passed to neighbours that should not have received it, so traffic detours through a network that should not carry it.',
    chapter,
  },
  rpki: {
    term: 'RPKI',
    def: 'Resource Public Key Infrastructure: a system of signed records in which address holders state which networks may announce their prefixes.',
    chapter,
  },
  roa: {
    term: 'Route origin authorisation (ROA)',
    def: 'A signed RPKI record saying which AS may originate a prefix, and how specific its announcements may be.',
    chapter,
  },
  rov: {
    term: 'Route origin validation (ROV)',
    def: 'Checking each BGP announcement against ROAs and dropping routes whose origin AS or prefix length is not allowed. It does not check the rest of the path.',
    chapter,
  },
  'amplification-attack': {
    term: 'Amplification attack',
    def: 'A DDoS attack that sends small requests with a forged source address to public servers, which send much larger replies to the victim.',
    chapter,
  },
  'scrubbing-center': {
    term: 'Scrubbing centre',
    def: 'A DDoS protection site that attracts a victim’s traffic with BGP, filters out the attack, and forwards the clean traffic to the victim.',
    chapter,
  },
  rtbh: {
    term: 'Remote triggered blackholing (RTBH)',
    def: 'Tagging a route so that upstream providers drop all traffic to one address. It protects the rest of a network during a DDoS by sacrificing the target.',
    chapter,
  },
}
