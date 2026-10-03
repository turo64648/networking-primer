// Glossary terms owned by the DNS chapter, plus brief entries for later chapters' terms used here.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  dns: {
    term: 'DNS (Domain Name System)',
    def: 'The internet’s distributed lookup system that turns names like www.example.com into addresses and other data. Answers are spread across many servers and cached along the way.',
    chapter: '/protocols/dns',
  },
  'dns-record': {
    term: 'DNS record',
    def: 'One piece of data stored under a name, with a type: A (an IPv4 address), AAAA (an IPv6 address), CNAME (an alias), NS (who answers for a zone), and so on.',
    chapter: '/protocols/dns',
  },
  'dns-zone': {
    term: 'Zone',
    def: 'A part of the DNS name tree that one operator controls and serves from its own authoritative servers, such as example.com and the names under it.',
    chapter: '/protocols/dns',
  },
  delegation: {
    term: 'Delegation',
    def: 'A parent zone pointing to the servers of a child zone with NS records, as .com does for example.com. It is how the DNS spreads control across many operators.',
    chapter: '/protocols/dns',
  },
  'stub-resolver': {
    term: 'Stub resolver',
    def: 'The small DNS client built into the operating system. It does not search by itself; it asks a recursive resolver and may keep a short cache.',
    chapter: '/protocols/dns',
  },
  'recursive-resolver': {
    term: 'Recursive resolver',
    def: 'A server that finds DNS answers for clients by asking authoritative servers, and caches what it learns. Run by ISPs, companies, and public services such as 1.1.1.1 or 8.8.8.8.',
    chapter: '/protocols/dns',
  },
  'authoritative-server': {
    term: 'Authoritative server',
    def: 'A DNS server that holds the real data for a zone and answers for it. It is the source of truth; resolvers only keep copies.',
    chapter: '/protocols/dns',
  },
  'root-server': {
    term: 'Root servers',
    def: 'The authoritative servers for the top of the DNS tree. They do not know any website’s address; they point resolvers to the servers for .com, .org, .uk and so on.',
    chapter: '/protocols/dns',
  },
  'dns-ttl': {
    term: 'TTL (DNS time to live)',
    def: 'How many seconds a DNS answer may be cached before it must be fetched again. The zone owner sets it. Not the same as the IP header field with the same name.',
    chapter: '/protocols/dns',
  },
  'negative-caching': {
    term: 'Negative caching',
    def: 'Caching the answer “this name or record does not exist”. Its lifetime comes from the zone’s SOA record, so a name created after someone looked it up can stay invisible for a while.',
    chapter: '/protocols/dns',
  },
  nxdomain: {
    term: 'NXDOMAIN',
    def: 'The DNS response code meaning “this name does not exist at all”. Different from NODATA, where the name exists but has no record of the type asked for.',
    chapter: '/protocols/dns',
  },
  cname: {
    term: 'CNAME',
    def: 'A DNS record that makes one name an alias for another, so the resolver continues the lookup at the target name. Often used to point a site at a CDN or cloud load balancer.',
    chapter: '/protocols/dns',
  },
  edns: {
    term: 'EDNS (Extension Mechanisms for DNS)',
    def: 'An extension that lets DNS messages carry options and be larger than the original 512-byte limit over UDP. Client subnet and DNSSEC both depend on it.',
    chapter: '/protocols/dns',
  },
  ecs: {
    term: 'EDNS Client Subnet (ECS)',
    def: 'An option where a recursive resolver tells the authoritative server part of the user’s IP address, so the answer can suit the user’s location rather than the resolver’s. It costs privacy and cache efficiency.',
    chapter: '/protocols/dns',
  },
  geodns: {
    term: 'GeoDNS',
    def: 'An authoritative server that gives different answers depending on where the question seems to come from, usually to send users to a nearby site.',
    chapter: '/protocols/dns',
  },
  'https-record': {
    term: 'HTTPS / SVCB record',
    def: 'A DNS record that tells a client how to connect to a service, not only where: supported protocols such as HTTP/3, address hints, and keys for Encrypted Client Hello.',
    chapter: '/protocols/dns',
  },
  dot: {
    term: 'DNS over TLS (DoT)',
    def: 'DNS queries sent inside a TLS connection on port 853, so the network cannot read or change them. Easy for a network to spot and block because of its port.',
    chapter: '/protocols/dns',
  },
  doh: {
    term: 'DNS over HTTPS (DoH)',
    def: 'DNS queries sent as HTTPS requests, usually on port 443. They look like other web traffic, which hides them from the network and lets apps choose their own resolver.',
    chapter: '/protocols/dns',
  },
  dnssec: {
    term: 'DNSSEC',
    def: 'Digital signatures on DNS records, checked along a chain from the root, so a resolver can detect forged answers. It proves who wrote the data; it does not encrypt it.',
    chapter: '/protocols/dns',
  },
  'cache-poisoning': {
    term: 'Cache poisoning',
    def: 'An attack where a forged DNS answer gets stored in a resolver’s cache, sending every user of that resolver to the attacker’s address until the entry expires.',
    chapter: '/protocols/dns',
  },
  'serve-stale': {
    term: 'Serve-stale',
    def: 'A resolver feature that keeps answering with an expired cached record when the authoritative servers cannot be reached, instead of failing.',
    chapter: '/protocols/dns',
  },
  'dns-truncation': {
    term: 'Truncation (TC bit)',
    def: 'A flag in a DNS response over UDP meaning “the full answer did not fit”. The client then asks again over TCP.',
    chapter: '/protocols/dns',
  },

  // Brief entries for terms explained in full by later chapters.
  anycast: {
    term: 'Anycast',
    def: 'Announcing the same IP address from many places at once, so the internet’s routing delivers each packet to the nearest one.',
    chapter: '/internet/internet-routing',
  },
  bgp: {
    term: 'BGP (Border Gateway Protocol)',
    def: 'The protocol networks use to tell each other which IP addresses they can reach. If a network stops announcing an address range, traffic to it has nowhere to go.',
    chapter: '/internet/internet-routing',
  },
  ddos: {
    term: 'DDoS (distributed denial of service)',
    def: 'An attack where many machines send traffic at once to overwhelm a service or its network.',
    chapter: '/internet/internet-routing',
  },
  'happy-eyeballs': {
    term: 'Happy Eyeballs',
    def: 'A client technique that tries IPv6 and IPv4 connections nearly in parallel and uses whichever works first, so a broken path costs a fraction of a second, not a timeout.',
    chapter: '/internet/last-mile',
  },
  tls: {
    term: 'TLS (Transport Layer Security)',
    def: 'The protocol that encrypts and authenticates a connection, such as the one under HTTPS.',
    chapter: '/protocols/tls',
  },
  ech: {
    term: 'Encrypted Client Hello (ECH)',
    def: 'A TLS extension that encrypts the first handshake message, including the site name, so the network cannot see which site on a shared server you visit.',
    chapter: '/protocols/tls',
  },
  quic: {
    term: 'QUIC',
    def: 'A transport protocol over UDP that combines connection setup and encryption. HTTP/3 runs on it.',
    chapter: '/protocols/quic',
  },
  cdn: {
    term: 'CDN (content delivery network)',
    def: 'A network of servers in many locations that caches and serves a website’s content close to users.',
    chapter: '/edge/cdns',
  },
}
