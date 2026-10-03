---
title: 3. TCP & UDP as Protocols
---

<script setup>
import { cards } from './tcp-and-udp-review'
</script>

# 3. TCP & UDP as Protocols

Almost every request from a phone rides on one of two transport protocols: TCP, which turns a lossy network
into a reliable stream, or UDP, which sends single messages and promises nothing. Interviewers probe TCP
because its round trips, loss recovery and speed limits explain most of the latency users feel.

::: info Before you start
- The network delivers **packets** to IP addresses. Any packet can be lost, delayed, duplicated or
  reordered, and nobody tells the sender. [Chapter 2](/foundations/packets-and-links) covers packets and
  addresses.
- A **round trip** is the time for a message to reach the other side and a reply to come back. It ranges
  from under a millisecond inside a datacenter to well over 100 ms across oceans or on a busy mobile network.
  [Chapter 1](/foundations/the-map) shows why round trips dominate latency.
- Inside one machine, the kernel runs TCP and hands data to programs through **sockets**. The
  [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers that side; this chapter
  covers what goes over the wire.

The chapter makes sense without them. Addresses in the examples are placeholders.
:::

## What the transport layer adds

**In short:** IP gets a packet to a machine. TCP and UDP add **ports**, so the packet reaches the right
program, and TCP adds a reliable, ordered stream on top.

IP delivers a packet to an address, such as a server at `192.0.2.10`. But that server runs many programs: a
web server, an SSH daemon, a metrics agent. Something must say which program each packet is for. Each
program listens on a numbered <Term id="port">port</Term>: 443 for HTTPS, 22 for SSH, 53 for DNS.

The client picks a port too, usually a random high number such as 51234. So every TCP connection is named by
four values: client address, client port, server address, server port. This is the
<Term id="four-tuple">4-tuple</Term>. Two connections from the same phone to the same server differ only in
the client port.

The 4-tuple matters far beyond TCP itself:

- **Load balancers hash it** to keep all packets of one connection on the same backend
  ([chapter 11](/edge/l4-load-balancing)).
- **NAT (network address translation) devices rewrite it**, swapping private addresses and ports for public ones
  ([chapter 8](/internet/last-mile)).
- **A client can run out of ports.** A proxy talking to one backend address can open only as many
  connections as it has free local ports, a few tens of thousands by default.
- **A change of address kills the connection.** When a phone moves from Wi-Fi to cellular, its address
  changes, so the 4-tuple changes and every TCP connection must start again.

On top of ports, the two protocols differ sharply:

| | <Term id="tcp">TCP</Term> | <Term id="udp">UDP</Term> |
|---|---|---|
| **Setup** | A handshake before any data | None: send at once |
| **Delivery** | Every byte, or an error | Each message arrives once, or not at all |
| **Order** | Bytes arrive in the order sent | Messages may arrive in any order |
| **Unit** | A stream of bytes, no message edges | Separate messages (datagrams) |
| **Speed control** | Slows down for the receiver and the network | None; the application decides |

::: details Going deeper: headers and ports
- The UDP header is 8 bytes: source port, destination port, length and checksum. The TCP header is at least
  20 bytes, adding sequence and acknowledgement numbers, flags, the window and options.
- Ports are 16-bit numbers, so 65,535 of them. Linux picks client ports from
  `net.ipv4.ip_local_port_range`, which defaults to about 28,000 ports (32768–60999).
- The port limit applies per destination, not per machine: the same local port can be reused toward a
  different server address or port, because the 4-tuple still differs.
:::

## Opening a connection: the three-way handshake

**In short:** before sending data, TCP spends one round trip agreeing on starting numbers with the server.
With TLS on top, a new HTTPS connection pays two or three round trips before the first byte of the page.

Before any data flows, the two sides exchange three packets:

1. The client sends a **SYN** ("synchronise"): "I want to talk, and my bytes will be numbered from X."
2. The server replies **SYN-ACK**: "Agreed. Mine start from Y, and I got yours."
3. The client sends an **ACK**: "I got yours." It can put its first data in this same packet.

This is the <Term id="three-way-handshake">three-way handshake</Term>. Its cost is one full round trip
before the client can send its request. That is small inside a datacenter. On a phone talking to a server
across an ocean, it can be 100 ms or more.

Encryption adds its own handshake. <Term id="tls">TLS</Term> 1.3 needs one more round trip on a new
connection ([chapter 5](/protocols/tls)). Then the request and response take a third:

<TcpHandshakeTimelineDiagram />

This is the single most useful number in web performance: **a cold HTTPS request costs about three round
trips before the first byte of the response**, plus the DNS lookup before it. That is why so much of this
book is about avoiding new connections, or moving the server closer to the user.

Closing a connection takes a FIN and an ACK in each direction. The side that closes first then keeps a small
record of the connection for a while, in a state called `TIME_WAIT`. The kernel side of opening and closing,
including the queues that hold half-open connections and `TIME_WAIT` problems on busy servers, is in the
[OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking).

::: details Going deeper: what the handshake also negotiates
- The starting sequence numbers are random (RFC 6528), so an attacker off the path cannot easily guess them
  and inject data.
- Options agreed in the SYN and SYN-ACK: the **maximum segment size** (largest chunk of data per packet),
  **window scaling** (lets the receive window grow beyond 64 KB), **SACK permitted** and **timestamps**
  (RFC 7323). A middlebox that strips these options quietly makes the connection slower.
- If the SYN is lost, Linux waits 1 second before resending it, then doubles the wait each time. With the
  default of 6 retries (`net.ipv4.tcp_syn_retries`), a connection to an unreachable host gives up after about
  two minutes. That is why applications must set their own connect timeout.
:::

### TCP Fast Open, and why it faded

<Term id="tcp-fast-open">TCP Fast Open (TFO)</Term> lets a returning client put its request inside the SYN,
saving the handshake round trip. The server gives the client a cookie on the first connection. The client
presents it in later SYNs, along with data.

It saw little deployment, for reasons worth knowing:

- **Middleboxes broke it.** Firewalls and NAT devices dropped SYNs that carried data or the unknown option.
  The client then had to retry without TFO, which cost more time than TFO saved. Google's early measurements
  (2011) found that a few percent of paths dropped such SYNs.
- **Browsers turned it off.** As of 2019, Chrome, Firefox and Edge all had it disabled by default.
- **The cookie can track users**, since it survives across sessions and networks.
- **Data in the SYN can be replayed**, so the server must only accept requests that are safe to repeat.

The lesson pushed the industry toward building new transports over UDP, where middleboxes cannot interfere
with the details. TLS 1.3's 0-RTT mode and QUIC took over the job of saving setup round trips
([chapter 7](/protocols/quic)).

### Try it: watch a handshake

Run `tcpdump` in one terminal (needs root), then `curl -sI https://example.com` in another:

```text
$ sudo tcpdump -ni any -c 3 'tcp port 443 and host example.com'
IP 10.0.0.5.51234 > 192.0.2.10.443: Flags [S], seq 1829471203, win 64240,
   options [mss 1460,sackOK,TS val 39211 ecr 0,nop,wscale 7], length 0
IP 192.0.2.10.443 > 10.0.0.5.51234: Flags [S.], seq 2210384725, ack 1829471204, win 65160,
   options [mss 1460,sackOK,TS val 88123 ecr 39211,nop,wscale 7], length 0
IP 10.0.0.5.51234 > 192.0.2.10.443: Flags [.], ack 1, win 502, length 0
```

(Trimmed and illustrative; timestamps removed.) What to look for:

- `[S]`, `[S.]` and `[.]` are SYN, SYN-ACK and ACK. The dot means "ACK flag set".
- The server's `ack` is the client's starting number plus one: "I got your SYN."
- The time between the first and second lines, shown in the real output, is one round trip to the server.
- After the handshake, `tcpdump` shows sequence numbers relative to the start, so `ack 1`.

## Sequence numbers and acknowledgements

**In short:** TCP numbers every byte. The receiver says "I have everything up to byte N", and the sender
resends whatever is not confirmed.

TCP splits the byte stream into chunks, each sent in one packet. Each chunk is a
<Term id="tcp-segment">segment</Term>. Every byte has a number, its
<Term id="sequence-number">sequence number</Term>, counted from the random start agreed in the handshake. A
segment carries the number of its first byte.

The receiver replies with an <Term id="tcp-ack">acknowledgement (ACK)</Term>: the number of the next byte it
expects. "ACK 5001" means "I have every byte up to 5000, in order." This is called a **cumulative** ACK. It
uses the numbers to put segments back in order, drop duplicates and spot gaps.

The sender does not wait for each ACK before sending more. It keeps many segments **in flight**: sent, but
not yet acknowledged. How many it may keep in flight is the whole subject of flow and congestion control,
below. Everything sent stays in the sender's memory until it is acknowledged, so it can be resent.

## Detecting and repairing loss

**In short:** a sender learns about a loss in two ways: repeated ACKs that point at the same gap (fast), or
silence until a timer fires (slow, and getting slower each time).

### Duplicate ACKs and fast retransmit

Say the sender sends segments 1 to 6, and segment 3 is lost. Segments 4, 5 and 6 still arrive. Each time,
the receiver can only say "I still need segment 3", so it repeats the same ACK. These are
<Term id="duplicate-ack">duplicate ACKs</Term>.

One duplicate ACK might only mean the packets were reordered. Three in a row strongly suggest a loss. The
sender then resends segment 3 at once, without waiting for any timer. This is **fast retransmit**, and it
repairs a loss in about one round trip.

Cumulative ACKs have a weakness: they name only the first gap. With several losses in one window, the sender
finds them one round trip at a time. <Term id="sack">Selective acknowledgement (SACK)</Term> fixes this. The
receiver also lists the ranges it does hold: "I need segment 3, but I have 4 to 6 and 8 to 9." The sender
can then resend exactly what is missing. Almost every modern stack supports it.

### Retransmission timeouts

Fast retransmit needs later segments to arrive and trigger duplicate ACKs. If the last segments of a
response are lost, or all of them, nothing comes back. The sender then waits for a timer, the
<Term id="rto">retransmission timeout (RTO)</Term>.

TCP sets the timeout from measured round trips: roughly the smoothed round trip plus a margin for its
variation, with a floor of a couple of hundred milliseconds on Linux. When it fires, the sender resends and
**doubles the timeout** for the next try. This is <Term id="exponential-backoff">exponential backoff</Term>.
It stops a sender from hammering a network that is already failing.

The backoff has a cost users notice. After a short outage, say a phone in a tunnel, the next retry may be
many seconds away even though the path has recovered. A timeout also tells TCP the network is in trouble,
so it cuts its sending rate sharply (see slow start, below). That is why tail losses hurt short web
responses most: a 30 KB response with its last packet lost can take an extra few hundred milliseconds.

::: details Going deeper: timers and modern loss detection
- RFC 6298 (2011) defines the RTO: smoothed RTT plus four times its variation, an initial 1 second, and a
  recommended minimum of 1 second. Linux uses a 200 ms minimum instead, and caps the RTO at 120 seconds.
- Linux gives up on an established connection after `net.ipv4.tcp_retries2` (default 15) timeouts, which
  works out to roughly 15 minutes. A connection to a dead peer can look "open" for that long unless the
  application sets its own timeouts or uses keepalives.
- **RACK-TLP** (RFC 8985, 2021), the default in modern Linux, detects loss by time rather than by counting
  three duplicate ACKs: a segment is lost if one sent later has been acknowledged and a reorder window has
  passed. Its **tail loss probe** resends the last segment after about two round trips of silence, so a
  tail loss is repaired without waiting for the full RTO.
- SACK is RFC 2018 (1996). Fast retransmit and the classic congestion rules are in RFC 5681 (2009).
:::

### Try it: see one connection's state

On Linux, `ss -ti` shows TCP's internal view of each connection (no root needed for your own):

```text
$ ss -ti dst 192.0.2.10
ESTAB  0  0  10.0.0.5:51234  192.0.2.10:443
     cubic wscale:7,7 rto:232 rtt:31.2/4.1 mss:1448 cwnd:24 ssthresh:20
     bytes_acked:1832411 segs_out:1402 retrans:0/7 rcv_space:14480 minrtt:28.9
```

(Trimmed and illustrative.) What to look for:

- `rtt:31.2/4.1` is the smoothed round trip and its variation, in milliseconds. `minrtt` is the lowest seen,
  a good estimate of the path without queues.
- `rto:232` is the current retransmission timeout in milliseconds.
- `retrans:0/7` means no segments are waiting on a resend right now, and 7 were resent over the
  connection's life. Divide total resends by `segs_out` for a rough loss rate.
- `cwnd` and `ssthresh` belong to congestion control, explained next.

On macOS, `netstat -s -p tcp` gives machine-wide counters, including retransmissions, but not this per-connection view.

## Flow control vs congestion control

**In short:** two separate limits decide how much a sender keeps in flight. Flow control protects the
**receiver**; congestion control protects the **network**. The sender obeys whichever is smaller.

**Flow control.** A receiver has limited memory for data the application has not read yet. In every ACK, it
advertises how much more it can take: the <Term id="receive-window">receive window</Term>. If the app stops
reading, the window shrinks to zero and the sender must pause. This is <Term id="flow-control">flow
control</Term>. The buffers behind this window, and how large they must be for a fast long-distance link, are
covered in the [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking).

**Congestion control.** The network between the two has no voice in the protocol. Routers along the path
have queues, and when traffic arrives faster than a link can send it, the queue grows and then overflows.
The sender must guess a safe rate from what it observes: losses, and rising round trips. It keeps that guess
as the <Term id="congestion-window">congestion window</Term> (cwnd), a limit on data in flight. Adjusting it
is <Term id="congestion-control">congestion control</Term>.

So the sender keeps at most `min(receive window, congestion window)` in flight, and it can send at most that
much per round trip. That gives a useful rule: **throughput ≈ window ÷ round trip**. A 64 KB window over a
100 ms round trip caps a connection at about 5 Mbit/s, however fast the link is.

Interviewers like this distinction because it tells you where to look. If the receive window is small, the
receiver or its app is the bottleneck. If cwnd is small and retransmissions are high, the network is.

::: details Going deeper: who is limiting the connection?
- Linux records how long a connection spent limited by each cause. `ss -ti` shows `rwnd_limited`,
  `sndbuf_limited` and `busy` times on recent kernels. A connection can also be **application-limited**:
  the sender has nothing to send, so neither window matters.
- The receive window field in the header is 16 bits, so 64 KB at most. The **window scale** option
  multiplies it by up to 2^14, for windows up to about 1 GB (RFC 7323).
- Congestion control runs only on the sender. A server's choice of algorithm decides download behaviour;
  the client's decides upload.
:::

## Slow start: why new connections are slow

**In short:** a new connection does not know the path's capacity, so it starts with a small window and
doubles it every round trip. A short response is over before the connection reaches full speed.

A new connection has no idea whether the path is a datacenter link or a congested mobile network. Sending
at full rate could overflow a queue and hurt everyone. So TCP starts with a small congestion window, the
<Term id="initial-window">initial window</Term>, typically 10 segments, about 14 KB.

Every acknowledged segment then grows the window by one segment. Since a full window is acknowledged every
round trip, the window **doubles each round trip**. This is <Term id="slow-start">slow start</Term>. The name
is historical: the growth is exponential, but it starts low.

Doubling stops at the first loss. TCP then switches to a gentler rule. Each loss halves the window; each loss-free round trip adds one segment. This is <Term id="aimd">additive
increase, multiplicative decrease (AIMD)</Term>, and the slower growth phase is called **congestion
avoidance**. The window that triggers the switch is the **slow-start threshold** (ssthresh in `ss` output).

This toy simulation shows the pattern. The path can carry 30 segments per round trip; anything above that
overflows a queue and loses a packet:

```python
# Run: python3 cwnd.py   (toy Reno-style slow start + AIMD, one line per round trip)
PATH_CAPACITY = 30   # segments the path can carry per round trip before a queue overflows
cwnd, ssthresh = 10, float("inf")   # initial window of 10 segments; no threshold yet

for rtt in range(1, 21):
    lost = cwnd > PATH_CAPACITY
    phase = "slow start" if cwnd < ssthresh else "avoidance"
    print(f"RTT {rtt:2}: cwnd {cwnd:3} segments  {phase:10}{'  LOSS' if lost else ''}")
    if lost:                      # multiplicative decrease: halve the window
        ssthresh = cwnd // 2
        cwnd = ssthresh
    elif cwnd < ssthresh:         # slow start: double every round trip
        cwnd *= 2
    else:                         # additive increase: one segment per round trip
        cwnd += 1
```

```text
RTT  1: cwnd  10 segments  slow start
RTT  2: cwnd  20 segments  slow start
RTT  3: cwnd  40 segments  slow start  LOSS
RTT  4: cwnd  20 segments  avoidance
RTT  5: cwnd  21 segments  avoidance
...
RTT 14: cwnd  30 segments  avoidance
RTT 15: cwnd  31 segments  avoidance   LOSS
RTT 16: cwnd  15 segments  avoidance
```

<TcpCwndSawtoothDiagram />

Three things to notice. Slow start overshoots, because it learns about the limit only by exceeding it. After
a loss, climbing back takes many round trips, one segment at a time. And the window spends much of its time
well below the path's capacity, which is why loss-based TCP struggles on long, fast paths.

### What this means for real requests

Count the round trips for a 100 KB response with an initial window of 10 segments. The server sends about
14 KB, then 28 KB, then 56 KB: three round trips to send 98 KB, and a fourth for the rest. Add the TCP and
TLS handshakes, and a cold request for a modest response takes five or six round trips. On a 100 ms mobile
path, that is over half a second, with the link mostly idle.

A **warm connection**, one that is already open and has already grown its window, skips all of this: no
handshakes, and the full window from the first byte. This is why connection reuse, HTTP/2's single shared
connection ([chapter 6](/protocols/http)) and pools of warm connections from the edge to origin servers
([chapter 14](/backend/edge-to-origin)) matter so much.

Warm connections can cool down, though. By default, Linux resets the congestion window to the initial window
after a connection sits idle for about one RTO. A pooled connection used every few seconds may slow-start on
every request.

::: details Going deeper: initial window and idle restart
- An initial window of 10 segments was standardised in RFC 6928 (2013), up from 2–4. Linux has used it since
  2011. Some CDNs tune the initial window higher for their own traffic.
- The "14 KB" rule of web performance follows from it: a page whose first 14 KB contain the critical HTML and
  CSS can start rendering after the first round trip of data.
- Linux restarts the window after idle when `net.ipv4.tcp_slow_start_after_idle` is 1 (the default). Setting
  it to 0 keeps the window on pooled connections. It is a common tuning for servers that hold long-lived
  connections, at the risk of sending a burst into a path whose conditions have changed.
- The window size that fills a path (bandwidth × round trip, the bandwidth-delay product) and the buffer sizes
  it implies are in the [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking).
:::

## CUBIC and BBR

**In short:** CUBIC treats packet loss as the signal to slow down. BBR instead estimates the path's bandwidth
and round trip and sends at that rate. The difference shows most on long, fast paths and on lossy
mobile links.

The rules above are classic "Reno" TCP. Real stacks use better algorithms, and two dominate interviews.

**CUBIC: loss-based.** <Term id="cubic">CUBIC</Term> still treats loss as the sign of congestion, and cuts its
window by about 30% when it sees one. What changes is the growth: the window follows a cubic curve over time.
It climbs fast while far below the last window where loss happened, slows down near it, then probes beyond
it. That reaches high rates much faster than adding one segment per round trip. CUBIC has been the Linux
default since 2006, and is the default on most other platforms too (as of 2025).

Loss-based control has two weaknesses:

- **It fills queues.** CUBIC keeps growing until a queue overflows. On paths with large buffers, often home
  routers and cellular networks, that means seconds of queueing delay before any loss. This is
  <Term id="bufferbloat">bufferbloat</Term>: a download makes every other app on the link slow.
- **It mistakes random loss for congestion.** Wi-Fi and cellular links lose packets to radio noise, not only
  to full queues. CUBIC slows down anyway. A loss rate of 1% can cut its throughput severely on a long path.

**BBR: model-based.** <Term id="bbr">BBR</Term> (Bottleneck Bandwidth and Round-trip propagation time),
published by Google in 2016, takes a different approach. It continuously measures two things: the highest
delivery rate it has seen, and the lowest round trip. Together they describe the path. BBR then sends at
about that delivery rate, spacing packets out evenly (**pacing**), with about one round trip's worth of data
in flight. It probes now and then for more bandwidth, and briefly drains queues to remeasure the round trip.

Because BBR does not treat each loss as a stop sign, it keeps its rate on lossy links where CUBIC collapses.
Because it aims to keep queues short, it can lower latency on bloated paths. Its known problems:

- **Fairness.** The first version could take more than its share from CUBIC flows in some conditions, and
  less in others, depending on buffer sizes.
- **High loss in shallow buffers.** By ignoring loss, BBRv1 could cause heavy retransmissions where buffers
  are small. BBRv2 and v3 respond to loss again, within limits.

Where things stand, as of 2025: Linux mainline ships **BBRv1** as an option, while CUBIC remains the
default. **BBRv3** exists as Google's out-of-tree code and an IETF draft. Google reported in 2023 that BBRv3
was the TCP congestion control for its internal WAN traffic and for google.com, and in 2024 that it also
covered YouTube. Treat these as dated public statements, not a current description.

::: details Going deeper: details interviewers sometimes probe
- CUBIC is RFC 9438 (2023, replacing RFC 8312 from 2018). Its growth depends on time since the last loss, not
  on ACK arrivals, so flows with different round trips share a link more fairly than with Reno.
- BBR needs **pacing**. Linux provides it through the `fq` queueing discipline or, since kernel 4.13,
  inside TCP itself.
- The `sysctl` value says only `bbr`; it does not tell you which BBR version a kernel runs.
- **ECN** (explicit congestion notification) lets routers mark packets instead of dropping them, so the
  sender slows down without a loss. Support along internet paths is patchy. **L4S** (RFC 9330, 2023) builds
  on it for very low queueing delay.
- In QUIC, congestion control lives in the application's library, not the kernel, so a company can change
  algorithms without a kernel upgrade.
:::

### Try it: check and change the algorithm

```text
$ sysctl net.ipv4.tcp_congestion_control net.ipv4.tcp_available_congestion_control
net.ipv4.tcp_congestion_control = cubic
net.ipv4.tcp_available_congestion_control = reno cubic
```

(Illustrative; Linux only.) The first line is the default for new connections, and `ss -ti` shows the
algorithm per connection. To try BBR (needs root): `sudo modprobe tcp_bbr`, then
`sudo sysctl -w net.ipv4.tcp_congestion_control=bbr`. It affects only data this machine sends, so on a
laptop it changes uploads, not downloads.

## Head-of-line blocking

**In short:** TCP delivers bytes strictly in order. One lost packet holds back everything after it, even
data that belongs to an unrelated request.

Suppose segments 1 to 10 arrive, except segment 3. The receiver's kernel holds segments 4 to 10 in memory.
It cannot hand them to the application, because TCP promised an in-order stream. The application sees
nothing until segment 3 is resent, at least one more round trip later. This is
<Term id="head-of-line-blocking">head-of-line blocking</Term>.

For one file, this barely matters: the file is useless without its middle anyway. It matters when one TCP
connection carries several independent things. HTTP/2 sends many requests over one connection
([chapter 6](/protocols/http)). A lost packet carrying part of one image stalls every other response on that
connection too.

On lossy mobile links, this can make one HTTP/2 connection slower than the six separate connections a browser
used with HTTP/1.1, where one loss stalls only one of them. QUIC fixes it by tracking loss per stream, so a
loss in one stream does not stall the others ([chapter 7](/protocols/quic)). Fixing it inside TCP is not
possible without breaking its in-order promise.

## UDP: what it leaves out, and who builds on it

**In short:** UDP adds ports and a checksum to IP, nothing more. Protocols choose it when they want to avoid
TCP's handshake and in-order delivery, or to build their own transport outside the kernel.

UDP sends a single message, a <Term id="datagram">datagram</Term>, to an address and port. It gives you none
of the following:

- **No connection or handshake.** The first packet can carry data.
- **No delivery guarantee.** Lost messages stay lost. Nobody is told.
- **No ordering or duplicate removal.** Messages may arrive in any order, or twice.
- **No flow or congestion control.** A UDP sender can flood a link, and the protocol will not stop it.

So whatever an application needs from that list, it must build itself. Who uses UDP, and why:

- <Term id="dns">DNS</Term> sends one small question and one small answer. A handshake would double the cost,
  and the client can ask again if no answer comes ([chapter 4](/protocols/dns)).
- **Voice, video calls and games** prefer a late packet dropped to a stall. A frame of audio that arrives
  after its playback time is useless, so retransmitting it in order, as TCP would, only adds delay.
- <Term id="quic">QUIC</Term>, the transport under HTTP/3, builds reliability, congestion control and
  encryption on top of UDP ([chapter 7](/protocols/quic)).

Why build a new transport on UDP rather than invent a new protocol next to TCP? Because the internet's
middleboxes (firewalls, NAT devices) pass TCP and UDP and often drop anything else. And because TCP lives in
operating system kernels, changes take years to reach phones; TCP Fast Open showed how even a small change can
be blocked. A transport on UDP can live in the application and ship with an app update. This freezing of the
network around existing protocols is called **ossification**.

UDP has operational costs too. NAT devices and firewalls track UDP "connections" by guessing, and often forget
them after tens of seconds of silence, so long-lived UDP flows need keepalives ([chapter 8](/internet/last-mile)).
Some corporate networks block UDP outright, so QUIC clients must fall back to TCP. And because UDP has no
handshake, a forged source address costs an attacker nothing, which is what makes UDP-based amplification
attacks possible.

## Why this matters in real systems

**Moving the handshake closer to the user.** A cold request costs about three round trips. If each one goes
to a server 150 ms away, the user waits half a second before the server even starts. CDNs and edge proxies
terminate TCP and TLS a few milliseconds from the user, then forward the request over connections to the
origin that are already open and warm. This is often called **split TCP** ([chapter 14](/backend/edge-to-origin)).

**Warm pools between services.** Inside a datacenter, a round trip is tiny, but a new connection still costs
a handshake, TLS, slow start and kernel work. Service clients and proxies keep pools of open connections.
A badly sized pool, or idle timeouts that do not match between client and server, shows up as latency spikes
and "connection reset" errors on the first request after a quiet period.

**Video and large downloads on mobile.** Throughput is roughly window ÷ round trip, and losses shrink the
window. On a mobile link with random loss, a loss-based sender can use a small fraction of the available
bandwidth. That is why video services have experimented with BBR and tune congestion control per network type.

**ML serving and long streams.** A model response streamed token by token over one long-lived connection
avoids handshakes after the first. But a lost packet stalls the stream for a round trip or more, and a
retransmission timeout can freeze it for seconds. Retries and timeouts must assume that a quiet stream may be
recovering, not dead.

**How to look at it:**

```bash
ss -ti dst 192.0.2.10                       # cwnd, rtt, retrans for connections to one host
ss -s                                       # summary: how many connections in each state
nstat -az | grep -i retrans                 # machine-wide retransmission counters (Linux)
curl -o /dev/null -s -w 'connect %{time_connect}s  tls %{time_appconnect}s  first byte %{time_starttransfer}s\n' https://example.com/
```

The `curl` line separates the TCP handshake (`connect`), TLS (`tls`, measured from the start) and the first
byte of the response. On a cold request, `connect` is about one round trip and `tls` about two.

## Where it breaks

**Netflix "SACK Panic", 2019: a protocol feature as an attack surface.** In June 2019, Netflix published an
advisory for several Linux and FreeBSD TCP bugs. The worst, CVE-2019-11477, let a remote sender crash a Linux
kernel with a crafted sequence of SACK blocks on a connection with a very small segment size. Operators had to
patch kernels, or as a stopgap turn SACK off or drop connections with tiny segment sizes. **Lesson:** loss
recovery code parses data that any remote peer controls, so it is security-critical.
([Netflix advisory, 2019](https://github.com/Netflix/security-bulletins/blob/master/advisories/third-party/2019-001.md))

**Linux challenge ACKs, 2016: a counter that leaked connections.** Researchers showed in 2016 that Linux's
implementation of a TCP anti-spoofing defence (RFC 5961) used one global limit on a type of reply, shared by
all connections. By watching that shared counter, an attacker off the path could infer whether two hosts had
a connection, guess its sequence numbers, and inject data or reset it (CVE-2016-5696). The Linux fix made the
limit less predictable. **Lesson:** shared state across connections can leak what TCP's random sequence numbers are meant to
hide. ([USENIX Security paper, 2016](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/cao))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. Why does the first request to a new HTTPS server take so long, even for a tiny response?
Before the request can be sent, TCP needs one round trip for its handshake, and TLS 1.3 needs another. The
request and response then take a third. Add the DNS lookup before all of this. On a 100 ms mobile path, that
is several hundred milliseconds before the server does any work.

For larger responses, slow start adds more: the server can send only about 14 KB in the first round trip, then
double each time.

**Senior add-on:** the fixes all cut or shorten round trips. Reuse connections. Terminate TCP and TLS at an
edge near the user. Use TLS session resumption, or QUIC, which combines the transport and TLS handshakes.
Fast Open tried to remove the TCP round trip but was defeated by middleboxes.
:::

::: details 2. What is the difference between flow control and congestion control?
Flow control protects the receiver: it advertises a receive window, how much more data it can buffer. Congestion
control protects the network: the sender keeps its own estimate, the congestion window, based on loss and
delay. The sender keeps at most the smaller of the two in flight.

**Senior add-on:** they point to different culprits. A small receive window means the receiving app or its
buffers are the limit. A small congestion window with retransmissions means the path is. `ss -ti` shows both,
and on recent kernels how long the connection was limited by each.
:::

::: details 3. How does TCP detect that a packet was lost?
Two ways. If later packets arrive, the receiver keeps acknowledging the same missing byte. Three duplicate ACKs
trigger a fast retransmit, about one round trip after the loss. SACK lets the receiver list what it does have,
so the sender resends only the gaps.

If nothing comes back, for example when the last packets of a response are lost, the sender waits for the
retransmission timeout, then resends and doubles the timeout for the next attempt.

**Senior add-on:** modern Linux uses RACK-TLP: time-based loss detection plus a probe that resends the last
segment after about two round trips of silence, which avoids most full timeouts. Timeouts also collapse the
congestion window, so they hurt far more than fast retransmits.
:::

::: details 4. Compare CUBIC and BBR. Which would you pick for a video service with many mobile users?
CUBIC is loss-based: it grows the window until a packet is lost, then cuts it by about 30%. BBR is model-based:
it measures the path's bandwidth and minimum round trip and sends at that rate, without treating every loss as
congestion.

On mobile links with random radio loss, CUBIC slows down for losses that are not congestion, and on paths with
big buffers it fills queues and adds delay. BBR keeps its rate and aims for short queues. For a video service,
BBR is often the better fit for throughput and latency.

**Senior add-on:** test before switching: BBR's fairness against CUBIC traffic and its retransmission rate in
shallow buffers have been real issues, mostly in BBRv1. Mainline Linux ships BBRv1 (as of 2025); Google has
reported deploying BBRv3 for google.com and YouTube (2023–2024). Congestion control only affects what the server
sends, so this is a server-side change, and A/B testing by network type is the honest way to decide.
:::

::: details 5. Users in one country report slow downloads from your service. How do you find out whether TCP is the cause?
Start with numbers from real clients: download time, round-trip time and throughput by country and network.
Then look at server-side connection state for those users with `ss -ti`: round trip, retransmissions, the
congestion window and the receive window.

Read the pattern. A long round trip with no loss means distance: the fix is serving from closer. High
retransmissions and a small congestion window mean a lossy or congested path. A small receive window means the
client is the limit. Capture a sample with `tcpdump` to confirm what the counters suggest.

**Senior add-on:** also check for middleboxes stripping options such as window scaling or SACK, a too-large
packet size causing black-holed packets (chapter 2), and the application itself pausing between writes. Compare
an alternative congestion control algorithm on a slice of traffic in that region.
:::

::: details 6. You are designing a real-time voice app. TCP or UDP?
UDP, with your own logic on top. A voice packet that arrives late is useless. TCP would resend it and hold every
later packet until it arrives, which turns one loss into an audible stall.

Over UDP, you send small packets at a steady rate, let the receiver drop late ones and cover the gaps, and add
sequence numbers and timestamps to detect loss and reordering. You still need to adapt your bitrate when the
network is congested.

**Senior add-on:** plan for networks that block UDP, with a fallback over TCP or TLS on port 443. Handle NAT
traversal and keepalives, since NAT devices forget idle UDP flows quickly. WebRTC packages most of this.
:::

::: details 7. What is head-of-line blocking, and why can HTTP/2 be slower than HTTP/1.1 on a lossy network?
TCP delivers bytes in order. If one packet is lost, every byte after it waits in the receiver's kernel until
the lost packet is resent, at least one round trip later.

HTTP/2 puts many requests on one TCP connection, so one loss stalls all of them. HTTP/1.1 browsers open about six
connections per site, so one loss stalls only one of them. With enough loss, the six connections win.

**Senior add-on:** HTTP/2 removed head-of-line blocking at the HTTP layer but not at the TCP layer. QUIC removes
it at the transport layer by tracking loss per stream.
:::

::: details 8. Why is QUIC built on UDP instead of being a new protocol alongside TCP?
Middleboxes on the internet pass TCP and UDP and often drop anything else, so a new protocol number would not
get through. Changing TCP itself means changing kernels and middleboxes, which takes years, and TCP Fast Open
showed how middleboxes can block even small changes.

UDP adds almost nothing, so QUIC can build its own reliability, congestion control and encryption in the
application, and ship updates with the app.

**Senior add-on:** QUIC encrypts nearly all of its header too, so middleboxes cannot learn to depend on its
details and ossify it again. The cost is CPU (user-space packet handling) and networks that block or throttle
UDP, which forces a TCP fallback.
:::

::: details 9. A client's connection to a server hangs for minutes after a brief network outage. Why?
During the outage, the sender's retransmissions were lost, and each timeout doubled the wait for the next one.
After a minute of outage, the next retry may be tens of seconds away, even though the network is back. If the
other side vanished entirely, Linux keeps retrying for around 15 minutes by default before giving up.

**Senior add-on:** applications must not rely on TCP to detect a dead peer. Set request deadlines, use
application-level heartbeats or TCP keepalives with short intervals, and on Linux consider `TCP_USER_TIMEOUT`
to cap how long unacknowledged data may wait.
:::

::: details 10. Your mobile app calls an API across an ocean. How would you make each call fast?
Avoid new connections: keep one connection open and reuse it, and use HTTP/2 or HTTP/3 to send calls in
parallel over it. Terminate the connection at an edge near the user, so the handshakes cost a few milliseconds,
and let the edge forward calls over warm connections to the origin.

Keep responses small, so they fit in the first few round trips of slow start, and use QUIC where available for
faster setup and better behaviour on lossy links.

**Senior add-on:** watch idle behaviour. Phones close connections when the radio sleeps, NAT devices drop idle
mappings, and Linux restarts slow start on idle connections. Measure cold and warm requests separately, since
the averages hide the cold cost.
:::

## Common misconceptions

- **"TCP guarantees delivery."** It guarantees in-order delivery or an error. It cannot deliver over a dead
  path, and it can take many minutes to tell you.
- **"A faster link makes downloads faster."** Throughput is capped by window ÷ round trip. On a long path,
  slow start and losses often matter more than link speed.
- **"Packet loss means congestion."** On Wi-Fi and cellular, much loss is radio noise. Loss-based congestion
  control slows down for it anyway.
- **"UDP is faster than TCP."** UDP skips the handshake and in-order delivery. It does not move packets faster,
  and anything reliable you build on it has to recover losses too.
- **"Flow control and congestion control are the same thing."** One protects the receiver, the other the
  network, and they point to different fixes.

## Key takeaways

- A cold HTTPS request costs about **three round trips** before the first byte: TCP, TLS, then the request.
- TCP numbers every byte. Loss is found by **duplicate ACKs and SACK** (fast) or by a **timeout that doubles**
  on each retry (slow).
- The sender keeps at most the smaller of the **receive window** (receiver's limit) and the **congestion
  window** (network's limit) in flight. Throughput ≈ window ÷ round trip.
- **Slow start** makes new connections slow and short transfers round-trip bound. Warm, reused connections
  avoid it.
- CUBIC is loss-based, BBR model-based; TCP's in-order delivery causes **head-of-line blocking**, one reason
  QUIC builds its own transport on UDP.

## Review

<Flashcards id="tcp-and-udp" :cards="cards" />

<MarkDone id="tcp-and-udp" />

## Sources

- [RFC 9293: Transmission Control Protocol](https://www.rfc-editor.org/rfc/rfc9293) (RFC, 2022)
- [RFC 768: User Datagram Protocol](https://www.rfc-editor.org/rfc/rfc768) (RFC, 1980)
- [RFC 5681: TCP Congestion Control](https://www.rfc-editor.org/rfc/rfc5681) (RFC, 2009)
- [RFC 2018: TCP Selective Acknowledgment Options](https://www.rfc-editor.org/rfc/rfc2018) (RFC, 1996)
- [RFC 6298: Computing TCP's Retransmission Timer](https://www.rfc-editor.org/rfc/rfc6298) (RFC, 2011)
- [RFC 8985: The RACK-TLP Loss Detection Algorithm for TCP](https://www.rfc-editor.org/rfc/rfc8985) (RFC, 2021)
- [RFC 6928: Increasing TCP's Initial Window](https://www.rfc-editor.org/rfc/rfc6928) (RFC, 2013)
- [RFC 7323: TCP Extensions for High Performance](https://www.rfc-editor.org/rfc/rfc7323) (RFC, 2014)
- [RFC 7413: TCP Fast Open](https://www.rfc-editor.org/rfc/rfc7413) (RFC, 2014)
- [RFC 9438: CUBIC for Fast and Long-Distance Networks](https://www.rfc-editor.org/rfc/rfc9438) (RFC, 2023)
- [BBR: Congestion-Based Congestion Control](https://queue.acm.org/detail.cfm?id=3022184) (ACM Queue paper, 2016)
- [BBRv3: Algorithm Bug Fixes and Public Internet Deployment](https://datatracker.ietf.org/meeting/117/materials/slides-117-ccwg-bbrv3-algorithm-bug-fixes-and-public-internet-deployment-00) (IETF 117 slides, 2023) and [IETF 119 update](https://datatracker.ietf.org/meeting/119/materials/slides-119-ccwg-bbrv3-overview-and-google-deployment-00) (slides, 2024)
- [The Sad Story of TCP Fast Open](https://candrews.integralblue.com/2019/03/the-sad-story-of-tcp-fast-open/) (blog, 2019)
- [Netflix security advisory NFLX-2019-001 (SACK Panic)](https://github.com/Netflix/security-bulletins/blob/master/advisories/third-party/2019-001.md) (advisory, 2019)
- [Off-Path TCP Exploits: Global Rate Limit Considered Dangerous](https://www.usenix.org/conference/usenixsecurity16/technical-sessions/presentation/cao) (USENIX Security paper, 2016)
