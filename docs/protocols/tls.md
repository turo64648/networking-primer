---
title: 5. TLS
---

<script setup>
import { cards } from './tls-review'
</script>

# 5. TLS

Almost every request a phone sends is encrypted, and <Term id="tls">Transport Layer Security (TLS)</Term> is
the protocol that does it. Interviewers care because TLS adds round trips to every new connection, and its
certificates cause some of the most avoidable outages in the industry.

::: info Before you start
- A **round trip** is the time for a message to reach the other side and a reply to come back. It ranges from
  a few milliseconds nearby to well over 100 ms across oceans or on a busy mobile network.
  [Chapter 1](/foundations/the-map) shows why round trips dominate latency.
- **TCP** sets up a connection with its own handshake, one round trip, before any data flows.
  [Chapter 3](/foundations/tcp-and-udp) covers it.
- The phone finds the server's address with **DNS** ([chapter 4](/protocols/dns)), then connects. TLS runs
  on top of that connection.

The chapter makes sense without them. Names and addresses in the examples are placeholders.
:::

## What TLS gives you

**In short:** TLS makes a connection private, tamper-proof, and authenticated: the phone knows it is talking
to the real site, not to someone in between.

Without encryption, anyone on the path can read and change traffic: the café Wi-Fi, the ISP, a compromised
router. HTTPS is plain HTTP carried inside a TLS connection, and the same goes for most other protocols today.

TLS provides three things:

- **Confidentiality.** Only the two ends can read the data.
- **Integrity.** Any change in transit is detected, and the connection fails.
- **Server authentication.** The server proves it owns the name the phone asked for. It does this with a
  <Term id="certificate">certificate</Term>, a signed document that ties the name to a public key.

The last one is the subtle part. Encryption alone is useless if you are encrypting to an attacker. Most of
this chapter's operational pain comes from certificates.

TLS 1.3, published in 2018, is the current version. TLS 1.2 (2008) is still widely supported, so you meet
both. Older versions are deprecated, and modern browsers refuse them.

## The TLS 1.3 handshake

**In short:** in one round trip, the two sides agree on a fresh secret key and the server proves its identity.
TLS 1.2 needed two round trips for the same job.

Before any request, the phone and the server run a **handshake**. It has two jobs: agree on encryption keys
that nobody on the path can learn, and prove the server is who it claims to be.

### Agreeing on a key in public

Both sides need the same secret key, but every message they exchange can be read by the network. They solve
this with a **key exchange**. Each side makes a fresh random key pair and sends the public half, its
**key share**. From its own private half and the other side's public half, each side computes the same shared
secret. An observer who sees both public halves cannot compute it.

The key pairs are thrown away after the connection. So even if someone records the traffic today and steals
the server's long-term private key next year, they cannot decrypt it. This property is
<Term id="forward-secrecy">forward secrecy</Term>, and TLS 1.3 always provides it.

### Proving who the server is

A key exchange alone would happily agree a key with an attacker in the middle. So the server also sends its
certificate, which says "this public key belongs to `www.example.com`", signed by a trusted authority.

Then the server signs a summary of the whole handshake so far with the private key that matches the
certificate. Only the real owner of that key can produce the signature. The phone checks it, and also checks
that the certificate is valid for the name it asked for (more on that below). Both sides finish with a
**Finished** message: a checksum over every handshake message, keyed with the new secret. If anyone changed
anything on the way, the checksums do not match and the connection stops.

### One round trip

<TlsHandshakeDiagram />

1. The phone sends a **ClientHello**: the TLS versions and encryption methods it supports, the site name it
   wants, and, new in 1.3, a key share for its best guess of the key exchange method.
2. The server replies with its own key share. From here on, everything is encrypted. In the same flight it
   sends its certificate, its signature over the handshake, and its Finished message.
3. The phone checks the certificate and signature, sends its Finished message, and sends its HTTP request
   right behind it.

So after the TCP handshake, TLS 1.3 costs **one round trip** before the request leaves. TLS 1.2 cost two,
because the phone waited for the server's choices before sending its key share. On a mobile link with a
100 ms round trip, a cold HTTPS connection over TCP takes about 200 ms with TLS 1.3 before the request is
sent, versus about 300 ms with TLS 1.2. DNS comes on top of that.

If the phone's guess was wrong, the server asks it to try again with a different method. That costs an extra
round trip. In practice clients guess right almost every time.

The handshake also settles which application protocol runs inside. The phone lists, say, HTTP/2 and
HTTP/1.1, and the server picks one. This is <Term id="alpn">Application-Layer Protocol Negotiation
(ALPN)</Term>, and it is how a client starts speaking HTTP/2 without an extra round trip
([chapter 6](/protocols/http)). <Term id="quic">QUIC</Term> folds this same handshake into its own connection
setup, saving the separate TCP round trip; [chapter 7](/protocols/quic) covers that.

::: details Going deeper: ciphers, math and compatibility
- **Key exchange** in TLS 1.3 is always ephemeral (EC)Diffie-Hellman. X25519 is the most common group.
  Since 2024, Chrome and Firefox also send a **hybrid post-quantum** key share (X25519 combined with ML-KEM,
  formerly Kyber) by default. That adds over a kilobyte to the ClientHello, so it no longer fits in one
  packet, which broke a few middleboxes that assumed it would.
- **Bulk encryption** uses only authenticated ciphers (AEADs): AES-GCM or ChaCha20-Poly1305. A 1.3 cipher
  suite name, such as `TLS_AES_128_GCM_SHA256`, names just the cipher and the hash. Key exchange and
  signature algorithm are negotiated separately.
- **What 1.3 removed:** RSA key exchange (no forward secrecy), static Diffie-Hellman, CBC-mode ciphers, RC4,
  compression and renegotiation. Each had been the root of a real attack against TLS 1.2 or earlier.
- **Middlebox compatibility.** Early TLS 1.3 drafts broke on firewalls that expected TLS 1.2. The final
  design disguises the handshake to look like TLS 1.2 session resumption, and puts the real version in an
  extension. This delayed the standard by about two years.
- **Downgrade protection.** A 1.3 server forced to speak 1.2 puts a fixed marker in its random value, which a
  1.3 client detects. The Finished checksums cover the version negotiation too.
- **"0.5-RTT" data:** the server may send data right after its Finished message, before hearing the
  client's. Rarely used for HTTP.
- Specifications: TLS 1.3 is RFC 8446 (2018). RFC 8996 (2021) formally deprecated TLS 1.0 and 1.1.
:::

### Try it: look at a handshake

`openssl s_client` connects and prints what was negotiated. `-servername` sends the site name (SNI, covered
below), which most servers need to pick the right certificate:

```text
$ openssl s_client -connect www.example.com:443 -servername www.example.com </dev/null
depth=2 C=US, O=Example Trust, CN=Example Root CA
depth=1 C=US, O=Example Trust, CN=Example Intermediate CA
depth=0 CN=www.example.com
---
Certificate chain
 0 s:CN=www.example.com
   i:C=US, O=Example Trust, CN=Example Intermediate CA
 1 s:C=US, O=Example Trust, CN=Example Intermediate CA
   i:C=US, O=Example Trust, CN=Example Root CA
---
New, TLSv1.3, Cipher is TLS_AES_256_GCM_SHA384
...
Verify return code: 0 (ok)
```

(Trimmed and illustrative.) What to look for:

- **Certificate chain**: what the server sent. `s:` is the subject (who the certificate is for), `i:` the
  issuer (who signed it). Each issuer should be the next line's subject.
- **`TLSv1.3`** and the cipher: what was negotiated.
- **`Verify return code: 0 (ok)`**: the chain checked out against your machine's trusted roots. Anything
  else, such as `unable to get local issuer certificate`, is a problem worth reading.

Add `-tls1_2` to test whether the server still accepts TLS 1.2. On macOS, the bundled `openssl` is LibreSSL;
the commands above work, but some newer options do not.

To see what the handshake costs, use `curl -w`. Both timers count from the start of the request:

```text
$ curl -so /dev/null -w 'tcp %{time_connect}s  tls %{time_appconnect}s  first byte %{time_starttransfer}s\n' https://www.example.com/
tcp 0.052s  tls 0.105s  first byte 0.161s
```

(Illustrative.) TLS took about 0.105 − 0.052 = 53 ms, roughly one round trip, as TLS 1.3 should. If it is
closer to two round trips, the server may be on TLS 1.2. If it is much more, look at slow signing on the
server, a far-away server, or certificate checks on the client. `curl -v` prints the negotiated version,
the ALPN choice and the certificate details in plain text.

## Resumption and 0-RTT

**In short:** a client that has talked to a server before can skip the certificate and signature, and can even
send its first request with no handshake round trip. That first request can be replayed by an attacker, so
only safe requests may use it.

The first handshake with a server does the expensive work: certificate checks and a signature. Phones
reconnect to the same sites all the time, so TLS lets them reuse that work.

### Session resumption

At the end of a handshake, the server can give the client a **session ticket**: an encrypted blob holding a
secret from this session. Next time, the client presents the ticket. The server decrypts it, recognises the
client, and skips the certificate and signature. This is <Term id="session-resumption">session
resumption</Term>. It still takes one round trip, but it is cheaper for both sides, and the server does no
signature.

In TLS 1.3, resumption normally includes a fresh key exchange as well, so it keeps forward secrecy.

The fleet behind a load balancer is where resumption breaks in production. The ticket is encrypted with a
**ticket key** held by the server. If the next connection lands on a different server with a different
ticket key, resumption silently fails and a full handshake happens. So large sites share ticket keys across
a fleet and rotate them often, typically every few hours to a day. A leaked ticket key lets an attacker
decrypt or impersonate resumed sessions, so ticket keys need the same care as private keys.

### 0-RTT: data in the first flight

TLS 1.3 goes one step further. With a ticket from a previous visit, the client can send its HTTP request
encrypted **inside its first message**, before the handshake finishes. The server can start working on it
immediately. This is <Term id="zero-rtt">0-RTT</Term> ("zero round trip time") or **early data**. On a phone
with a 100 ms round trip, it saves 100 ms on every reconnect.

The catch is **replay**. An attacker who records that first message can send a copy to the server again.
The early data is encrypted, so the attacker cannot read or change it, but the server may process it twice.
The normal handshake defends against this with fresh random values on both sides; early data arrives before
the server has contributed any.

So 0-RTT is safe only for requests that do no harm when repeated. Fetching a page or an image is fine. A
request that sends money, places an order or changes state is not. In HTTP terms, the request must be
**idempotent**, meaning that doing it twice has the same effect as doing it once, and ideally free of side
effects; [chapter 6](/protocols/http) explains idempotent methods.

In practice, servers and CDNs that accept 0-RTT usually allow it only for safe methods such as `GET`, and
many do not enable it at all. A proxy that receives early data and forwards it to an origin marks the request,
so the origin can refuse it and ask the client to retry after the handshake.

::: details Going deeper: tickets, PSKs and replay defences
- In TLS 1.3, a resumed session uses a **pre-shared key (PSK)** derived from the previous session. The server
  sends it in a `NewSessionTicket` message after the handshake. Tickets have a lifetime of at most 7 days.
- Resumption mode `psk_dhe_ke` adds a fresh key exchange and keeps forward secrecy. Early data is encrypted
  only with the PSK, so it does **not** have forward secrecy against a later ticket-key leak.
- Servers can limit replay with single-use tickets or a cache of recently seen ClientHellos, but this is hard
  across a fleet of servers in many locations. RFC 8446 says plainly that 0-RTT has no full replay protection.
- **RFC 8470 (2018)** defines HTTP rules for early data: a proxy adds `Early-Data: 1` when it forwards a
  request that arrived as early data, and a server can answer `425 Too Early` to make the client retry after
  the handshake.
- TLS 1.2 had two older resumption methods, session IDs (server-side cache) and session tickets. TLS 1.2
  tickets broke forward secrecy for as long as the ticket key lived.
:::

## Certificates and validation

**In short:** a certificate ties a site name to a public key, signed by a certificate authority. The phone
trusts it if it can follow signatures up to a root it already trusts, and the name and dates match.

### What a CA vouches for

A <Term id="certificate-authority">certificate authority (CA)</Term> is an organisation that browsers and
operating systems trust to sign certificates. Before signing one for `www.example.com`, a CA checks that the
requester **controls the domain**: for example, by asking them to put a token on the website or in DNS.

That is all most certificates prove. A **domain-validated** certificate says "whoever asked for this
controlled the domain at the time". It says nothing about whether the site is honest. A phishing site at
`examp1e-login.com` can get a valid certificate for that name. Some certificates add checks on the
organisation, but browsers stopped showing that difference in the address bar around 2019.

### Chains and trust stores

Phones and browsers ship with a list of trusted **root** certificates, the **trust store**. It holds on the
order of a hundred or more, and the exact list varies by platform. Roots are kept offline and rarely used. Instead, a root signs a few **intermediate**
certificates, and intermediates sign site certificates. The list from the site certificate up to a root is
the <Term id="certificate-chain">certificate chain</Term>.

<TlsChainDiagram />

The server must send its own certificate **and the intermediates**. The phone already has the root. A
classic production bug is a server that sends only its own certificate. Desktop browsers often still work,
because they have cached that intermediate from other sites or fetch it themselves. But `curl`, Java
services, mobile apps and many API clients fail with "unable to get local issuer certificate". The symptom
is "works in my browser, fails for some clients".

### What the phone checks

For each connection, the client checks that:

- each certificate in the chain is signed by the next, ending at a root in its trust store;
- the current time is inside each certificate's validity dates;
- the name it asked for is listed in the site certificate (wildcards such as `*.example.com` cover one level);
- the certificate is allowed to be used for a TLS server;
- the certificate was publicly logged (browsers only; see below), and, depending on the client, that it has
  not been revoked.

The name check uses the certificate's **Subject Alternative Name** list. The older "common name" field is
ignored by modern browsers, which still surprises people who generate their own certificates.

The date check depends on the phone's clock. A device with a badly wrong clock, such as a new device that
has not synced yet, sees every certificate as expired or not yet valid.

### Watching what CAs do

Any trusted CA can sign a certificate for any name. A CA that is hacked or careless can therefore issue a
certificate for your domain to someone else. Two defences exist:

- <Term id="certificate-transparency">Certificate Transparency (CT)</Term>: CAs must record every certificate
  in public, append-only logs. Chrome and Safari reject certificates that were not logged. Site owners can
  watch the logs for certificates issued for their names, for example with `crt.sh`.
- **CAA records** in DNS name the CAs allowed to issue for a domain. CAs must check them before issuing.

::: details Going deeper: certificate details
- Certificates use the **X.509** format. The fields you care about: subject, issuer, validity dates
  (`notBefore`, `notAfter`), Subject Alternative Names, public key, Extended Key Usage (`serverAuth`) and the
  CA's signature.
- Site certificates hold an RSA (2048-bit is common) or ECDSA P-256 key. ECDSA signatures are much cheaper
  for the server, which matters at high handshake rates. Many sites serve both and let the client choose.
- **Cross-signing**: a new root's intermediate can also be signed by an older, widely trusted root. Old
  devices follow the old path; new devices follow the new one. Let's Encrypt used this to launch; its expiry
  is a story below.
- Chrome has required Certificate Transparency for all new certificates since 2018. A certificate carries
  signed proofs (SCTs) from the logs, embedded by the CA.
- CAA is RFC 8659; CAs have been required to check it since 2017.
- Inspect a server's certificate:
  `openssl s_client -connect host:443 -servername host </dev/null 2>/dev/null | openssl x509 -noout -subject -issuer -dates`
:::

### SNI: one address, many sites

One IP address often serves thousands of sites: a CDN, a cloud load balancer, a shared host. The server must
pick the right certificate before it can send it. But the HTTP request, which names the site, comes after the
handshake.

So the ClientHello carries the name: <Term id="sni">Server Name Indication (SNI)</Term>. The server reads it
and picks the certificate. A client that sends no SNI, or the wrong one, gets the server's default
certificate, usually with a name mismatch. That is why `openssl s_client` needs `-servername`.

SNI is sent **in plain text**, because the encryption keys do not exist yet. Anyone on the path can see which
site you are connecting to, even though the rest is encrypted. Networks use this for filtering, parental
controls, analytics and censorship. Encrypted Client Hello, below, closes that gap.

## Running certificates in production

**In short:** certificates expire, and lifetimes are getting much shorter. Issue and renew them by machine,
monitor what is actually being served, and treat expiry as a known future outage.

### ACME and automation

For years, certificates lasted one to three years and were renewed by hand. Someone bought one, emailed
files, and pasted them into a load balancer. People forgot, and sites went down.

The <Term id="acme">ACME</Term> protocol (Automatic Certificate Management Environment) automates this.
Let's Encrypt, a free CA, created it and launched in 2015–2016. A small client on the server proves control
of the domain and fetches a certificate with no human involved:

- **HTTP challenge:** the CA asks the client to serve a token at a fixed URL on port 80 of the domain.
- **DNS challenge:** the client publishes a token in a DNS TXT record. This is the only way to get a wildcard
  certificate, and it works for servers that are not reachable from the internet.

Clients such as `certbot`, Caddy's built-in client and Kubernetes' cert-manager renew automatically, well
before expiry. Most cloud load balancers and CDNs now issue and renew certificates for you.

### Shorter lifetimes

Shorter lifetimes limit the damage from a stolen key or a wrong certificate, and they force automation.
The industry has moved fast:

- The CA/Browser Forum, where CAs and browser makers set the rules, passed **ballot SC-081** in April 2025.
  It cuts the maximum certificate lifetime from 398 days to **200 days** from 15 March 2026, **100 days**
  from 15 March 2027, and **47 days** from 15 March 2029. How long a CA may reuse an earlier domain check
  shrinks too, to 10 days by 2029.
- Let's Encrypt has issued 90-day certificates since its start. It announced in December 2025 that its default
  will drop to 45 days by February 2028, and it also offers six-day certificates (as of 2026).

As of late 2026, manual renewal is no longer realistic for public certificates. A 47-day certificate needs
renewing about eight times a year.

### Rotation without outages

Getting a new certificate is half the job. It must also reach every place that serves it: load balancers,
CDN configurations, edge servers in many locations, sidecars. Servers must reload it without dropping
connections. Common practice:

- **Renew early.** Renew when about a third of the lifetime remains, so there is time to notice failures.
- **Monitor from the outside.** Probe each public name and alert on what is actually served, not on what
  the certificate store says. Watch CT logs for unexpected certificates.
- **Inventory everything.** Internal services, APIs used by partners, and certificates inside devices or
  apps are the ones that expire unnoticed.

<Term id="certificate-pinning">Certificate pinning</Term> deserves a warning. Some mobile apps accept only a
specific certificate or key, to resist interception. If the site rotates to a new key or CA that the app did
not expect, every installed copy of the app breaks until users update it. Teams that pin usually pin to
several keys, including backups, rather than to a single site certificate, and many have stopped pinning.

### Revocation, and why it is fading

If a private key leaks before the certificate expires, the CA can **revoke** it. Clients learn this in two
ways:

- A <Term id="crl">certificate revocation list (CRL)</Term>: a signed list of revoked certificates that the CA
  publishes. Clients download it, which can be large.
- The <Term id="ocsp">Online Certificate Status Protocol (OCSP)</Term>: the client asks the CA about one
  certificate. This leaks to the CA which sites each user visits, and adds a network request to the handshake.
  **OCSP stapling** lets the server fetch the answer and attach it to the handshake instead.

In practice revocation has always been weak. If the check fails or times out, most clients carry on anyway,
because blocking would break sites whenever a CA's server is slow. An attacker who can intercept traffic can
often block the check as well. Browsers instead push their own compact lists of important revocations to
users. Many non-browser clients, including `curl` and most TLS libraries, do not check revocation by default.

The industry is moving away from OCSP. A 2023 CA/Browser Forum ballot made CRLs mandatory and OCSP optional.
Let's Encrypt, which issues a large share of the web's certificates, turned off its OCSP service on
6 August 2025, citing privacy, and now publishes only CRLs. Short lifetimes are the other half of the answer:
a stolen key for a six-week certificate is useful for at most six weeks.

::: details Going deeper: ACME details
- ACME is RFC 8555 (2019). A third challenge type, **TLS-ALPN-01**, proves control during a TLS handshake on
  port 443, which suits load balancers.
- **ACME Renewal Information (ARI)**, RFC 9773 (2025), lets the CA tell clients when to renew. A CA can then
  spread out renewals, or ask everyone to renew early before a mass revocation. Let's Encrypt recommends it
  for the move to shorter lifetimes.
- CAs must sometimes revoke many certificates within days because of a CA-side mistake. That is why renewal
  must be possible at any time, not only on a schedule.
- Let's Encrypt's schedule (announced December 2025): 45-day certificates on an opt-in profile from May 2026,
  64 days by default from February 2027, 45 days by default from February 2028.
:::

## Terminating TLS at the edge

**In short:** large sites end the user's TLS connection at a server near the user, not at the origin. That
server holds the certificate and, normally, the private key; keyless designs move the signing elsewhere.

Ending a TLS connection is called <Term id="tls-termination">TLS termination</Term>. Big sites terminate at an
edge server or <Term id="cdn">CDN</Term> location close to the user, for three reasons:

- **Latency.** The handshake round trips go to a server 10 ms away instead of an origin 150 ms away.
- **Seeing the request.** Caching, routing and filtering need the decrypted HTTP request.
- **Offloading work.** The origin does not pay for handshakes with millions of phones.

The edge then sends the request on to the origin over a separate connection. That hop is usually encrypted
too, often with <Term id="mtls">mutual TLS (mTLS)</Term>, where the edge also presents a certificate, so the
origin accepts only traffic from its own edge. [Chapter 14](/backend/edge-to-origin) covers that hop, and
[chapter 12](/edge/l7-proxies) covers how proxies handle the decrypted traffic.

The cost: the edge sees all user data in plain text, and it holds the site's private key. For a company using
a third-party CDN, that means handing the key to another company and to every server in its network.

### Keyless or remote signing

Look again at the handshake. The private key is used for exactly one thing: the server's signature over the
handshake. Everything else uses keys made fresh for the session.

So the signature can be done somewhere else. The edge runs the handshake, and when it needs the signature it
sends the data to a **key server** that the site owner controls. The key server signs and returns the result.
The private key never leaves the owner's infrastructure. The edge still sees the decrypted traffic, so this
protects the key, not the data.

The cost is one extra round trip from the edge to the key server on each full handshake. Resumed sessions
need no signature, so the extra cost lands only on new clients.

::: details Going deeper: Keyless SSL and delegated credentials
- **Cloudflare's Keyless SSL**, described in its September 2014 blog posts, is a well-known example. The
  edge sends the private-key operation to a key server run by the customer, over a long-lived authenticated
  connection, and uses session resumption to keep the number of remote operations down.
- The same idea runs inside single companies. A company can keep keys in a hardware security module (HSM) or
  a few guarded key servers, and let edge servers in less trusted locations request signatures.
- **Delegated credentials** (RFC 9345, 2023) offer another approach. The certificate's key signs a
  short-lived credential, valid for hours to days, that the edge uses instead. A stolen credential soon
  expires, and no remote call is needed per handshake. Clients must support the extension.
:::

## Encrypted Client Hello

**In short:** ECH encrypts the ClientHello, including the site name, so the network sees only that you are
connecting to a shared front, such as a CDN. Networks that filter by site name lose that ability.

Even with encrypted DNS ([chapter 4](/protocols/dns)), the site name leaks in the plain-text SNI. <Term id="ech">Encrypted
Client Hello (ECH)</Term> fixes this.

The site's provider publishes a public key in the site's <Term id="https-record">HTTPS DNS record</Term>. The
phone fetches it along with the address. It then sends two ClientHellos, one inside the other:

- The **outer** ClientHello is in plain text and names a generic **public name** shared by many sites, such
  as the CDN's own name.
- The **inner** ClientHello is encrypted with that public key. It holds the real site name and the rest of the
  sensitive details.

The provider's server decrypts the inner one and carries on the handshake for the real site. If the keys do
not match, for example after a key rotation, the server sends the current keys and the client retries.

ECH only hides something when many sites share the same front. A site on its own IP address gains little:
the address gives it away. So ECH matters most on large CDNs and cloud providers. It also depends on the
DNS lookup being private, usually through DNS over HTTPS, or the network learns the name from DNS instead.

### What it changes for networks

Networks that relied on SNI lose it:

- **Filtering and parental controls** by site name stop working for ECH traffic. They can still block by IP
  address or public name, which affects every site behind that front.
- **Enterprise security tools** that log or filter by SNI lose visibility. Companies usually manage this on
  their own devices, for example by browser policy or by running their own resolver, rather than on the wire.
- **Censorship.** Some national networks have blocked ECH connections outright. Clients then fall back or
  fail.

This mirrors the DoH story in chapter 4: privacy for users means less visibility and control for network
operators, and the decision moves from the network to the client and the provider.

::: details Going deeper: ECH status
- ECH was published as **RFC 9849** in March 2026, with a companion RFC 9848 for publishing its keys in DNS
  HTTPS records. Drafts had been deployed for years before that.
- Chrome and Firefox shipped ECH support in 2023, and Cloudflare enabled it for many of its customers the same
  year. Support in other clients and servers varies; OpenSSL added it in 2026.
- ECH replaced an earlier design, Encrypted SNI (ESNI), which encrypted only the name and was abandoned.
- Clients with no ECH key send a fake ("GREASE") ECH extension, so that real ECH traffic does not stand out
  and middleboxes do not grow to depend on its absence.
:::

## Why this matters in real systems

**Cold connections are expensive on phones.** A first request on a new connection pays DNS, TCP and TLS
before any HTTP happens. On a 100 ms mobile round trip, that is several hundred milliseconds. Apps and
browsers keep connections open and reuse them, warm them up at startup, and rely on resumption. Terminating
TLS at a nearby edge cuts the cost of each round trip ([chapter 1](/foundations/the-map)).

**Handshakes cost CPU at scale.** A full handshake costs the server a signature, which is far more work than
encrypting a request. A burst of reconnections, after a deploy or a network blip, can saturate edge CPU. Sites
use ECDSA keys, resumption with shared ticket keys across the fleet, and connection reuse to keep the rate of
full handshakes down.

**Load balancers and resumption interact.** If ticket keys differ between servers, resumption works only when
a client lands on the same server again. Sites sharing a hostname across many edge locations distribute ticket
keys to all of them and rotate them on a schedule.

**Internal traffic is encrypted too.** Service meshes give every service a certificate and use mTLS between
services ([chapter 16](/backend/reaching-the-service)). These certificates often live for hours or days,
issued by an internal CA, which only works because issuance is fully automated.

**ML serving and APIs see TLS in their latency.** A client that opens a new connection per API call pays the
handshake every time. Connection pooling in the client often removes tens of milliseconds per request.

**How to look at it:**

```bash
openssl s_client -connect host:443 -servername host </dev/null            # chain, version, cipher
openssl s_client -connect host:443 -servername host </dev/null 2>/dev/null \
  | openssl x509 -noout -dates                                            # expiry dates
curl -sv -o /dev/null https://host/ 2>&1 | grep -E 'SSL|TLS|ALPN|expire'  # what curl negotiated
curl -so /dev/null -w 'tls done %{time_appconnect}s\n' https://host/      # handshake time
```

## Where it breaks

**Ericsson and O2, 2018: an expired certificate in the mobile core.** On 6 December 2018, an expired
certificate in two versions of Ericsson's mobile core software made the equipment stop working. O2 in the UK
lost 4G data for millions of customers for most of a day, and operators in other countries, including SoftBank
in Japan, were hit too. **Lesson:** certificates embedded in products expire as surely as website ones, and
someone has to own them.
([Computer Weekly, 2018](https://www.computerweekly.com/news/252454067/O2-outage-highlights-importance-of-software-certificate-audits))

**Microsoft Teams, 2020: a forgotten authentication certificate.** On 3 February 2020, Teams was unavailable for
about three hours. Microsoft's stated root cause was an expired authentication certificate. It said it would
review its certificate deployment and provisioning procedures. **Lesson:** even companies with heavy
automation have certificates outside it; inventory and external monitoring catch them.
([TechCrunch, 2020](https://techcrunch.com/2020/02/03/microsoft-teams-has-been-down-this-morning/))

**Let's Encrypt, 2021: an old root expires for old clients.** On 30 September 2021, the older root that
Let's Encrypt had used for cross-signing, DST Root CA X3, expired as planned. Modern devices already trusted
Let's Encrypt's own root and noticed nothing. But old systems, embedded devices and some older OpenSSL-based
clients still followed the expired path and rejected certificates for many sites. **Lesson:** trust stores on
clients you do not control age, and a root expiry breaks the oldest clients first.
([Let's Encrypt, 2021](https://letsencrypt.org/docs/dst-root-ca-x3-expiration-september-2021/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Walk me through a TLS 1.3 handshake.
After the TCP handshake, the client sends a ClientHello: supported versions and ciphers, the site name (SNI),
the application protocols it speaks (ALPN), and a key share for its preferred key exchange. The server replies
with its key share. Both sides can now compute a shared secret, so the rest is encrypted. In the same flight the
server sends its certificate, a signature over the handshake with its private key, and a Finished checksum.
The client checks the chain, the name and the signature, sends its Finished, and sends its request. One round
trip.

**Senior add-on:** the key pairs are ephemeral, so there is forward secrecy. The signature over the transcript
binds the key exchange to the certificate, which is what stops a man in the middle. A wrong key-share guess
costs an extra round trip. QUIC uses the same handshake inside its own transport.
:::

::: details 2. Why is TLS 1.3 faster than 1.2, and what does a cold HTTPS connection cost a phone?
In TLS 1.2 the client waited for the server's choices before sending its key share, so the handshake took two
round trips. In 1.3 the client guesses and sends a key share up front, so it takes one.

A cold connection over TCP with TLS 1.3 needs about two round trips before the request goes out (TCP, then
TLS), plus the DNS lookup. At 100 ms per round trip on mobile, that is roughly 200 ms, versus 300 ms with
TLS 1.2.

**Senior add-on:** resumption makes the repeat handshake cheaper for the server, and 0-RTT removes the TLS round
trip for safe requests. QUIC removes the separate TCP round trip. Terminating at a nearby edge shrinks each
round trip itself, which often matters more than any protocol change.
:::

::: details 3. What is 0-RTT? When would you turn it on, and for what?
A returning client can send its first request inside the ClientHello, using a key from a previous session.
It saves a full round trip on reconnects. But an attacker can record that first message and replay it, and the
server may process it twice.

So I would accept early data only for requests that are safe to repeat: `GET` requests for pages or assets,
with no side effects. Anything that changes state waits for the full handshake.

**Senior add-on:** if a proxy forwards early data, it marks the request (`Early-Data: 1`) so the origin can
answer `425 Too Early`. Replay caches help but are hard to make reliable across many locations. Early data
also lacks forward secrecy against a ticket-key leak.
:::

::: details 4. Some clients fail with "unable to get local issuer certificate", but the site works in Chrome. How do you find out why?
Run `openssl s_client -connect host:443 -servername host` and read the certificate chain. The most likely
cause is that the server sends only its own certificate and not the intermediate. Chrome may have the
intermediate cached or fetch it, so it works there; `curl`, Java and mobile clients do not.

Other causes to check: the client's trust store is old and lacks the root (old Android or embedded devices,
an old Java runtime), the client sends no SNI and gets a default certificate, or a corporate proxy is
replacing certificates.

**Senior add-on:** check every server and edge location, since only some may be misconfigured. Fix by serving
the full chain (the "fullchain" file ACME clients produce), and add a chain check to external monitoring.
:::

::: details 5. What does a certificate authority actually vouch for?
For most certificates, only that the requester controlled the domain when the certificate was issued. It does
not say the site is trustworthy. A phishing site can get a valid certificate for its own lookalike name.

**Senior add-on:** the real risk is a CA issuing a certificate for your domain to someone else. Certificate
Transparency makes every issuance public, so you can monitor the logs, and CAA records limit which CAs may
issue for your domain.
:::

::: details 6. Design certificate management for a company with thousands of domains and services.
Automate issuance and renewal with ACME everywhere possible: DNS challenges for wildcards and internal
names, managed certificates on cloud load balancers and CDNs. Keep an inventory of every certificate, where it
is deployed, and who owns it. Renew when a third of the lifetime remains. Deploy with hot reload, so a
rotation drops no connections.

Monitor from outside: probe every public endpoint, alert on certificates expiring within a couple of weeks,
and check the full chain. Watch CT logs for certificates you did not request. Use an internal CA, with short
lifetimes, for service-to-service mTLS.

**Senior add-on:** plan for lifetimes falling to 47 days by 2029 and for mass revocation events, which need
renewal on demand (ARI helps). Keep private keys in few places, using HSMs or remote signing at the edge.
Do not pin a single certificate in mobile apps. Hunt for the non-obvious ones: partner APIs, devices, and
certificates embedded in software.
:::

::: details 7. How does certificate revocation work, and why do people say it is broken?
A CA can revoke a certificate if its key leaks. Clients learn this from a CRL, a list they download, or from
OCSP, a live query about one certificate, optionally stapled to the handshake by the server.

It is weak because most clients soft-fail: if the check fails, they continue, so an attacker can block it.
OCSP also leaks browsing to the CA and slows handshakes. Many non-browser clients never check at all.

**Senior add-on:** the industry is moving to CRLs pushed by browsers plus short lifetimes. CRLs became mandatory
and OCSP optional in 2023, Let's Encrypt shut down OCSP in August 2025, and maximum lifetimes are falling to
47 days by 2029.
:::

::: details 8. A bank wants a CDN for its website, but will not give the CDN its private key. How can that work?
Use keyless or remote signing. The CDN's edge runs the TLS handshake, but sends the one operation that needs
the private key, the handshake signature, to a key server run by the bank. The key never leaves the bank.

The cost is an extra round trip from edge to key server on each full handshake. Resumed sessions skip it.

**Senior add-on:** the CDN still sees decrypted traffic, so this protects the key, not the data. Delegated
credentials are an alternative: a short-lived credential signed by the bank's key, used by the edge with no
per-handshake call. Cloudflare described Keyless SSL in 2014 as one example.
:::

::: details 9. What does SNI reveal, what does ECH change, and what does that mean for a corporate network?
SNI puts the site name in plain text in the ClientHello, so the network sees which site you visit even
though the content is encrypted. ECH encrypts the real ClientHello, including the name, and shows only a
shared public name, such as the CDN's.

A corporate network that filters or logs by SNI loses that for ECH traffic. It can still see IP addresses and
the public name, and it can control its own devices: browser policy, its own DNS resolver, or a managed proxy.

**Senior add-on:** ECH only helps when many sites share a front; the IP address still identifies a site on its
own address. It depends on private DNS to fetch the key, usually DoH. It became RFC 9849 in March 2026.
:::

::: details 10. After a deploy, edge CPU spikes and p99 latency rises, but traffic volume is the same. What do you check?
Check the rate of full handshakes compared with resumed ones. A deploy that restarts servers drops connections,
so every client reconnects at once, and each full handshake costs a signature. If the deploy also changed or
lost the session ticket keys, resumption fails everywhere and every reconnect pays full price.

Look at TLS metrics on the edge (handshakes per second, resumption ratio), and at CPU in signing.

**Senior add-on:** drain connections gradually during deploys, keep ticket keys shared and stable across
restarts, prefer ECDSA certificates, and spread reconnects with jitter. Connection draining is covered in
[chapter 11](/edge/l4-load-balancing).
:::

## Common misconceptions

- **"HTTPS means the site is safe."** It means the connection is private and goes to whoever controls that
  domain name. Phishing sites have valid certificates too.
- **"TLS hides which site I visit."** Without ECH, the site name is in plain text in SNI, and DNS and IP
  addresses leak it too.
- **"Revoking a certificate stops it working everywhere."** Many clients do not check revocation, or soft-fail.
  Short lifetimes are the real limit.
- **"0-RTT is a free speed-up."** Early data can be replayed. It is safe only for requests that can be repeated.
- **"The server sends the root certificate."** The client already has roots. The server must send the
  intermediates, and forgetting them breaks non-browser clients.
- **"Encryption is the slow part."** Bulk encryption is cheap on modern CPUs. The cost is in round trips and in
  full-handshake signatures.

## Key takeaways

- TLS 1.3 agrees a fresh key and authenticates the server in **one round trip**, versus two for TLS 1.2, with
  forward secrecy always on.
- **Resumption** saves server work; **0-RTT** saves a round trip but can be replayed, so use it only for safe,
  idempotent requests.
- A certificate proves **domain control**, checked along a chain to a trusted root. Servers must send the
  intermediates.
- Lifetimes are falling to **47 days by 2029** and OCSP is fading, so automate issuance and monitor what is
  served.
- Large sites terminate TLS at the **edge**; keyless signing keeps the private key at home, and ECH hides the
  site name from the network.

## Review

<Flashcards id="tls" :cards="cards" />

<MarkDone id="tls" />

## Sources

- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446) (RFC, 2018)
- [RFC 8470: Using Early Data in HTTP](https://www.rfc-editor.org/rfc/rfc8470) (RFC, 2018)
- [RFC 8555: Automatic Certificate Management Environment (ACME)](https://www.rfc-editor.org/rfc/rfc8555) (RFC, 2019)
- [RFC 9773: ACME Renewal Information (ARI) Extension](https://www.rfc-editor.org/rfc/rfc9773) (RFC, 2025)
- [RFC 9345: Delegated Credentials for TLS and DTLS](https://www.rfc-editor.org/rfc/rfc9345) (RFC, 2023)
- [RFC 9849: TLS Encrypted Client Hello](https://www.rfc-editor.org/rfc/rfc9849) (RFC, 2026)
- [RFC 6962: Certificate Transparency](https://www.rfc-editor.org/rfc/rfc6962) (RFC, 2013)
- [CA/Browser Forum Ballot SC-081v3: Introduce schedule of reducing validity and data reuse periods](https://cabforum.org/2025/04/11/ballot-sc081v3-introduce-schedule-of-reducing-validity-and-data-reuse-periods/) (industry standard, 2025)
- [Let's Encrypt: OCSP Service Has Reached End of Life](https://letsencrypt.org/2025/08/06/ocsp-service-has-reached-end-of-life) (documentation, 2025)
- [Let's Encrypt: Decreasing Certificate Lifetimes to 45 Days](https://letsencrypt.org/2025/12/02/from-90-to-45) (documentation, 2025)
- [Keyless SSL: The Nitty Gritty Technical Details](https://blog.cloudflare.com/keyless-ssl-the-nitty-gritty-technical-details/) (Cloudflare engineering blog, 2014)
- [O2 outage highlights importance of software certificate audits](https://www.computerweekly.com/news/252454067/O2-outage-highlights-importance-of-software-certificate-audits) (news, 2018)
- [Microsoft Teams has been down this morning](https://techcrunch.com/2020/02/03/microsoft-teams-has-been-down-this-morning/) (news, 2020)
- [Let's Encrypt: DST Root CA X3 Expiration (September 2021)](https://letsencrypt.org/docs/dst-root-ca-x3-expiration-september-2021/) (documentation, 2021)
