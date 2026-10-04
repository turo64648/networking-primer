---
title: "E3. Push & Real-Time to Phones"
---

<script setup>
import { cards } from './push-and-realtime-review'
</script>

# E3. Push & Real-Time to Phones

A chat message, a ride update or a breaking-news alert has to reach a phone that did not ask for it. This
Extra covers how that works when the app is closed (push through Apple or Google) and when it is open
(WebSockets and their relatives), and what it costs to hold millions of open connections at the edge.
Interviewers use it for "design a chat or notification system" questions.

::: info Before you start
- A phone's cellular radio sleeps when idle, and waking it costs time and battery. NAT devices in the
  carrier forget idle connections. [Chapter 8](/internet/last-mile) covers both.
- HTTP/2 and HTTP/3 carry many requests on one connection, and HTTP has several ways for a server to send
  data whenever it wants. [Chapter 6](/protocols/http) and [chapter 7](/protocols/quic) cover them.
- An L7 proxy terminates client connections at the edge and has to drain them during deploys.
  [Chapter 12](/edge/l7-proxies) covers it.

The Extra makes sense without them.
:::

## Why a phone cannot keep many connections open

**In short:** every open connection needs packets now and then to stay alive, and every packet wakes the
radio and costs battery. Carrier NATs and the operating system both punish apps that try.

To receive a message at any moment, an app needs a connection the server can write to. A server cannot
connect *to* a phone: the phone sits behind the carrier's NAT, has no stable public address, and its
inbound ports are closed. So the phone must open the connection and keep it open.

Keeping it open is the hard part, for three reasons:

- **Radio states.** The cellular radio drops to a low-power state after a few seconds of quiet. Any packet,
  even a tiny one, wakes it, and it then stays in a high-power state for several more seconds before
  sleeping again. A few bytes can cost seconds of full radio power. [Chapter 8](/internet/last-mile) shows
  the states.
- **NAT timeouts.** The carrier's <Term id="cgnat">carrier-grade NAT</Term> keeps a mapping for each flow
  and deletes it after a period of silence. After that, the server's packets go nowhere, and neither side
  is told. The idle timeout varies by carrier, from tens of seconds to tens of minutes.
- **The operating system.** iOS suspends most apps seconds after they leave the screen, and their sockets
  stop working. Android's Doze mode and app standby limit network access for background apps. Both exist
  to protect battery.

To survive the NAT, a connection needs a <Term id="heartbeat">heartbeat</Term>: a small message sent often
enough to keep the mapping alive. If ten apps each send one every few minutes on their own schedule, the
radio wakes ten times as often. The battery drains even when nothing happens. The fix is to share one
connection.

::: details Going deeper: why TCP keepalive does not solve it
TCP has a built-in keepalive, but on Linux the default first probe comes after two hours of silence
(`net.ipv4.tcp_keepalive_time = 7200`). Carrier NATs forget idle flows far sooner, so apps send their own
heartbeats at the application layer. Picking the interval is a trade-off: shorter survives more NATs but
costs more battery. Some push clients probe the network to learn the longest interval that works.
:::

## The push relay pattern

**In short:** the operating system keeps one long-lived connection to the platform's push service (APNs on
Apple devices, FCM on most Android devices). Every app's server sends its messages to that service over
HTTPS, and the service forwards them down the shared connection.

Instead of each app holding its own connection, the phone holds exactly one, and the OS owns it. On iPhones
it goes to the **Apple Push Notification service (APNs)**. On Android devices with Google services it goes
to **Firebase Cloud Messaging (FCM)**. This shared relay is called a
<Term id="push-notification-service">push notification service</Term>. One heartbeat schedule now covers
every app, and the OS can time it to coincide with other radio use.

<PushRelayDiagram />

Sending a message works like this:

1. **Registration.** When the app first runs, it asks the OS for a <Term id="device-token">device token</Term>:
   an opaque string that means "this app on this phone". The app sends the token to its own servers, which
   store it next to the user's account.
2. **Send.** When something happens, the website's servers send an HTTPS request to APNs or FCM. It carries
   the token, a small payload, and credentials proving the sender owns the app.
3. **Relay.** The push service finds the phone's open connection and forwards the message. If the phone is
   offline, the service stores the message for a while and delivers it on reconnect.
4. **Display or wake.** The OS shows the notification itself, even if the app is not running. Or, for a
   silent "data" message, it wakes the app briefly to fetch new content.

Three properties shape every design built on this:

- **Delivery is best effort.** The service may delay, merge or drop messages. Store the truth on your own
  servers. Treat a push as a hint to sync, not as the data itself.
- **Payloads are small.** A few kilobytes at most. Send an ID, and let the app fetch the details when it opens.
- **Tokens go stale.** Users uninstall apps and restore phones. The push service answers "unregistered" for
  dead tokens, and your servers must delete them, or your send volume fills with failures.

Browsers have the same pattern, called <Term id="web-push">Web Push</Term>. Each browser vendor runs a push
service. A website subscribes through the browser, gets an endpoint URL, and posts encrypted messages to it.

::: details Going deeper: the provider APIs (as of 2025)
- **APNs.** Providers send an HTTP/2 `POST` to `api.push.apple.com` (port 443, or 2197 if 443 is blocked)
  at the path `/3/device/<token>`. They authenticate with a signed JSON Web Token or a TLS client
  certificate. Headers set the priority, an expiry time, and a collapse ID that replaces an older pending
  message. Devices themselves reach APNs on TCP port 5223, falling back to 443. Apple retired the older
  binary protocol in 2021. Background (silent) pushes are throttled by the system, and Apple's docs advise
  sending only a few per hour.
- **FCM.** Servers call the HTTP v1 API with an OAuth 2.0 token from a service account. Android messages
  are normal or high priority. Normal ones may wait until the device leaves Doze. High priority ones can wake
  the device, but Google may downgrade an app's high-priority messages if they do not lead to a visible
  notification.
- **Web Push.** The protocol is RFC 8030. Payloads are encrypted end to end (RFC 8291), so the browser's
  push service cannot read them. The sender identifies itself with VAPID keys (RFC 8292). Safari on iOS
  supports Web Push for home-screen web apps since iOS 16.4 (2023).
- Android phones sold without Google services rely on vendor push services instead, each with its own API.
:::

## Real-time while the app is open

**In short:** when the app is on screen, it can hold its own connection and get updates in milliseconds.
The options are polling, long polling, Server-Sent Events, WebSockets, and streams over HTTP/2 or HTTP/3.
Close the connection when the app leaves the screen, and fall back to push.

Push latency is often fine for a notification, but it is uneven and best effort. A chat window, a live map
or a trading screen needs updates within a few hundred milliseconds. While the app is in the foreground,
the OS lets it keep its own connection. [Chapter 6](/protocols/http) covers each option in detail; this is
the decision view.

| Option | How it works | Good for | Watch out for |
|---|---|---|---|
| **Short polling** | Ask "anything new?" every few seconds | Rare updates, simplest servers | Wasted requests, radio kept awake, delay up to the interval |
| **<Term id="long-polling">Long polling</Term>** | Server holds each request open until there is news, then client asks again | Works through any proxy | One request per message, extra headers, gaps between requests |
| **<Term id="sse">Server-Sent Events</Term>** | One long HTTP response; the server writes events as text | Server-to-client feeds; browser reconnects by itself | One-way only; uses a whole connection on HTTP/1.1 |
| **<Term id="websocket">WebSocket</Term>** | An HTTP request upgrades into a two-way message channel | Chat, games, collaboration | Every hop must allow upgrades and long idle times |
| **HTTP/2 or HTTP/3 streams** | A long request or response stream, such as a gRPC stream, on a shared connection | Native apps, service-to-service | Proxies and browsers vary in support |

Two practical rules come up in interviews. First, prefer the simplest option that meets the need: SSE over
HTTP/2 handles most "server sends updates" cases and passes through ordinary HTTP infrastructure. Second,
every option on this list keeps a connection open. That connection needs heartbeats to survive NATs, and it
dies when the phone changes network, so the client must reconnect and catch up on what it missed.

Catching up is the part teams forget. Give each event a sequence number or ID. On reconnect, the client
sends the last one it saw, and the server replays from there or tells it to do a full refresh.

::: details Going deeper: protocol details
- WebSocket is RFC 6455 (2011). It can also run as one stream inside an HTTP/2 connection (RFC 8441, 2018)
  or HTTP/3 connection (RFC 9220, 2022), which saves a connection and a handshake.
- SSE uses the `text/event-stream` content type. The browser's `EventSource` reconnects automatically and
  sends the `Last-Event-ID` header, so replay comes almost free.
- RFC 6202 (2011) lists the known problems of long polling and HTTP streaming through proxies.
- Native apps often use their own protocols over a single connection. Facebook's 2011 post on building
  Messenger describes adopting MQTT, a lightweight publish-subscribe protocol, to keep a persistent
  connection without draining the battery.
- WebTransport, built on HTTP/3, offers streams and datagrams to browsers. Browser support is still uneven
  as of 2025.
:::

## Millions of long-lived connections at the edge

**In short:** idle connections are cheap in CPU but cost memory and file descriptors, and they make deploys
and failures hard. A proxy cannot drain a connection that never ends, and when a node dies, all its clients
reconnect at once.

Large apps terminate these connections at their edge proxies, close to users, like any other traffic
([chapter 12](/edge/l7-proxies)). The proxy then forwards messages to and from backend servers. Three
problems appear that short requests never cause.

### Memory per connection

An idle connection does almost no work, so CPU is rarely the limit. Memory is. Each connection holds kernel
socket buffers, TLS state, and the application's own session state. With tuning, that is tens of kilobytes
per idle connection; with default buffer sizes and chatty sessions, much more. A server with 100 GB of
memory therefore holds on the order of a million connections, if the software is built for it.

Other limits arrive at the same time: the per-process file descriptor limit, connection-tracking tables in
firewalls, and <Term id="port-exhaustion">source ports</Term> on the hop from proxy to backend. The OS
Primer covers sockets and buffers ([OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking)).

Every hop also has an idle timeout: the cloud load balancer, the proxy, the NAT. The heartbeat interval must
be shorter than the shortest of them. Cloud load balancers often default to about a minute.

### Draining during deploys

To restart a proxy cleanly, you stop sending it new connections and wait for existing ones to finish. A
WebSocket never finishes. So the proxy must close connections itself, politely: it sends an HTTP/2
<Term id="goaway">GOAWAY</Term> or a WebSocket close message saying "going away", and the client reconnects
to another server.

If one proxy closes all its connections in the same second, all those clients reconnect in the same second.
Spread the closes over minutes. Many systems also cap connection lifetime (for example, a few hours), so
connections rotate steadily and a deploy is not a special event. [Chapter 12](/edge/l7-proxies) covers
<Term id="drain">draining</Term> in detail.

### Reconnect storms

When a node, a region or the whole service fails and comes back, every client reconnects at once. This is a
<Term id="reconnect-storm">reconnect storm</Term>, a form of <Term id="thundering-herd">thundering herd</Term>.
Reconnecting is far more expensive than staying connected: a TCP and TLS handshake, an authentication check,
and often a full resync of the user's state. Each of those hits a backend that was sized for steady state.

The defences are the same as for retry storms ([chapter 17](/operations/timeouts-retries-overload)):

- **Backoff with jitter.** Clients wait a random, growing delay before reconnecting, so arrivals spread out.
- **Cheap reconnects.** TLS session resumption skips most handshake work. A resume token lets the server send
  only what changed.
- **Admission control.** The edge accepts reconnects at a rate the backends can handle and asks the rest to
  retry later.
- **Gradual recovery.** Bring capacity back in steps instead of opening the floodgates.

<PushReconnectStormDiagram />

## Try it

These commands work on stock Linux. Output below is illustrative.

```bash
# How many TCP connections is this server holding? (summary)
ss -s

# Established connections on port 443, with their kernel timers
ss -tno state established '( sport = :443 )' | head -3

# When the kernel's own keepalive would first probe an idle connection
sysctl net.ipv4.tcp_keepalive_time
```

```text
TCP:   1048612 (estab 1048203, closed 201, orphaned 0, timewait 180)
Recv-Q Send-Q Local Address:Port  Peer Address:Port
0      0      203.0.113.5:443     198.51.100.7:51234  timer:(keepalive,4min,0)
net.ipv4.tcp_keepalive_time = 7200
```

Look for the established count against your memory budget, and for the 7200-second default: far longer
than any carrier NAT keeps an idle flow.

To watch a Server-Sent Events stream, use `curl -N` (no buffering) against an endpoint you run:

```bash
curl -N -H 'Accept: text/event-stream' https://example.com/events
```

## Why this matters in real systems

- **One server, millions of sockets.** WhatsApp wrote in January 2012 that one FreeBSD server running its
  Erlang code held over 2 million TCP connections, on a machine with 24 logical CPUs and about 100 GB of
  memory. That works out to tens of kilobytes per connection, all included.
- **Sessions as lightweight processes.** Discord described in 2017 how each user connects over a WebSocket
  and gets a session process on the Erlang VM, with nearly five million concurrent users at the time. Their
  hardest problems were fanning messages out to very large groups, not holding the connections.
- **Battery as a design constraint.** Facebook's 2011 post on the Messenger app describes moving to a
  persistent MQTT connection to cut message latency without hurting battery life.
- **Notification systems.** A typical design stores the event, looks up the user's device tokens, and sends
  one request per device to APNs or FCM through a queue of workers. Most of the operational work is token
  hygiene, rate limits and retries.

## Where it breaks

- **Facebook, October 2021.** A configuration change took Facebook's backbone and DNS offline for hours.
  Meta's postmortem explains that bringing services back had to be gradual, because the sudden return of
  traffic risked overloading power systems and caches. **Lesson:** after a large outage, plan for every
  client coming back at once.
  ([Meta engineering blog](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/))

## Interview questions

::: details Design: how would you deliver chat messages to a mobile app?
When the app is open, keep a WebSocket (or an HTTP/2 stream) to the nearest edge, send each message with a
sequence number, and let the client ask for anything it missed on reconnect. When the app is closed, send a
push through APNs or FCM with a short payload, and let the app fetch the message when opened. Store
messages on the server first, so neither path is the source of truth.

**Senior add-on:** heartbeats shorter than the shortest idle timeout on the path, jittered reconnects,
connection lifetime caps for deploys, collapse IDs so a burst becomes one notification, and deleting tokens
the push service reports as unregistered.
:::

::: details Why can't the server just connect to the phone when it has a message?
The phone has no stable public address and sits behind the carrier's NAT, which drops unsolicited inbound
connections. So the phone must keep a connection open, and the OS shares one connection across all apps.

**Senior add-on:** even on IPv6, where the phone has a public address, carrier and OS firewalls block
inbound connections, and waking the radio for random traffic would cost battery.
:::

::: details Why do apps send their own heartbeats instead of relying on TCP keepalive?
TCP keepalive defaults to probing after two hours of silence on Linux. Carrier NATs forget idle flows far
sooner, so the connection dies silently. An application heartbeat every tens of seconds to minutes keeps the
NAT mapping and detects dead connections.

**Senior add-on:** the interval is a battery trade-off, and the shortest idle timeout anywhere on the path
(NAT, cloud load balancer, proxy) sets the upper bound.
:::

::: details Debugging: users say notifications arrive late or not at all. How do you find out why?
Split the path. Check your own send logs: did you call APNs or FCM, and what did it answer (success,
unregistered token, rate limited)? If the push service accepted it, check the message priority and type:
normal-priority Android messages can wait for Doze, and silent pushes are throttled on iOS. Then look at
patterns by OS version, device maker and network.

**Senior add-on:** some Android makers add aggressive battery savers that kill background work. Stale tokens
inflate failure counts. Remember delivery is best effort, so the app must sync on open whatever happens.
:::

::: details Design: you run a million WebSocket connections per region. How do you deploy proxies safely?
Take one proxy at a time out of the load balancer, then close its connections gradually over several
minutes with a "going away" message. Clients reconnect with jitter to other proxies. Keep enough spare
capacity to absorb one proxy's clients.

**Senior add-on:** cap connection lifetime so connections rotate all the time, make reconnects cheap with
TLS resumption and resume tokens, and rate-limit reconnects at the edge so a mass close cannot become a
storm.
:::

::: details SSE, WebSockets or long polling for a live sports score feed in a browser?
SSE: the data flows one way, the browser reconnects by itself and resumes from the last event ID, and it
passes through ordinary HTTP proxies and CDNs. Long polling is the fallback for hostile networks.

**Senior add-on:** over HTTP/1.1, each SSE stream takes one of the browser's few connections per host, so
serve it over HTTP/2.
:::

## Common misconceptions

- "Push notifications are guaranteed." They are best effort; they can be delayed, merged or dropped.
- "The push carries the data." It should carry a hint or an ID; the app fetches the rest.
- "An idle connection is free." It costs memory on every hop and needs heartbeats to stay alive.
- "TCP keepalive keeps NAT mappings alive." Its default interval is far too long.
- "Draining finishes by itself." Long-lived connections must be closed on purpose, and gradually.

## Key takeaways

- Phones cannot keep many connections: radio wake-ups cost battery, NATs forget idle flows, and the OS
  suspends background apps.
- The OS keeps one connection to APNs or FCM; app servers send to that service with a device token.
- When the app is open, use SSE, WebSockets or HTTP/2 or HTTP/3 streams, with sequence numbers for catch-up.
- At the edge, idle connections cost memory, not CPU; heartbeats must beat the shortest idle timeout.
- Close connections gradually during deploys, and defend against reconnect storms with jitter and cheap
  reconnects.

## Review

<Flashcards id="push-and-realtime" :cards="cards" />

<MarkDone id="push-and-realtime" />

## Sources

- [Sending notification requests to APNs](https://developer.apple.com/documentation/usernotifications/sending-notification-requests-to-apns) (documentation, Apple)
- [Set and manage Android message priority](https://firebase.google.com/docs/cloud-messaging/android/message-priority) (documentation, Firebase)
- [RFC 8030: Generic Event Delivery Using HTTP Push](https://www.rfc-editor.org/rfc/rfc8030) (RFC, 2016)
- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) (RFC, 2011) and
  [RFC 8441: Bootstrapping WebSockets with HTTP/2](https://www.rfc-editor.org/rfc/rfc8441) (RFC, 2018)
- [RFC 6202: Known Issues and Best Practices for Long Polling and Streaming](https://www.rfc-editor.org/rfc/rfc6202) (RFC, 2011)
- [1 million is so 2011](https://blog.whatsapp.com/1-million-is-so-2011) (engineering blog, WhatsApp, 2012)
- [How Discord Scaled Elixir to 5,000,000 Concurrent Users](https://discord.com/blog/how-discord-scaled-elixir-to-5-000-000-concurrent-users) (engineering blog, Discord, 2017)
- [Building Facebook Messenger](https://engineering.fb.com/2011/08/12/android/building-facebook-messenger/) (engineering blog, Facebook, 2011)
