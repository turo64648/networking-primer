---
title: 1. The Map
---

<script setup>
import { cards } from './the-map-review'
</script>

# 1. The Map: One Request, End to End

When you tap a link on your phone, the request crosses networks run by half a dozen different organisations
before any application code sees it. This chapter walks that path once, end to end, and shows where the time
goes. "What happens when you type a URL?" is a classic interview question, and this map is the senior-level
outline of the answer.

::: info Before you start
- Every machine on the internet is reached by an **IP address**. Data travels in small chunks called
  **packets**. [Chapter 2](/foundations/packets-and-links) covers both.
- **TCP** sets up a reliable connection before sending data; **UDP** sends single messages with no setup.
  [Chapter 3](/foundations/tcp-and-udp) covers both.
- The name in a URL is turned into an IP address by <Term id="dns">DNS</Term>, covered in
  [chapter 4](/protocols/dns).

The chapter makes sense without them. It names many mechanisms only briefly; each link leads to the chapter
that explains it.
:::

## The path at a glance

**In short:** a request leaves your phone over a radio link, crosses your provider's network and the
internet, reaches the website's nearby edge site, and only then, if needed, travels the website's own network
to an application server.

Here is the whole path. The colours show who runs each part. The rest of this section walks it hop by hop.

<MapPathDiagram />

### Your side

Before anything else, the phone must turn the site's name into an address. It asks a
<Term id="recursive-resolver">recursive resolver</Term>, a DNS server run by your provider or a public
service, which usually answers from its cache ([chapter 4](/protocols/dns)).

The phone then sends packets over its radio: Wi-Fi to your home router, or cellular to a tower. If the radio
was idle to save battery, it must first wake up and get permission to send, which can take a noticeable
fraction of a second. This is one reason the first request after a pause feels slow
([chapter 8](/internet/last-mile)).

Your phone usually has a private address that the internet cannot reach. A router rewrites it to a shared
public address on the way out and remembers the mapping, so replies find their way back. This is
<Term id="nat">network address translation (NAT)</Term>. Your home router does it, and mobile carriers do it
for many customers at once.

### Your provider and the internet

Your <Term id="isp">internet service provider (ISP)</Term>, a broadband company or a mobile carrier, carries
the packets out of its network. The internet is tens of thousands of separately run networks. They tell each
other which addresses they can reach using the <Term id="bgp">Border Gateway Protocol (BGP)</Term>, and hand
packets from one to the next ([chapter 9](/internet/internet-routing)).

The path is often shorter than "the internet" suggests. Large websites and CDNs connect their networks
directly to many big ISPs. So a request may go from your ISP straight into the website's network, crossing no
one else.

### The website's edge

The request does not travel to a distant datacenter. It ends at an edge site in or near your city, called a
<Term id="pop">point of presence (PoP)</Term>. Large websites, <Term id="cdn">CDNs</Term> and cloud
providers run hundreds of them. Which PoP you reach is decided by DNS answers or by
<Term id="anycast">anycast</Term>, where the same address is announced from every PoP and routing picks a
nearby one ([chapter 10](/edge/steering)).

Inside the PoP, the request passes three stages:

1. A <Term id="layer-4">layer 4 (L4)</Term> load balancer spreads incoming connections across many proxy
   servers. It looks only at addresses and ports, which makes it fast and simple
   ([chapter 11](/edge/l4-load-balancing)).
2. A <Term id="layer-7">layer 7 (L7)</Term> proxy ends the encrypted connection. It completes the
   <Term id="tls">TLS</Term> handshake, decrypts the request and reads the HTTP inside: host, path, headers.
   It can then route, rate-limit or reject it ([chapter 5](/protocols/tls), [chapter 6](/protocols/http),
   [chapter 12](/edge/l7-proxies)).
3. A CDN cache answers at once if it holds a fresh copy of the response. Images, scripts and video usually
   stop here ([chapter 13](/edge/cdns)).

### Behind the edge

If the cache cannot answer, the proxy forwards the request to the website's own servers, called the
<Term id="origin">origin</Term>. Large companies carry this traffic over their own long-distance network, a
<Term id="backbone">backbone</Term>, rather than the public internet. The edge keeps connections to the
origin open, so this hop does not pay for a new handshake ([chapter 14](/backend/edge-to-origin)).

In the datacenter, the request crosses a fabric of switches ([chapter 15](/backend/datacenter-fabric)). An
internal load balancer or service mesh picks one healthy server for the service
([chapter 16](/backend/reaching-the-service)). Finally the server's kernel hands the bytes to the
application, which the [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers.
This book stops at that first application server.

### Why ownership matters

You control only some hops. The website owns the edge, backbone and datacenter. Your ISP, the carriers in
between and the user's Wi-Fi are outside its control, yet users blame the website for all of them.

This shapes design. Large websites build edges close to users to shrink the part of the path they do not
control. They also measure from real users' devices, because their own servers cannot see the radio or the
home router ([chapter 18](/operations/observing-the-path)).

## Distance and round trips

**In short:** light in fiber covers about 200 km per millisecond. Every exchange that must wait for a reply
pays the full distance twice, and a new connection needs several such exchanges.

Light in glass fiber travels at about two thirds of its speed in a vacuum: roughly **200 km per
millisecond**. No engineering removes that limit. Better hardware can only remove the delays added on top.

Most network steps are a question and an answer. The sender waits for the reply before it continues. The
time for that is the <Term id="rtt">round-trip time (RTT)</Term>. Because the signal goes there and back,
each 100 km of distance adds at least 1 ms of RTT.

Some examples, derived from straight-line distance:

| Path | Straight-line distance | RTT floor from physics | In practice |
|---|---|---|---|
| Within one city | tens of km | well under 1 ms | set by the access network, not distance |
| Across the US, coast to coast | about 4,000 km | about 40 ms | more |
| London to New York | about 5,600 km | about 56 ms | about 70 ms |
| London to Sydney | about 17,000 km | about 170 ms | well over 200 ms |

Real paths are longer than the straight line, and each router and queue adds delay. So measured RTTs sit
above the floor, often well above it on mobile networks.

For most web and API requests, **round trips matter more than bandwidth**. A typical API response is a few
kilobytes. Sending it over a faster link saves almost nothing, while each extra round trip across an ocean
adds tens of milliseconds. Even large transfers start slowly and grow their sending rate one round trip at a
time ([chapter 3](/foundations/tcp-and-udp)).

::: details Going deeper: why fiber is slower than light
- Glass has a refractive index of about 1.47, so light in fiber travels at about 204,000 km/s: about 204 km
  per ms. "200 km per ms" is a safe round figure.
- Cables follow coasts, roads and sea floors, not great circles. Routing between networks can add detours,
  such as traffic between two cities in one country leaving through a third city.
- Microwave and other radio links travel close to the speed of light in air. Some trading firms use them
  between exchanges for that reason. They carry little data and do not change web latency.
:::

## Cold and warm requests

**In short:** a cold request must look up the name, open a connection and set up encryption before it can
ask for anything: about four round trips. A warm request reuses an open connection and needs about one.

Imagine a phone opening an app for the first time today. It has no cached address and no open connection.
Before the first byte of the answer arrives, it needs:

1. **A DNS lookup**: one round trip to the resolver, if the resolver has the answer cached.
2. **A TCP connection**: one round trip to the edge for the handshake.
3. **A TLS handshake**: one more round trip to agree on keys, with TLS 1.3.
4. **The request itself**: one round trip, plus the time the server takes to answer.

This is a <Term id="cold-request">cold request</Term>. The next request on the same connection skips steps 1
to 3. It is a **warm request**, and costs one round trip plus server time. On a 50 ms mobile round trip, that
is roughly the difference between 200 ms and 50 ms before any server work.

<MapColdWarmDiagram />

<Term id="quic">QUIC</Term>, the transport under HTTP/3, combines the connection and TLS handshakes into one
round trip. A client that has talked to the server recently can even send its request in the first message
([chapter 7](/protocols/quic)).

Three consequences follow, and interviewers like all three:

- **Handshakes should happen close to the user.** If the edge is 10 ms away, the three setup round trips cost
  about 30 ms. If the origin is 150 ms away, they would cost about 450 ms. Ending TLS at a nearby PoP, then
  using a warm connection to the origin, means the long distance is paid once per request, not four times.
- **Connection reuse is a performance feature.** Apps that open a new connection for each request pay the
  cold price every time. Keeping connections alive and using HTTP/2 or HTTP/3 to send many requests over one
  is often the biggest single win ([chapter 6](/protocols/http)).
- **Redirects are hidden cold requests.** A redirect from `example.com` to `www.example.com` costs a full
  round trip, and a new name may need a new lookup and connection too.

The response time measured at the client is the <Term id="ttfb">time to first byte (TTFB)</Term>. It
includes all of the above.

::: details Going deeper: round-trip counts in detail
- TLS 1.2 needs two round trips for a full handshake; TLS 1.3 (RFC 8446, 2018) needs one. Both can resume
  an earlier session more cheaply.
- TLS 1.3 and QUIC both offer **0-RTT**: on a resumed session the client sends its request with the first
  handshake message. The cost is that an attacker can replay that first request, so servers accept 0-RTT
  only for safe requests ([chapter 5](/protocols/tls)).
- A DNS lookup that misses the resolver's cache adds round trips from the resolver to authoritative
  servers. A <Term id="cname">CNAME</Term> to a CDN adds another lookup ([chapter 4](/protocols/dns)).
- Browsers hide some cold cost: they look up names and open connections early when a page hints at them
  (`dns-prefetch`, `preconnect`). Mobile apps can warm a connection at startup.
:::

## A latency budget

**In short:** the budget is mostly round trips times distance. Radio wake-ups and server work can add as
much again, and only the website controls the server part.

These are orders of magnitude, tied to a setting. Your numbers will differ, so measure them (below).

| Step | Setting | Order of magnitude |
|---|---|---|
| Radio wake-up | Phone idle, then sends | Up to about 100 ms on 4G; seconds on 3G |
| Round trip to a nearby edge | Home broadband or quiet Wi-Fi | A few ms to a few tens of ms |
| Round trip to a nearby edge | 4G or 5G | Tens of ms, more under load or weak signal |
| DNS lookup | Answer cached at a nearby resolver | A few ms to a few tens of ms |
| Edge to origin, one round trip | Same continent / across an ocean | Tens of ms / about 70 ms to over 200 ms |
| Round trip inside a datacenter | Between two servers | Well under 1 ms |
| Server work | The application | Under 1 ms to seconds; depends on the app |

A worked example, derived from the table. A phone on 4G has a 40 ms round trip to a nearby PoP. The origin
is across an ocean, 100 ms from the PoP. A cold, uncached request costs about four round trips to the edge
(160 ms), one warm round trip to the origin (100 ms), and server time. That is roughly a quarter of a second
before the server does any work. Add a radio wake-up and it approaches half a second.

The same request when warm costs 40 ms to the edge plus 100 ms to the origin. If the CDN can answer, only
the 40 ms remains. That is why caching and edge placement matter so much for users far from the origin.

::: details Going deeper: where these figures come from
- The radio figures come from Ilya Grigorik's *High Performance Browser Networking* (2013): LTE targets an
  idle-to-connected transition under 100 ms; 3G networks could take a couple of seconds. Real networks vary
  by carrier, signal and device.
- Ocean-crossing figures follow from distance at 200 km per ms, plus the detours described above.
- The datacenter figure reflects short cables and few switch hops. Queueing under load can raise it
  ([chapter 15](/backend/datacenter-fabric)).
:::

### Try it: split your own request

`curl` can print how long each phase took. It works on stock Linux and macOS:

```bash
curl -o /dev/null -s -w 'dns      %{time_namelookup}\nconnect  %{time_connect}\ntls      %{time_appconnect}\nfirst    %{time_starttransfer}\ntotal    %{time_total}\n' https://www.example.com/
```

```text
dns      0.021
connect  0.042
tls      0.069
first    0.092
total    0.093
```

(Illustrative; your numbers will differ.) Each value is seconds **since the start**, not the length of the
step. Subtract neighbours to get each phase:

- `connect − dns` is the TCP handshake: about one round trip to whatever answered. Here, 21 ms.
- `tls − connect` is the TLS handshake: about one round trip with TLS 1.3. Here, 27 ms.
- `first − tls` is one round trip plus the server's work. Here, 23 ms, so the server answered almost at once:
  probably a cache hit.

To see a warm request, give curl the same URL twice, with `-o /dev/null` for each. It reuses the connection
for the second transfer and reports `0` for its DNS, connect and TLS times. Only the request's own round trip
remains. A large gap between `tls` and `first` points at the server or the origin, not the network.
[Chapter 18](/operations/observing-the-path) turns this into a full debugging method with `mtr` and
`tcpdump`.

## How the book follows the path

**In short:** each part of the book covers one stretch of the map, in the order a request meets it.

- **Foundations** (chapters 2–3): packets, addresses and the transport protocols every hop relies on.
- **Protocols the client speaks** (chapters 4–7): DNS, TLS, HTTP and QUIC, end to end between phone and edge.
- **Reaching the internet** (chapters 8–9): the radio, NAT and the routing between networks.
- **The edge** (chapters 10–13): choosing a PoP, load balancing, proxies and caching.
- **Behind the edge** (chapters 14–16): backbone, datacenter fabric and finding the server.
- **Operating the path** (chapters 17–18): timeouts, retries, overload and debugging across all hops.

The capstone, [What Happens When…](/extras/what-happens-when), walks the map again in full detail once you
have read the rest.

## Why this matters in real systems

**Global apps put the edge near users and keep the origin central.** A service may run its application in
two or three regions but have PoPs in hundreds of cities. Users get fast handshakes and cached content
locally. Only dynamic requests make the long trip, over connections that are already warm
([chapter 14](/backend/edge-to-origin)).

**Mobile apps pay the cold price often.** Phones switch networks, sleep their radios and lose connections
in the background. So many requests from a mobile app are cold, even for heavy users. Teams reduce this by
reusing connections, using QUIC (which survives network changes) and warming a connection at startup
([chapter 8](/internet/last-mile)).

**Region choice is a physics question.** A team serving Australian users from a single US region pays well
over 100 ms per round trip before any optimisation. Caching and edge termination help a lot. But anything
that needs several sequential calls to the origin is still slow, and only a closer region fixes that.

**ML serving has the same shape.** For a chat-style API, the user notices the time to the first streamed
token. The model's work often dominates it, but a cold connection from a distant client can add hundreds of
milliseconds. API clients that keep connections open avoid that.

## Where it breaks

**Verizon route leak, 2019: a hop nobody involved owned.** On 24 June 2019, a small network in Pennsylvania
passed on routes for other companies' addresses, created by a routing optimiser at its provider. Verizon
passed them on to the rest of the internet. Traffic for Cloudflare and many other networks was drawn through
the small network, which could not carry it. **Lesson:** your users' path crosses networks you do not
control, and a mistake there looks like your outage.
([Cloudflare, 2019](https://blog.cloudflare.com/how-verizon-and-a-bgp-optimizer-knocked-large-parts-of-the-internet-offline-today/))

**Fastly, 2021: the edge is a shared hop.** On 8 June 2021, a valid configuration change by one customer
triggered a software bug that Fastly had deployed in May. About 85% of Fastly's network returned errors, and
many large websites went down at once. Fastly reported 95% of its network was back within 49 minutes.
**Lesson:** the CDN sits on the path of every request, so its failure is your failure; plan how to bypass
it. ([Fastly, 2021](https://www.fastly.com/blog/summary-of-june-8-outage))

**Facebook, 2021: the backbone took everything with it.** On 4 October 2021, a maintenance command
disconnected Facebook's backbone, which links its datacenters. Its DNS servers then withdrew their routes, so
Facebook's services were unreachable worldwide for about six hours. **Lesson:** hops behind the edge are
invisible to users until they fail, and then nothing in front of them can help.
([Facebook engineering, 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. What happens when you type a URL into a browser and press Enter? Answer at senior level.
Name the stages in order and say what each costs. The browser checks its caches, then resolves the name with
DNS, usually from a resolver's cache. It opens a connection to the address it gets: a TCP handshake, then a
TLS handshake, or one combined QUIC handshake. It sends the HTTP request and waits for the response.

Then follow the request across the network. The phone's radio may need to wake. NAT rewrites the address.
The ISP hands packets toward the website's network, often directly. The address leads to a nearby PoP,
chosen by DNS or anycast. There, an L4 load balancer picks a proxy, the proxy ends TLS and reads the request,
and the CDN cache may answer. On a miss, the request crosses the backbone on a warm connection to a
datacenter, where an internal load balancer picks an application server.

**Senior add-on:** talk about time, not only steps. A cold request costs about four round trips before the
server works; a warm one costs one. Ending TLS near the user is the main reason edges exist. Mention that
typing a bare name may first hit `http://` and redirect, unless the site is on the browser's HSTS preload
list (a built-in list of sites that are always opened over HTTPS). Say how you would measure each phase (`curl -w`, browser timing APIs).
:::

::: details 2. Your service runs in one US region. Users in Australia complain it is slow. What do you do?
Start with physics. Sydney to the US west coast is about 12,000 km, so a round trip cannot be under about
120 ms. A cold request that does its handshakes with the US origin costs at least three of those, about
360 ms, before any server work.

Put an edge in or near Australia, using a CDN or your cloud's edge. Handshakes then happen tens of
milliseconds from users. The edge forwards requests to the US over warm connections, so each request pays the
ocean round trip once. Cache everything cacheable at the edge. Make the app reuse connections and send fewer
sequential requests.

**Senior add-on:** state what is left. Dynamic requests still pay one trans-Pacific round trip, and screens
that need several sequential calls pay it several times. If that matters, the fix is moving data and
compute closer: a second region, with the data consistency costs that brings. Measure from real users
before and after, by country and network type.
:::

::: details 3. Users in one country say the app's first screen takes several seconds. Your server dashboards look normal. How do you find out why?
Normal server metrics mean the time is going somewhere before or after the server. Split the request into
phases from the user's side: DNS, connect, TLS, time to first byte. Real-user timing from the app does this
at scale; `curl -w` from a machine in that country does it for one request.

Then read the phases. Slow DNS points at the resolver. Slow connect and TLS mean a long round trip: are these
users reaching a distant PoP? Check which PoP they hit and their round-trip times. A slow first byte with
fast setup points at the origin path or a cache miss.

**Senior add-on:** compare by network. If one mobile carrier is slow and others are fine, suspect its routing
or its connection to your network, and check whether you exchange traffic directly. If only first requests
are slow, suspect radio wake-ups and cold connections, and look at connection reuse. Packet loss shows up as
long, uneven tails rather than a constant delay ([chapter 18](/operations/observing-the-path)).
:::

::: details 4. Why does a faster connection often not make a web page or API call faster?
Most requests are small. Their time is spent waiting for round trips, not pushing bytes. A cold request needs
several round trips, and each costs at least the distance there and back at 200 km per ms. More bandwidth
does not shorten any of them.

**Senior add-on:** bandwidth starts to matter for large responses, such as video or model downloads. Even
then, a new connection ramps up its sending rate one round trip at a time, so the first part of a transfer is
also bound by round trips ([chapter 3](/foundations/tcp-and-udp)).
:::

::: details 5. Why do companies end TLS at an edge site instead of at their origin?
A TLS connection needs a TCP and a TLS handshake before the first request. Doing them with a nearby PoP costs
a few short round trips instead of a few long ones. The PoP then sends the request to the origin over a
connection that is already open.

It also lets the edge cache responses, filter attacks and spread load, because it can read the request.

**Senior add-on:** the cost is that the edge holds certificates and private keys and sees decrypted traffic.
The edge-to-origin hop needs its own encryption and authentication ([chapter 14](/backend/edge-to-origin)).
:::

## Common misconceptions

- **"The request goes to the website's datacenter."** Most requests end at an edge site near the user. Only
  cache misses and dynamic requests go further.
- **"Faster internet means faster pages."** Round trips usually dominate, and distance sets a floor no
  bandwidth can lower.
- **"Latency is a fixed number for a user."** It depends on the radio state, the network, the PoP reached
  and whether the connection is warm.
- **"The internet is a long chain of networks."** Big websites connect directly to many ISPs, so the path is
  often only two or three networks.
- **"The server's response time is what users see."** Users also pay for DNS, handshakes and every round
  trip; server metrics cannot see those.

## Key takeaways

- A request crosses **your device, your ISP, other networks, the website's edge, its backbone and its
  datacenter**. Each is run by someone different.
- Light in fiber covers about **200 km per ms**; every round trip pays the distance twice.
- A **cold request** costs about four round trips before the server works; a **warm request** about one.
- Edges exist mainly to **do handshakes and caching close to users**, and send the rest over warm connections.
- Measure your own path with `curl -w`: subtract the phases to see where the time goes.

## Review

<Flashcards id="the-map" :cards="cards" />

<MarkDone id="the-map" />

## Sources

- [High Performance Browser Networking](https://hpbn.co/), Ilya Grigorik (book, 2013), especially
  [Primer on Latency and Bandwidth](https://hpbn.co/primer-on-latency-and-bandwidth/) and
  [Mobile Networks](https://hpbn.co/mobile-networks/)
- [RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293) (RFC, 2022)
- [RFC 8446: The Transport Layer Security (TLS) Protocol Version 1.3](https://www.rfc-editor.org/rfc/rfc8446) (RFC, 2018)
- [RFC 9000: QUIC, A UDP-Based Multiplexed and Secure Transport](https://www.rfc-editor.org/rfc/rfc9000) (RFC, 2021)
- [curl man page: `--write-out`](https://curl.se/docs/manpage.html#-w) (documentation)
- [What happens when…](https://github.com/alex/what-happens-when) (community document, ongoing)
- [How Verizon and a BGP Optimizer Knocked Large Parts of the Internet Offline Today](https://blog.cloudflare.com/how-verizon-and-a-bgp-optimizer-knocked-large-parts-of-the-internet-offline-today/) (Cloudflare blog, 2019)
- [Summary of June 8 outage](https://www.fastly.com/blog/summary-of-june-8-outage) (Fastly incident report, 2021)
- [More details about the October 4 outage](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) (Facebook engineering blog, 2021)
