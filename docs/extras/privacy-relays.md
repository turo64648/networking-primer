---
title: "E2. Privacy Relays & VPNs"
---

<script setup>
import { cards } from './privacy-relays-review'
</script>

# E2. Privacy Relays & VPNs

A VPN or a privacy relay puts one or two extra machines between a phone and a website, so the website no
longer sees the user's real address. Interviewers ask about them because they change the path, the packet
size and the source address, and many systems quietly depend on all three.

::: info Before you start
A website normally sees the public address of the user's network, and uses it to guess location, pick a
nearby site and count requests. QUIC is a transport that runs over UDP and carries TLS inside it
([chapter on QUIC](/protocols/quic)). Steering picks the site each user reaches ([steering](/edge/steering)),
and carrier NAT already makes many users share one address ([last mile](/internet/last-mile)).
:::

## What a VPN changes on the path

**In short:** a VPN wraps every packet inside another packet and sends it to a VPN server. The website sees
the server's address and location, every packet loses some room to the wrapper, and the path gets longer.

Picture a phone in Berlin with a VPN app connected to a server in Amsterdam. The phone opens a page on
`example.com`. Its operating system hands the packet to the VPN app instead of the Wi-Fi card. The app
encrypts the whole packet, puts it inside a new UDP packet addressed to Amsterdam, and sends that. Putting one
packet inside another is called <Term id="encapsulation">encapsulation</Term>, and the result is a
**tunnel**. A **<Term id="vpn">virtual private network (VPN)</Term>** is this tunnel between a device and a
server, plus the software that routes traffic into it.

The Amsterdam server unwraps the packet and sends it on to `example.com` from its own address. That address
is the **<Term id="egress-ip">egress address</Term>**: where traffic leaves the relay system for the open
internet. Three things change for everyone downstream:

- **Who the site sees.** The website sees Amsterdam's egress address, not the phone's. The phone's network
  (the café Wi-Fi, the ISP) sees only encrypted packets to the VPN server. It cannot see which sites are
  visited, though it can see sizes and timing.
- **Where the site thinks the user is.** Location databases map addresses to places. The user now "is" in
  Amsterdam, or wherever the provider says its addresses are.
- **The path.** Traffic goes Berlin → Amsterdam → wherever `example.com`'s nearest site is for Amsterdam.
  If the VPN server is far away, every round trip grows by the detour.

### Packet size: the MTU overhead

Every link has a largest packet it carries, the <Term id="mtu">maximum transmission unit (MTU)</Term>. It is
1,500 bytes on most Ethernet and Wi-Fi paths. The tunnel adds its own headers (outer IP, UDP, the VPN's
header and the encryption tag) to each packet. So the inner packet must be smaller, typically by 60 to
100 bytes.

The VPN app usually sets a smaller MTU on its virtual interface, so the operating system builds smaller
packets. Problems start when something on the path lowers the MTU further, such as a PPPoE home link or a
mobile carrier's own tunnel. Large packets are then dropped. If the "too big" error messages are filtered,
<Term id="pmtud">path MTU discovery</Term> never learns the right size. The classic symptom: the TLS
handshake or small pages work, but large downloads or uploads hang. VPNs often use
<Term id="mss-clamping">MSS clamping</Term>, rewriting TCP's maximum segment size so connections never send
oversized packets.

QUIC has its own twist. It requires paths to carry UDP packets of at least 1,200 bytes. A tunnel that leaves
less room than that breaks QUIC outright, and the browser falls back to TCP.

::: details Going deeper: tunnel types and numbers
- **WireGuard** adds 60 bytes over IPv4 and 80 over IPv6, and its tools default to an MTU of 1,420 so the
  tunnel fits inside a 1,500-byte path in both cases.
- **IPsec** (ESP in UDP) overhead depends on the cipher and mode; 50–80 bytes is a common range.
- **OpenVPN** can run over UDP or TCP. Running a TCP connection inside a TCP tunnel stacks two sets of
  retransmission timers, which behaves badly on lossy links ("TCP meltdown").
- **Full tunnel vs split tunnel.** A full tunnel sends all traffic through the VPN. A split tunnel sends only
  some (for example a company's private ranges). Company VPNs often use split tunnels to keep video calls off
  the VPN concentrator.
:::

### Try it: see the tunnel

```bash
ip link show                       # Linux: look for wg0 or tun0 with "mtu 1420" or similar
ip route get 1.1.1.1               # which interface would carry this packet?
curl -s https://ifconfig.me; echo  # the address websites see (your egress address)
ping -M do -s 1400 example.com     # Linux: don't fragment; lower -s until it works
```

With the VPN on, `curl` prints the VPN server's address, and `ip route get` names the tunnel interface. On
macOS, use `ifconfig` and `route get`, and `ping -D -s 1400`. Output differs by VPN product.

## Two-hop privacy relays

**In short:** a single VPN server sees both who you are and where you go, so you must trust its operator
completely. A two-hop relay splits that knowledge between two operators. The first knows who but not where;
the second knows where but not who.

A one-hop VPN moves trust; it does not remove it. The VPN provider sees the user's real address and the
address of every site they visit. If it logs, is hacked or is ordered to hand over records, both halves are
in one place.

A **<Term id="privacy-relay">two-hop privacy relay</Term>** uses two relays run by different companies:

1. The phone connects to an **ingress relay** (the first hop). The ingress sees the phone's real address. It
   does not see the destination name, because the phone sends that inside a second encrypted layer.
2. Through that, the phone opens a tunnel to an **egress relay** (the second hop). The egress learns the
   destination and connects to it, but it sees only the ingress relay's address, not the user's.
3. The website sees the egress relay's address. TLS between the phone and the website still runs end to end,
   so neither relay sees the page contents.

<RelayTwoHopDiagram />

The guarantee holds only if the two operators do not combine their logs. Splitting them across two companies
makes that collusion a business and legal decision, not a single bug. It is the same idea as Tor's three
hops, with fewer hops, fast commercial servers, and no attempt to hide from an adversary watching both sides.

::: details Going deeper: what each party still sees
- The **user's network** sees encrypted traffic to the ingress relay, with its sizes and timing.
- The **ingress** sees the user's address, the egress it picked, and traffic volumes.
- The **egress** sees destination names and addresses, and traffic volumes, but not the user's address.
- An observer who sees both the user's link and the egress's link can try to match flows by timing. Two-hop
  relays do not defend against that.
:::

## MASQUE: tunnels made of HTTP

**In short:** modern relays build their tunnels out of ordinary HTTP over QUIC. To the network, relay
traffic looks like a normal HTTPS connection to a web server, and one connection carries many tunnels.

Old VPN protocols have their own packet formats. Firewalls can spot them and block them, and many networks
do. The IETF's **<Term id="masque">MASQUE</Term>** work instead reuses HTTP. The relay is an HTTP proxy, and
the phone asks it to open a tunnel with an ordinary HTTP request.

HTTP has had a way to ask a proxy for a tunnel for decades: the `CONNECT` method. The client sends
`CONNECT example.com:443`, the proxy opens a TCP connection to that address, and from then on it copies
bytes both ways. MASQUE extends this in two directions:

- **Over QUIC.** The phone talks to the relay over HTTP/3, so one QUIC connection to the relay carries many
  tunnels as separate streams. A lost packet on one tunnel does not stall the others.
- **UDP, not only TCP.** Plain `CONNECT` tunnels a byte stream. **<Term id="connect-udp">CONNECT-UDP</Term>**
  (RFC 9298) asks the proxy to forward UDP datagrams instead. That lets the phone run QUIC to the website
  *through* the relay, so the website still gets HTTP/3.

Two-hop works by nesting. The phone opens a QUIC connection to the ingress. Inside it, it sends a
CONNECT-UDP request to reach the egress. Through that tunnel, it opens a second QUIC connection, directly to
the egress. Inside that one, it asks for a tunnel to `example.com`. The ingress sees only an encrypted QUIC
connection to the egress, so it never learns the destination.

The nesting costs packet size. Each QUIC layer adds its own headers, which is why relay designs care about
the 1,200-byte minimum. Most relays also have a fallback over HTTP/2 and TCP for networks that block UDP.

::: details Going deeper: the RFCs
- **HTTP Datagrams and the Capsule Protocol** (RFC 9297, 2022) let an HTTP request carry unreliable
  datagrams. On HTTP/3 they ride in QUIC DATAGRAM frames, so lost packets are not retransmitted twice.
- **CONNECT-UDP** (RFC 9298, 2022) uses an "extended CONNECT" request with a URI template naming the target
  host and port.
- **CONNECT-IP** (RFC 9484, 2023) tunnels whole IP packets, which makes a full VPN out of HTTP.
- MASQUE stands for "Multiplexed Application Substrate over QUIC Encryption".
:::

## Oblivious HTTP: one request, no connection

**In short:** Oblivious HTTP hides the client's address for single requests, without a tunnel. The client
encrypts each request to the server's public key and sends it through a relay. The relay sees who but not
what; the server sees what but not who.

Some services want to receive data without learning who sent it. Examples are crash reports, telemetry,
safe-browsing lookups and DNS queries. A full tunnel per request would be slow and heavy. **<Term
id="oblivious-http">Oblivious HTTP (OHTTP)</Term>** (RFC 9458, 2024) does it with one encrypted message:

1. The client fetches the target's public key configuration ahead of time.
2. It encrypts the whole HTTP request (method, path, headers, body) to that key, and POSTs the blob to a
   **relay** run by another party.
3. The relay strips the client's address and forwards the blob to a **gateway** in front of the target. The
   gateway decrypts it, passes it to the target, and encrypts the response back.

There is no TLS session or cookie that links one request to the next. The trade-off: OHTTP suits small,
independent requests. It does not suit browsing, long streams or anything that needs a login session, since
a session cookie would tell the server who you are anyway.

::: details Going deeper: OHTTP details
- Encryption uses Hybrid Public Key Encryption (HPKE, RFC 9180). Requests use a compact binary HTTP encoding
  (RFC 9292).
- **Oblivious DNS over HTTPS** (RFC 9230, 2022, experimental) applies the same split to DNS lookups.
- The relay can still rate-limit by client address, and the gateway can only rate-limit what it decrypts.
  That split is a real operational problem for abuse handling.
:::

## Effects on website operators

**In short:** behind a relay, the client address stops meaning "this user" and "this place". Location is
coarser, many users share an egress address, and the address lists must be kept up to date.

### Geolocation and steering

Websites use the client address, or the DNS resolver's address, to pick a nearby site and to choose
language, currency, content rights and ads. Behind a relay, both point at the egress. If the egress is near
the user, little changes. If a VPN user in Berlin exits in Amsterdam, they are served as a Dutch user from
the Amsterdam site. That is correct for that path, since their packets do go through Amsterdam.

Well-built relays help by placing egress close to the user and **publishing** where each egress range is
meant to serve. Publishing uses a <Term id="geofeed">geofeed</Term>: a simple file mapping address ranges
to country, region and city. Location database vendors read these feeds. Relays usually let users pick
a coarse location ("same country and time zone") rather than an exact city, so city-level targeting gets
worse by design.

DNS-based steering has the same problem in another form. If the relay also resolves DNS near the egress,
<Term id="geodns">location-aware DNS</Term> answers for the egress's location, which matches where the
traffic exits. Steering based on <Term id="ecs">EDNS Client Subnet</Term> sees the relay's subnet, not the
user's.

### Rate limiting and abuse handling

Many abuse systems treat an IP address as a rough user identity: N login attempts per address per minute,
block lists of bad addresses, extra checks for "unusual" addresses. Relays break this in two ways:

- **Many users per address.** One egress address may carry thousands of users, much like
  <Term id="cgnat">carrier-grade NAT</Term>. A per-address <Term id="rate-limiting">rate limit</Term> tuned
  for one household then throttles many innocent users.
- **One user, many addresses.** A user's next connection may leave from a different egress address. Blocking
  one address does not stop an abuser.

The common responses: rate-limit egress ranges with higher limits, key limits on accounts or sessions
instead of addresses, and use signals other than the address. One newer signal is **<Term
id="privacy-pass">Privacy Pass</Term>**-style tokens: a trusted party (for example the device vendor)
attests that the client passed a check, without telling the site who the user is. Blocking all relay
traffic is possible but blunt, since relay users are mostly ordinary paying customers.

### Egress address lists

Operators who want to treat relay traffic specially need to know which addresses are relays. Privacy relays
built for the mainstream usually publish their egress ranges, often as a geofeed. Commercial VPNs mostly do
not, and threat-intelligence vendors sell lists built by observation.

Published lists change. Treat them as data you fetch on a schedule, not a constant in code. A stale list
mislabels new egress addresses as ordinary residential users, or old ones as relays.

::: details Going deeper: reading the real client address
- Behind a relay, `X-Forwarded-For` from the relay is not available: the egress connects to the site as a
  normal client and does not add the user's address. That is the point.
- Do not trust any client-supplied header for location or identity. Use the connecting address, your own
  geolocation lookup, and the published lists.
- Logs keyed by IP address undercount distinct users behind relays and overcount single users who rotate.
:::

## Why this matters in real systems

- **iCloud Private Relay.** Apple announced it in 2021 as part of iCloud+. Apple's 2021 overview describes
  two hops: an ingress relay run by Apple, and egress relays run by third-party content providers. It uses
  QUIC-based MASQUE proxying with a fallback over TCP, covers Safari and DNS plus some unencrypted app
  traffic, and offers a coarse location option. Apple publishes the egress ranges as a geofeed-style list
  for operators.
- **Fallback and blocking.** Apple's guidance (2021 onward) tells network operators how to signal that the
  relay should not be used on their network, through DNS. Enterprise and school networks use it to keep
  their filtering working.
- **Company VPNs.** Many companies route employees through a VPN concentrator. Every remote user then shares
  a handful of egress addresses, and SaaS vendors see the whole company as one location, which surprises
  per-address rate limits.
- **OHTTP for telemetry.** Browser and OS vendors have described sending some telemetry or lookups through
  OHTTP relays (for example Cloudflare's Privacy Gateway, announced in 2022), so the receiving service never
  sees user addresses.

## Where it breaks

- **TunnelCrack (2023).** Researchers showed that many VPN clients send traffic outside the tunnel when an
  attacker controls the local network, for example by making the VPN server's address look "local". Lesson:
  a VPN's protection depends on the client's routing rules, not only on its encryption.
  [TunnelCrack](https://tunnelcrack.mathyvanhoef.com/)
- **TunnelVision (2024, CVE-2024-3661).** A hostile DHCP server can push routes (DHCP option 121) more
  specific than the VPN's, steering traffic around the tunnel on most operating systems except Android.
  Lesson: longest-prefix routing beats a VPN's default route, so the client must lock its routes or use a
  firewall. [Leviathan Security write-up](https://www.leviathansecurity.com/blog/tunnelvision)

## Interview questions

::: details 1. What does a VPN change for the user, their network, and the website?
The user's packets are wrapped and sent to the VPN server, which forwards them from its own address. The
local network sees only encrypted traffic to that server. The website sees the server's address, so it
thinks the user is where the server is. Packets get smaller and round trips may get longer.

**Senior add-on:** the VPN provider now sees everything the local network used to see, so trust moved
rather than disappeared. The MTU drop and longer path show up as hangs on large transfers and slower
handshakes.
:::

::: details 2. Users on a VPN say small pages load but large uploads hang. How do you find out why?
Suspect packet size. The tunnel lowers the usable MTU. If something on the path lowers it further and drops
the "too big" messages, large packets vanish while small ones get through. Test with `ping -M do -s <size>`
to find the largest size that passes, and compare with the tunnel's MTU.

**Senior add-on:** fix by lowering the tunnel MTU, clamping TCP's MSS at the VPN gateway, or allowing the
ICMP "packet too big" messages. QUIC needs 1,200-byte UDP payloads, so a too-small tunnel MTU also forces
fallback to TCP.
:::

::: details 3. Explain how a two-hop privacy relay protects the user. What does it not protect against?
The first relay sees the user's address but not the destination, because the request to the second relay is
encrypted inside. The second relay sees the destination but only the first relay's address. TLS to the site
still runs end to end, so neither sees content. No single operator can link user and destination.

**Senior add-on:** it fails if the two operators collude, if an observer can correlate timing on both sides,
or if the user logs in, since the site then knows exactly who they are. It hides the network address, not
the identity.
:::

::: details 4. What are MASQUE and CONNECT-UDP, and why build a relay on HTTP/3?
MASQUE builds tunnels out of HTTP requests. A client asks an HTTP proxy to open a tunnel with `CONNECT`, and
CONNECT-UDP (RFC 9298) does the same for UDP datagrams. Over HTTP/3, one QUIC connection carries many
independent tunnels.

**Senior add-on:** relay traffic looks like normal HTTPS, so it is hard to block without collateral damage;
streams avoid head-of-line blocking; QUIC's connection migration keeps the tunnel up when the phone switches
networks; and UDP proxying lets the user still speak HTTP/3 to the site. Cost: nested headers and more CPU.
:::

::: details 5. Design rate limiting for a login endpoint that many relay users hit.
Do not rely on the address alone. Identify relay and VPN egress addresses from published lists and give them
higher per-address limits. Key the main limits on the account and the device or session, and add a
challenge only when behaviour looks bad.

**Senior add-on:** add attestation tokens such as Privacy Pass so relay users can prove they are not bots
without revealing who they are. Refresh egress lists on a schedule. Watch per-egress error rates so one
noisy address does not lock out everyone behind it.
:::

::: details 6. Users of a privacy relay say your site shows the wrong country and serves them from a far region. What do you check?
Check which egress address they arrive from and what your location database says about it. Compare with the
relay's published geofeed. A stale database or a missing feed is the usual cause. Then check which address
your DNS steering saw: the relay's resolver, possibly without client subnet.

**Senior add-on:** subscribe to the relay's feed and refresh it, and prefer steering by measured latency
from the egress rather than by database location. Remember that serving from near the egress is correct for
the path, even if the user is elsewhere.
:::

::: details 7. When would you use Oblivious HTTP instead of a relay tunnel?
For small, independent requests where the server must not learn the sender: telemetry, crash reports, safe
lookups, DNS. Each request is encrypted to the server and passed through a relay, with no connection to
link requests together.

**Senior add-on:** OHTTP fails for anything needing a session, since a cookie or login re-identifies the
user. Abuse control splits awkwardly: the relay can limit by address but cannot see content, and the
gateway sees content but not addresses.
:::

## Common misconceptions

- **"A VPN makes me anonymous."** It hides your address from sites and your network, but the VPN provider
  sees everything, and logins, cookies and fingerprinting still identify you.
- **"A privacy relay can read my traffic."** Not HTTPS traffic: TLS runs end to end between the device and
  the site. The relays see addresses, names and volumes.
- **"An IP address is a user."** It never was, because of NAT. Behind relays, one address is many users and
  one user is many addresses.
- **"Relay users are in the wrong place."** They are where their packets exit. Serving them from near the
  egress is usually the fastest choice.
- **"Encapsulation is free."** Every tunnel layer takes bytes from each packet and can break large transfers
  if path MTU discovery fails.

## Key takeaways

- A VPN encapsulates packets and exits from its own address: new egress location, smaller packets, longer
  path, and all trust moved to the VPN operator.
- Two-hop relays split knowledge: the ingress knows who but not where, the egress knows where but not who.
- MASQUE builds relays out of HTTP/3: `CONNECT` for TCP, CONNECT-UDP (RFC 9298) for UDP and QUIC.
- Oblivious HTTP (RFC 9458) hides the sender of single requests without a tunnel.
- Operators should use published egress lists and geofeeds, and stop treating an IP address as a user.

## Review

<Flashcards id="privacy-relays" :cards="cards" />

<MarkDone id="privacy-relays" />

## Sources

- [RFC 9298: Proxying UDP in HTTP](https://www.rfc-editor.org/rfc/rfc9298) — RFC, 2022.
- [RFC 9297: HTTP Datagrams and the Capsule Protocol](https://www.rfc-editor.org/rfc/rfc9297) — RFC, 2022.
- [RFC 9484: Proxying IP in HTTP](https://www.rfc-editor.org/rfc/rfc9484) — RFC, 2023.
- [RFC 9458: Oblivious HTTP](https://www.rfc-editor.org/rfc/rfc9458) — RFC, 2024.
- [RFC 8805: A Format for Self-Published IP Geolocation Feeds](https://www.rfc-editor.org/rfc/rfc8805) — RFC, 2020.
- [RFC 9576: The Privacy Pass Architecture](https://www.rfc-editor.org/rfc/rfc9576) — RFC, 2024.
- [iCloud Private Relay Overview](https://www.apple.com/privacy/docs/iCloud_Private_Relay_Overview_Dec2021.PDF) — documentation (Apple), 2021.
- [Prepare your network or web server for iCloud Private Relay](https://support.apple.com/en-us/102602) — documentation (Apple), 2021 onward.
- [WireGuard: Next Generation Kernel Network Tunnel](https://www.wireguard.com/papers/wireguard.pdf) — paper, 2017.
- [TunnelCrack: Widespread design flaws in VPN apps](https://tunnelcrack.mathyvanhoef.com/) — research, 2023.
- [TunnelVision (CVE-2024-3661)](https://www.leviathansecurity.com/blog/tunnelvision) — security research blog, 2024.
