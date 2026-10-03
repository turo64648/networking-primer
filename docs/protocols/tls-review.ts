// Flashcards for the TLS chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'What three things does TLS give a connection?',
    a: 'Confidentiality (only the two ends can read it), integrity (changes are detected), and server authentication (the server proves it owns the name, with a certificate).',
  },
  {
    q: 'How do two sides agree on a secret key when the network can read everything they send?',
    a: 'Each makes a fresh key pair and sends the public half. Each combines its private half with the other’s public half to get the same secret, which an observer cannot compute.',
  },
  {
    q: 'Why does TLS 1.3 need one round trip where TLS 1.2 needed two?',
    a: 'The 1.3 client guesses the key exchange and sends its key share in the first message, so the server can reply with its key share, certificate and Finished at once.',
  },
  {
    q: 'How does the server prove it is the real site, not a man in the middle?',
    a: 'It sends a certificate binding its public key to the name, then signs a summary of the handshake with the matching private key. Only the key’s owner can make that signature.',
  },
  {
    q: 'What is forward secrecy and why does it matter?',
    a: 'Each connection uses throwaway keys, so traffic recorded today cannot be decrypted even if the server’s long-term key is stolen later. TLS 1.3 always provides it.',
  },
  {
    q: 'Why can resumption silently fail behind a load balancer?',
    a: 'The session ticket is encrypted with a server’s ticket key. If the client lands on a server with a different key, it cannot read the ticket and does a full handshake. Fleets share and rotate ticket keys.',
  },
  {
    q: 'Why is 0-RTT data only safe for some requests?',
    a: 'An attacker can record and resend the first message, so the server may process the request twice. Only requests that are harmless to repeat, such as a plain GET, should use it.',
  },
  {
    q: 'What does a domain-validated certificate prove?',
    a: 'That whoever requested it controlled the domain when it was issued. It says nothing about whether the site is honest.',
  },
  {
    q: 'Why does a site sometimes work in a browser but fail in curl or a mobile app with an issuer error?',
    a: 'The server is not sending its intermediate certificate. Browsers may have it cached or fetch it; most other clients cannot complete the chain.',
  },
  {
    q: 'Why does a server need SNI to pick a certificate?',
    a: 'One IP address can host thousands of sites, and the certificate is sent before the HTTP request names the site. SNI puts the name in the first handshake message.',
  },
  {
    q: 'How does Certificate Transparency protect a domain owner?',
    a: 'Every publicly trusted certificate must be logged publicly, and browsers reject unlogged ones. Owners can watch the logs and spot certificates issued for their names without their knowledge.',
  },
  {
    q: 'Why is certificate revocation considered weak?',
    a: 'Most clients continue if the revocation check fails, so an attacker can block it. OCSP leaks browsing to the CA, and many non-browser clients never check at all.',
  },
  {
    q: 'Why are certificate lifetimes getting shorter, and what does that force?',
    a: 'Short lifetimes limit how long a stolen key or bad certificate is useful, standing in for weak revocation. They make manual renewal impractical, so issuance and deployment must be automated.',
  },
  {
    q: 'Why is certificate pinning in a mobile app risky?',
    a: 'If the site rotates to a key or CA the app does not expect, every installed copy fails until users update. Pin to several keys including backups, or do not pin.',
  },
  {
    q: 'Why do large sites terminate TLS at the edge?',
    a: 'Handshake round trips go to a nearby server instead of a distant origin, the edge can cache and route on the decrypted request, and the origin is spared the handshake work.',
  },
  {
    q: 'How can a CDN terminate TLS without holding the site’s private key?',
    a: 'The key is only needed for the handshake signature. The edge sends that one operation to a key server the site owner runs, at the cost of an extra round trip per full handshake.',
  },
  {
    q: 'What does Encrypted Client Hello hide, and when does it actually help?',
    a: 'It encrypts the real ClientHello, including the site name, showing only a shared public name. It helps only when many sites share the same front, since a dedicated IP address still gives the site away.',
  },
]
