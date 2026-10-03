// Glossary terms owned by the TLS chapter. (tls and ech are defined in dns-glossary.ts.)
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  certificate: {
    term: 'Certificate (TLS)',
    def: 'A signed document that ties a site name to a public key. The server sends it in the TLS handshake to prove it is the real site.',
    chapter: '/protocols/tls',
  },
  'certificate-authority': {
    term: 'Certificate authority (CA)',
    def: 'An organisation that browsers and operating systems trust to sign certificates. For most certificates it only checks that the requester controls the domain.',
    chapter: '/protocols/tls',
  },
  'certificate-chain': {
    term: 'Certificate chain',
    def: 'The list of certificates from a site’s certificate, through one or more intermediates, up to a root the client already trusts. The server must send the intermediates.',
    chapter: '/protocols/tls',
  },
  'forward-secrecy': {
    term: 'Forward secrecy',
    def: 'The property that recorded traffic cannot be decrypted later, even if the server’s long-term private key is stolen, because each connection uses throwaway keys.',
    chapter: '/protocols/tls',
  },
  alpn: {
    term: 'ALPN (Application-Layer Protocol Negotiation)',
    def: 'A TLS extension where the client lists the protocols it speaks, such as HTTP/2 and HTTP/1.1, and the server picks one during the handshake, at no extra cost.',
    chapter: '/protocols/tls',
  },
  sni: {
    term: 'SNI (Server Name Indication)',
    def: 'The site name a client puts in its first TLS message, so a server hosting many sites can pick the right certificate. It is sent in plain text unless ECH is used.',
    chapter: '/protocols/tls',
  },
  'session-resumption': {
    term: 'Session resumption',
    def: 'Reconnecting to a TLS server with a ticket from an earlier session, which skips the certificate check and the server’s signature.',
    chapter: '/protocols/tls',
  },
  'zero-rtt': {
    term: '0-RTT (early data)',
    def: 'A TLS 1.3 feature where a returning client sends its first request inside its first handshake message, saving a round trip. The data can be replayed, so it suits only safe requests.',
    chapter: '/protocols/tls',
  },
  'certificate-transparency': {
    term: 'Certificate Transparency (CT)',
    def: 'Public, append-only logs where CAs must record every certificate they issue. Browsers reject unlogged certificates, and site owners can watch the logs for their names.',
    chapter: '/protocols/tls',
  },
  acme: {
    term: 'ACME (Automatic Certificate Management Environment)',
    def: 'The protocol, created by Let’s Encrypt, that lets software prove control of a domain and get or renew a certificate automatically.',
    chapter: '/protocols/tls',
  },
  'certificate-pinning': {
    term: 'Certificate pinning',
    def: 'An app accepting only specific certificates or keys for a site. It resists interception, but breaks every installed copy of the app if the site rotates to a key it did not expect.',
    chapter: '/protocols/tls',
  },
  crl: {
    term: 'CRL (certificate revocation list)',
    def: 'A signed list of revoked certificates published by a CA, which clients download and check locally.',
    chapter: '/protocols/tls',
  },
  ocsp: {
    term: 'OCSP (Online Certificate Status Protocol)',
    def: 'A live query to a CA asking whether one certificate is revoked. It leaks browsing to the CA and is being phased out in favour of CRLs and short lifetimes.',
    chapter: '/protocols/tls',
  },
  'tls-termination': {
    term: 'TLS termination',
    def: 'Ending a client’s TLS connection at a server, often an edge server or load balancer, which decrypts the traffic and forwards it over a separate connection.',
    chapter: '/protocols/tls',
  },
  mtls: {
    term: 'Mutual TLS (mTLS)',
    def: 'TLS where the client also presents a certificate, so both sides prove who they are. Used between services and between an edge and its origin.',
    chapter: '/protocols/tls',
  },
}
