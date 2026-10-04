// Glossary terms owned by the Privacy Relays & VPNs extra.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  vpn: {
    term: 'Virtual private network (VPN)',
    def: 'An encrypted tunnel from a device to a VPN server, which forwards the traffic from its own address. Websites see the server’s address; the local network sees only encrypted traffic.',
    chapter: '/extras/privacy-relays',
  },
  'egress-ip': {
    term: 'Egress address',
    def: 'The address from which traffic leaves a VPN, relay or company network for the open internet. Websites see this address instead of the user’s.',
    chapter: '/extras/privacy-relays',
  },
  'privacy-relay': {
    term: 'Two-hop privacy relay',
    def: 'A relay design with two hops run by different operators. The first knows the user’s address but not the destination; the second knows the destination but not the user.',
    chapter: '/extras/privacy-relays',
  },
  masque: {
    term: 'MASQUE',
    def: 'An IETF family of standards for building proxies and tunnels out of HTTP, mainly HTTP/3 over QUIC. It covers UDP proxying (CONNECT-UDP) and IP proxying (CONNECT-IP).',
    chapter: '/extras/privacy-relays',
  },
  'connect-udp': {
    term: 'CONNECT-UDP',
    def: 'An HTTP request (RFC 9298) asking a proxy to forward UDP datagrams to a target host and port. It lets QUIC traffic run through an HTTP proxy.',
    chapter: '/extras/privacy-relays',
  },
  'oblivious-http': {
    term: 'Oblivious HTTP (OHTTP)',
    def: 'A way to send single HTTP requests (RFC 9458) encrypted to the target and forwarded by a separate relay, so the relay sees who sent it but not what, and the target sees what but not who.',
    chapter: '/extras/privacy-relays',
  },
  geofeed: {
    term: 'Geofeed',
    def: 'A file in which a network publishes the intended location of its address ranges (RFC 8805). Location databases read geofeeds to place addresses correctly.',
    chapter: '/extras/privacy-relays',
  },
  'privacy-pass': {
    term: 'Privacy Pass',
    def: 'A token system in which a trusted issuer vouches that a client passed a check, without telling the website who the client is. Used as an abuse signal that does not depend on the IP address.',
    chapter: '/extras/privacy-relays',
  },
}
