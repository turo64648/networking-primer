// Glossary terms owned by the Last Mile & Mobile chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'last-mile': {
    term: 'Last mile',
    def: 'The access network between a user’s device and their internet provider: Wi-Fi and home broadband, or the cellular radio and carrier network. Usually the most variable part of the path.',
    chapter: '/internet/last-mile',
  },
  jitter: {
    term: 'Jitter',
    def: 'Variation in delay from one packet to the next. Radio links and full buffers cause a lot of it; real-time apps suffer more from jitter than from a steady delay.',
    chapter: '/internet/last-mile',
  },
  'radio-state': {
    term: 'Radio state (RRC)',
    def: 'Whether a phone’s cellular radio is idle or connected, managed by Radio Resource Control. Waking from idle adds a promotion delay; staying connected after traffic (the tail timer) costs battery.',
    chapter: '/internet/last-mile',
  },
  'packet-gateway': {
    term: 'Packet gateway',
    def: 'The point where a mobile carrier’s core network meets the internet. All phone traffic passes through it, so it may be far from the user and is what IP geolocation sees.',
    chapter: '/internet/last-mile',
  },
  'nat-timeout': {
    term: 'NAT timeout',
    def: 'How long a NAT keeps the mapping for a quiet flow before deleting it. After that, the connection silently stops working; keepalives prevent it.',
    chapter: '/internet/last-mile',
  },
  cgnat: {
    term: 'Carrier-grade NAT (CGNAT)',
    def: 'NAT run by an internet provider, sharing one public IPv4 address among many subscribers. Servers then see many users as one address.',
    chapter: '/internet/last-mile',
  },
  'port-exhaustion': {
    term: 'Port exhaustion',
    def: 'Running out of source ports on a shared address, for example in a CGNAT port block or a cloud NAT gateway. New connections fail while existing ones keep working.',
    chapter: '/internet/last-mile',
  },
  dns64: {
    term: 'DNS64',
    def: 'A resolver that invents an IPv6 address, embedding the IPv4 one, for names that have only IPv4 addresses. Used with NAT64 on IPv6-only networks.',
    chapter: '/internet/last-mile',
  },
  nat64: {
    term: 'NAT64',
    def: 'A translator that turns IPv6 packets sent to a special prefix into IPv4 packets, so IPv6-only devices can reach IPv4-only servers.',
    chapter: '/internet/last-mile',
  },
  '464xlat': {
    term: '464XLAT',
    def: 'An on-device translator (CLAT) that turns an app’s IPv4 traffic into IPv6, paired with the carrier’s NAT64. Lets IPv4-only apps work on IPv6-only networks.',
    chapter: '/internet/last-mile',
  },
}
