---
title: "A. Interview Question Bank"
---

# A. Interview Question Bank

This page collects every interview question from the book, one chapter after another, followed by harder
questions that combine several chapters. Use it in the week before your interviews, to find the gaps you
still have.

::: info How to use this page
1. **Answer out loud first.** Read the question and answer it as you would in an interview, before you open
   the box. Talking through an answer shows gaps that reading does not.
2. **Then open the box.** It holds the core of a good answer in one or two sentences. If you missed it, or
   could not explain it simply, mark the question.
3. **Follow the links for anything you marked.** "Full answer" goes to the chapter's interview questions,
   where the model answer and its senior add-on live. "Section" goes to the part of the chapter that explains
   the topic.
4. **Finish with the senior curveballs** at the end. They mix topics from several chapters, as real
   senior and infrastructure interviews do.
:::

## 1. The Map: One Request, End to End

[Chapter 1](/foundations/the-map)

::: details 1.1 What happens when you type a URL into a browser and press Enter? Answer at senior level.
Caches, DNS, a TCP and TLS handshake (or one QUIC handshake), then the request, which reaches a nearby edge,
an L4 balancer, a proxy, the CDN cache and, on a miss, an origin region. Put time on it: a cold request costs
about four round trips before the server works, a warm one costs one.

Full answer: [Chapter 1, Q1](/foundations/the-map#interview-questions) · Section: [The path at a glance](/foundations/the-map#the-path-at-a-glance)
:::

::: details 1.2 Your service runs in one US region. Users in Australia complain it is slow. What do you do?
Physics sets a floor of about 120 ms per round trip, and a cold request pays several. Put an edge near the
users so handshakes stay local, forward over warm connections, and cache what you can.

Full answer: [Chapter 1, Q2](/foundations/the-map#interview-questions) · Section: [Distance and round trips](/foundations/the-map#distance-and-round-trips)
:::

::: details 1.3 Users in one country say the first screen takes seconds, but server dashboards look normal. How do you find out why?
The time is outside the server. Split the request into DNS, connect, TLS and first byte from the user's side,
then slice by network and PoP to see which phase grew.

Full answer: [Chapter 1, Q3](/foundations/the-map#interview-questions) · Section: [A latency budget](/foundations/the-map#a-latency-budget)
:::

::: details 1.4 Why does a faster connection often not make a web page or API call faster?
Most requests are small, so their time goes to round trips, not to moving bytes. More bandwidth does not
shorten a round trip.

Full answer: [Chapter 1, Q4](/foundations/the-map#interview-questions) · Section: [Cold and warm requests](/foundations/the-map#cold-and-warm-requests)
:::

::: details 1.5 Why do companies end TLS at an edge site instead of at their origin?
The handshakes then cross a short distance, and the edge forwards over an already open connection. The edge
can also cache, filter attacks and spread load, at the cost of holding keys and seeing plaintext.

Full answer: [Chapter 1, Q5](/foundations/the-map#interview-questions) · Section: [Distance and round trips](/foundations/the-map#distance-and-round-trips)
:::

## 2. Packets & Links

[Chapter 2](/foundations/packets-and-links)

::: details 2.1 Your laptop sends a packet to a server on another network. What happens at layers 2 and 3?
The laptop sees the server is off its prefix and frames the packet to the gateway's MAC, found with ARP or
NDP. Each router does a longest-prefix match, lowers the TTL and builds a new frame; the IP addresses stay
the same unless a NAT rewrites them.

Full answer: [Chapter 2, Q1](/foundations/packets-and-links#interview-questions) · Section: [The local link](/foundations/packets-and-links#the-local-link-frames-mac-addresses-and-the-gateway)
:::

::: details 2.2 Why do we need both MAC addresses and IP addresses?
A MAC address names a card on one link; an IP address names a destination across the internet, in
prefixes routers can aggregate. The split also lets a device move between networks.

Full answer: [Chapter 2, Q2](/foundations/packets-and-links#interview-questions) · Section: [The local link](/foundations/packets-and-links#the-local-link-frames-mac-addresses-and-the-gateway)
:::

::: details 2.3 Routes for 10.0.0.0/8, 10.1.0.0/16 and 0.0.0.0/0: where does 10.1.2.3 go, and why does the rule matter?
To the `/16`, the longest matching prefix. The rule lets narrow routes override broad ones, which powers
traffic engineering and also BGP hijacks.

Full answer: [Chapter 2, Q3](/foundations/packets-and-links#interview-questions) · Section: [Longest-prefix match](/foundations/packets-and-links#how-a-router-chooses-longest-prefix-match)
:::

::: details 2.4 After setting up a site-to-site VPN, SSH works but HTTPS downloads hang after a few kilobytes. Why?
An MTU black hole: full-size packets do not fit the tunnel, and the ICMP "packet too big" message never gets
back. Confirm with don't-fragment pings; fix ICMP filtering, clamp the MSS and set the tunnel MTU.

Full answer: [Chapter 2, Q4](/foundations/packets-and-links#interview-questions) · Section: [MTU, fragmentation and black holes](/foundations/packets-and-links#mtu-fragmentation-and-black-holes)
:::

::: details 2.5 You are designing an overlay network for a fleet (VXLAN or WireGuard). How do you handle MTU?
Either raise the underlay MTU to fit the wrapping overhead, or lower the overlay MTU by that overhead on every
host. Then clamp the MSS at the edges, allow ICMP and test the exact boundary sizes.

Full answer: [Chapter 2, Q5](/foundations/packets-and-links#interview-questions) · Section: [MTU, fragmentation and black holes](/foundations/packets-and-links#mtu-fragmentation-and-black-holes)
:::

::: details 2.6 How does traceroute work, and what can mislead you?
It sends probes with rising TTLs, and each router that drops one replies with "time exceeded". Slow ICMP
replies, asymmetric return paths and parallel paths all mislead; only loss that persists to the end is real.

Full answer: [Chapter 2, Q6](/foundations/packets-and-links#interview-questions) · Section: [TTL, ICMP and traceroute](/foundations/packets-and-links#ttl-icmp-and-traceroute)
:::

::: details 2.7 Why is "block all ICMP" a bad firewall policy?
ICMP carries the errors the network depends on: without "packet too big", path MTU discovery fails, and IPv6
neighbour discovery runs over ICMPv6. Allow the error types and rate-limit echo instead.

Full answer: [Chapter 2, Q7](/foundations/packets-and-links#interview-questions) · Section: [TTL, ICMP and traceroute](/foundations/packets-and-links#ttl-icmp-and-traceroute)
:::

::: details 2.8 What changes for your service when you add IPv6 support?
AAAA records and IPv6 on every public entry point, and an audit of everything that handles addresses:
logging, rate limits, allow lists. Rate-limit by `/64`, and measure IPv6 separately because Happy Eyeballs
hides breakage.

Full answer: [Chapter 2, Q8](/foundations/packets-and-links#interview-questions) · Section: [IPv6: what changes](/foundations/packets-and-links#ipv6-what-changes)
:::

## 3. TCP & UDP as Protocols

[Chapter 3](/foundations/tcp-and-udp)

::: details 3.1 Why does the first request to a new HTTPS server take so long, even for a tiny response?
TCP needs a round trip, TLS 1.3 another, and the request a third, after DNS. Larger responses also wait on
slow start, which sends about 14 KB in the first round trip.

Full answer: [Chapter 3, Q1](/foundations/tcp-and-udp#interview-questions) · Section: [The three-way handshake](/foundations/tcp-and-udp#opening-a-connection-the-three-way-handshake)
:::

::: details 3.2 What is the difference between flow control and congestion control?
Flow control protects the receiver through its advertised window; congestion control protects the network
through the sender's own estimate. The sender keeps the smaller of the two in flight.

Full answer: [Chapter 3, Q2](/foundations/tcp-and-udp#interview-questions) · Section: [Flow control vs congestion control](/foundations/tcp-and-udp#flow-control-vs-congestion-control)
:::

::: details 3.3 How does TCP detect that a packet was lost?
Duplicate acknowledgements (and SACK) trigger a fast retransmit about one round trip later. If nothing comes
back, the retransmission timeout fires, which also collapses the congestion window.

Full answer: [Chapter 3, Q3](/foundations/tcp-and-udp#interview-questions) · Section: [Detecting and repairing loss](/foundations/tcp-and-udp#detecting-and-repairing-loss)
:::

::: details 3.4 Compare CUBIC and BBR. Which would you pick for a video service with many mobile users?
CUBIC backs off on loss; BBR sends at the measured bandwidth and minimum round trip. BBR often suits lossy
mobile links better, but A/B test it by network type.

Full answer: [Chapter 3, Q4](/foundations/tcp-and-udp#interview-questions) · Section: [CUBIC and BBR](/foundations/tcp-and-udp#cubic-and-bbr)
:::

::: details 3.5 Users in one country report slow downloads. How do you find out whether TCP is the cause?
Compare real-client numbers by country, then read `ss -ti` for those users. A long round trip without loss
means distance; retransmissions mean a bad path; a small receive window means the client.

Full answer: [Chapter 3, Q5](/foundations/tcp-and-udp#interview-questions) · Section: [Flow control vs congestion control](/foundations/tcp-and-udp#flow-control-vs-congestion-control)
:::

::: details 3.6 You are designing a real-time voice app. TCP or UDP?
UDP with your own logic: a late voice packet is useless, and TCP would stall everything behind it. Add
sequence numbers, adapt the bitrate, and keep a TCP or TLS fallback for networks that block UDP.

Full answer: [Chapter 3, Q6](/foundations/tcp-and-udp#interview-questions) · Section: [UDP](/foundations/tcp-and-udp#udp-what-it-leaves-out-and-who-builds-on-it)
:::

::: details 3.7 What is head-of-line blocking, and why can HTTP/2 be slower than HTTP/1.1 on a lossy network?
TCP delivers in order, so one lost packet holds back every byte behind it. HTTP/2 puts all requests on one
connection, so one loss stalls them all; six HTTP/1.1 connections lose only one.

Full answer: [Chapter 3, Q7](/foundations/tcp-and-udp#interview-questions) · Section: [Head-of-line blocking](/foundations/tcp-and-udp#head-of-line-blocking)
:::

::: details 3.8 Why is QUIC built on UDP instead of being a new protocol alongside TCP?
Middleboxes pass only TCP and UDP, and changing TCP means changing kernels and middleboxes. UDP adds almost
nothing, so QUIC can build everything in user space and ship with the app.

Full answer: [Chapter 3, Q8](/foundations/tcp-and-udp#interview-questions) · Section: [UDP](/foundations/tcp-and-udp#udp-what-it-leaves-out-and-who-builds-on-it)
:::

::: details 3.9 A client's connection hangs for minutes after a brief network outage. Why?
Each lost retransmission doubled the timeout, so the next retry may be tens of seconds away after the network
returns. Do not rely on TCP to detect dead peers: use deadlines, heartbeats or `TCP_USER_TIMEOUT`.

Full answer: [Chapter 3, Q9](/foundations/tcp-and-udp#interview-questions) · Section: [Detecting and repairing loss](/foundations/tcp-and-udp#detecting-and-repairing-loss)
:::

::: details 3.10 Your mobile app calls an API across an ocean. How would you make each call fast?
Reuse one multiplexed connection, terminate it at a nearby edge that forwards over warm connections, and
keep responses small enough for slow start's first round trips. Use QUIC where available.

Full answer: [Chapter 3, Q10](/foundations/tcp-and-udp#interview-questions) · Section: [Slow start](/foundations/tcp-and-udp#slow-start-why-new-connections-are-slow)
:::

## 4. DNS

[Chapter 4](/protocols/dns)

::: details 4.1 What happens, DNS-wise, when you type a URL into a browser?
Browser and OS caches first, then the stub asks a recursive resolver. On a miss the resolver walks root,
TLD and authoritative servers, caching each answer for its TTL.

Full answer: [Chapter 4, Q1](/protocols/dns#interview-questions) · Section: [Who answers](/protocols/dns#who-answers-stub-recursive-and-authoritative)
:::

::: details 4.2 What is the difference between a recursive resolver and an authoritative server? Why split them?
The authoritative server holds a zone's records; the resolver answers anything by asking and caching. The
split lets caches absorb most traffic, but location-aware answers then see the resolver, not the user.

Full answer: [Chapter 4, Q2](/protocols/dns#interview-questions) · Section: [Who answers](/protocols/dns#who-answers-stub-recursive-and-authoritative)
:::

::: details 4.3 Design DNS-based failover between two regions.
Health-check from several places and return the healthy region with a short TTL. Then handle what DNS cannot:
stretched caches, open connections, capacity in the surviving region, and flapping.

Full answer: [Chapter 4, Q3](/protocols/dns#interview-questions) · Section: [Load balancing with DNS](/protocols/dns#load-balancing-with-dns-and-its-limits)
:::

::: details 4.4 You changed a record an hour ago and some users still reach the old IP. How do you find out why?
Query every authoritative server directly, then users' resolvers and the old TTL. Then check the client:
pinned connections, runtime caches, `/etc/hosts`.

Full answer: [Chapter 4, Q4](/protocols/dns#interview-questions) · Section: [Caching and TTLs](/protocols/dns#caching-and-ttls)
:::

::: details 4.5 How do you choose a TTL?
Short TTLs allow fast changes but cost queries and dependence on your provider; long ones are cheap and
survive outages but make mistakes slow to undo. Lower the TTL ahead of planned changes.

Full answer: [Chapter 4, Q5](/protocols/dns#interview-questions) · Section: [Caching and TTLs](/protocols/dns#caching-and-ttls)
:::

::: details 4.6 A new subdomain works for you, but some users get NXDOMAIN for half an hour. Why?
Negative caching: someone looked it up before it existed, and their resolver cached "does not exist" for the
zone's negative TTL from the SOA record.

Full answer: [Chapter 4, Q6](/protocols/dns#interview-questions) · Section: [Negative caching](/protocols/dns#negative-caching)
:::

::: details 4.7 Users in Asia report being sent to servers in the US. What could cause that?
Location-aware DNS sees the resolver, which may be a US corporate resolver, a VPN or a distant public
resolver without EDNS Client Subnet. Anycast avoids depending on the resolver's location.

Full answer: [Chapter 4, Q7](/protocols/dns#interview-questions) · Section: [Location-aware answers](/protocols/dns#location-aware-answers)
:::

::: details 4.8 Why does DNS use UDP? When does it use TCP, and what breaks if TCP port 53 is blocked?
UDP makes a lookup one message each way. Truncated large answers and zone transfers use TCP, so blocking it
breaks only large answers, which looks random by name.

Full answer: [Chapter 4, Q8](/protocols/dns#interview-questions) · Section: [UDP, TCP and truncated answers](/protocols/dns#udp-tcp-and-truncated-answers)
:::

::: details 4.9 Can you use DNS as a load balancer? What are the limits?
Coarsely: weighted, health-checked answers can shift traffic between sites. But one cached answer serves a
whole resolver, answers cannot be recalled, and DNS sees no load and retries nothing.

Full answer: [Chapter 4, Q9](/protocols/dns#interview-questions) · Section: [Load balancing with DNS](/protocols/dns#load-balancing-with-dns-and-its-limits)
:::

::: details 4.10 What do DNS over HTTPS and DNS over TLS change, for users and for operators?
The local network can no longer read or change lookups, but the resolver sees them all. Operators lose
network-level filtering, and internal names or location-aware answers may break.

Full answer: [Chapter 4, Q10](/protocols/dns#interview-questions) · Section: [Encrypted DNS: DoT and DoH](/protocols/dns#encrypted-dns-dot-and-doh)
:::

::: details 4.11 What does DNSSEC protect against, and what does it not?
It stops forged answers through signatures checked by validating resolvers. It does not encrypt, does not
cover the last hop unless the device validates, and adds an outage risk from bad keys or expired signatures.

Full answer: [Chapter 4, Q11](/protocols/dns#interview-questions) · Section: [Can you trust the answer?](/protocols/dns#can-you-trust-the-answer)
:::

::: details 4.12 Your DNS provider is under a large DDoS attack. How do you design so that you stay up?
Two independent authoritative providers in the NS records, fed from one zone in code. Keep stable TTLs long
enough to ride out short outages, and use only features both providers support.

Full answer: [Chapter 4, Q12](/protocols/dns#interview-questions) · Section: [Where it breaks](/protocols/dns#where-it-breaks)
:::

## 5. TLS

[Chapter 5](/protocols/tls)

::: details 5.1 Walk me through a TLS 1.3 handshake.
The ClientHello carries SNI, ALPN and a key share; the server replies with its key share, certificate,
signature and Finished in one flight. One round trip, with forward secrecy from ephemeral keys.

Full answer: [Chapter 5, Q1](/protocols/tls#interview-questions) · Section: [The TLS 1.3 handshake](/protocols/tls#the-tls-1-3-handshake)
:::

::: details 5.2 Why is TLS 1.3 faster than 1.2, and what does a cold HTTPS connection cost a phone?
The client guesses and sends a key share up front, saving a round trip. A cold TCP plus TLS 1.3 connection
costs about two round trips before the request, roughly 200 ms at 100 ms per round trip.

Full answer: [Chapter 5, Q2](/protocols/tls#interview-questions) · Section: [The TLS 1.3 handshake](/protocols/tls#the-tls-1-3-handshake)
:::

::: details 5.3 What is 0-RTT? When would you turn it on, and for what?
A returning client sends its first request inside the ClientHello, saving a round trip. It can be replayed,
so accept it only for requests that are safe to repeat.

Full answer: [Chapter 5, Q3](/protocols/tls#interview-questions) · Section: [Resumption and 0-RTT](/protocols/tls#resumption-and-0-rtt)
:::

::: details 5.4 Some clients fail with "unable to get local issuer certificate", but the site works in Chrome. Why?
Usually the server omits the intermediate certificate, which Chrome may have cached. Check with
`openssl s_client`, also for old trust stores and missing SNI, and serve the full chain.

Full answer: [Chapter 5, Q4](/protocols/tls#interview-questions) · Section: [Certificates and validation](/protocols/tls#certificates-and-validation)
:::

::: details 5.5 What does a certificate authority actually vouch for?
For most certificates, only that the requester controlled the domain at issuance. Certificate Transparency
and CAA records limit the damage of mis-issuance.

Full answer: [Chapter 5, Q5](/protocols/tls#interview-questions) · Section: [Certificates and validation](/protocols/tls#certificates-and-validation)
:::

::: details 5.6 Design certificate management for a company with thousands of domains and services.
Automate with ACME, keep an inventory with owners, renew early and hot-reload. Monitor every endpoint's
chain and expiry from outside, and watch CT logs.

Full answer: [Chapter 5, Q6](/protocols/tls#interview-questions) · Section: [Running certificates in production](/protocols/tls#running-certificates-in-production)
:::

::: details 5.7 How does certificate revocation work, and why do people say it is broken?
CRLs and OCSP tell clients about revoked certificates, but most clients soft-fail, so an attacker can block
the check. The industry is moving to browser-pushed CRLs and short lifetimes.

Full answer: [Chapter 5, Q7](/protocols/tls#interview-questions) · Section: [Certificates and validation](/protocols/tls#certificates-and-validation)
:::

::: details 5.8 A bank wants a CDN but will not give it its private key. How can that work?
Keyless or remote signing: the edge runs the handshake but sends the signature operation to the bank's key
server. It costs a round trip per full handshake and still exposes decrypted traffic to the CDN.

Full answer: [Chapter 5, Q8](/protocols/tls#interview-questions) · Section: [Terminating TLS at the edge](/protocols/tls#terminating-tls-at-the-edge)
:::

::: details 5.9 What does SNI reveal, what does ECH change, and what does that mean for a corporate network?
SNI shows the site name in plain text; ECH encrypts it behind a shared public name. Corporate filtering by SNI
stops working, so control moves to managed devices, resolvers and proxies.

Full answer: [Chapter 5, Q9](/protocols/tls#interview-questions) · Section: [Encrypted Client Hello](/protocols/tls#encrypted-client-hello)
:::

::: details 5.10 After a deploy, edge CPU spikes and p99 rises, but traffic is the same. What do you check?
The ratio of full to resumed handshakes: restarts force reconnects, and lost ticket keys make every reconnect
a full handshake. Drain gradually and keep ticket keys stable.

Full answer: [Chapter 5, Q10](/protocols/tls#interview-questions) · Section: [Resumption and 0-RTT](/protocols/tls#resumption-and-0-rtt)
:::

## 6. HTTP

[Chapter 6](/protocols/http)

::: details 6.1 What does idempotent mean, and why does it matter for HTTP?
Sending the request twice has the same effect on the server as once. Because a dropped connection leaves the
outcome unknown, only idempotent requests can be retried safely.

Full answer: [Chapter 6, Q1](/protocols/http#interview-questions) · Section: [Methods and idempotency](/protocols/http#methods-and-idempotency)
:::

::: details 6.2 Design a payments API so that clients can safely retry.
The client sends an idempotency key; the server stores key, request and result in the payment's transaction
and returns the stored result on repeats. Lock on the key and reject the same key with a different body.

Full answer: [Chapter 6, Q2](/protocols/http#interview-questions) · Section: [Methods and idempotency](/protocols/http#methods-and-idempotency)
:::

::: details 6.3 What is the difference between a 502 and a 504? What do you check for each?
Both come from a proxy: 502 means no valid response (refused, reset, garbage), 504 means it gave up waiting.
Check backend health and resets for 502, backend latency and the proxy timeout for 504.

Full answer: [Chapter 6, Q3](/protocols/http#interview-questions) · Section: [Status codes](/protocols/http#status-codes)
:::

::: details 6.4 Explain no-cache, no-store, private and max-age.
`max-age` sets freshness; `no-cache` allows storing but requires revalidation; `no-store` forbids storing;
`private` allows only the user's own browser to keep it.

Full answer: [Chapter 6, Q4](/protocols/http#interview-questions) · Section: [Caching headers](/protocols/http#caching-headers)
:::

::: details 6.5 How do ETags work, and what do they save?
A stale copy is revalidated with `If-None-Match`, and an unchanged resource returns `304` with no body. That
saves bandwidth and work, not the round trip; versioned URLs save that too.

Full answer: [Chapter 6, Q5](/protocols/http#interview-questions) · Section: [Caching headers](/protocols/http#caching-headers)
:::

::: details 6.6 What problem does HTTP/2 solve over HTTP/1.1, and what problem does it leave?
It interleaves many requests on one connection with compressed headers. It leaves TCP head-of-line blocking,
which HTTP/3 removes.

Full answer: [Chapter 6, Q6](/protocols/http#interview-questions) · Section: [HTTP/2](/protocols/http#http-2-many-requests-on-one-connection)
:::

::: details 6.7 After moving to gRPC, one backend is overloaded while new ones sit idle. Why, and how do you fix it?
gRPC keeps one long-lived HTTP/2 connection per backend, and a connection-level balancer chose once. Balance
per request (proxy or client-side) and set a maximum connection age.

Full answer: [Chapter 6, Q7](/protocols/http#interview-questions) · Section: [Connection reuse in practice](/protocols/http#connection-reuse-in-practice)
:::

::: details 6.8 Users report random "connection reset" errors that happen more at night. How do you find out why?
An idle-timeout race: a server closes an idle pooled connection as the client sends on it. List the idle
timeout at every hop and make each backend outlast the hop in front of it.

Full answer: [Chapter 6, Q8](/protocols/http#interview-questions) · Section: [Connection reuse in practice](/protocols/http#connection-reuse-in-practice)
:::

::: details 6.9 How would you send live updates from a server to a browser? Compare the options.
Long polling works everywhere but costs a request per message; Server-Sent Events stream one way over plain
HTTP; WebSockets are two-way. All need heartbeats and reconnect plans.

Full answer: [Chapter 6, Q9](/protocols/http#interview-questions) · Section: [Long-lived connections](/protocols/http#long-lived-connections-streaming-and-websockets)
:::

::: details 6.10 A personalised page started showing one user's data to another. Where do you look?
A shared cache stored a personal response: check `Cache-Control`, `Vary` and CDN rules. Purge and disable
caching first, then make personal responses uncacheable by default.

Full answer: [Chapter 6, Q10](/protocols/http#interview-questions) · Section: [Caching headers](/protocols/http#caching-headers)
:::

## 7. QUIC & HTTP/3

[Chapter 7](/protocols/quic)

::: details 7.1 Why is QUIC built on UDP instead of being a new protocol or an improved TCP?
TCP changes take years in kernels and are blocked by middleboxes, and new IP protocols are dropped. UDP passes
almost everywhere, so QUIC lives in user space and ships with the app.

Full answer: [Chapter 7, Q1](/protocols/quic#interview-questions) · Section: [Why a new transport](/protocols/quic#why-a-new-transport-and-why-on-udp)
:::

::: details 7.2 How many round trips before the request, over TCP and over QUIC?
TCP with TLS 1.3 needs two; QUIC combines transport and TLS into one, and 0-RTT on resumption sends the
request in the first packet.

Full answer: [Chapter 7, Q2](/protocols/quic#interview-questions) · Section: [The combined handshake](/protocols/quic#the-combined-handshake)
:::

::: details 7.3 How does HTTP/3 fix HTTP/2's head-of-line blocking? What blocking remains?
Each request gets its own QUIC stream with its own ordering, so a loss delays only its stream. Order within a
stream, the shared congestion window and header compression still couple them.

Full answer: [Chapter 7, Q3](/protocols/quic#interview-questions) · Section: [Streams without head-of-line blocking](/protocols/quic#streams-without-head-of-line-blocking)
:::

::: details 7.4 A phone switches from Wi-Fi to cellular mid-download. What happens over TCP and over QUIC?
TCP dies with the old address and must reconnect. QUIC finds the connection by its ID, validates the new path
and carries on, if the load balancer routes by connection ID.

Full answer: [Chapter 7, Q4](/protocols/quic#interview-questions) · Section: [Connection IDs and migration](/protocols/quic#connection-ids-and-migration)
:::

::: details 7.5 Design the rollout of HTTP/3 for a large website.
Terminate QUIC at the edge, route by connection ID, advertise with Alt-Svc and HTTPS records using short
lifetimes, and roll out by percentage. Compare QUIC and TCP users and plan a kill switch.

Full answer: [Chapter 7, Q5](/protocols/quic#interview-questions) · Section: [Discovery and fallback](/protocols/quic#discovery-and-fallback)
:::

::: details 7.6 After enabling HTTP/3, some users report pages that hang for seconds. How do you find out why?
Segment by network and client; clusters suggest UDP interference that defeats fallback. Reproduce with
`curl --http3-only` versus `--http2`, check packet sizes and four-tuple load balancing.

Full answer: [Chapter 7, Q6](/protocols/quic#interview-questions) · Section: [Discovery and fallback](/protocols/quic#discovery-and-fallback)
:::

::: details 7.7 Why does QUIC use more CPU than TCP, and what can you do about it?
It runs in user space and encrypts every packet without the kernel and hardware offloads TCP enjoys. Batch
system calls, use UDP segmentation offloads and tune the crypto.

Full answer: [Chapter 7, Q7](/protocols/quic#interview-questions) · Section: [The costs](/protocols/quic#the-costs)
:::

::: details 7.8 How does QUIC avoid being used for amplification attacks?
The client's first packet must be at least 1200 bytes, and the server sends at most three times what it
received until the address is validated. A Retry token proves the address under attack.

Full answer: [Chapter 7, Q8](/protocols/quic#interview-questions) · Section: [The costs](/protocols/quic#the-costs)
:::

::: details 7.9 Why does a classic layer-4 load balancer struggle with QUIC?
It hashes the four-tuple, which changes on NAT rebinding or migration. Route by connection ID, with the
server's identity encoded in the IDs it issues.

Full answer: [Chapter 7, Q9](/protocols/quic#interview-questions) · Section: [Connection IDs and migration](/protocols/quic#connection-ids-and-migration)
:::

::: details 7.10 QUIC encrypts its headers. What does that give, and what does it cost network operators?
Middleboxes cannot ossify or tamper with it, and privacy improves. Operators lose header-based loss and
round-trip measurement and must rely on endpoint metrics and qlog.

Full answer: [Chapter 7, Q10](/protocols/quic#interview-questions) · Section: [Why a new transport](/protocols/quic#why-a-new-transport-and-why-on-udp)
:::

## 8. The Last Mile & Mobile

[Chapter 8](/internet/last-mile)

::: details 8.1 Why is the first request from a mobile app often much slower than the rest?
The radio must wake, then DNS, TCP and TLS each cost round trips on a slow link. Later requests find all of
it warm.

Full answer: [Chapter 8, Q1](/internet/last-mile#interview-questions) · Section: [Radio states and the slow first request](/internet/last-mile#radio-states-and-the-slow-first-request)
:::

::: details 8.2 What is carrier-grade NAT, and how does it affect a service you run?
Many phones share one public IPv4 address. Per-IP rate limits, bans and geolocation then hit many innocent
users at once.

Full answer: [Chapter 8, Q2](/internet/last-mile#interview-questions) · Section: [Carrier-grade NAT](/internet/last-mile#carrier-grade-nat)
:::

::: details 8.3 Design rate limiting for a public API used heavily by mobile apps.
Limit by account or key first, then by device token and IPv6 `/64`. Keep IPv4 limits high as a backstop,
return `429` with a retry time, and prefer challenges to blocks.

Full answer: [Chapter 8, Q3](/internet/last-mile#interview-questions) · Section: [Carrier-grade NAT](/internet/last-mile#carrier-grade-nat)
:::

::: details 8.4 Chat messages stop arriving after the phone sits idle for a minute or two. What is happening?
A NAT on the path forgot the idle mapping, and neither end was told. Send keepalives shorter than the NAT
timeout and reconnect fast, or use the platform's push service.

Full answer: [Chapter 8, Q4](/internet/last-mile#interview-questions) · Section: [NAT and its timeouts](/internet/last-mile#nat-and-its-timeouts)
:::

::: details 8.5 Your app works on Wi-Fi but some features fail on a specific carrier. How do you find out why?
Check whether the carrier is IPv6-only with NAT64, and look for IPv4 literals in the failing feature. Also
check CGNAT-related blocks and MTU.

Full answer: [Chapter 8, Q5](/internet/last-mile#interview-questions) · Section: [IPv6-only mobile networks](/internet/last-mile#ipv6-only-mobile-networks-nat64-and-464xlat)
:::

::: details 8.6 What is Happy Eyeballs, and what problem can it hide?
The client races IPv6 and IPv4 and uses the first to connect. A broken IPv6 path then shows up only as a small
delay, so monitor each address family separately.

Full answer: [Chapter 8, Q6](/internet/last-mile#interview-questions) · Section: [Happy Eyeballs and switching networks](/internet/last-mile#happy-eyeballs-and-switching-networks)
:::

::: details 8.7 Users on busy Wi-Fi see good speed tests but laggy video calls. Why?
Speed tests measure throughput; calls need steady latency. Shared airtime and bufferbloat add jitter under
load, which per-flow queueing such as FQ-CoDel fixes.

Full answer: [Chapter 8, Q7](/internet/last-mile#interview-questions) · Section: [Bufferbloat](/internet/last-mile#bufferbloat-when-the-link-is-full)
:::

::: details 8.8 Does 5G solve mobile latency?
Partly: the radio hop can be faster, but the carrier core, the internet and distance remain. Round trips to a
normal cloud region are still tens of milliseconds.

Full answer: [Chapter 8, Q8](/internet/last-mile#interview-questions) · Section: [Where the latency comes from](/internet/last-mile#where-the-latency-comes-from)
:::

::: details 8.9 A phone moves from Wi-Fi to cellular mid-download. What happens, and how would you design for it?
The new address kills TCP connections. Listen for network changes, reconnect at once and resume with range
requests; QUIC can migrate the connection instead.

Full answer: [Chapter 8, Q9](/internet/last-mile#interview-questions) · Section: [Happy Eyeballs and switching networks](/internet/last-mile#happy-eyeballs-and-switching-networks)
:::

## 9. Internet Routing

[Chapter 9](/internet/internet-routing)

::: details 9.1 How does a packet from my phone find its way to a website's server across different companies' networks?
Autonomous systems announce their prefixes to neighbours with BGP, and each router forwards on the most
specific match. Route choice follows business policy, not latency.

Full answer: [Chapter 9, Q1](/internet/internet-routing#interview-questions) · Section: [How BGP works](/internet/internet-routing#how-bgp-works)
:::

::: details 9.2 What is the difference between transit and peering? Why would a large website peer?
Transit is paid reach to the whole internet; peering exchanges traffic between two networks' own users. Peering
is cheaper at volume, usually faster, and gives more control.

Full answer: [Chapter 9, Q2](/internet/internet-routing#interview-questions) · Section: [Transit, peering and exchanges](/internet/internet-routing#who-connects-to-whom-transit-peering-and-exchanges)
:::

::: details 9.3 How does anycast work? What happens to a TCP connection when the route changes?
Many sites announce the same prefix and each network picks its best route. A mid-connection route change lands
packets on a site with no state, which resets the connection.

Full answer: [Chapter 9, Q3](/internet/internet-routing#interview-questions) · Section: [Anycast](/internet/internet-routing#anycast)
:::

::: details 9.4 Design how a new global service connects to the internet.
PoPs near users with two or more transit providers each, then peering and private links as traffic grows. Own
address space with ROAs, an anycast-or-DNS choice, and a DDoS plan.

Full answer: [Chapter 9, Q4](/internet/internet-routing#interview-questions) · Section: [Transit, peering and exchanges](/internet/internet-routing#who-connects-to-whom-transit-peering-and-exchanges)
:::

::: details 9.5 Users of one ISP report high latency since this morning and nothing changed on your side. How do you find out why?
Scope it with real-user data, then compare paths both ways with `mtr` and looking glasses. A down peering link
or an anycast shift to a farther PoP are common causes.

Full answer: [Chapter 9, Q5](/internet/internet-routing#interview-questions) · Section: [Steering outbound traffic by measurement](/internet/internet-routing#steering-outbound-traffic-by-measurement)
:::

::: details 9.6 What is the difference between a route leak and a hijack? What does RPKI protect against?
A hijack announces someone else's prefix; a leak passes a real route to the wrong neighbours. RPKI checks the
origin AS, so it stops most hijacks but not leaks.

Full answer: [Chapter 9, Q6](/internet/internet-routing#interview-questions) · Section: [Route leaks and hijacks](/internet/internet-routing#route-leaks-and-hijacks)
:::

::: details 9.7 Your prefix is being hijacked right now. What do you do?
Confirm with public BGP data, announce more specifics down to `/24`, and get upstreams to filter the bad route.
If the prefix is already a `/24`, only RPKI and filtering help.

Full answer: [Chapter 9, Q7](/internet/internet-routing#interview-questions) · Section: [Route leaks and hijacks](/internet/internet-routing#route-leaks-and-hijacks)
:::

::: details 9.8 How would you absorb a multi-terabit DDoS attack?
Anycast across many sites so each takes a share, filter obvious junk at the edge, and divert through scrubbing
when a site lacks capacity. Filtering must happen before the congested link.

Full answer: [Chapter 9, Q8](/internet/internet-routing#interview-questions) · Section: [Absorbing volumetric DDoS](/internet/internet-routing#absorbing-volumetric-ddos)
:::

## 10. Steering Users & Failing Over

[Chapter 10](/edge/steering)

::: details 10.1 Design global load balancing for a service with worldwide users, 50 PoPs and 3 regions.
Anycast entry addresses at every PoP, PoPs forwarding to regions over a private network, and a real-user map
to override anycast with DNS where it fails. Fail open and move load in steps.

Full answer: [Chapter 10, Q1](/edge/steering#interview-questions) · Section: [Three levers](/edge/steering#three-levers-dns-anycast-and-the-client)
:::

::: details 10.2 A region dies at 2 a.m. Walk me through what happens to users.
In-flight requests fail and PoP health checks move traffic within seconds; DNS-steered users move as caches
expire. The surviving regions must absorb the surge, and failback must be slow.

Full answer: [Chapter 10, Q2](/edge/steering#interview-questions) · Section: [When a region dies](/edge/steering#when-a-region-dies)
:::

::: details 10.3 When would you choose DNS-based steering over anycast, and the reverse?
DNS for precise per-country, per-ISP or weighted control; anycast for fast failover and attack absorption.
Large systems combine them, driven by real-user measurement.

Full answer: [Chapter 10, Q3](/edge/steering#interview-questions) · Section: [Three levers](/edge/steering#three-levers-dns-anycast-and-the-client)
:::

::: details 10.4 Users of one ISP in Brazil reach a PoP in Miami instead of São Paulo. How do you find out why?
First find whether DNS or routing chose Miami by checking the address they get. Then check the resolver and map,
or the ISP's route to São Paulo, which often goes through US transit.

Full answer: [Chapter 10, Q4](/edge/steering#interview-questions) · Section: [Debugging: users reach the wrong site](/edge/steering#debugging-users-reach-the-wrong-site)
:::

::: details 10.5 How do you design health checks so they cannot cause an outage?
Check from several places with agreement and hysteresis, and test only what the site needs. Fail open when
everything looks down and cap how much capacity automation can remove.

Full answer: [Chapter 10, Q5](/edge/steering#interview-questions) · Section: [Health checks](/edge/steering#health-checks-knowing-what-is-down)
:::

::: details 10.6 You must take a region offline for a day of maintenance. How do you do it safely?
Confirm headroom elsewhere, shift traffic in steps while watching the receivers, and let connections and caches
drain. Bring it back slowly because its caches are cold.

Full answer: [Chapter 10, Q6](/edge/steering#interview-questions) · Section: [Capacity-aware steering and evacuation](/edge/steering#capacity-aware-steering-and-evacuation)
:::

::: details 10.7 How can a mobile app itself help with steering and failover?
Ship a refreshable endpoint list, fail over to the next endpoint immediately, race connections, and report
timings. Add jittered backoff and a safe built-in default list.

Full answer: [Chapter 10, Q7](/edge/steering#interview-questions) · Section: [Three levers](/edge/steering#three-levers-dns-anycast-and-the-client)
:::

## 11. L4 Load Balancing

[Chapter 11](/edge/l4-load-balancing)

::: details 11.1 What does an L4 load balancer do, and how is it different from an L7 one?
L4 picks a backend per connection from addresses and ports without reading the payload. L7 terminates the
connection and routes, retries and balances per request, at much higher cost per byte.

Full answer: [Chapter 11, Q1](/edge/l4-load-balancing#interview-questions) · Section: [What an L4 load balancer does](/edge/l4-load-balancing#what-an-l4-load-balancer-does)
:::

::: details 11.2 Why not use ECMP from the router straight to the backends?
Router hashing moves most flows when the path set changes, and it knows nothing about health. ECMP spreads
flows across the balancer tier, which makes rehashing harmless.

Full answer: [Chapter 11, Q2](/edge/l4-load-balancing#interview-questions) · Section: [ECMP, and why it is not enough](/edge/l4-load-balancing#ecmp-and-why-it-is-not-enough)
:::

::: details 11.3 Explain consistent hashing. Why does a Maglev table beat a hash ring for a packet balancer?
Consistent hashing remaps only the changed backend's share of flows. A Maglev table gives near-equal shares and
one array read per packet, where a ring needs virtual points and a search.

Full answer: [Chapter 11, Q3](/edge/l4-load-balancing#interview-questions) · Section: [Consistent hashing](/edge/l4-load-balancing#choosing-a-backend-consistent-hashing)
:::

::: details 11.4 Design the L4 load balancing tier for a large edge site.
Balancers announce VIPs over BGP behind router ECMP, hash into a shared consistent table, encapsulate to
backends and use direct server return. Add health checks that fail open and draining.

Full answer: [Chapter 11, Q4](/edge/l4-load-balancing#interview-questions) · Section: [Connection state](/edge/l4-load-balancing#connection-state-track-or-stay-stateless)
:::

::: details 11.5 What is direct server return, and what does it cost?
Backends reply to clients directly, so the balancer carries only the small inbound side. It costs encapsulation
and MTU care, backend setup, and a balancer that sees half of each connection.

Full answer: [Chapter 11, Q5](/edge/l4-load-balancing#interview-questions) · Section: [Delivering packets and the return path](/edge/l4-load-balancing#delivering-packets-and-the-return-path)
:::

::: details 11.6 Why does QUIC need special handling in an L4 balancer?
Its four-tuple can change mid-connection. Route on connection IDs that encode an encrypted server identity.

Full answer: [Chapter 11, Q6](/edge/l4-load-balancing#interview-questions) · Section: [QUIC and connection-ID-aware balancing](/edge/l4-load-balancing#quic-and-connection-id-aware-balancing)
:::

::: details 11.7 During every deploy, users see a spike of connection resets. How do you find out why?
Check whether a restarted backend resets connections it does not know, meaning flows moved mid-connection. Then
check draining and whether all balancers got the new table at once.

Full answer: [Chapter 11, Q7](/edge/l4-load-balancing#interview-questions) · Section: [Draining and deploys](/edge/l4-load-balancing#draining-and-deploys)
:::

::: details 11.8 Health checks fail on half the fleet but users see no errors. What do you do?
Suspect the checker: a shared dependency in the health URL, a network change or a broken prober. Make sure the
system fails open and separate liveness from dependency health.

Full answer: [Chapter 11, Q8](/edge/l4-load-balancing#interview-questions) · Section: [Health checks](/edge/l4-load-balancing#health-checks)
:::

::: details 11.9 One backend gets far more load than the others, though the table is even. Why?
Equal slots mean equal flows, not equal work: a few heavy connections or one big NATed client dominate. Balance
per request, cap connection lifetimes, or use load-aware tables.

Full answer: [Chapter 11, Q9](/edge/l4-load-balancing#interview-questions) · Section: [Consistent hashing](/edge/l4-load-balancing#choosing-a-backend-consistent-hashing)
:::

## 12. L7 Proxies

[Chapter 12](/edge/l7-proxies)

::: details 12.1 What is the difference between an L4 load balancer and an L7 proxy? Why use both?
L4 forwards connections cheaply; L7 reads each request to route, balance, rate limit and retry. L4 spreads
connections across a proxy fleet and gives it one stable address.

Full answer: [Chapter 12, Q1](/edge/l7-proxies#interview-questions) · Section: [What an L7 proxy does](/edge/l7-proxies#what-an-l7-proxy-does)
:::

::: details 12.2 Explain the power of two choices. Why not always pick the least-loaded server?
Pick two at random and use the less loaded: nearly as good as the global minimum. With many proxies and stale
data, all would pick the same idle-looking server and overload it.

Full answer: [Chapter 12, Q2](/edge/l7-proxies#interview-questions) · Section: [Balancing requests across backends](/edge/l7-proxies#balancing-requests-across-backends)
:::

::: details 12.3 A server that returns errors instantly gets more traffic, not less. Why?
Failing fast leaves few requests in flight, so least-request balancing keeps choosing it. Outlier detection on
error rates ejects it.

Full answer: [Chapter 12, Q3](/edge/l7-proxies#interview-questions) · Section: [Health checks and outlier detection](/edge/l7-proxies#health-checks-and-outlier-detection)
:::

::: details 12.4 Design rate limiting for a public API served from 50 PoPs.
Token buckets per API key with `429` and `Retry-After`. Generous local limits on each proxy plus regional shared
counters, accepting some inaccuracy, and fail open if the store is down.

Full answer: [Chapter 12, Q4](/edge/l7-proxies#interview-questions) · Section: [Rate limiting](/edge/l7-proxies#rate-limiting)
:::

::: details 12.5 After every deploy, users see a burst of 502s for a few seconds. How do you find out why?
Read the proxy's failure reason. Refused means the process stopped before removal, so fix the drain order;
resets on reused connections mean the backend's idle timeout is shorter than the proxy's.

Full answer: [Chapter 12, Q5](/edge/l7-proxies#interview-questions) · Section: [Health checks and outlier detection](/edge/l7-proxies#health-checks-and-outlier-detection)
:::

::: details 12.6 How do you deploy a new edge proxy version without dropping WebSocket connections?
Hand listening sockets to the new process and drain the old one. WebSockets must eventually close, so spread the
closes over time and have clients reconnect with jitter.

Full answer: [Chapter 12, Q6](/edge/l7-proxies#interview-questions) · Section: [Long-lived connections during deploys](/edge/l7-proxies#long-lived-connections-during-deploys)
:::

::: details 12.7 A gRPC service behind an L4 balancer has very uneven CPU across servers. Why, and what do you do?
Each client sends all calls over one long-lived connection, placed once. Balance per request with an L7 proxy or
client-side balancing, and set a maximum connection age.

Full answer: [Chapter 12, Q7](/edge/l7-proxies#interview-questions) · Section: [Balancing requests across backends](/edge/l7-proxies#balancing-requests-across-backends)
:::

::: details 12.8 Your search endpoint gets 50 times normal traffic from many IPs. How do you respond?
Confirm it is an attack from patterns and fingerprints, then rate-limit, challenge and block at the proxy. Protect
the backend with brief caching and load shedding on that route.

Full answer: [Chapter 12, Q8](/edge/l7-proxies#interview-questions) · Section: [L7 DDoS and bots](/edge/l7-proxies#l7-ddos-and-bots)
:::

## 13. CDNs

[Chapter 13](/edge/cdns)

::: details 13.1 How does a CDN make a website faster? Does it help for uncacheable responses?
Cached content comes from a nearby PoP. Uncacheable requests still gain: handshakes end nearby and the PoP uses
warm connections to the origin.

Full answer: [Chapter 13, Q1](/edge/cdns#interview-questions) · Section: [What a CDN does and why it helps](/edge/cdns#what-a-cdn-does-and-why-it-helps)
:::

::: details 13.2 Design the caching strategy for an e-commerce site: assets, product pages, prices and the cart.
Hashed assets cached for a year; product pages at the CDN with surrogate-key purges and stale serving; prices as a
microcache or small API call; cart and account `private`.

Full answer: [Chapter 13, Q2](/edge/cdns#interview-questions) · Section: [What to cache](/edge/cdns#what-to-cache)
:::

::: details 13.3 The CDN hit ratio dropped from 95% to 70% overnight. How do you find out why?
Check origin health first, then break misses down by host, path and PoP. Look for new query parameters,
`Set-Cookie`, `Vary`, shorter lifetimes, a purge or cold PoPs.

Full answer: [Chapter 13, Q3](/edge/cdns#interview-questions) · Section: [Cache keys and hit ratio](/edge/cdns#cache-keys-and-hit-ratio)
:::

::: details 13.4 What is an origin shield? When would you not use one?
A PoP near the origin through which all misses pass, so the origin sees about one request per object. Skip it
when the detour costs too much or you cannot make it redundant.

Full answer: [Chapter 13, Q4](/edge/cdns#interview-questions) · Section: [Tiered caching and the origin shield](/edge/cdns#tiered-caching-and-the-origin-shield)
:::

::: details 13.5 A breaking news page expires and the origin falls over. What happened, and how do you prevent it?
A thundering herd of misses hit the origin at once. Use request collapsing, a shield, `stale-while-revalidate`
and `stale-if-error`.

Full answer: [Chapter 13, Q5](/edge/cdns#interview-questions) · Section: [Serving stale and collapsing requests](/edge/cdns#serving-stale-and-collapsing-requests)
:::

::: details 13.6 How do you invalidate content at a CDN? What are the risks?
Change the URL, else purge by URL or surrogate key, and purge everything only as a last resort. Purge-all
floods the origin, and purges never reach browsers.

Full answer: [Chapter 13, Q6](/edge/cdns#interview-questions) · Section: [Purging and invalidation](/edge/cdns#purging-and-invalidation)
:::

::: details 13.7 Attackers request random URLs like `/?q=8f3a1`. Why is the origin struggling behind the CDN?
Every random query string is a new cache key, so every request misses. Drop unknown parameters from the key,
rate-limit at the edge and lock the origin to the CDN.

Full answer: [Chapter 13, Q7](/edge/cdns#interview-questions) · Section: [Absorbing attacks at the edge](/edge/cdns#absorbing-attacks-at-the-edge)
:::

::: details 13.8 Users see another user's account page after yesterday's CDN change. What happened?
A rule or missing `private` header let a shared cache store a personal response. Bypass and purge, roll back, and
mark personal responses uncacheable at the origin.

Full answer: [Chapter 13, Q8](/edge/cdns#interview-questions) · Section: [Cache keys and hit ratio](/edge/cdns#cache-keys-and-hit-ratio)
:::

::: details 13.9 Should you run your own CDN or buy one? What changes at very large scale?
Buying gives reach and features at once; building pays off for huge, predictable traffic and caches inside ISPs.
Many large companies do both.

Full answer: [Chapter 13, Q9](/edge/cdns#interview-questions) · Section: [Why this matters in real systems](/edge/cdns#why-this-matters-in-real-systems)
:::

## 14. Edge to Origin

[Chapter 14](/backend/edge-to-origin)

::: details 14.1 Why is a dynamic, uncacheable API faster through a CDN than directly to the origin?
Handshakes happen with a nearby PoP, which forwards over a warm connection, so only the request and response
cross the long distance. The gain depends on warm pools.

Full answer: [Chapter 14, Q1](/backend/edge-to-origin#interview-questions) · Section: [Warm, pooled, multiplexed connections](/backend/edge-to-origin#warm-pooled-multiplexed-connections)
:::

::: details 14.2 Occasional 502s from the edge, but the origin's logs show no errors. How do you find out why?
Likely the origin closes idle pooled connections before the edge does, so requests land on just-closed
connections. Make the pool's idle timeout shorter than every hop behind it.

Full answer: [Chapter 14, Q2](/backend/edge-to-origin#interview-questions) · Section: [Warm, pooled, multiplexed connections](/backend/edge-to-origin#warm-pooled-multiplexed-connections)
:::

::: details 14.3 Design the network path from a global edge to two origin regions.
PoPs keep warm, multiplexed connections to both regions and send to the best healthy one. Secure the leg with
mTLS, lock the origin to the edge, and size each region for all traffic.

Full answer: [Chapter 14, Q3](/backend/edge-to-origin#interview-questions) · Section: [Choosing an origin region](/backend/edge-to-origin#choosing-an-origin-region)
:::

::: details 14.4 What is split TCP? What does it give up?
The client's connection ends at a nearby proxy, which opens its own onward, so each leg recovers faster. It gives
up end-to-end semantics, adds per-connection state, and needs TLS termination.

Full answer: [Chapter 14, Q4](/backend/edge-to-origin#interview-questions) · Section: [Split TCP](/backend/edge-to-origin#split-tcp-ending-the-connection-near-the-user)
:::

::: details 14.5 When is a private backbone worth it compared with the public internet?
When you move a lot of traffic between your own sites or tail latency on the long leg costs money. It also
concentrates risk in its configuration.

Full answer: [Chapter 14, Q5](/backend/edge-to-origin#interview-questions) · Section: [Private backbone or public internet](/backend/edge-to-origin#private-backbone-or-public-internet)
:::

::: details 14.6 Why do backbone operators use central traffic engineering?
Shortest-path routing overloads the best links; a central controller places traffic on many paths and fills spare
capacity with bulk transfers. The risk moves to the controller.

Full answer: [Chapter 14, Q6](/backend/edge-to-origin#interview-questions) · Section: [Traffic engineering on the backbone](/backend/edge-to-origin#traffic-engineering-on-the-backbone)
:::

::: details 14.7 An attacker floods your origin directly, bypassing the CDN. What now, and what should you have done?
Allow only edge ranges at the firewall, get upstream filtering and move the origin address. Long term, require
mTLS or an outbound tunnel so the origin has no public listener.

Full answer: [Chapter 14, Q7](/backend/edge-to-origin#interview-questions) · Section: [Securing the edge-to-origin hop](/backend/edge-to-origin#securing-the-edge-to-origin-hop)
:::

::: details 14.8 One region fails. What happens on the edge-to-origin leg, and what can go wrong?
PoPs move traffic to the next region and may retry idempotent requests. Cold pools, missing capacity, homed data
and gray failures that pass health checks all bite.

Full answer: [Chapter 14, Q8](/backend/edge-to-origin#interview-questions) · Section: [Choosing an origin region](/backend/edge-to-origin#choosing-an-origin-region)
:::

## 15. The Datacenter Fabric

[Chapter 15](/backend/datacenter-fabric)

::: details 15.1 Why do modern datacenters use leaf-spine instead of a traditional tree?
Most traffic is server to server, and a tree funnels it through a few core switches. Leaf-spine gives many equal
two-hop paths, grows with identical switches, and loses only 1/N on a failure.

Full answer: [Chapter 15, Q1](/backend/datacenter-fabric#interview-questions) · Section: [Why datacenters stopped building trees](/backend/datacenter-fabric#why-datacenters-stopped-building-trees)
:::

::: details 15.2 What is oversubscription, and how would you choose it?
The ratio of server-facing to uplink capacity at a tier. Bursty web traffic tolerates 2:1 to 4:1; storage,
analytics and ML need close to 1:1.

Full answer: [Chapter 15, Q2](/backend/datacenter-fabric#interview-questions) · Section: [Oversubscription](/backend/datacenter-fabric#oversubscription-how-much-the-fabric-can-carry)
:::

::: details 15.3 Design the network for a new datacenter with about 10,000 servers.
About 250 racks, so three tiers: pods with their own spines joined by super-spine planes. A routed BGP underlay
with ECMP, an overlay if needed, and drains planned at peak.

Full answer: [Chapter 15, Q3](/backend/datacenter-fabric#interview-questions) · Section: [Why datacenters stopped building trees](/backend/datacenter-fabric#why-datacenters-stopped-building-trees)
:::

::: details 15.4 A backup between two servers runs at 100 Gb/s though the fabric has terabits free. Why?
One TCP connection hashes onto one path, so it cannot exceed that path's slowest link. Open several connections,
and watch elephant flows crowding mice.

Full answer: [Chapter 15, Q4](/backend/datacenter-fabric#interview-questions) · Section: [ECMP, hashing and elephant flows](/backend/datacenter-fabric#ecmp-hashing-and-elephant-flows)
:::

::: details 15.5 Why would anyone run BGP inside a datacenter? How are AS numbers assigned?
BGP keeps state small and changes local, and its policy lets you drain switches. Per RFC 7938, each leaf gets its
own private AS and the spines share one.

Full answer: [Chapter 15, Q5](/backend/datacenter-fabric#interview-questions) · Section: [BGP inside the datacenter](/backend/datacenter-fabric#bgp-inside-the-datacenter)
:::

::: details 15.6 About 1% of calls between two services time out, and both look healthy. How do you find out why?
One bad link behind ECMP affects only flows hashed onto it, so failures look random. Probe with many source
ports, check interface errors, and drain the suspect link.

Full answer: [Chapter 15, Q6](/backend/datacenter-fabric#interview-questions) · Section: [ECMP, hashing and elephant flows](/backend/datacenter-fabric#ecmp-hashing-and-elephant-flows)
:::

::: details 15.7 After moving onto a VXLAN overlay, small requests work but large responses hang. What happened?
VXLAN adds 50 bytes, so full-size packets exceed a 1,500-byte underlay MTU and are dropped. Raise the underlay
MTU everywhere or lower the inner MTU.

Full answer: [Chapter 15, Q7](/backend/datacenter-fabric#interview-questions) · Section: [MTU and encapsulation overhead](/backend/datacenter-fabric#mtu-and-encapsulation-overhead)
:::

::: details 15.8 How do you safely take a spine switch out of service?
Check spare capacity, then make its BGP routes less preferred and wait for traffic to fall to zero. The drain
tooling must refuse unsafe drains.

Full answer: [Chapter 15, Q8](/backend/datacenter-fabric#interview-questions) · Section: [Failure domains and draining a switch](/backend/datacenter-fabric#failure-domains-and-draining-a-switch)
:::

## 16. Reaching the Service

[Chapter 16](/backend/reaching-the-service)

::: details 16.1 How does a request to a Kubernetes ClusterIP reach a pod?
Kernel rules on the client's node pick a ready pod and rewrite the destination, and connection tracking keeps
the choice. It is per-connection L4 balancing with no central box.

Full answer: [Chapter 16, Q1](/backend/reaching-the-service#interview-questions) · Section: [Kubernetes Services](/backend/reaching-the-service#kubernetes-services)
:::

::: details 16.2 You scaled a gRPC service from 10 to 40 pods and load is still uneven. Why?
A ClusterIP picks a pod once per long-lived HTTP/2 connection. Use client-side balancing over a headless Service,
a per-request proxy, or a maximum connection age.

Full answer: [Chapter 16, Q2](/backend/reaching-the-service#interview-questions) · Section: [Where the balancing happens](/backend/reaching-the-service#where-the-balancing-happens)
:::

::: details 16.3 Compare DNS-based and registry-based service discovery.
DNS works everywhere but is cached and carries no health. A registry has leases and watches, so changes arrive in
seconds, but it needs clients and becomes a critical dependency.

Full answer: [Chapter 16, Q3](/backend/reaching-the-service#interview-questions) · Section: [Service discovery](/backend/reaching-the-service#service-discovery)
:::

::: details 16.4 Design how services in a large company find and call each other.
A replicated registry with leases and watches, callers caching a last-known-good list and balancing per request
with subsetting. Deliver through a library, sidecars or proxyless clients, with mTLS.

Full answer: [Chapter 16, Q4](/backend/reaching-the-service#interview-questions) · Section: [Service discovery](/backend/reaching-the-service#service-discovery)
:::

::: details 16.5 What does a service mesh give you, and what does it cost?
Request-level balancing, retries, mTLS and metrics in any language without code changes. It costs two proxy
hops per call, a proxy per instance, a busy control plane and harder debugging.

Full answer: [Chapter 16, Q5](/backend/reaching-the-service#interview-questions) · Section: [Sidecars and service meshes](/backend/reaching-the-service#sidecars-and-service-meshes)
:::

::: details 16.6 Every deploy causes a short spike of 502s and resets. How do you find the cause?
Pods exit before callers drop them from their lists, or readiness passes too early. Fail readiness first, add a
pre-stop delay longer than propagation, and send GOAWAY.

Full answer: [Chapter 16, Q6](/backend/reaching-the-service#interview-questions) · Section: [Changing the list without dropping requests](/backend/reaching-the-service#changing-the-list-without-dropping-requests)
:::

::: details 16.7 Pods see intermittent 5-second delays on external HTTP calls. What do you check?
Five seconds is the default DNS timeout: check `ndots:5` search expansion, cluster DNS load, and conntrack races
or a full conntrack table dropping queries.

Full answer: [Chapter 16, Q7](/backend/reaching-the-service#interview-questions) · Section: [Kubernetes Services](/backend/reaching-the-service#kubernetes-services)
:::

::: details 16.8 Why might a pod see the wrong client IP address, and how do you fix it?
NAT and proxy hops replace the source address. Use `externalTrafficPolicy: Local` at L4, and `X-Forwarded-For` or
the PROXY protocol at L7, trusted only from known proxies.

Full answer: [Chapter 16, Q8](/backend/reaching-the-service#interview-questions) · Section: [The handoff to the server's kernel](/backend/reaching-the-service#the-handoff-to-the-server-s-kernel)
:::

::: details 16.9 When would you choose IPVS, nftables or an eBPF data path over iptables mode?
When Services reach the thousands and linear rule walks and slow updates hurt. nftables is the intended
successor; eBPF removes per-packet NAT but needs new debugging tools.

Full answer: [Chapter 16, Q9](/backend/reaching-the-service#interview-questions) · Section: [Kubernetes Services](/backend/reaching-the-service#kubernetes-services)
:::

## 17. Timeouts, Retries & Overload

[Chapter 17](/operations/timeouts-retries-overload)

::: details 17.1 How do you choose a timeout for a call to a dependency?
Set it a little above a high percentile of healthy latency measured from the caller, and check it fits the
caller's own budget. Better, propagate a deadline.

Full answer: [Chapter 17, Q1](/operations/timeouts-retries-overload#interview-questions) · Section: [Timeouts](/operations/timeouts-retries-overload#timeouts)
:::

::: details 17.2 Why is "retry 3 times" at every layer dangerous?
Retries multiply: three layers of three attempts send up to 27 calls, exactly when the bottom layer is
overloaded. Retry at one layer with a budget.

Full answer: [Chapter 17, Q2](/operations/timeouts-retries-overload#interview-questions) · Section: [Retry amplification across layers](/operations/timeouts-retries-overload#retry-amplification-across-layers)
:::

::: details 17.3 What is jitter, and why does backoff need it?
Randomness in the retry wait. Without it, clients that failed together retry together in waves.

Full answer: [Chapter 17, Q3](/operations/timeouts-retries-overload#interview-questions) · Section: [Backoff and jitter](/operations/timeouts-retries-overload#backoff-and-jitter)
:::

::: details 17.4 Design the retry and timeout policy for a mobile SDK used by millions of phones.
A deadline per user action, retries only for safe calls with capped full-jitter backoff and `Retry-After`, and a
client-side budget. Make it remotely configurable and plan for mass reconnects.

Full answer: [Chapter 17, Q4](/operations/timeouts-retries-overload#interview-questions) · Section: [Admission control at the client](/operations/timeouts-retries-overload#admission-control-at-the-client)
:::

::: details 17.5 Design overload protection for a service behind an edge proxy.
Rate limits, deadlines and a retry budget at the edge; bounded queues, concurrency limits and priority shedding in
the service; circuit breakers in callers. Load-test past capacity.

Full answer: [Chapter 17, Q5](/operations/timeouts-retries-overload#interview-questions) · Section: [Load shedding](/operations/timeouts-retries-overload#load-shedding)
:::

::: details 17.6 A dependency blipped for a minute; your service has been down for 30 minutes since. What is going on?
A metastable failure: retries keep load above capacity, so requests keep timing out. Cut load hard, disable
retries, then let traffic back in gradually.

Full answer: [Chapter 17, Q6](/operations/timeouts-retries-overload#interview-questions) · Section: [Retry storms and metastable failures](/operations/timeouts-retries-overload#retry-storms-and-metastable-failures)
:::

::: details 17.7 High p99 latency with a fine median: how do you investigate, and would hedging help?
Break latency down by server, route and time. Hedging helps when a few servers are slow and hurts when the whole
service is overloaded.

Full answer: [Chapter 17, Q7](/operations/timeouts-retries-overload#interview-questions) · Section: [Hedged requests](/operations/timeouts-retries-overload#hedged-requests)
:::

::: details 17.8 What is the difference between a circuit breaker, outlier detection and a rate limiter?
A circuit breaker stops a caller from calling a failing dependency; outlier detection removes bad servers from a
pool; a rate limiter caps a client regardless of server health.

Full answer: [Chapter 17, Q8](/operations/timeouts-retries-overload#interview-questions) · Section: [Circuit breakers](/operations/timeouts-retries-overload#circuit-breakers)
:::

::: details 17.9 Why does a server's useful throughput fall when it accepts too much work?
Queued requests outlive their callers' timeouts, so the server does work nobody receives, and retries add more.
Bound queues and drop requests past their deadline.

Full answer: [Chapter 17, Q9](/operations/timeouts-retries-overload#interview-questions) · Section: [Load shedding](/operations/timeouts-retries-overload#load-shedding)
:::

::: details 17.10 When is it safe to retry a request that timed out?
Only when repeating it is harmless: a read, an idempotent write, or a write with an idempotency key. A refused
connection or `REFUSED_STREAM` proves nothing was processed.

Full answer: [Chapter 17, Q10](/operations/timeouts-retries-overload#interview-questions) · Section: [Retries](/operations/timeouts-retries-overload#retries)
:::

## 18. Observing & Debugging the Path

[Chapter 18](/operations/observing-the-path)

::: details 18.1 Users say the site is slow, but server latency graphs are flat. What do you do?
Scope it with real-user data by phase and slice, then test the path in order: `dig`, `curl -w`,
`openssl s_client`, `mtr`. Correlate the start time with changes.

Full answer: [Chapter 18, Q1](/operations/observing-the-path#interview-questions) · Section: [A method: walk the path in order](/operations/observing-the-path#a-method-walk-the-path-in-order)
:::

::: details 18.2 What does traceroute tell you, and what does it not?
It shows the routers on the forward path and where persistent loss starts. It does not show the return path,
and rate-limited replies and mixed ECMP branches mislead.

Full answer: [Chapter 18, Q2](/operations/observing-the-path#interview-questions) · Section: [A method: walk the path in order](/operations/observing-the-path#a-method-walk-the-path-in-order)
:::

::: details 18.3 Compare real-user monitoring and synthetic monitoring. When do you need each?
RUM shows true impact and who is affected but misses users who failed. Probes give steady, repeatable alerts with
no traffic needed. You need both.

Full answer: [Chapter 18, Q3](/operations/observing-the-path#interview-questions) · Section: [Two ways to watch](/operations/observing-the-path#two-ways-to-watch-real-users-and-probes)
:::

::: details 18.4 Design request tracing across a CDN, a load balancer and a set of services.
Create a trace ID at the edge, pass it in `traceparent`, record spans at every hop and log it everywhere. Sample,
but keep errors and slow requests.

Full answer: [Chapter 18, Q4](/operations/observing-the-path#interview-questions) · Section: [Following one request across hops](/operations/observing-the-path#following-one-request-across-hops)
:::

::: details 18.5 After a certificate rotation, users in one country see TLS errors. How do you find out why?
Find which edge sites they reach and compare each site's served chain with `openssl s_client`. A stale site,
a missing intermediate or a root absent from old devices are the usual causes.

Full answer: [Chapter 18, Q5](/operations/observing-the-path#interview-questions) · Section: [Scenario 2](/operations/observing-the-path#scenario-2-tls-errors-in-one-country-after-a-certificate-rotation)
:::

::: details 18.6 About 5% of requests through a load balancer time out, and retries succeed. Where do you look?
Group failures by backend, source port, response size and idle time. Each pattern points to a different
culprit: a bad backend, a timeout mismatch, a bad ECMP link, or packet size.

Full answer: [Chapter 18, Q6](/operations/observing-the-path#interview-questions) · Section: [Scenario 3](/operations/observing-the-path#scenario-3-intermittent-timeouts-behind-a-load-balancer)
:::

## C. What Happens When…

[Capstone](/extras/what-happens-when)

::: details C.1 What happens when you type a URL into your phone's browser and press Enter?
Radio wake, DNS to a nearby edge, TCP and TLS (or QUIC), then an L4 balancer, a proxy, the cache, a warm
connection to the origin, and another balancer to a server. Over TCP that is four round trips before the first byte.

Full answer: [Capstone, Q1](/extras/what-happens-when#interview-questions) · Section: […you open a URL on your phone, cold](/extras/what-happens-when#you-open-a-url-on-your-phone-cold)
:::

::: details C.2 Where does the time go on a cold mobile request, and how would you cut it?
Mostly round trips on the radio link. End connections at the edge, use TLS 1.3 and HTTP/3, reuse connections,
and cache at the edge.

Full answer: [Capstone, Q2](/extras/what-happens-when#interview-questions) · Section: […you open a URL on your phone, cold](/extras/what-happens-when#you-open-a-url-on-your-phone-cold)
:::

::: details C.3 Why is the first request after the app sits idle for a minute slow again?
The radio sleeps, a NAT or balancer silently drops the idle connection, and TCP may shrink its window. Keep
connection lifetimes below the shortest idle timeout on the path.

Full answer: [Capstone, Q3](/extras/what-happens-when#interview-questions) · Section: […the same request, warm](/extras/what-happens-when#the-same-request-warm)
:::

::: details C.4 Design: you are launching a global, latency-sensitive website. Walk through the path you would build.
PoPs with caches reached by anycast or DNS, L4 then L7 at each, warm connections to two or more regions, and
balancers with discovery inside. Plan health checks, headroom, retry budgets and drains.

Full answer: [Capstone, Q4](/extras/what-happens-when#interview-questions) · Section: [Why this matters in real systems](/extras/what-happens-when#why-this-matters-in-real-systems)
:::

::: details C.5 An origin region fails. What do users see, and what decides how long it lasts?
In-flight requests fail, then the edge moves traffic within seconds. Duration depends on detection, safe bounded
retries and spare capacity elsewhere.

Full answer: [Capstone, Q5](/extras/what-happens-when#interview-questions) · Section: […a region fails mid-day](/extras/what-happens-when#a-region-fails-mid-day)
:::

::: details C.6 How do you deploy a new version without dropping requests?
Remove servers from discovery first, wait for propagation, finish in-flight requests, send GOAWAY, then stop.
Add the new version back gradually.

Full answer: [Capstone, Q6](/extras/what-happens-when#interview-questions) · Section: […a deploy happens while requests are in flight](/extras/what-happens-when#a-deploy-happens-while-requests-are-in-flight)
:::

::: details C.7 p99 doubled for mobile users in one country, with no deploy. How do you find out why?
Split real-user timing by stage, then by carrier, PoP and region. Setup time points at the network side; first
byte points behind the edge.

Full answer: [Capstone, Q7](/extras/what-happens-when#interview-questions) · Section: […you open a URL on your phone, cold](/extras/what-happens-when#you-open-a-url-on-your-phone-cold)
:::

::: details C.8 After each deploy, about 1% of requests fail with 502 for a minute. Why?
The drain races the shutdown: proxies still send to a process that has exited. Fail readiness first, wait longer
than propagation, and set proxy idle timeouts below the backend's.

Full answer: [Capstone, Q8](/extras/what-happens-when#interview-questions) · Section: […a deploy happens while requests are in flight](/extras/what-happens-when#a-deploy-happens-while-requests-are-in-flight)
:::

::: details C.9 After a release, CDN hit ratio fell from 95% to 60% and the origin is overloaded. How do you investigate?
Compare cache keys and headers before and after: a new parameter, `Vary`, cookie or shorter lifetime. Protect the
origin with stale serving and collapsing meanwhile.

Full answer: [Capstone, Q9](/extras/what-happens-when#interview-questions) · Section: […the CDN has it, and when it does not](/extras/what-happens-when#the-cdn-has-it-and-when-it-does-not)
:::

::: details C.10 Why not set the DNS TTL to zero for instant failover?
Some resolvers ignore it, open connections never re-ask, and every lookup becomes a trip to your provider. Keep the
address stable and move what is behind it.

Full answer: [Capstone, Q10](/extras/what-happens-when#interview-questions) · Section: […a region fails mid-day](/extras/what-happens-when#a-region-fails-mid-day)
:::

::: details C.11 The site works on Wi-Fi but hangs for some users on cellular. What could it be?
Broken IPv6 or NAT64, an MTU black hole, throttled UDP stalling QUIC, or a short carrier NAT timeout. "Hangs"
points to silently dropped packets.

Full answer: [Capstone, Q11](/extras/what-happens-when#interview-questions) · Section: […you open a URL on your phone, cold](/extras/what-happens-when#you-open-a-url-on-your-phone-cold)
:::

::: details C.12 What changes if the request is a POST that places an order?
It is uncacheable, must not go in 0-RTT, and must not be retried blindly. An idempotency key makes retries safe.

Full answer: [Capstone, Q12](/extras/what-happens-when#interview-questions) · Section: […the CDN has it, and when it does not](/extras/what-happens-when#the-cdn-has-it-and-when-it-does-not)
:::

## Senior curveballs

**In short:** these questions mix several chapters, as real senior and infrastructure interviews do. There is
no single right answer. Interviewers want a list of plausible causes, how you would tell them apart, and what
you would check first.

::: details S1. After moving a service into Kubernetes on a VXLAN overlay, uploads over 1 MB fail from some clients but downloads work. Where do you look?
Packet size first: the overlay's 50 bytes push full-size packets past an underlay MTU, and ICMP "too big" may be
filtered. Then check whether the failures follow one ECMP path or one node, and whether the client side has its
own tunnel.

Chapters: [MTU, fragmentation and black holes](/foundations/packets-and-links#mtu-fragmentation-and-black-holes) · [MTU and encapsulation overhead](/backend/datacenter-fabric#mtu-and-encapsulation-overhead) · [Kubernetes Services](/backend/reaching-the-service#kubernetes-services)
:::

::: details S2. Design a global API for an AI chat product that streams model output to phones.
Anycast PoPs end TLS and QUIC near users, then forward over warm connections to GPU regions chosen by capacity,
not only distance. Stream with Server-Sent Events, with heartbeats under every idle timeout, and resume streams
by request ID after network changes. Balance per request, shed by priority, and drain long streams during deploys.

Chapters: [Three levers](/edge/steering#three-levers-dns-anycast-and-the-client) · [Long-lived connections](/protocols/http#long-lived-connections-streaming-and-websockets) · [Warm connections](/backend/edge-to-origin#warm-pooled-multiplexed-connections) · [Load shedding](/operations/timeouts-retries-overload#load-shedding)
:::

::: details S3. Right after a deploy of the edge proxies, origin CPU doubles and the CDN hit ratio is unchanged. What could explain it?
The edge restart emptied its connection pools, so the origin pays a wave of TLS handshakes; lost session ticket keys
make every one a full handshake. A changed retry policy at the edge could also multiply requests. Compare origin
handshake rate and requests per user request.

Chapters: [Resumption and 0-RTT](/protocols/tls#resumption-and-0-rtt) · [Warm connections](/backend/edge-to-origin#warm-pooled-multiplexed-connections) · [Retry amplification](/operations/timeouts-retries-overload#retry-amplification-across-layers)
:::

::: details S4. A region fails over cleanly, but 20 minutes later the second region falls over too. Why, and how would you have prevented it?
The survivor got the failed region's load plus a surge of handshakes, cold cache misses and retries, without the
headroom for it. Retries then kept it in a metastable overload. Prevent it with N+1 capacity, retry budgets,
stale serving and load shedding, and test with regular drains.

Chapters: [When a region dies](/edge/steering#when-a-region-dies) · [Serving stale](/edge/cdns#serving-stale-and-collapsing-requests) · [Retry storms](/operations/timeouts-retries-overload#retry-storms-and-metastable-failures)
:::

::: details S5. Users on one mobile carrier see slow first loads only since you enabled HTTP/3. How do you find out why?
Compare QUIC and TCP timing for that carrier. Throttled or dropped UDP makes clients wait before falling back, and
a short carrier NAT timeout kills idle QUIC connections. Stop advertising HTTP/3 to that network while you confirm.

Chapters: [Discovery and fallback](/protocols/quic#discovery-and-fallback) · [NAT and its timeouts](/internet/last-mile#nat-and-its-timeouts) · [Scenario 1](/operations/observing-the-path#scenario-1-p99-rose-only-on-mobile)
:::

::: details S6. Design zero-downtime deploys for a service reached through an edge, an L4 tier, L7 proxies and a mesh.
Each layer must stop sending before the layer behind it stops listening. Fail readiness, wait longer than
discovery and table propagation, send GOAWAY, and keep idle timeouts decreasing from client to backend. Retry only
requests that never reached the app, and give long streams a drain deadline with jittered reconnects.

Chapters: [Draining and deploys](/edge/l4-load-balancing#draining-and-deploys) · [Long-lived connections during deploys](/edge/l7-proxies#long-lived-connections-during-deploys) · [Changing the list](/backend/reaching-the-service#changing-the-list-without-dropping-requests) · [Retries](/operations/timeouts-retries-overload#retries)
:::

::: details S7. Your rate limiter blocks a whole university and a mobile carrier at once during a traffic spike. What went wrong, and how do you redesign it?
It keyed on IPv4 addresses, which CGNAT and campus NAT share among thousands of users. Key on accounts, API keys or
device tokens, use `/64` for IPv6, treat IP limits as a high backstop, and challenge rather than block.

Chapters: [Carrier-grade NAT](/internet/last-mile#carrier-grade-nat) · [Rate limiting](/edge/l7-proxies#rate-limiting) · [IPv6: what changes](/foundations/packets-and-links#ipv6-what-changes)
:::

::: details S8. A cloud migration moved DNS, certificates and the CDN at once. Some users now get TLS errors and others reach the old site. How do you untangle it?
Separate the layers. For stale sites, check the old TTL, every authoritative server and pinned connections. For TLS
errors, check which edge each user reaches and the chain it serves, including missing intermediates. Next time,
lower TTLs first and change one layer at a time.

Chapters: [Caching and TTLs](/protocols/dns#caching-and-ttls) · [Certificates and validation](/protocols/tls#certificates-and-validation) · [Scenario 2](/operations/observing-the-path#scenario-2-tls-errors-in-one-country-after-a-certificate-rotation)
:::

::: details S9. Internal RPC p99 jumps during nightly backup windows, though average fabric utilization stays low. Why?
Backup elephant flows hash onto a few uplinks and fill their queues, so small RPCs sharing those links wait or are
dropped and retransmitted. Averages hide it. Rate-limit or reschedule bulk traffic, add paths, and watch per-link
p99 utilization and drops.

Chapters: [ECMP, hashing and elephant flows](/backend/datacenter-fabric#ecmp-hashing-and-elephant-flows) · [Oversubscription](/backend/datacenter-fabric#oversubscription-how-much-the-fabric-can-carry) · [Detecting and repairing loss](/foundations/tcp-and-udp#detecting-and-repairing-loss)
:::

::: details S10. Your anycast service is under a large DDoS while a BGP route leak sends some legitimate users to a distant PoP. What do you do?
Keep the attack spread across sites and filter at the edge; do not withdraw sites, which concentrates the attack.
Find the leak in public BGP data and contact the leaking network's upstreams. Meanwhile steer affected networks with
DNS to regional addresses.

Chapters: [Absorbing volumetric DDoS](/internet/internet-routing#absorbing-volumetric-ddos) · [Route leaks and hijacks](/internet/internet-routing#route-leaks-and-hijacks) · [Three levers](/edge/steering#three-levers-dns-anycast-and-the-client)
:::

::: details S11. After you add a service mesh, a downstream outage turns into a full outage of your product. What happened?
Retries in the app, the mesh and the edge multiplied load on the struggling service, and long timeouts held threads
on every caller. Set retries at one layer with a budget, propagate deadlines, and add circuit breakers and outlier
detection.

Chapters: [Sidecars and service meshes](/backend/reaching-the-service#sidecars-and-service-meshes) · [Retry budgets](/operations/timeouts-retries-overload#retry-budgets) · [Circuit breakers](/operations/timeouts-retries-overload#circuit-breakers)
:::

::: details S12. Mobile users in a distant country want faster checkout, which is a POST to one origin region. What can you do?
Cut round trips before the request: end TLS or QUIC at a nearby edge, keep warm connections to the origin, and
preconnect when the cart opens. The POST still pays one long round trip, so make it safe to retry with an
idempotency key; going faster needs regional writes and their consistency costs.

Chapters: [Distance and round trips](/foundations/the-map#distance-and-round-trips) · [Split TCP](/backend/edge-to-origin#split-tcp-ending-the-connection-near-the-user) · [Methods and idempotency](/protocols/http#methods-and-idempotency)
:::

<MarkDone id="question-bank" />
