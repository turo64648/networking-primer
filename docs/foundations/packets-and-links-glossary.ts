// Glossary terms owned by the Packets & Links chapter, plus a brief entry for NAT (explained in chapter 8).
import type { GlossaryEntry } from '../.vitepress/glossary'

const chapter = '/foundations/packets-and-links'

export const terms: Record<string, GlossaryEntry> = {
  packet: {
    term: 'Packet',
    def: 'A unit of data with an IP header giving its source and destination addresses. Routers forward packets one by one, without knowing which request they belong to.',
    chapter,
  },
  'ip-address': {
    term: 'IP address',
    def: 'The address that identifies a destination on the internet: 32 bits for IPv4 (192.0.2.10), 128 bits for IPv6 (2001:db8::10). Routers forward packets by it.',
    chapter,
  },
  frame: {
    term: 'Frame',
    def: 'The wrapper a packet travels in across one link, such as Ethernet or Wi-Fi, addressed by MAC addresses. Each router throws it away and builds a new one.',
    chapter,
  },
  encapsulation: {
    term: 'Encapsulation',
    def: 'Wrapping each layer’s data inside the next layer’s header: a TCP segment inside an IP packet inside a frame. Tunnels add further layers.',
    chapter,
  },
  'mac-address': {
    term: 'MAC address',
    def: 'The hardware address of a network card, such as 3c:84:6a:12:34:56. It only means something on one local link.',
    chapter,
  },
  'default-gateway': {
    term: 'Default gateway',
    def: 'The router a device sends packets to when the destination is not on its own local network.',
    chapter,
  },
  arp: {
    term: 'ARP (Address Resolution Protocol)',
    def: 'How an IPv4 device finds the MAC address for an IP address on its link: it asks everyone “who has this address?” and caches the reply.',
    chapter,
  },
  ndp: {
    term: 'NDP (Neighbour Discovery)',
    def: 'The IPv6 replacement for ARP, carried in ICMPv6. It also lets routers announce themselves and the network’s address prefix.',
    chapter,
  },
  cidr: {
    term: 'CIDR and prefix length',
    def: 'Writing a block of addresses as an address and the number of leading bits they share, such as 192.168.1.0/24 (256 addresses). A smaller number means a bigger block.',
    chapter,
  },
  'private-address': {
    term: 'Private addresses',
    def: 'IPv4 ranges reserved for internal networks (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16). They are not routed on the internet, so traffic needs NAT to leave.',
    chapter,
  },
  'longest-prefix-match': {
    term: 'Longest-prefix match',
    def: 'The rule routers use to pick a route: of all table entries that contain the destination address, use the most specific (longest prefix).',
    chapter,
  },
  'ip-ttl': {
    term: 'TTL / hop limit (IP)',
    def: 'A counter in every IP packet that each router lowers by one; the packet is dropped at zero, which stops routing loops. Traceroute builds on it. Unrelated to the DNS TTL.',
    chapter,
  },
  icmp: {
    term: 'ICMP',
    def: 'The Internet Control Message Protocol, used for error reports (“time exceeded”, “packet too big”) and tests such as ping. IPv6 uses ICMPv6, which also carries neighbour discovery.',
    chapter,
  },
  traceroute: {
    term: 'Traceroute',
    def: 'A tool that maps a path by sending probes with hop counters of 1, 2, 3… and recording which router reports each one dropped.',
    chapter,
  },
  mtu: {
    term: 'MTU (maximum transmission unit)',
    def: 'The largest packet a link carries in one frame, usually 1,500 bytes on Ethernet. A path’s MTU is that of its smallest link; tunnels shrink it.',
    chapter,
  },
  fragmentation: {
    term: 'IP fragmentation',
    def: 'Splitting a packet too big for a link into pieces that the receiver reassembles. Fragments are often dropped in practice, so senders avoid it.',
    chapter,
  },
  pmtud: {
    term: 'Path MTU discovery (PMTUD)',
    def: 'How a sender learns a path’s size limit: it marks packets “don’t fragment”, and a router that cannot forward one replies with an ICMP “packet too big” message.',
    chapter,
  },
  'pmtud-black-hole': {
    term: 'PMTUD black hole',
    def: 'A path where large packets are dropped and the ICMP “packet too big” replies are filtered, so the sender never shrinks its packets. Connections open, then hang.',
    chapter,
  },
  mss: {
    term: 'MSS (maximum segment size)',
    def: 'The largest chunk of data a TCP endpoint accepts in one segment, announced at connection setup. Normally the MTU minus the IP and TCP headers, such as 1,460 bytes.',
    chapter,
  },
  'mss-clamping': {
    term: 'MSS clamping',
    def: 'A router lowering the MSS value in passing TCP connection setups, so neither end sends packets too big for a tunnel. It does not help UDP.',
    chapter,
  },

  // Brief entry for a term explained in full by a later chapter.
  nat: {
    term: 'NAT (network address translation)',
    def: 'A gateway rewriting addresses and ports so that many devices with private addresses share one or a few public addresses.',
    chapter: '/internet/last-mile',
  },
}
