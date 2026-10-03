// Glossary terms owned by the Map chapter, plus brief entries for later chapters' terms used here.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  rtt: {
    term: 'Round-trip time (RTT)',
    def: 'The time for a message to reach the other end and a reply to come back. Distance sets a floor on it; queues and slow links add to it.',
    chapter: '/foundations/the-map',
  },
  'cold-request': {
    term: 'Cold and warm requests',
    def: 'A cold request must first look up the name and set up a new connection and encryption, costing several round trips. A warm request reuses an open connection and costs about one.',
    chapter: '/foundations/the-map',
  },
  ttfb: {
    term: 'Time to first byte (TTFB)',
    def: 'The time from starting a request until the first byte of the response arrives. It includes any lookups, connection setup, network round trips and server work.',
    chapter: '/foundations/the-map',
  },
  pop: {
    term: 'Point of presence (PoP)',
    def: 'A site where a large website, CDN or cloud provider places servers close to users and connects to local networks. Users’ connections end there rather than at a distant datacenter.',
    chapter: '/foundations/the-map',
  },
  origin: {
    term: 'Origin',
    def: 'The website’s own servers that hold the real content and run the application, as opposed to the edge and CDN servers in front of them.',
    chapter: '/foundations/the-map',
  },
  backbone: {
    term: 'Backbone',
    def: 'The long-distance network that links a company’s edge sites and datacenters. Large providers run their own private backbone instead of crossing the public internet.',
    chapter: '/backend/edge-to-origin',
  },
  isp: {
    term: 'ISP (internet service provider)',
    def: 'The company that connects your home, office or phone to the internet: a broadband provider or a mobile carrier.',
    chapter: '/foundations/the-map',
  },
  nat: {
    term: 'NAT (network address translation)',
    def: 'A router rewriting private addresses to a shared public address on the way out, and remembering the mapping so replies find their way back. Mobile carriers do it at large scale (carrier-grade NAT).',
    chapter: '/internet/last-mile',
  },
  'layer-4': {
    term: 'Layer 4 (L4)',
    def: 'The transport layer: TCP and UDP. An L4 device sees addresses and ports, but not the content of requests.',
    chapter: '/edge/l4-load-balancing',
  },
  'layer-7': {
    term: 'Layer 7 (L7)',
    def: 'The application layer, such as HTTP. An L7 proxy decrypts and reads each request, so it can route, cache or reject by name, path or header.',
    chapter: '/edge/l7-proxies',
  },
}
