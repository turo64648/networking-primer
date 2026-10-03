---
title: "7. QUIC & HTTP/3"
---

<script setup>
import { cards } from './quic-review'
</script>

# 7. QUIC & HTTP/3

<Term id="quic">QUIC</Term> is a transport protocol that does TCP's job and TLS's job together, in a program
running on top of UDP. <Term id="http3">HTTP/3</Term> is HTTP carried over it. Interviewers like it because it
packs a decade of lessons about handshakes, head-of-line blocking, mobile networks and middleboxes into one
design, with real costs attached.

::: info Before you start
- **TCP** gives a reliable, ordered byte stream and needs a handshake before any data.
  **UDP** sends single messages with no setup and no guarantees. [Chapter 3](/foundations/tcp-and-udp)
  covers both.
- **TLS 1.3** encrypts a connection after one round trip of its own handshake, and can resume a past session
  faster. [Chapter 5](/protocols/tls) covers it.
- **HTTP/2** sends many requests at once over one TCP connection. [Chapter 6](/protocols/http) covers it.

The chapter makes sense without them. Addresses and names in the examples are placeholders.
:::

## Why a new transport, and why on UDP

**In short:** TCP is built into every operating system and inspected by every middlebox, so it cannot change
quickly. QUIC moves the transport into the application, on top of UDP, and encrypts nearly everything so the
network cannot freeze it again.

By the early 2010s, a page load over HTTPS on a phone looked like this. A <Term id="tcp">TCP</Term> handshake
took one round trip. A <Term id="tls">TLS</Term> handshake took one or two more. Only then could the first
request leave. On a mobile network, each <Term id="rtt">round trip (RTT)</Term> is tens of milliseconds, often
more. And once the connection was up, a single lost packet stalled every request on it.

Fixing this inside TCP was possible on paper. In practice it was very slow, for two reasons:

- **TCP lives in the operating system kernel.** A change ships only when phones, laptops and servers update
  their OS. Many phones never get that update.
- **Middleboxes inspect TCP.** Firewalls, <Term id="nat">NATs</Term> and traffic shapers read and sometimes
  rewrite TCP headers. Devices that inspect or change traffic like this are called
  <Term id="middlebox">middleboxes</Term>. Many drop packets that look unfamiliar, so new TCP options often
  fail on real paths.

The second problem has a name: <Term id="protocol-ossification">protocol ossification</Term>. The protocol
is "frozen" by what the network expects it to look like. <Term id="tcp-fast-open">TCP Fast Open</Term>, which
lets data ride on the first handshake packet, is the classic example: middleboxes broke it often enough that
it never became widely used on the open internet.

QUIC avoids both problems:

- It runs in the application or a user-space library, so a browser or server update ships a new version.
- It sits on <Term id="udp">UDP</Term>, which every network already passes (with exceptions, covered later).
  A brand-new IP protocol number would be dropped by most firewalls and NATs.
- It encrypts almost the whole packet, including most of its own header. Middleboxes cannot depend on what
  they cannot read, so the protocol can keep changing.

UDP adds only port numbers and a checksum. Everything else, reliability, ordering, congestion control and
encryption, is QUIC's own work.

::: details Going deeper: history and standards
- Google built the first version ("gQUIC") from about 2012 and served it from its own servers to Chrome and
  its apps. Google's 2017 SIGCOMM paper estimated QUIC was then about 7% of internet traffic.
- The IETF redesigned it and published QUIC version 1 in 2021: RFC 9000 (transport), RFC 9001 (how TLS is
  used), RFC 9002 (loss detection and congestion control) and RFC 8999 (the parts that must never change
  between versions). HTTP/3 is RFC 9114 (2022).
- QUIC version 2 (RFC 9369, 2023) changes almost nothing functionally. It exists partly to keep the version
  mechanism in use, so middleboxes do not come to expect version 1 forever.
- All major browsers support HTTP/3, and large CDNs offer it (as of 2025). Usage shares change quickly; check
  a current source such as Cloudflare Radar rather than trusting a number in a book.
:::

## The combined handshake

**In short:** QUIC carries the TLS 1.3 handshake inside its own first packets. A new connection is ready
after one round trip instead of two, and a resumed one can send data immediately.

Over TCP, the transport and the encryption are set up one after the other. First the
<Term id="three-way-handshake">three-way handshake</Term> opens the TCP connection. Then TLS 1.3 runs its own
round trip on top. The first HTTP request leaves after **two** round trips (three with TLS 1.2).

QUIC does both at once. The phone's first packet already contains the TLS "ClientHello" message. The
server's reply contains the rest of the server side of the TLS handshake. The phone finishes the handshake
and sends its request in the same flight:

<QuicHandshakeDiagram />

1. **Phone → server:** a QUIC "Initial" packet carrying the TLS ClientHello: supported ciphers, a key share,
   and the protocol it wants (`h3`, chosen with <Term id="alpn">ALPN</Term>, as in chapter 5).
2. **Server → phone:** the ServerHello, the certificate and the server's Finished message. From here both
   sides have keys.
3. **Phone → server:** the phone's Finished message and the first HTTP request, together.

That saves one round trip on every new connection: tens of milliseconds on a good mobile network, hundreds on
a poor or distant one. For a user on another continent, it is often the single biggest gain.

### Resuming with 0-RTT

If the phone talked to this server recently, it can resume the TLS session
(<Term id="session-resumption">session resumption</Term>, chapter 5). With resumption, QUIC can send the request
in the very first flight, before any reply. This is <Term id="zero-rtt">0-RTT</Term>.

The catch is the same as in TLS: 0-RTT data can be **replayed**. Someone who copies the first flight can send
it to the server again, and the server cannot always tell. So clients send only safe, repeatable requests
(such as a `GET`) as 0-RTT. Servers can refuse it, or answer `425 Too Early` to make the client retry after the
handshake. [Chapter 5](/protocols/tls) covers replay in detail.

### Not becoming a DDoS weapon

UDP has no handshake, so anyone can send a packet with a forged source address. If a small packet made the
server send back a large reply (certificates are several kilobytes), attackers could aim servers at a victim.
That is an **amplification attack**.

QUIC has two defences:

- The phone must pad its first packet to at least 1200 bytes. That makes the attacker pay for their bytes.
- Until the server knows the address is real, it sends at most three times the bytes it has received. This is
  the <Term id="amplification-limit">amplification limit</Term>. A large certificate chain can hit it, and then
  the handshake waits an extra round trip. Keeping certificate chains small avoids that.

Under attack, a server can also reply with a **Retry** packet carrying a token. The phone must echo the token,
which proves it owns its address. That costs one extra round trip, so servers use it only when needed. It
plays the same role as SYN cookies in TCP.

::: details Going deeper: packets and keys
- QUIC uses the TLS 1.3 handshake messages but not TLS's record format. TLS hands QUIC the keys, and QUIC
  encrypts its own packets (RFC 9001).
- Handshake packets use a **long header** that includes the version and both connection IDs. After the
  handshake, packets use a **short header**: a few flag bits, the destination connection ID, and an encrypted
  packet number.
- "Initial" packets are encrypted with keys anyone can derive from values in the packet. That stops
  middleboxes reading them by accident, but it is not secrecy. Real protection starts with the next keys.
- Each side sends its QUIC settings, such as flow-control limits and idle timeout, as a TLS extension
  ("transport parameters"). They are protected by the handshake, so nobody on the path can change them.
- Post-quantum key shares make the ClientHello larger than one 1200-byte packet, so it spans two Initial
  packets. Servers and load balancers must handle a ClientHello that arrives in pieces.
:::

## Streams without head-of-line blocking

**In short:** one TCP connection is a single ordered byte stream, so one lost packet stalls every HTTP/2
request on it. QUIC carries many independent streams, and a loss delays only the streams whose data was in the
lost packet.

HTTP/2 sends many requests and responses over one TCP connection, interleaved. To HTTP/2 they are separate.
To TCP they are one long sequence of bytes, and TCP must hand bytes to the application strictly in order.

Now lose one packet. The bytes after it have arrived, but TCP holds all of them back until the lost packet is
resent, about one round trip later. Every response waits, including ones whose data is complete. This is
<Term id="head-of-line-blocking">head-of-line blocking</Term> at the transport layer
([chapter 3](/foundations/tcp-and-udp)). On a lossy mobile link, it can make HTTP/2 slower than several
separate HTTP/1.1 connections.

QUIC moves streams into the transport. A <Term id="quic-stream">QUIC stream</Term> is an ordered, reliable flow
of bytes, and one connection carries many of them. Every chunk of data in a packet is labelled with its stream
and its position in that stream. So when a packet is lost, QUIC still delivers every other stream's data:

<QuicStreamsDiagram />

HTTP/3 puts each request and its response on its own stream. A lost packet now delays the one response it
belonged to, not the whole page.

### What is still blocked

QUIC removes blocking **between** streams, not all blocking:

- **Inside one stream, order still matters.** A large download on one stream still waits for its own lost
  packet.
- **Header compression can link streams.** HTTP/2's header compression (HPACK) assumes headers arrive in order.
  HTTP/3 replaces it with <Term id="qpack">QPACK</Term>, which lets the sender avoid references that could make
  one stream wait for another. Servers and clients choose how much blocking risk to accept for better
  compression.
- **Bandwidth is still shared.** All streams share one congestion window, so a loss still slows the whole
  connection's sending rate. Only the delivery order is decoupled.

### Reliability and congestion control

QUIC does the same jobs as TCP, with some fixes learned from TCP's history:

- **Every packet gets a new number**, even when it carries resent data. TCP reuses sequence numbers for
  resends, so when an acknowledgement arrives, the sender cannot tell whether it is for the original or the
  resend. QUIC never has that ambiguity, so its round-trip measurements are cleaner.
- **Acknowledgements are richer.** They can list many ranges of received packets, while TCP's
  <Term id="sack">selective acknowledgement</Term> option has room for only a few. They also report how long the
  receiver waited before acknowledging.
- **<Term id="flow-control">Flow control</Term> works per stream and per connection.** The receiver limits how
  much each stream, and the connection as a whole, may send ahead. It also limits how many streams the peer
  may open.
- **<Term id="congestion-control">Congestion control</Term> uses the same algorithms** as TCP, such as CUBIC and
  BBR (chapter 3). The difference is where it runs: in the application, so a team can change or tune it with a
  normal release.

That last point cuts both ways. A bug in a user-space congestion controller ships with the app, and there are
many QUIC implementations, each with its own bugs.

::: details Going deeper: HTTP/3 on top of streams
- Stream IDs encode who opened the stream (client or server) and whether it is bidirectional or
  unidirectional. Each HTTP/3 request uses one client-opened bidirectional stream.
- HTTP/3 also opens unidirectional streams: one control stream per side (settings, `GOAWAY`) and two for QPACK
  (encoder and decoder updates).
- `GOAWAY` tells the peer "finish what you have, start nothing new here". Servers send it before a deploy or
  shutdown, the same pattern as in HTTP/2 ([chapter 12](/edge/l7-proxies)).
- HTTP/2's priority tree was dropped. Both versions can use the simpler **Extensible Priorities** scheme
  (RFC 9218, 2022): an `urgency` level and an `incremental` flag. Server push exists in the HTTP/3 spec but is
  rarely used; Chrome removed push for HTTP/2 in 2022.
- QUIC can also carry **unreliable datagrams** (RFC 9221): messages that are encrypted and congestion
  controlled but never resent. They are used to tunnel UDP and IP traffic (MASQUE, see the
  [privacy relays extra](/extras/privacy-relays)) and by WebTransport.
:::

## Connection IDs and migration

**In short:** TCP names a connection by addresses and ports, so a phone that changes network loses it. QUIC
names a connection by an ID inside each packet, so it can survive an address change.

A TCP connection is identified by its <Term id="four-tuple">four-tuple</Term>: source address, source port,
destination address, destination port. If any of them changes, it is a different connection as far as the
server is concerned.

Phones change addresses all the time. They walk out of Wi-Fi range onto cellular. A NAT forgets an idle
mapping and gives the next packet a new port; this is called **NAT rebinding**. In both cases every TCP
connection dies, and the app must reconnect and redo both handshakes.

QUIC packets carry a <Term id="connection-id">connection ID</Term>. Each side picks the IDs it wants to
receive, and the other side writes them into the packets it sends. The server looks up the connection by
that ID, not by the four-tuple. So when the address changes, the server still knows which connection the packet
belongs to:

<QuicMigrationDiagram />

Moving a live connection to a new path is called <Term id="connection-migration">connection migration</Term>.
It works like this:

1. The phone starts sending from its new address.
2. The server notices the new path. Before sending much there, it **validates** the path: it sends a random
   challenge, and the phone must echo it back. This stops an attacker redirecting traffic to a victim's address.
3. Both sides restart congestion control for the new path, because its capacity is unknown.

NAT rebinding is handled the same way, and the phone may not even know it happened.

### Limits in practice

- **Only the client migrates.** A server cannot move a connection to a new address of its own (apart from one
  "preferred address" offered during the handshake). Servers can also tell clients not to migrate at all.
- **Privacy needs fresh IDs.** If the phone kept the same connection ID on the new network, an observer could
  link the two paths to one user. So the server hands out spare IDs in advance, and the phone switches to an
  unused one when it moves.
- **Clients must choose to do it.** Libraries and operating systems differ in whether they migrate on network
  changes or open a new connection. Many apps still treat a network change as "reconnect".

### Why load balancers care

A large site has many servers behind one address. A layer-4 load balancer usually picks a server by hashing the
four-tuple, so the same connection always reaches the same server. After a migration or NAT rebinding, the
four-tuple changes. The hash then picks a different server, which has never heard of the connection.

Connection IDs fix this too. The server chooses the IDs the client will use, so it can encode its own identity
in them. A load balancer that understands the format reads the ID and routes to the right server, whatever the
address. The client's very first packet uses a random ID it made up, so the balancer must hash that one
consistently until the server's own IDs take over. How this is built is
[chapter 11](/edge/l4-load-balancing)'s subject.

::: details Going deeper: IDs and resets
- In QUIC version 1, a connection ID is 0 to 20 bytes. A client that never migrates may ask for a zero-length
  ID, which saves bytes.
- New IDs are sent with `NEW_CONNECTION_ID` frames; path checks use `PATH_CHALLENGE` and `PATH_RESPONSE`.
- If a server loses state (a crash, or a packet routed to the wrong machine), it cannot decrypt the packet.
  It can send a **stateless reset**: a packet ending in a secret token the client received earlier. The client
  then knows the connection is gone and reconnects, instead of waiting for a timeout.
- The IETF's QUIC-LB work describes a standard way to encode server identity into connection IDs for load
  balancers.
:::

## Discovery and fallback

**In short:** a client cannot assume a site speaks QUIC, and cannot assume UDP works on the current network. It
learns about HTTP/3 from a header or a DNS record, tries it, and falls back to TCP if it fails.

TCP on port 443 works almost everywhere. QUIC uses UDP port 443, which usually works but sometimes does not.
So every client keeps TCP as the safe path and treats QUIC as an upgrade.

### How the client learns the site supports HTTP/3

**The Alt-Svc header.** The first time, the browser connects over TCP. The response includes an
<Term id="alt-svc">Alt-Svc</Term> header:

```text
alt-svc: h3=":443"; ma=86400
```

It means "this site also speaks HTTP/3 on UDP port 443; remember this for 86,400 seconds (one day)". The browser
caches it and tries QUIC on its next connection. The first visit cannot benefit.

**The HTTPS DNS record.** The <Term id="https-record">HTTPS record</Term> ([chapter 4](/protocols/dns)) can say
`alpn="h3,h2"`. The browser asks for it alongside the addresses, so it can try QUIC on the very first
connection.

Both carry a lifetime, like a DNS TTL. That matters when you want to turn HTTP/3 **off**. Clients keep trying
QUIC until their cached hint expires, so shorten `ma` or the record's TTL before a planned shutdown.

### Racing and remembering

A client that tries QUIC first and waits for a timeout before trying TCP would make users on blocked networks
wait seconds. So clients race:

- Start the QUIC handshake. If it has not completed after a short delay, start TCP as well. Use whichever
  finishes first. Google's 2017 paper describes Chrome delaying TCP by up to 300 ms; current values vary by
  browser and version.
- Remember failures. If QUIC fails on this network, mark it broken for a while and go straight to TCP.

This is the same idea as <Term id="happy-eyeballs">Happy Eyeballs</Term>, which races IPv6 against IPv4.
[Chapter 8](/internet/last-mile) covers it; newer versions of the Happy Eyeballs guidance include QUIC in the
race.

### Where UDP does not work

- **Blocked on purpose.** Many company networks block UDP 443. They want all web traffic to pass through a
  proxy that decrypts and inspects TCP connections, and QUIC would bypass it. Browsers also have management
  policies to switch QUIC off.
- **Rate-limited.** UDP is the usual vehicle for amplification floods, so some networks cap UDP traffic. A
  capped path does not fail cleanly. It loses packets at busy times, and QUIC looks slow rather than broken.
- **Short NAT timeouts.** NATs and firewalls often forget idle UDP mappings faster than TCP ones, sometimes in
  tens of seconds. QUIC connections that sit idle may need keep-alive packets, which cost battery on phones.
- **Small packets only.** QUIC needs paths that carry 1200-byte UDP packets without fragmenting. On a path
  that cannot (some tunnels), the handshake fails.

Clean blocking is easy: QUIC never connects and the race picks TCP. **Partial** breakage is the dangerous case.
If the handshake succeeds and later packets vanish, the client has already committed to QUIC and sees a hang.
The Google firewall story below is exactly this.

::: details Going deeper: numbers from Google's deployment
- In November 2016 YouTube data, 95.3% of clients that tried QUIC used it successfully. 4.4% could not, mostly
  on corporate networks. Google wrote that it had not seen an entire ISP block QUIC or UDP.
- About 0.3% of users were on networks that seemed to rate-limit UDP, down from 1% in June 2015. Google
  disabled QUIC for those networks and asked their operators to raise the limits.
- These numbers are from one company, years ago. Blocking rates differ a lot between countries, mobile
  carriers and enterprises. Measure your own users.
:::

### Try it: see HTTP/3 in action

Check whether a site advertises HTTP/3, and whether your network lets it through:

```text
$ curl -sI https://www.example.com | grep -i alt-svc
alt-svc: h3=":443"; ma=86400

$ curl --http3 -s -o /dev/null -w '%{http_version} connect=%{time_connect} tls=%{time_appconnect}\n' https://www.example.com
3 connect=0.031 tls=0.031

$ curl --http2 -s -o /dev/null -w '%{http_version} connect=%{time_connect} tls=%{time_appconnect}\n' https://www.example.com
2 connect=0.030 tls=0.062
```

(Illustrative; your numbers will differ.) What to look for:

- The `alt-svc` header shows the server advertises HTTP/3.
- `--http3` needs a curl built with HTTP/3 support; check for `HTTP3` in `curl -V`. `--http3` falls back to
  TCP if QUIC fails, while `--http3-only` does not, which makes it a quick test of whether UDP 443 works here.
- Over TCP, the TLS time (`time_appconnect`) is about one round trip after the TCP connect. Over QUIC, both
  finish together, because they are one handshake.

Other tools:

```bash
dig www.example.com HTTPS                     # look for alpn="h3,..."
sudo tcpdump -ni any udp port 443 -c 20       # QUIC packets: you see sizes and timing, not contents
ss -uanp | grep 443                           # UDP sockets on 443 (with -p, needs root for other users' processes)
```

In a browser, the developer tools' Network panel has a Protocol column; `h3` means HTTP/3. To read QUIC
packets in Wireshark, run curl or the browser with `SSLKEYLOGFILE=/tmp/keys.log` set, and load that file into
Wireshark: it then decrypts the traffic.

## The costs

**In short:** QUIC costs more CPU than kernel TCP, depends on UDP getting through, and is harder to observe. Its
gains are largest on lossy, high-latency mobile links and smallest on fast, clean ones.

### CPU

Kernel TCP has had decades of optimisation. Network cards split large TCP sends into packets and merge received
packets in hardware. The kernel can even do TLS encryption, or hand it to the card. QUIC gets far less of this:

- It runs in user space, so packets cross the kernel boundary in system calls, often one per packet in naive
  code. The [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers that path.
- It encrypts every packet itself, including its header.
- Its acknowledgements are generated and processed by the application, not the kernel.

Google's 2017 paper reported that its QUIC servers first used about 3.5 times the CPU of TLS over TCP for the
same traffic, and about twice after optimisation. A 2024 lab study found that on links above roughly 500 Mbps,
Chrome downloaded noticeably slower over HTTP/3 than over HTTP/2, mostly because of the receiver's processing
cost. Both numbers are tied to specific implementations and years. The direction is consistent: QUIC trades CPU
for latency.

Mitigations exist and keep improving: batching system calls, letting the kernel and network card split one
large UDP send into many packets (generic segmentation offload) and merge received ones, and kernel bypass for
the largest deployments.

### Network and operations

- **Fallback is permanent.** You must run TCP and TLS alongside QUIC indefinitely, with the same content and
  behaviour. Two stacks means two sets of bugs, metrics and capacity plans.
- **Less visibility.** Tools that read TCP headers to measure round trips and loss see only encrypted UDP. An
  optional "spin bit" lets passive observers estimate round-trip time, but endpoints may turn it off. Debugging
  moves to endpoint logs, such as the structured **qlog** format many QUIC libraries emit.
- **DDoS defence changes.** Filters built around TCP handshakes do not apply. Operators rely on the
  amplification limit, Retry tokens, and rate limits on new connections per source.

::: details Going deeper: offloads and kernel details
- Linux added UDP generic segmentation offload (GSO) in kernel 4.18 (2018), and UDP receive offload (GRO) later.
  `sendmmsg` and `recvmmsg` batch several packets per system call. Some network cards also offload UDP
  segmentation in hardware.
- Pacing (spreading packets over time instead of sending bursts) matters more for QUIC. User-space code must
  time it itself, or use kernel features such as the `fq` queueing discipline with per-packet send times.
- Google's 2017 paper lists the three big CPU costs as cryptography, sending and receiving UDP packets, and
  maintaining connection state.
:::

## Why this matters in real systems

**The gain depends on the network.** Google's 2017 paper reported that QUIC cut Google Search latency by 8.0% on
desktop and 3.6% on mobile, and YouTube rebuffering by 18.0% on desktop and 15.3% on mobile. The largest gains
were for users with high round-trip times and loss. On a fast office link, users may see little difference. If
you roll out HTTP/3, measure by network type and region, not just the global average.

**Most deployments terminate QUIC at the edge.** A CDN or edge proxy speaks HTTP/3 to the phone, where round
trips and loss are worst. Behind it, the hop to the origin usually uses HTTP/1.1 or HTTP/2 over long-lived TCP
connections ([chapter 14](/backend/edge-to-origin)). Inside datacenters, where loss is rare and round trips are
short, TCP remains the default (as of 2025).

**Capacity planning has to include CPU.** Moving a large share of traffic from TCP to QUIC can raise edge CPU
use noticeably. Teams usually enable it gradually and watch CPU per request alongside latency.

**Mobile apps benefit most from migration and fast setup.** An app that opens connections often, on flaky
networks, saves a round trip each time and can survive Wi-Fi to cellular switches. Client libraries such as
Google's Cronet (Chrome's network stack, packaged for apps) and Apple's networking frameworks support HTTP/3.

**Deploys and load balancing need care.** A load balancer that hashes the four-tuple breaks QUIC connections
after NAT rebinding. Draining a server needs `GOAWAY` and enough time for clients to move. Chapters
[11](/edge/l4-load-balancing) and [12](/edge/l7-proxies) cover both.

## Where it breaks

**Google, 2016: a one-bit change met a firewall.** In October 2016, Google changed one bit in the visible flags
of gQUIC's packet header. One brand of firewall had been blocking QUIC by matching that field, so clients behind
it had always fallen back to TCP cleanly. After the change, the firewall let the first packets through and
blocked later ones. Clients started QUIC, then hit a black hole the fallback logic did not catch. Google reverted
the change and the vendor updated its classifier. **Lesson:** partial blocking is worse than full blocking, and
any visible header field will be ossified by someone; encrypt what you can.
([Langley et al., SIGCOMM 2017](https://research.google/pubs/the-quic-transport-protocol-design-and-internet-scale-deployment/))

**Cloudflare, 2025: broadcast addresses broke the amplification limit.** Researchers reported that one QUIC
Initial packet sent to a broadcast address in Cloudflare's ranges reached every worker process on a machine,
through a Linux routing detail combined with shared UDP sockets (`SO_REUSEPORT`). On a 128-core machine, one
packet could trigger about 384 replies, far above QUIC's three-times limit. Cloudflare removed the broadcast
routes. **Lesson:** the protocol's limits hold per connection; your socket and routing setup can still multiply
them. ([Cloudflare, 2025](https://blog.cloudflare.com/mitigating-broadcast-address-attack/))

**Cloudflare, 2025: acknowledgements for packets never sent.** A researcher found that Cloudflare's QUIC library,
quiche, did not check acknowledgements carefully. A client could acknowledge packets the server had not sent yet,
or guess future packet numbers, and trick congestion control into sending far faster than the path allowed.
Cloudflare added strict checks and randomly skips packet numbers, so guessing fails. It reported no customer
impact. **Lesson:** user-space transports must re-learn defences that kernel TCP stacks added years ago.
([Cloudflare, 2025](https://blog.cloudflare.com/defending-quic-from-acknowledgement-based-ddos-attacks/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Why is QUIC built on UDP instead of being a new protocol or an improved TCP?
TCP lives in operating system kernels, so changes take years to reach users, and many devices never update.
Middleboxes also inspect TCP and drop packets with unfamiliar options, which blocked earlier improvements such
as TCP Fast Open. A new IP protocol would be dropped by most firewalls and NATs.

UDP passes almost everywhere and adds almost nothing, so QUIC can implement everything itself in user space and
ship with the browser or app.

**Senior add-on:** QUIC also encrypts nearly all of its header so middleboxes cannot ossify it, and greases
fields and versions to keep them changeable. The price is CPU cost, dependence on UDP reachability, and a
permanent TCP fallback.
:::

::: details 2. Walk through a new HTTPS connection over TCP and over QUIC. How many round trips before the request?
Over TCP with TLS 1.3: one round trip for the TCP handshake, one for TLS, then the request. Two round trips
(three with TLS 1.2), plus DNS before all of it.

Over QUIC: the first packet carries the TLS ClientHello. The server answers with the rest of its handshake. The
client sends Finished and the request together. One round trip. On resumption, 0-RTT lets the request go in the
first packet.

**Senior add-on:** 0-RTT data can be replayed, so only safe requests use it and servers may reject it or answer
`425 Too Early`. The server's first reply is limited to three times the client's bytes until the address is
validated, so a large certificate chain can add a round trip. A Retry under attack adds one too.
:::

::: details 3. How does HTTP/3 fix the head-of-line blocking that HTTP/2 has? What blocking remains?
HTTP/2 multiplexes requests over one TCP connection, but TCP delivers one ordered byte stream. A lost packet
holds back every response until it is resent. QUIC carries separate streams, each ordered on its own. HTTP/3
puts each request on its own stream, so a loss delays only the response it belonged to.

What remains: order inside one stream, a shared congestion window, and possible coupling through header
compression.

**Senior add-on:** QPACK avoids HPACK's in-order assumption by letting the encoder decide whether to risk a
blocking reference, limited by a "blocked streams" setting from the decoder. Under heavy loss, all streams still
slow down because congestion control is per connection.
:::

::: details 4. A user's phone switches from Wi-Fi to cellular in the middle of a download. What happens over TCP and over QUIC?
Over TCP, the phone's address changes, so the four-tuple changes and the connection is gone. The app must notice,
reconnect, redo TCP and TLS handshakes, and resume the download if the server supports ranges.

Over QUIC, the phone keeps sending on the same connection from the new address. The server finds the connection
by its connection ID, checks the new path with a challenge, and carries on. Congestion control restarts for the
new path.

**Senior add-on:** the phone switches to a fresh connection ID so observers cannot link the two paths. The
server's load balancer must route by connection ID, or the packets land on a server without the connection's
state. Many clients still open a new connection anyway; migration depends on the client library.
:::

::: details 5. Design the rollout of HTTP/3 for a large website.
Terminate QUIC at the edge proxies or CDN, keeping TCP and HTTP/2 fully working. Make the load balancers route
QUIC by connection ID. Advertise HTTP/3 with an Alt-Svc header and an HTTPS DNS record, starting with a short
lifetime so you can turn it off quickly.

Roll out by percentage and region. Compare latency and error rates for QUIC and TCP users by network type, and
watch CPU per request at the edge. Detect networks where QUIC fails or is slow, and stop advertising it there.

**Senior add-on:** plan the kill switch: clients cache Alt-Svc for its `ma` value, so you cannot stop QUIC
instantly unless you also refuse UDP and rely on fallback. Budget CPU for roughly twice the cost per byte at first
and measure your own. Add QUIC-specific DDoS controls (amplification limit, Retry, per-source limits) and
endpoint logging such as qlog, because packet captures show little.
:::

::: details 6. After you enable HTTP/3, some users report pages that hang for several seconds. Most users are fine. How do you find out why?
Segment the reports. Look at network (ASN, enterprise or mobile carrier), client version and region. A cluster
in corporate networks or one carrier suggests UDP interference. Compare error and latency rates for the same
users over QUIC and over TCP.

Then reproduce from an affected network: `curl --http3-only` versus `--http2`, a packet capture of UDP 443, and
browser logs. Look for a handshake that succeeds followed by lost packets, which defeats fallback. Check packet
sizes too: a path that drops 1200-byte UDP packets breaks the handshake.

**Senior add-on:** check server-side causes as well. A load balancer that hashes the four-tuple breaks
connections after NAT rebinding. NAT idle timeouts shorter than your idle timeout kill quiet connections. As a
mitigation, stop advertising HTTP/3 to the affected networks while you fix it.
:::

::: details 7. Why does QUIC use more CPU than TCP, and what can you do about it?
TCP runs in the kernel with decades of optimisation and hardware help: the network card splits and merges
packets, and can even encrypt. QUIC runs in user space, crosses into the kernel for packets, encrypts every packet
itself, and handles acknowledgements in the application.

Mitigations: batch packets per system call, use segmentation and receive offloads for UDP, tune the crypto, and
for very large deployments use kernel bypass.

**Senior add-on:** Google's 2017 paper reported 3.5 times the CPU of TLS over TCP at first and about twice after
optimisation. A 2024 study showed HTTP/3 slower than HTTP/2 above roughly 500 Mbps because of receive-side cost.
The trade is CPU for latency, which pays off on lossy, high-latency links.
:::

::: details 8. How does QUIC avoid being used for amplification attacks?
UDP source addresses can be forged. QUIC requires the client's first packet to be at least 1200 bytes, and the
server sends at most three times what it received until it confirms the client owns the address. Under attack,
the server can send a Retry with a token that the client must echo, proving its address.

**Senior add-on:** the limit is per address and per connection in the protocol, but deployment details can break
it. Cloudflare's 2025 broadcast-address bug turned one packet into hundreds of replies through shared sockets.
Path validation during migration uses the same idea.
:::

::: details 9. Why does a classic layer-4 load balancer struggle with QUIC?
It picks a server by hashing the four-tuple. A QUIC connection can change its four-tuple, through NAT rebinding
or migration. The new hash points to a different server, which has no state for that connection.

The fix is to route by connection ID. The server chooses the IDs the client uses, so it can encode its identity
in them, and the balancer reads it.

**Senior add-on:** the client's first packet carries a random ID it made up, so the balancer must hash that
consistently until the server's IDs take over. Encrypting server identity in the ID keeps observers from mapping
the fleet. [Chapter 11](/edge/l4-load-balancing) covers the design.
:::

::: details 10. QUIC encrypts its headers. What does that give, and what does it cost network operators?
It stops middleboxes from reading or changing transport details, so they cannot come to depend on them. That
keeps QUIC changeable, and also protects privacy and prevents tampering such as injected resets.

The cost is visibility. Operators cannot measure round-trip time, loss or retransmissions from packet headers as
they do for TCP. They must rely on endpoint metrics, logs, or the optional spin bit.

**Senior add-on:** this is a deliberate choice: the IETF chose ossification resistance over on-path
manageability, and documented what remains visible in RFC 9312. Debugging moves to qlog and endpoint key logs.
:::

## Common misconceptions

- **"QUIC runs on UDP, so it is unreliable."** QUIC provides reliable, ordered delivery within each stream. UDP is
  only the envelope.
- **"HTTP/3 removes head-of-line blocking."** It removes it between streams. Order within a stream, and the
  shared congestion window, remain.
- **"QUIC is always faster."** On fast, clean networks the difference is small and CPU cost can make it slower.
  The gains come from fewer round trips and loss handling on poor links.
- **"Connection migration just works."** Only clients migrate, servers can forbid it, clients must choose to do
  it, and load balancers must route by connection ID.
- **"Blocking UDP 443 breaks HTTP/3 sites."** Clean blocking falls back to TCP quickly. Partial blocking and rate
  limiting are what cause hangs.

## Key takeaways

- QUIC runs in user space over UDP and encrypts almost everything, so it can evolve without OS updates or
  middlebox approval.
- One combined handshake: a new connection needs **one round trip** instead of two; resumption allows 0-RTT,
  with replay risk.
- **Independent streams** confine a lost packet to the request it belonged to.
- **Connection IDs** let connections survive address changes and let load balancers route without the
  four-tuple.
- Costs: **more CPU**, dependence on UDP, less visibility, and a TCP fallback you must keep forever. Discovery
  through Alt-Svc or HTTPS records, plus racing, makes fallback quick when blocking is clean.

## Review

<Flashcards id="quic" :cards="cards" />

<MarkDone id="quic" />

## Sources

- [RFC 9000: QUIC, A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000) (RFC, 2021)
- [RFC 9001: Using TLS to Secure QUIC](https://www.rfc-editor.org/rfc/rfc9001) (RFC, 2021)
- [RFC 9002: QUIC Loss Detection and Congestion Control](https://www.rfc-editor.org/rfc/rfc9002) (RFC, 2021)
- [RFC 9114: HTTP/3](https://www.rfc-editor.org/rfc/rfc9114) (RFC, 2022) and
  [RFC 9204: QPACK](https://www.rfc-editor.org/rfc/rfc9204) (RFC, 2022)
- [RFC 7838: HTTP Alternative Services](https://www.rfc-editor.org/rfc/rfc7838) (RFC, 2016) and
  [RFC 9460: SVCB and HTTPS records](https://www.rfc-editor.org/rfc/rfc9460) (RFC, 2023)
- [RFC 9312: Manageability of the QUIC Transport Protocol](https://www.rfc-editor.org/rfc/rfc9312) (RFC, 2022)
- [RFC 9218: Extensible Prioritization Scheme for HTTP](https://www.rfc-editor.org/rfc/rfc9218) (RFC, 2022)
- [The QUIC Transport Protocol: Design and Internet-Scale Deployment](https://research.google/pubs/the-quic-transport-protocol-design-and-internet-scale-deployment/) (paper, SIGCOMM 2017)
- [QUIC is not Quick Enough over Fast Internet](https://arxiv.org/abs/2310.09423) (paper, WWW 2024)
- [QUIC action: patching a broadcast address amplification vulnerability](https://blog.cloudflare.com/mitigating-broadcast-address-attack/) (engineering blog, 2025)
- [Defending QUIC from acknowledgement-based DDoS attacks](https://blog.cloudflare.com/defending-quic-from-acknowledgement-based-ddos-attacks/) (engineering blog, 2025)
