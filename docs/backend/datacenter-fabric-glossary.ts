// Glossary terms owned by the Datacenter Fabric chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'clos-topology': {
    term: 'Clos network',
    def: 'A multistage switching design in which every switch in one stage connects to every switch in the next. Datacenters use it to give every pair of racks many equal paths built from identical small switches.',
    chapter: '/backend/datacenter-fabric',
  },
  'leaf-spine': {
    term: 'Leaf-spine',
    def: 'The common two-tier Clos fabric: each rack switch (leaf) connects to every spine switch, so any two racks are two hops apart through any spine.',
    chapter: '/backend/datacenter-fabric',
  },
  'top-of-rack-switch': {
    term: 'Top-of-rack (ToR) switch',
    def: 'The switch that connects the servers in one rack to the rest of the fabric. In a leaf-spine fabric it is the leaf.',
    chapter: '/backend/datacenter-fabric',
  },
  'bisection-bandwidth': {
    term: 'Bisection bandwidth',
    def: 'How much traffic can cross the network when the servers are cut into two equal halves. A full-bisection fabric lets every server send at full speed to the other half at once.',
    chapter: '/backend/datacenter-fabric',
  },
  oversubscription: {
    term: 'Oversubscription',
    def: 'The ratio of a switch’s capacity facing servers to its capacity facing the rest of the network, such as 3:1. A cost trade-off that bets not all servers send at full speed at once.',
    chapter: '/backend/datacenter-fabric',
  },
  incast: {
    term: 'Incast',
    def: 'Many senders replying to one receiver at the same instant, overflowing the switch buffer on the receiver’s link. It causes packet loss and TCP timeouts on fan-out requests.',
    chapter: '/backend/datacenter-fabric',
  },
  'elephant-flow': {
    term: 'Elephant flow',
    def: 'A long-lived connection that moves a large amount of data, such as a backup. Because ECMP balances connections, not bytes, a few elephants can overload one link.',
    chapter: '/backend/datacenter-fabric',
  },
  'overlay-network': {
    term: 'Overlay network',
    def: 'A virtual network built by wrapping packets inside other packets sent across a physical network. It lets tenants have their own addresses independent of where machines sit.',
    chapter: '/backend/datacenter-fabric',
  },
  'underlay-network': {
    term: 'Underlay network',
    def: 'The physical routed network that carries an overlay’s wrapped packets. It only needs to route between tunnel endpoints.',
    chapter: '/backend/datacenter-fabric',
  },
  vxlan: {
    term: 'VXLAN',
    def: 'Virtual Extensible LAN: a common overlay format that wraps Ethernet frames in UDP packets, with a 24-bit identifier for about 16 million virtual networks. It adds 50 bytes over IPv4.',
    chapter: '/backend/datacenter-fabric',
  },
  vtep: {
    term: 'VXLAN tunnel endpoint (VTEP)',
    def: 'The switch or host software that wraps packets into VXLAN and unwraps them at the other end.',
    chapter: '/backend/datacenter-fabric',
  },
  evpn: {
    term: 'EVPN',
    def: 'Ethernet VPN: a BGP extension that tunnel endpoints use to announce which MAC and IP addresses live behind them, instead of learning by flooding.',
    chapter: '/backend/datacenter-fabric',
  },
  'jumbo-frame': {
    term: 'Jumbo frame',
    def: 'An Ethernet frame larger than the standard 1,500-byte payload, typically around 9,000 bytes. Datacenter underlays use them so encapsulated packets still fit.',
    chapter: '/backend/datacenter-fabric',
  },
  'failure-domain': {
    term: 'Failure domain',
    def: 'The set of components that fail together when one thing fails, such as all servers behind one rack switch or one power feed. Replicas are spread across failure domains.',
    chapter: '/backend/datacenter-fabric',
  },
}
