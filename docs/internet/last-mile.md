---
title: "8. The Last Mile & Mobile"
---

<script setup>
import { cards } from './last-mile-review'
</script>

# 8. The Last Mile & Mobile

The first hop, from the phone over Wi-Fi or a cell tower into its provider's network, is often the slowest and
least predictable part of the whole path. It also decides which IP address your servers see, and how many
other users share it. Interviewers probe it through mobile performance, rate limiting, IPv6 and "it only
fails on cellular" debugging stories.

::: info Before you start
- Devices on a home or office network usually have **private addresses**, rewritten to a public address at
  the router. [Chapter 2](/foundations/packets-and-links) covers addresses, IPv4 and IPv6.
- A TCP connection is identified by the client and server addresses and ports. If any of them changes, the
  connection is gone. [Chapter 3](/foundations/tcp-and-udp) covers TCP.
- A **round trip** is the time for a packet to reach the other end and an answer to come back. Every new
  connection costs a few of them. [Chapter 1](/foundations/the-map) gives a latency budget.

The chapter makes sense without them. Addresses in the examples are placeholders.
:::

## What the last mile is

**In short:** the last mile is the access network between a user's device and their internet provider. On
phones it is Wi-Fi or cellular radio, and it adds most of the variability users feel.

A request from a phone takes one of two routes into the internet:

- **Wi-Fi:** phone → access point → home or office router → the broadband provider's network (fibre, cable
  or DSL) → the internet.
- **Cellular:** phone → cell tower → the carrier's core network → a gateway where the carrier's network meets
  the internet.

This first stretch is called the <Term id="last-mile">last mile</Term>, even though it is the first hop from
the user's side. It belongs to the user, their landlord or their carrier, never to you. You cannot fix it;
you can only design for it.

Two properties set it apart from the rest of the path. It is **shared radio**, so delay changes from moment to
moment. And it is where **address translation** happens, so it decides what your servers see as "the user".

## Where the latency comes from

**In short:** radio links add delay that varies from packet to packet. On cellular, traffic also travels to
the carrier's gateway, which may be far from the user.

On an idle home Wi-Fi network, the hop from phone to router takes a few milliseconds. On 4G, a round trip to a
nearby server is typically tens of milliseconds. Those are the good cases. What engineers notice is the
spread: the same request takes 40 ms, then 300 ms, then 60 ms. That variation in delay is called
<Term id="jitter">jitter</Term>, and on radio links it often matters more than the average.

### Wi-Fi: one shared channel

A Wi-Fi channel carries one transmission at a time. Every device on it, and on neighbouring networks using the
same channel, takes turns. Before sending, a device listens, waits a random time, and sends only if the air is
quiet. When two devices collide or the signal is weak, the frame is resent. All of this is invisible to TCP,
which sees only a delay.

So Wi-Fi latency grows with the number of busy devices and with interference, not only with your own traffic.
A crowded conference hall or apartment block can add tens to hundreds of milliseconds. A slow, distant device
also hurts everyone: it takes longer to send the same data, so it holds the channel longer.

::: details Going deeper: Wi-Fi details that show up in debugging
- The listen-then-send scheme is called CSMA/CA. Lost frames are retried at the link layer, several times,
  before anything above notices.
- The "performance anomaly": with per-frame fairness, one slow-rate client drags down every client's
  throughput. Access points that schedule by **airtime** instead fix most of it.
- Phones save power by sleeping between beacons from the access point. A packet for a sleeping phone waits at
  the access point, adding delay to the first packet after a quiet period.
- The OS sometimes scans other channels, for roaming or location. While off-channel, the phone cannot
  receive, which shows up as a brief latency spike.
- Newer standards (Wi-Fi 6 and later) let the access point schedule several clients at once, which helps
  crowded networks. Results depend heavily on the access point and the clients.
:::

### Cellular: scheduled radio and a distant gateway

On cellular, the tower decides who sends when. The phone asks for permission to send, waits for a slot, then
sends. Lost radio frames are retried quickly, but each retry adds a few milliseconds. Signal strength, cell load
and movement change the available speed from second to second.

Then comes a hop engineers often forget. The carrier carries all phone traffic through its core network to a
<Term id="packet-gateway">packet gateway</Term>, where it reaches the internet. That gateway may be in another
city. A user in one town may enter the internet hundreds of kilometres away. Two effects follow: extra delay,
and IP addresses that locate the gateway, not the user.

::: details Going deeper: why mobile IP geolocation is coarse
Your servers see the address of the carrier's gateway, usually behind carrier-grade NAT (later in this
chapter). A country-sized carrier may run a handful of gateways. IP-based geolocation databases can therefore
place a mobile user in the wrong city, and DNS or anycast steering
([chapter 10](/edge/steering)) sends them to the edge nearest the gateway, not the user.
:::

## Radio states and the slow first request

**In short:** a phone's cellular radio sleeps when idle and takes time to wake. The first request after a
quiet period pays that cost, and every packet keeps the radio awake, costing battery.

A cellular radio uses a lot of power while connected. To save battery, the phone and the network drop it into
an idle state after a few seconds without traffic. In idle, the phone cannot send data. It must first ask the
network for radio resources and wait for them. These states are the
<Term id="radio-state">radio states</Term>, managed by a protocol called Radio Resource Control (RRC).

<LastMileRadioStatesDiagram />

This produces a pattern every mobile engineer meets: **the first request is slow, the next one is fast.** The
first request waits for the radio to wake up (the **promotion delay**), then pays for DNS, TCP and TLS. A
request seconds later finds the radio awake and maybe a warm connection.

How long is the wait? It depends on the generation and the carrier's settings:

- On 3G, waking could take up to about two seconds.
- 4G (LTE) aimed for 100 ms or less. A 2012 measurement on a US LTE network found about 260 ms.
- 5G adds an in-between "inactive" state, designed to make waking faster. Real results vary by deployment.

After the last packet, the radio stays connected for a **tail timer**, often around ten seconds on 4G, then
drops back to idle. The tail costs battery for no data.

### What this means for app design

- **Batch background traffic.** An analytics ping every 20 seconds keeps the radio awake permanently and
  drains the battery. Send in bursts, or piggyback on requests the user caused.
- **Warm up when you know a request is coming.** Open the connection, or send a small request, as the user
  opens a screen. That hides the promotion delay and the handshakes.
- **Measure the first request separately.** Median latency hides the cold-start cost. Track first request
  after app launch, or after a gap, as its own metric.
- **Prefer push over polling.** Polling keeps the radio busy. Phones use one shared push channel per device
  instead ([chapter E3](/extras/push-and-realtime)).

::: details Going deeper: the numbers and their sources
- 3G's idle-to-connected promotion could take up to two seconds and tens of control messages; LTE's target
  was 100 ms or less, and 50 ms for LTE-Advanced (Grigorik, *High Performance Browser Networking*).
- Huang et al. (MobiSys 2012) measured a US LTE network in 2011–2012: promotion about 260 ms, tail timer
  about 11.6 s, and LTE up to 23 times less power-efficient than Wi-Fi for real traces, largely due to the tail.
- 3GPP Release 15 (5G) added the RRC_INACTIVE state, which keeps the phone's context in the network so it can
  resume faster than from full idle.
- The timers are set by each carrier and can differ between networks and over time. Treat any figure as an
  order of magnitude.
:::

## Bufferbloat: when the link is full

**In short:** when a link is busy, packets wait in large queues. Latency for everything on that link,
including small requests, can grow from milliseconds to seconds.

Picture someone uploading a video from a phone while also using a chat app. The upload fills the link. The
chat app's tiny messages now queue behind megabytes of video in a buffer at the phone, the router or the tower.
A message that took 50 ms now takes over a second.

Large buffers that fill and stay full are called <Term id="bufferbloat">bufferbloat</Term>.
[Chapter 3](/foundations/tcp-and-udp) explains why loss-based congestion control fills them: it keeps sending
faster until a packet is dropped, and a big buffer delays that drop. Radio links make it worse. Their speed
changes every second, so devices and towers keep deep buffers to avoid running dry.

The key distinction is **idle latency versus latency under load**. Speed tests used to report only idle
latency. The number users feel is latency while something else is using the link.

Fixes exist at every layer:

- **Smarter queues.** Routers and access points that keep one short queue per flow, and drop early when a
  queue grows (algorithms such as FQ-CoDel and CAKE), keep small flows fast under load.
- **Airtime fairness on Wi-Fi.** The access point shares airtime fairly between clients, so one slow client
  cannot clog the channel.
- **Delay-aware senders.** Congestion control such as BBR watches delay instead of waiting for loss, so it
  keeps queues shorter ([chapter 3](/foundations/tcp-and-udp)).
- **App behaviour.** Do not let a background upload share a connection, or a priority level, with
  interactive requests.

```bash
# macOS 12+: measures throughput and responsiveness (latency under load)
networkQuality -v

# Any OS: watch the ping time, then start a large download or upload in another window
ping -i 0.5 1.1.1.1
```

Look at how much the ping time rises once the link is busy. A rise from 20 ms to 500 ms means a bloated
queue somewhere on the path, usually at the slowest link.

::: details Going deeper: measured bufferbloat and newer work
- Jiang et al. (IMC 2012) measured four US carriers and one in Korea and saw TCP round trips of up to
  10 seconds, caused by deep buffers and large phone receive windows.
- Høiland-Jørgensen et al. (USENIX ATC 2017) found hundreds of milliseconds of extra queueing inside the
  Linux Wi-Fi stack. Their per-flow queues and airtime scheduler, merged into Linux, cut latency under load by
  about an order of magnitude.
- **L4S** (RFC 9330, 2023) lets senders and the network signal congestion before queues build. Deployment is
  early as of 2025, with some cable and mobile operators trialling it.
:::

## 5G: what changes and what does not

**In short:** 5G radios can add less delay than 4G, but the famous "1 ms" is a standard's radio target, not
a round trip to your servers. Distance, the core network and the internet still dominate.

The requirements for 5G set a one-way radio delay target of 4 ms for normal mobile broadband and 1 ms for
"ultra-reliable low-latency" uses. That figure covers only the radio hop, on an unloaded cell, for tiny
packets. It excludes the carrier's core network, the gateway, the internet, and the server.

Measurements tell a more modest story. A 2021 study of US 5G networks found the lowest round trip, about 6 ms,
on high-frequency (millimetre-wave) 5G to a test server about 3 km away. Round trips grew quickly with
distance to the server. Low-band 5G, the most common kind, added more delay than millimetre-wave.

For engineers, 5G changes the radio part of the budget, sometimes. It does not change the speed of light, the
detour to the carrier's gateway, or the round trips your protocol needs. Treat claims of "single-digit
millisecond" latency as true only for servers very close to the radio network.

::: details Going deeper: the sources
- ITU-R report M.2410 (2017) sets the IMT-2020 user-plane latency requirements: 4 ms (eMBB) and 1 ms
  (URLLC), one way, unloaded, for small packets, measured across the radio interface only.
- Narayanan et al. (SIGCOMM 2021) measured Verizon and T-Mobile 5G, including millimetre-wave, low-band,
  standalone and non-standalone modes. The ~6 ms minimum was against a carrier speed-test server; round trips
  roughly doubled once the server was about 320 km away.
- Most 5G networks launched in "non-standalone" mode, which uses a 4G core and 4G signalling.
:::

## NAT and its timeouts

**In short:** a NAT device lets many private addresses share one public address by rewriting ports and
remembering each flow. It forgets idle flows, which silently breaks long-lived connections.

[Chapter 2](/foundations/packets-and-links) introduced <Term id="nat">network address translation (NAT)</Term>.
A recap: your home router has one public IPv4 address. Devices behind it have
<Term id="private-address">private addresses</Term>, such as `192.168.1.20`. When a device opens a connection,
the router rewrites the source to its public address and a free <Term id="port">port</Term>. It stores that
pairing, called a **mapping**, so it can send replies back to the right device.

Two consequences matter for engineers:

- **Nobody can connect in.** The NAT only knows flows that started inside. A server cannot open a connection
  to a phone. That is why phones receive pushes over a connection they opened themselves.
- **Mappings expire.** The NAT has limited memory, so it deletes mappings that have been quiet for a while.
  This expiry is the <Term id="nat-timeout">NAT timeout</Term>.

When a mapping expires, neither end is told. The phone's next packet gets a new mapping, often a new port, or
is dropped. The server sees packets from an unknown address and port, so the old TCP connection is dead.
The app finds out only when a request hangs until its timeout.

The standards ask for generous timeouts: at least 2 minutes for UDP and about 2 hours for established TCP.
Real devices, especially for UDP and on mobile networks, are often shorter. The QUIC deployment guidance tells
applications to assume UDP state may expire after 30 seconds of silence.

So long-lived connections need **keepalives**: small messages sent often enough to keep the mapping fresh.
On a phone, each keepalive also wakes the radio. The interval is a trade-off between dead connections and
battery, which is another reason phones funnel all apps through one push connection.

::: details Going deeper: the rules and NAT rebinding
- RFC 4787 (2007) requires UDP mappings to last at least 2 minutes and recommends 5 or more. RFC 5382 (2008)
  requires at least 2 hours 4 minutes for established TCP.
- RFC 9308 (2022), on QUIC deployment, says UDP applications can assume a NAT mapping may expire after
  30 seconds of inactivity.
- When a mapping expires and the next packet gets a new public port, that is **NAT rebinding**. TCP cannot
  survive it. QUIC identifies connections by an ID rather than addresses, so it can
  ([chapter 7](/protocols/quic)).
:::

## Carrier-grade NAT

**In short:** mobile carriers do not have enough public IPv4 addresses, so they put many subscribers behind
one shared address. Servers then see hundreds or more users as one address, which breaks IP-based rate
limiting, blocking and abuse handling.

A carrier with 50 million phones cannot give each one a public IPv4 address; there are not enough left. So it
runs NAT inside its own network. Each phone gets a private address, and a large NAT near the gateway shares a
pool of public addresses among many phones. This is
<Term id="cgnat">carrier-grade NAT (CGNAT)</Term>. A home broadband user behind CGNAT goes through two NATs:
their router's and the carrier's.

<LastMileCgnatDiagram />

CGNAT is the normal case on mobile. A 2016 measurement found it in more than 90% of cellular networks it
could observe, and in about 17–18% of networks serving users overall. Fixed-line providers have added it
since, as IPv4 addresses grew scarce.

### Port exhaustion

One public address has about 64,000 ports per protocol. To share it, the CGNAT often gives each subscriber a
**block** of ports, such as a few hundred or a few thousand. That makes logging cheap, because the carrier
records one block per subscriber instead of every connection.

A subscriber who opens more connections than their block allows runs out. New connections then fail or stall,
while existing ones keep working. This is <Term id="port-exhaustion">port exhaustion</Term>. Typical causes
are many apps and tabs opening connections at once, a device with a bug that leaks connections, or a home
network with many devices behind one subscriber line. To the user it looks like "some sites load, others
hang".

### What CGNAT does to your servers

The assumption "one IP address is one user" breaks. That affects several things large services do:

- **Rate limiting.** A per-IP limit set for one user throttles everyone behind the shared address. A busy
  CGNAT address looks like a bot.
- **Blocking and reputation.** Banning an abusive address bans every innocent user on it. Their phones then
  fail sign-ups, CAPTCHAs or logins for reasons they cannot see.
- **Identifying abusers.** To find one subscriber, the carrier needs the public address, the **source port**
  and an exact timestamp. Many servers log only the address, so abuse reports cannot be acted on.
- **Geolocation and steering.** The address points to the carrier's gateway, as described above.

Better practice is to limit on something closer to the user. Use an account, session or API token where one
exists. For IPv6 clients, limit on the network prefix rather than the full address: a phone or home usually
gets a whole `/64` and can pick any address in it. Treat known CGNAT or proxy addresses with higher limits or a
challenge instead of a block. And log the source port and accurate time on every connection.

::: details Going deeper: standards and measurements
- RFC 6598 (2012) reserves `100.64.0.0/10` as "shared address space" for carrier NAT, so it does not clash with
  customers' own `10.x` or `192.168.x` networks. Seeing a `100.64`–`100.127` address on your device, or as a
  traceroute hop, is a strong sign of CGNAT.
- RFC 6888 (2013) sets CGNAT requirements, including per-subscriber port limits and keeping a subscriber on the
  same public address for all their flows.
- RFC 6269 (2011) lists the problems of address sharing for servers. RFC 6302 (2011) asks internet-facing
  servers to log the source port and accurate timestamps for exactly this reason.
- Richter et al. (IMC 2016) found CGNAT in more than 90% of cellular networks they observed.
:::

## IPv6-only mobile networks: NAT64 and 464XLAT

**In short:** many carriers give phones only an IPv6 address. Translators in the network, and sometimes on
the phone, let them still reach IPv4-only servers. Apps that hard-code IPv4 break.

Running IPv4 inside a carrier network is expensive: private address space runs out, and every packet needs
CGNAT. IPv6 has enough addresses for every phone to have a public one. So several large carriers, such as
T-Mobile US, give phones **only** IPv6. [Chapter 2](/foundations/packets-and-links) covers IPv6 itself.

The problem: much of the internet is still IPv4-only. An IPv6-only phone needs a way to reach those servers.
Two translators work together:

1. **DNS64.** The app asks for `example.com`. If the site has only an IPv4 address, the carrier's
   resolver invents an IPv6 address that embeds the IPv4 one, under a special prefix. This is
   <Term id="dns64">DNS64</Term>.
2. **NAT64.** The phone sends packets to that invented address. A translator at the carrier, called
   <Term id="nat64">NAT64</Term>, sees the prefix, extracts the IPv4 address and forwards the packet as IPv4. It
   also shares public IPv4 addresses, like CGNAT.

This works for any app that connects by name. It fails for apps that use an IPv4 address directly: a hard-coded
address, an address passed in a protocol message, or code that only opens IPv4 sockets. With no IPv4 on the
phone, those connections fail at once.

<LastMileNat64Diagram />

The fix for those apps is a third translator **on the phone**. It gives the phone a fake local IPv4 address,
turns IPv4 packets into IPv6, and sends them to the carrier's NAT64. The double translation (IPv4 to 6 to 4)
is called <Term id="464xlat">464XLAT</Term>. Android ships this translator; other platforms vary.

### What engineers should do

- **Connect by name, through the platform's networking APIs.** They handle IPv6, DNS64 and fallback.
- **Never hard-code IPv4 addresses**, in code, configuration or protocol messages.
- **Serve AAAA records** (IPv6 addresses) from your edge. IPv6 users then skip the carrier's translators and
  their shared, rate-limited IPv4 addresses.
- **Test on an IPv6-only network.** macOS can share its connection as an IPv6-only network with NAT64, which is
  how Apple suggests developers test.

```bash
# Is my network translating? The name ipv4only.arpa has only IPv4 addresses.
# An AAAA answer means DNS64 is inventing addresses for this network.
dig ipv4only.arpa AAAA +short
# illustrative output on a NAT64 network:
# 64:ff9b::c000:aa
# 64:ff9b::c000:ab

# Which address family did curl use, and which address?
curl -s -o /dev/null -w '%{remote_ip}\n' https://example.com/
```

::: details Going deeper: standards and edge cases
- NAT64 is RFC 6146 and DNS64 is RFC 6147 (both 2011). The well-known prefix `64:ff9b::/96` comes from RFC 6052;
  carriers may use their own. 464XLAT is RFC 6877 (2013). The on-phone part is called the CLAT; the carrier's
  NAT64 is the PLAT.
- Devices find the prefix by looking up `ipv4only.arpa` (RFC 7050), or from router advertisements (RFC 8781).
- DNS64 breaks DNSSEC validation on the device, because the invented address has no valid signature.
  Validating resolvers sit upstream of DNS64 instead.
- Since 1 June 2016, Apple has required apps submitted to its App Store to work on IPv6-only networks.
:::

## Happy Eyeballs and switching networks

**In short:** dual-stack devices race IPv6 and IPv4 so a broken path costs a fraction of a second, not a
timeout. Moving between Wi-Fi and cellular changes the phone's address, which kills TCP connections.

### Racing IPv4 and IPv6

Many networks give a device both IPv6 and IPv4. Sometimes one of them is broken: a misconfigured router, a
firewall that drops IPv6. If the device tried IPv6 first and waited for a timeout, users would wait tens of
seconds.

<Term id="happy-eyeballs">Happy Eyeballs</Term> avoids that. The client looks up both address types, tries
IPv6 first, and starts an IPv4 attempt if IPv6 has not connected within a short delay, around a quarter of a
second. The first connection to succeed wins, and the other is dropped. Browsers and the main mobile
platforms do this by default.

It has a side effect for operators: **it hides broken IPv6.** Users get through on IPv4 after a short delay,
so nothing alerts. Your IPv6 path can be broken for weeks while dashboards look fine, with a quarter-second
penalty on every new connection. Monitor IPv6 and IPv4 separately, with probes forced to one family.

::: details Going deeper: Happy Eyeballs versions
- Version 1 is RFC 6555 (2012). Version 2, RFC 8305 (2017), adds sending DNS queries for both families at once,
  waiting about 50 ms for the AAAA answer if the A answer comes first, and a recommended 250 ms between
  connection attempts.
- A version 3 draft (in progress as of 2025) folds in HTTPS records and racing QUIC against TCP.
- Libraries differ. Some language runtimes do not race by default, so a server-to-server client can hang on a
  broken IPv6 route that a browser would skip.
:::

### Moving between networks

Walk out of the house and the phone switches from Wi-Fi to cellular. Its IP address changes. A TCP connection
is tied to the old address, so every open connection is dead, even if nothing tells the app.

Apps handle this in a few ways:

- **Reconnect on network change.** Platforms announce network changes. Good apps drop old connections and
  retry idempotent requests right away, instead of waiting for timeouts.
- **Use a protocol that survives the move.** QUIC can carry a connection to a new address
  ([chapter 7](/protocols/quic)). Multipath TCP can use Wi-Fi and cellular together; Apple's documentation
  describes using it for Siri.
- **Expect the in-between state.** A phone on weak Wi-Fi may hang on to it. Some platforms send traffic over
  cellular when Wi-Fi looks poor, which also costs the user mobile data.

A related trap is the **captive portal**: hotel or airport Wi-Fi that intercepts traffic until you accept terms.
Requests hang or return the portal's page. Platforms detect it by fetching a known URL and checking the answer.

## Why this matters in real systems

**Mobile latency is mostly cold starts and tail.** Median request time on a warm connection looks fine. The
first request after launch pays radio wake-up, DNS, TCP and TLS, on a link with high jitter. Teams that fix
mobile performance usually do it by reusing connections, warming them up early, cutting round trips
(TLS 1.3, QUIC, [chapter 7](/protocols/quic)), and batching small requests.

**Rate limits built for desktops hurt mobile users.** A per-IP limit that works on broadband throttles a whole
CGNAT address. Large services rate-limit by account or token where they can, use IPv6 prefixes, and treat
shared addresses with challenges instead of blocks. [Chapter 12](/edge/l7-proxies) covers rate limiting at the
proxy.

**IPv6 is a performance feature on mobile.** On an IPv6-only carrier, an IPv4-only site goes through NAT64 and
its shared addresses. Serving AAAA records from the edge removes that hop and that sharing.

**Long-lived connections need keepalives tuned to NATs.** Chat, gaming and streaming apps hold connections for
minutes or hours. Without keepalives inside the NAT timeout, connections die silently and the app hangs until a
timeout. With keepalives that are too frequent, the battery drains. Mobile platforms solve it once per device
with a push service ([chapter E3](/extras/push-and-realtime)).

**Debugging "slow on cellular" starts by splitting the time.** Ask whether the cost is radio wake-up (only the
first request), handshakes (every new connection), queueing (only under load) or distance (constant). Each has
a different fix.

```bash
# Break one request into phases; run it twice a few seconds apart on a phone hotspot,
# then again after 30 s of silence, and compare the first phases
curl -o /dev/null -s -w 'dns %{time_namelookup}  tcp %{time_connect}  tls %{time_appconnect}  first-byte %{time_starttransfer}\n' https://example.com/

# Is there NAT between you and the internet? Compare your interface address with what servers see.
ip -brief addr     # Linux (macOS: ifconfig)
curl -s https://icanhazip.com
```

If your interface shows a private or `100.64.x.x` address and the server sees a different one, you are behind
NAT, and `100.64.x.x` points to carrier-grade NAT.

## Where it breaks

**CGNAT users are rate-limited more often, 2025.** Cloudflare studied traffic from more than 200,000 addresses
it identified as CGNAT. It reported that these addresses were rate-limited about three times as often as other
addresses, even though their traffic looked more human. Customers' per-IP rules were catching many real users
who shared one address. **Lesson:** an IP address is not a user; rate limits and blocks keyed on it fall hardest
on mobile users.
([Cloudflare, 2025](https://blog.cloudflare.com/detecting-cgn-to-reduce-collateral-damage/))

**Apps that broke on IPv6-only networks, 2016.** Apple announced in 2015 that iOS was moving towards IPv6-only
network services. From 1 June 2016, its App Store required every submitted app to work on an IPv6-only
network with NAT64. Apple's notice warned that apps using IPv4-specific APIs or hard-coded IP addresses would
need changes. **Lesson:** code that assumes IPv4 works in the office and fails on real carrier networks; test on
an IPv6-only network.
([Apple developer support](https://developer.apple.com/support/ipv6))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Why is the first request from a mobile app often much slower than the rest?
Several one-time costs stack up. If the phone has been quiet, the cellular radio is idle and must wake up,
which takes from around a hundred milliseconds to more, depending on the network. Then the app needs a DNS
lookup, a TCP connection and a TLS handshake, each costing round trips on a high-latency link.

Later requests find the radio awake, the name cached and the connection open, so they pay only one round trip.

**Senior add-on:** measure the first request as its own metric. Hide the cost by warming the connection when the
user opens a screen, reusing connections, and using TLS 1.3 or QUIC to cut handshake round trips. Also note that
batching background traffic both saves battery and avoids repeated wake-ups.
:::

::: details 2. What is carrier-grade NAT, and how does it affect a service you run?
The carrier does not have a public IPv4 address for every phone. So it gives phones private addresses and
translates many of them to one shared public address, each with its own range of ports.

For a service, many users now arrive from the same address. Per-IP rate limits throttle all of them, an IP ban
blocks innocent users, and IP geolocation points at the carrier's gateway.

**Senior add-on:** rate-limit on accounts, sessions or tokens; for IPv6, on the `/64` prefix. Give known shared
addresses higher limits or a challenge rather than a block. Log source port and accurate time so abuse
reports can name a subscriber. Serving over IPv6 avoids the sharing altogether for IPv6 users.
:::

::: details 3. Design rate limiting for a public API used heavily by mobile apps.
Start with the strongest identity available. Authenticated calls are limited per account or API key. For
anonymous calls, combine signals: a device or app-instance token, the IP address or IPv6 `/64`, and request
patterns.

Treat IP-based limits as a coarse backstop, set high, because one IPv4 address may carry thousands of users.
Respond with a clear `429` and a retry time so well-behaved apps back off. Prefer challenges to hard blocks for
suspicious shared addresses.

**Senior add-on:** maintain a list of addresses known to be CGNAT, proxies or privacy relays, from your own
traffic (many distinct accounts per address) or a vendor. Store limits per region so a carrier's address pool
does not hit one global counter. Watch for clients that retry instantly on `429`, which turns a limit into a
retry storm ([chapter 17](/operations/timeouts-retries-overload)).
:::

::: details 4. Users report that your chat app's messages stop arriving after the phone sits idle for a minute or two. What is happening?
Probably a NAT mapping expired. The app holds a long-lived connection. While it is quiet, a NAT on the path,
often the carrier's, forgets the mapping. Neither end is told. Messages from the server go nowhere, and the app's
next send gets a new port or is dropped.

Fix it with keepalives sent more often than the shortest NAT timeout, and with fast reconnects on any error or
network change.

**Senior add-on:** confirm by correlating failures with idle time and network type (worse on cellular, often
only UDP). Keepalive intervals trade dead connections against battery. Many apps avoid holding their own
connection at all and use the platform's push service to wake them.
:::

::: details 5. Your app works on Wi-Fi but some features fail on a specific carrier. How do you find out why?
Find out what is different about that carrier's network. Check whether it is IPv6-only: look at the phone's
addresses, or whether `ipv4only.arpa` returns an AAAA answer. If so, look for IPv4 literals in the failing
feature: hard-coded addresses, URLs, or a server sending an IPv4 address in a response.

Also check for CGNAT effects: are failures rate limits or blocks keyed on IP? Compare server logs by network.

**Senior add-on:** reproduce on an IPv6-only NAT64 test network (macOS can create one). Check the failing
feature's own protocol: peer-to-peer, WebRTC or custom TCP code may bypass the platform's IPv6-aware APIs.
Also check MTU problems, since translation and tunnelling shrink the packet size
([chapter 2](/foundations/packets-and-links)).
:::

::: details 6. What is Happy Eyeballs, and what problem can it hide?
When a host has both IPv6 and IPv4 addresses, the client tries IPv6 first and starts IPv4 after a short delay
if IPv6 has not connected. The first to succeed wins. Users never wait for a broken path to time out.

The problem it hides: if your IPv6 is broken, users quietly fall back to IPv4. No errors, only a few hundred
milliseconds extra on each new connection.

**Senior add-on:** monitor each address family separately with forced IPv4 and IPv6 probes, and compare the
share of IPv6 connections over time. A sudden drop in IPv6 share is often the only sign. Also check server-side
clients and libraries, which may not race at all.
:::

::: details 7. Users on a busy Wi-Fi network see good speed tests but laggy video calls. Why?
Speed tests measure throughput, often with idle latency. Video calls need low, steady latency. On busy Wi-Fi,
devices take turns on one channel and frames get resent, causing jitter. And if someone is downloading or
uploading, packets queue in large buffers: bufferbloat.

Measure latency under load, for example with `networkQuality` on macOS or by pinging while a download runs.

**Senior add-on:** fixes are per-flow queueing with active queue management (FQ-CoDel, CAKE) on the router and
access point, airtime fairness on Wi-Fi, and fewer clients per channel. On the app side, keep background
transfers from competing with real-time traffic.
:::

::: details 8. Does 5G solve mobile latency?
Partly. 5G radio can add less delay than 4G, and its standard sets a 1 ms radio target for special low-latency
uses. But that target covers only the radio hop, on an empty cell. Real round trips include the carrier's core,
its gateway, the internet and the server.

Measured 5G round trips are a few milliseconds only to servers very close by. To an ordinary cloud region they
are tens of milliseconds, like 4G in many cases.

**Senior add-on:** distance and round trip count still dominate. If a product needs single-digit milliseconds,
compute must sit inside or next to the carrier network, and the protocol must avoid extra handshakes.
:::

::: details 9. A phone moves from Wi-Fi to cellular mid-download. What happens, and how would you design for it?
The phone gets a new IP address. TCP connections are tied to the old address, so they die. If the app does
nothing, the download hangs until a timeout, then fails or restarts.

Listen for network changes, close old connections right away, and resume. Use range requests so a download
continues where it stopped, and make requests idempotent so retries are safe.

**Senior add-on:** QUIC can migrate the connection to the new address, keeping streams alive; the load
balancer must route by connection ID ([chapter 11](/edge/l4-load-balancing)). Multipath TCP is an alternative
where both ends support it.
:::

## Common misconceptions

- **"5G means 1 ms latency."** That is a one-way radio target on an empty cell, not a round trip to a server.
- **"One IP address is one user."** Behind carrier-grade NAT, one IPv4 address can carry hundreds or thousands.
- **"A connection stays open until someone closes it."** NATs drop idle mappings silently, often within
  minutes, sometimes within 30 seconds.
- **"High bandwidth means low latency."** A fast link with a full buffer can add seconds of delay.
- **"If IPv6 were broken, we'd see errors."** Happy Eyeballs falls back to IPv4 quietly.
- **"IPv6-only phones can't reach IPv4 sites."** They can, through DNS64 and NAT64, unless the app uses IPv4
  addresses directly.

## Key takeaways

- The last mile adds **variable** delay: shared Wi-Fi airtime, cellular scheduling, and deep buffers that fill
  under load. Design for jitter and for latency under load.
- Cellular radios **sleep and wake**. The first request after idle pays a promotion delay, and frequent small
  requests keep the radio awake and drain the battery.
- **NAT mappings expire**, so long-lived connections need keepalives and fast reconnects.
- **Carrier-grade NAT** puts many users behind one IPv4 address. Rate-limit and block on accounts, tokens and
  IPv6 prefixes, and log source ports.
- Many phones are **IPv6-only** and reach IPv4 through NAT64. Connect by name, never hard-code IPv4, serve
  IPv6, and monitor each address family separately.

## Review

<Flashcards id="last-mile" :cards="cards" />

<MarkDone id="last-mile" />

## Sources

- [High Performance Browser Networking, ch. 7: Mobile Networks](https://hpbn.co/mobile-networks/) (book, Ilya Grigorik, 2013)
- [A Close Examination of Performance and Power Characteristics of 4G LTE Networks](https://web.eecs.umich.edu/~zmao/Papers/RRC4G_mobisys2012.pdf) (paper, MobiSys 2012)
- [A Variegated Look at 5G in the Wild: Performance, Power, and QoE Implications](https://feng-qian.github.io/paper/5g_sigcomm21.pdf) (paper, SIGCOMM 2021)
- [Report ITU-R M.2410: Minimum requirements related to technical performance for IMT-2020 radio interfaces](https://www.itu.int/dms_pub/itu-r/opb/rep/R-REP-M.2410-2017-PDF-E.pdf) (standard, 2017)
- [Tackling Bufferbloat in 3G/4G Networks](https://dl.acm.org/doi/10.1145/2398776.2398810) (paper, IMC 2012)
- [Ending the Anomaly: Achieving Low Latency and Airtime Fairness in WiFi](https://arxiv.org/abs/1703.00064) (paper, USENIX ATC 2017)
- [RFC 4787: NAT Behavioral Requirements for Unicast UDP](https://www.rfc-editor.org/rfc/rfc4787) (RFC, 2007) and
  [RFC 5382: NAT Behavioral Requirements for TCP](https://www.rfc-editor.org/rfc/rfc5382) (RFC, 2008)
- [RFC 6269: Issues with IP Address Sharing](https://www.rfc-editor.org/rfc/rfc6269) (RFC, 2011) and
  [RFC 6302: Logging Recommendations for Internet-Facing Servers](https://www.rfc-editor.org/rfc/rfc6302) (RFC, 2011)
- [RFC 6598: IANA-Reserved IPv4 Prefix for Shared Address Space](https://www.rfc-editor.org/rfc/rfc6598) (RFC, 2012) and
  [RFC 6888: Common Requirements for Carrier-Grade NATs](https://www.rfc-editor.org/rfc/rfc6888) (RFC, 2013)
- [A Multi-perspective Analysis of Carrier-Grade NAT Deployment](https://dl.acm.org/doi/10.1145/2987443.2987474) (paper, IMC 2016)
- [RFC 6146: Stateful NAT64](https://www.rfc-editor.org/rfc/rfc6146), [RFC 6147: DNS64](https://www.rfc-editor.org/rfc/rfc6147) (RFCs, 2011) and
  [RFC 6877: 464XLAT](https://www.rfc-editor.org/rfc/rfc6877) (RFC, 2013)
- [RFC 7050: Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis](https://www.rfc-editor.org/rfc/rfc7050) (RFC, 2013)
- [RFC 8305: Happy Eyeballs Version 2](https://www.rfc-editor.org/rfc/rfc8305) (RFC, 2017)
- [RFC 9308: Applicability of the QUIC Transport Protocol](https://www.rfc-editor.org/rfc/rfc9308) (RFC, 2022)
- [RFC 9330: Low Latency, Low Loss, and Scalable Throughput (L4S) Architecture](https://www.rfc-editor.org/rfc/rfc9330) (RFC, 2023)
- [One IP address, many users: Detecting CGNAT to reduce collateral effects](https://blog.cloudflare.com/detecting-cgn-to-reduce-collateral-damage/) (engineering blog, 2025)
- [Supporting IPv6-only Networks](https://developer.apple.com/support/ipv6) (Apple documentation, 2016)
