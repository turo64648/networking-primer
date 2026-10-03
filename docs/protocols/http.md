---
title: 6. HTTP
---

<script setup>
import { cards } from './http-review'
</script>

# 6. HTTP

Once the phone has an address and a secure connection, it finally asks for something. The
<Term id="http">Hypertext Transfer Protocol (HTTP)</Term> is how almost every app and website asks, and its
rules decide what can be cached, what can be retried and how many requests share a connection. Interviewers
use it to probe API design, caching, retries and long-lived connections.

::: info Before you start
- **TCP** gives two machines a reliable, ordered stream of bytes. Setting it up costs one round trip, and a
  lost packet holds up everything behind it. [Chapter 3](/foundations/tcp-and-udp) covers TCP.
- **TLS** encrypts that stream and proves the server's identity, at the cost of another round trip.
  [Chapter 5](/protocols/tls) covers it.
- Between the phone and the server there are often caches and proxies run by a CDN or the site itself.
  [Chapter 1](/foundations/the-map) gives the whole path.

The chapter makes sense without them. Names and addresses in the examples are placeholders.
:::

## What an HTTP exchange looks like

**In short:** the client sends a request (a method, a path and headers); the server sends a response (a
status code, headers and usually a body). Every version of HTTP keeps this same meaning.

Here is a phone asking for a user's profile. The text below is what HTTP/1.1 sends over the connection:

```text
GET /api/users/42 HTTP/1.1
Host: api.example.com
Accept: application/json
Authorization: Bearer eyJhbGciOi...

HTTP/1.1 200 OK
Content-Type: application/json
Content-Length: 61
Cache-Control: private, max-age=60

{"id":42,"name":"Ada","plan":"pro","updated":"2025-06-01"}
```

The first block is the **request**. Its first line holds the **method** (`GET`, what to do) and the
**path** (`/api/users/42`, what to do it to). Then come **headers**: named pieces of extra information.
`Host` says which site the request is for, because one server address often hosts many sites.

The second block is the **response**. Its first line holds a three-digit **status code** (`200`, "it
worked"). Its headers describe the body and say how it may be cached. Then comes the body itself.

This split between meaning and wire format is the most useful idea in the chapter. Methods, status codes
and headers mean the same in HTTP/1.1, HTTP/2 and HTTP/3. Only the way they travel changes. So the first
half of this chapter is about meaning, and the second half is about connections.

::: details Going deeper: one meaning, three wire formats
- The meaning is defined once, in RFC 9110 "HTTP Semantics" (2022). Caching is RFC 9111. The HTTP/1.1 wire
  format is RFC 9112, and HTTP/2 is RFC 9113, all from 2022. HTTP/3 is RFC 9114 (2022).
- HTTP/1.1 sends headers as text, ending each line with a carriage return and line feed. HTTP/2 and HTTP/3
  send the same headers as compressed binary fields.
- In HTTP/2 and HTTP/3 the method, path and host travel as special "pseudo-headers": `:method`, `:path`,
  `:authority` and `:scheme`. The response status is `:status`. Tools often show them this way.
- The body's length is given by `Content-Length`, or, in HTTP/1.1, by **chunked** encoding when the sender
  does not know the length in advance.
:::

### Try it: see the request and response

`curl` ships with macOS and most Linux systems. `-v` prints what it sends (`>`) and receives (`<`):

```text
$ curl -sv https://example.com/ -o /dev/null
* Connected to example.com (192.0.2.10) port 443
* ALPN: server accepted h2
> GET / HTTP/2
> Host: example.com
> User-Agent: curl/8.7.1
> Accept: */*
>
< HTTP/2 200
< content-type: text/html
< cache-control: max-age=3600
< etag: "84238dfc8092e5d9c0dac8ef93371a07"
< age: 1520
```

(Trimmed and illustrative; your headers will differ.) What to look for:

- `ALPN: server accepted h2` means the connection uses HTTP/2. The choice happens inside the TLS handshake.
- `cache-control`, `etag` and `age` are caching headers, explained later in this chapter.
- An `age` header usually means a shared cache, such as a CDN, served the response.

## Methods and idempotency

**In short:** a method tells everyone on the path what kind of action a request is. Whether it is safe to
send twice decides whether clients and proxies may retry it.

The method matters to more than the server. Browsers, caches, proxies and client libraries all read it to
decide what they may do on their own. The common ones:

| Method | Meaning | Safe? | Idempotent? |
|---|---|---|---|
| **GET** | Read a resource | Yes | Yes |
| **HEAD** | Like GET, headers only | Yes | Yes |
| **PUT** | Replace the resource with this body | No | Yes |
| **DELETE** | Remove the resource | No | Yes |
| **POST** | Process this: create, submit, run | No | No |
| **PATCH** | Change part of the resource | No | Not by default |

A <Term id="safe-method">safe method</Term> promises not to change anything on the server. A crawler or a
link preview can send it freely, and caches may store its responses.

<Term id="idempotency">Idempotent</Term> means that sending a request twice has the same effect as sending
it once. `PUT /users/42` with the same body leaves the same user, however often it arrives. `DELETE` the same
item twice and it is still gone. The second response may differ (a `404` instead of a `200`), but the state
of the server does not.

### Why idempotency matters on a network

A client sends a request and the connection drops before the response arrives. The client cannot tell
which of these happened:

1. The request never reached the server.
2. The server did the work, but the response was lost.

If the request is idempotent, it does not matter: the client sends it again. If it is a `POST` that charges
a card, sending it again may charge the card twice. This is why HTTP client libraries and proxies
automatically retry idempotent requests after a connection failure, but are careful with `POST`.

The same question appears in [chapter 5](/protocols/tls): early data sent with
<Term id="zero-rtt">0-RTT</Term> can be replayed by an attacker, so servers should accept only idempotent
requests in it. When and how often to retry is [chapter 17](/operations/timeouts-retries-overload)'s subject.

### Making POST safe to retry

Many operations, like "place this order", cannot be written as a `PUT`. The common fix is an
<Term id="idempotency-key">idempotency key</Term>. The client makes up a unique ID for each logical
operation and sends it in a header. The server stores the key with the result. If the same key arrives
again, it returns the stored result instead of doing the work twice.

```text
POST /v1/payments HTTP/1.1
Host: api.example.com
Idempotency-Key: 6f1c2a9e-1b7d-4e55-9a0b-3c2f8d1e7a44

{"amount": 1999, "currency": "usd"}
```

Payment APIs made this pattern well known. The design details that interviewers probe:

- **The client creates the key once**, before the first attempt, and reuses it for every retry. A new key per
  attempt defeats the purpose.
- **The server stores the key and result atomically** with the work itself. Otherwise a crash between the two
  breaks the guarantee.
- **Two requests with the same key at the same time** must not both run. One waits or gets a conflict error.
- **Keys expire** after a time window, often a day or more, so storage stays bounded.

::: details Going deeper: the fine print
- RFC 9110 defines safe and idempotent methods. `OPTIONS` and `TRACE` are also safe; `CONNECT` is neither.
- Safe is a promise about intent, not a guarantee. A server that deletes data on `GET /delete?id=7` breaks
  it, and link prefetchers and crawlers will eventually trigger the deletion.
- RFC 9110 lets clients retry idempotent requests automatically, and asks them not to retry non-idempotent
  ones unless they know the request was not processed.
- An `Idempotency-Key` request header is being standardised in an IETF draft (as of 2025). Many APIs already
  use the name.
- HTTP/2's `GOAWAY` message (later in this chapter) tells the client which requests the server never
  started. Those are safe to retry whatever their method.
:::

## Status codes

**In short:** the first digit gives the class of result. The exact code tells clients, caches and on-call
engineers what went wrong and, for 5xx errors, often which hop produced it.

| Class | Meaning | Codes you meet most |
|---|---|---|
| **1xx** | Informational, more to come | `101` switching protocols, `103` early hints |
| **2xx** | Success | `200` OK, `201` created, `204` no content |
| **3xx** | Go elsewhere, or use your copy | `301`/`308` moved for good, `302`/`307` moved for now, `304` not modified |
| **4xx** | The client's request is the problem | `400`, `401`, `403`, `404`, `409`, `429` too many requests |
| **5xx** | The server side failed | `500`, `502`, `503`, `504` |

The split between 4xx and 5xx matters in operations. Retrying a 4xx usually fails again, because the request
itself is wrong. Many 5xx errors are temporary. Alerts usually page on the 5xx rate, not the 4xx rate.

### Which hop sent the error?

A request from a phone usually passes through several HTTP hops: a CDN, a load balancer or proxy, and then
the application. Each hop that terminates HTTP can produce its own status code. The 5xx codes tell you a
lot about where the failure was:

- **`500` Internal Server Error**: usually the application itself crashed or threw an error.
- **`502` Bad Gateway**: a proxy could not get a valid response from the server behind it. The connection was
  refused, reset, or the reply was garbage. Think "the backend is down or crashed mid-response".
- **`503` Service Unavailable**: someone chose not to serve the request, often because of overload or
  maintenance. It may carry a `Retry-After` header.
- **`504` Gateway Timeout**: a proxy waited for the server behind it and gave up. Think "the backend is
  alive but too slow".

The error page's body and headers often name the hop: a CDN's branded page, a `Server: nginx` header, or a
proxy-specific header. That is the first clue in a debugging session.

`429` Too Many Requests means "you, specifically, are sending too much". It often comes with `Retry-After`.
Well-behaved clients slow down when they see it; [chapter 12](/edge/l7-proxies) covers how proxies enforce
rate limits.

::: details Going deeper: redirects and non-standard codes
- `301` and `302` allowed old clients to change a `POST` into a `GET` on the redirect, and browsers did.
  `307` and `308` were added to forbid that: the method and body stay the same.
- Browsers cache `301` and `308` redirects, sometimes for a long time. A wrong permanent redirect is hard to
  take back.
- `401` means "who are you?" (missing or bad credentials). `403` means "I know who you are, and no".
- NGINX logs a non-standard `499` when the client closed the connection before the response was ready.
  A spike in `499` often means clients are timing out before the server does.
- Some systems return `200` with an error in the body. This hides failures from every cache, proxy and
  dashboard that reads status codes.
:::

## Caching headers

**In short:** the server tells every cache on the path how long a response stays fresh and who may store
it. After that, caches check back cheaply with a conditional request instead of downloading again.

A response may be kept by the browser, by the app's HTTP library, and by shared caches such as a
<Term id="cdn">CDN</Term>. Each of them follows the same headers. This chapter covers what the headers mean;
how a CDN builds on them is [chapter 13](/edge/cdns)'s subject.

### Freshness: Cache-Control

The <Term id="cache-control">Cache-Control</Term> header carries the server's instructions. The ones that
matter most:

- **`max-age=3600`**: the response stays fresh for 3600 seconds. A cache may serve it without asking the
  server.
- **`s-maxage=86400`**: the same, but only for shared caches such as CDNs. It overrides `max-age` there.
- **`private`**: only the user's own browser or app may store it, never a shared cache.
- **`public`**: shared caches may store it, even if they would not by default.
- **`no-cache`**: a cache **may** store it, but must check with the server before every use.
- **`no-store`**: nobody may store it at all.

The names `no-cache` and `no-store` confuse almost everyone. Remember it this way: `no-cache` means "always
revalidate"; only `no-store` means "do not keep a copy". Sensitive responses, such as account pages, need
`private` or `no-store`.

A response with no freshness information is not necessarily uncacheable. If it has a `Last-Modified` date,
caches may guess a lifetime from it. This **heuristic caching** surprises teams who forgot to set headers.
Always say what you mean.

### Revalidation: ETag and 304

When a stored response is no longer fresh, the cache does not have to download it again. It can ask: "I have
this version; has it changed?"

<HttpCacheValidationDiagram />

The server labels each version of a response with an <Term id="etag">ETag</Term>, a short opaque string such
as `"v7"` or a hash of the content. When the stored copy goes stale, the cache sends a
<Term id="conditional-request">conditional request</Term>:

```text
GET /app.css HTTP/1.1
Host: www.example.com
If-None-Match: "v7"

HTTP/1.1 304 Not Modified
ETag: "v7"
Cache-Control: max-age=3600
```

`304` means "your copy is still good". It has no body, so it is small. The cache keeps its stored body and
starts a new freshness period. If the content changed, the server sends a normal `200` with the new body and
a new ETag instead.

Revalidation still costs a round trip, so it saves bandwidth more than latency. That is why sites give
static files long lifetimes and change their names when they change, for example `app.3f9a2c.css`. The old
name never needs revalidating, and a new name skips every cache. This pattern is called **cache busting**.

### Variants: Vary

Sometimes one URL has several valid responses. The server sends gzip-compressed text to clients that say
they accept it, and plain text to others. A cache must not give the compressed one to a client that cannot
read it.

The <Term id="vary">Vary</Term> header lists the request headers that change the response.
`Vary: Accept-Encoding` tells caches to store one copy per encoding, and to match requests on that header
too.

`Vary` is easy to misuse. `Vary: User-Agent` creates one copy for each of thousands of browser versions, so
the cache almost never hits. `Vary: Cookie` does the same for every user. CDNs often normalise or ignore such
headers for this reason ([chapter 13](/edge/cdns)).

::: details Going deeper: details interviewers sometimes probe
- **`Age`** is how long, in seconds, a shared cache has held the response. A response is fresh while its age
  is below its lifetime.
- **`must-revalidate`** forbids serving a stale copy when the server cannot be reached.
  **`stale-while-revalidate=60`** allows serving a stale copy for 60 seconds while fetching a new one in the
  background (RFC 5861, 2010). **`immutable`** tells browsers not to revalidate even on reload.
- **`Last-Modified` and `If-Modified-Since`** are the older, date-based form of revalidation. ETags are more
  precise.
- **Weak ETags**, written `W/"v7"`, mean "equivalent content", not byte-identical.
- **Different servers, different ETags.** If each server behind a load balancer generates ETags from local
  file metadata, the same file gets different ETags and revalidation fails half the time. Generate them from
  the content.
- **Authorization.** RFC 9111 forbids shared caches from storing responses to requests with an
  `Authorization` header, unless the response explicitly allows it (for example with `public` or
  `s-maxage`).
- **`Set-Cookie`.** The standard does not forbid caching a response that sets a cookie. Many CDNs refuse by
  default, but a custom rule can override that, with predictable results (see the Steam story below).
:::

### Try it: watch revalidation

```bash
curl -sI https://www.example.com/app.css          # look at cache-control, etag, age
curl -sI https://www.example.com/app.css -H 'If-None-Match: "v7"'   # use the real etag
```

If you send back the ETag you received, the second command should print `HTTP/2 304` and no
`content-length` worth downloading. If it prints `200` every time, check whether the ETag changes between
requests; different servers may be answering. In a browser, the network panel's "Size" column shows
"(disk cache)" or "(memory cache)" for responses served without any request.

## HTTP/1.1: one request at a time

**In short:** an HTTP/1.1 connection carries one request and response at a time. Clients reuse connections
and open several in parallel, but a slow response still holds up the requests queued behind it.

Every new connection costs round trips before the first request: one for the TCP
<Term id="three-way-handshake">three-way handshake</Term>, and one more for TLS 1.3. On a mobile network,
where a round trip can take tens to hundreds of milliseconds, that is a large share of the page's load time.

### Keep-alive

The first version of HTTP closed the connection after every response. HTTP/1.1 keeps it open by default, so
the next request can go straight away. This is <Term id="keep-alive">keep-alive</Term>, also called a
persistent connection. Either side may close an idle connection after a while, and either side can say
`Connection: close` to close it after the current response.

But on one HTTP/1.1 connection, requests go strictly one after another. The client sends a request, waits
for the whole response, then sends the next one. A slow response blocks everything behind it on that
connection. This is <Term id="head-of-line-blocking">head-of-line blocking</Term> at the HTTP level.

### More connections, more problems

Browsers work around this by opening several connections to the same host, about six each in today's
browsers. A page with 80 small files then downloads six at a time. Sites used to go further: they spread
files across extra host names (`static1.example.com`, `static2...`) to get more connections. This was
called **domain sharding**.

More connections are not free. Each one pays its own handshakes, starts its own slow ramp-up of sending
speed (TCP slow start), and competes with the others for the same link.

<HttpMultiplexingDiagram />

::: details Going deeper: pipelining and request smuggling
- HTTP/1.1 allowed **pipelining**: sending several requests without waiting. Responses still had to come
  back in order, so a slow one blocked the rest, and buggy proxies mixed them up. Browsers never turned it
  on by default.
- HTTP/1.1 marks the end of a body with `Content-Length` or chunked encoding. If a proxy and the server
  behind it disagree about where a body ends, an attacker can hide a second request inside the first. This
  is **request smuggling**, a recurring class of security bugs in proxy chains. Strict parsing and HTTP/2
  between hops both reduce it.
:::

## HTTP/2: many requests on one connection

**In short:** HTTP/2 splits each request and response into small frames and interleaves many of them on one
connection. Requests no longer wait for each other, but all of them still share one TCP stream.

<Term id="http2">HTTP/2</Term> keeps HTTP's meaning and changes how it travels. Each request and its
response form a <Term id="stream">stream</Term>, with its own number. The data of each stream is cut into
small binary **frames** labelled with that number. Frames of different streams take turns on the same
connection, and the other side puts them back together.

This is <Term id="multiplexing">multiplexing</Term>. A page's 80 files can all be requested at once over one
connection. A slow response no longer blocks the others; its frames simply arrive later. One connection
also means one set of handshakes and one shared view of the network's capacity.

HTTP/2 brought two more important changes:

- **Header compression.** Requests repeat long headers: cookies, user agents, auth tokens. HTTP/2 compresses
  them with <Term id="hpack">HPACK</Term>, which remembers headers already sent on the connection and
  replaces repeats with short references.
- **Flow control per stream.** Each side says how much data it is ready to receive, for each stream and for
  the connection. A large download cannot starve the rest.

Browsers use HTTP/2 only over TLS. Client and server agree on it during the TLS handshake, through
<Term id="alpn">ALPN</Term>. Inside datacenters, HTTP/2 also runs without TLS, notably for gRPC (later in
this chapter).

### What HTTP/2 did not fix

HTTP/2 removed head-of-line blocking between requests, but not underneath them. All streams share one TCP
connection, and TCP delivers bytes strictly in order. If one packet is lost, every stream waits until it is
resent, even streams whose data already arrived.

On a clean network this rarely matters. On a lossy mobile network, one HTTP/2 connection can do worse than
six HTTP/1.1 connections, because one loss stalls everything instead of one-sixth of it. Fixing this was a
main reason for <Term id="quic">QUIC</Term> and HTTP/3, which give each stream its own ordering on top of
UDP. [Chapter 7](/protocols/quic) covers how.

### Server push: tried and dropped

HTTP/2 also let a server send responses the client had not asked for yet. The idea was to push the
stylesheet along with the page and save a round trip. In practice the server often pushed files the browser
already had cached, and measured gains were small or negative.

Chrome disabled server push by default in version 106 (2022), and Firefox removed it in version 132 (2024).
The common replacement is <Term id="early-hints">103 Early Hints</Term>. The server sends a quick
informational response listing files the page will need, while it is still building the page. The browser
then decides whether to fetch them, using its own cache knowledge.

::: details Going deeper: HTTP/2 details
- A client-started stream has an odd number, and numbers only go up. Servers limit how many streams may be
  open at once with `SETTINGS_MAX_CONCURRENT_STREAMS`. The specification recommends allowing at least 100.
- Frame types include `HEADERS`, `DATA`, `SETTINGS`, `WINDOW_UPDATE`, `PING`, `RST_STREAM` (cancel one
  stream) and `GOAWAY` (stop using this connection).
- HPACK (RFC 7541, 2015) was designed to resist the compression attacks that broke earlier header
  compression in TLS. HTTP/3 uses a variant called QPACK.
- HTTP/2's original stream priority tree was complex and widely ignored. RFC 9113 deprecated it. RFC 9218
  (2022) defines a simpler `Priority` header used by HTTP/2 and HTTP/3.
- **Connection coalescing.** A browser may send requests for `img.example.com` over an existing HTTP/2
  connection to `www.example.com`, if both names resolve to the same address and the certificate covers
  both. A server that receives a request it cannot serve on that connection replies `421` Misdirected
  Request.
- Early Hints is RFC 8297 (2017). Chrome announced its server push removal in a 2022 blog post that points
  to Early Hints and `<link rel="preload">` as the replacements.
:::

### Try it: compare versions and see reuse

```text
$ curl -s -o /dev/null -w '%{http_version} connect=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer}\n' \
    https://www.example.com/ https://www.example.com/about
2 connect=0.031 tls=0.068 ttfb=0.141
2 connect=0.000 tls=0.000 ttfb=0.052
```

(Illustrative.) `curl` fetched two URLs in one run and reused the connection for the second. `connect` and
`tls` are zero there: no new handshakes. Its time to first byte (<Term id="ttfb">TTFB</Term>) is shorter by
roughly those two handshakes. Add `--http1.1` to force the older version, and `-v` to see the line
`Re-using existing connection`.

## Connection reuse in practice

**In short:** reused connections make requests fast, but they live in pools with idle timeouts on both
ends. Mismatched timeouts and long-lived connections cause some of the most common HTTP bugs in production.

Clients keep open connections in a <Term id="connection-pool">connection pool</Term>. When the app makes a
request, the library takes an idle connection to that host from the pool, or opens a new one. Browsers do
this, and so does every server-side HTTP client. Proxies keep pools to the servers behind them too.

### The idle timeout race

Neither side keeps an idle connection forever. Each closes it after its own **idle timeout**. Trouble starts
when the server's timeout is shorter than the client's:

1. A connection sits idle in the client's pool.
2. The server's idle timer runs out, and it closes the connection.
3. At the same moment, the client picks that connection and sends a request.
4. The request meets a closed connection. The client sees a reset, or the proxy returns a `502`.

These failures are rare, random and hard to reproduce. They happen most at low traffic, when connections sit
idle long enough. The rule: **each hop should close idle connections sooner than the hop in front of it
does**. A backend's idle timeout should be longer than its load balancer's, and the load balancer's longer
than the client pool's.

### Long-lived connections and uneven load

The opposite problem comes from connections that never close. A client with one HTTP/2 connection sends all
its requests to whichever server that connection reached. A load balancer that balances
**connections**, not requests, cannot spread that traffic.

After a deploy or a scale-out, new servers get almost no traffic: the clients' old connections still point at
the old servers. The usual fixes:

- Balance **requests** with an HTTP-aware proxy ([chapter 12](/edge/l7-proxies)), or let clients spread
  requests across several backends themselves.
- Give connections a **maximum age**, so clients reconnect and land somewhere new from time to time.
- When a server shuts down, send <Term id="goaway">GOAWAY</Term>. This HTTP/2 message says "finish what you
  have, then use a new connection", and names the last request the server will process.

::: details Going deeper: timeout defaults vary
- Idle timeouts differ by product and version, so check the ones you run. As examples: NGINX's
  `keepalive_timeout` defaults to 75 seconds, Node.js's HTTP server `keepAliveTimeout` to 5 seconds, and AWS
  Application Load Balancers to 60 seconds. A Node.js backend behind such a load balancer, with defaults,
  produces exactly the race above.
- HTTP/1.1 servers may announce their timeout with a `Keep-Alive: timeout=5` header. Some clients honour it.
- Some client libraries retry a request automatically if a reused connection fails before any response
  byte arrives, but only for idempotent methods.
- A `GOAWAY` carries the highest stream number the server may have processed. Streams above it were never
  started, so the client can safely resend them on a new connection.
:::

## Long-lived connections: streaming and WebSockets

**In short:** some apps need the server to send data whenever it has it. HTTP offers streaming responses,
Server-Sent Events, WebSockets and gRPC streams; each keeps a connection open, which every hop must
tolerate.

Plain HTTP is request then response. A chat app, a live score or a model generating text one token at a time
needs the server to send data as it happens. There are four common ways to do it:

- **Long polling.** The client sends a request, and the server holds it open until there is news, then
  responds. The client immediately asks again. It works everywhere, but each message costs a request.
- **Server-Sent Events (SSE).** <Term id="sse">SSE</Term> is one long response that the server keeps
  writing to, one event at a time, with the content type `text/event-stream`. It is one-way, server to
  client, and plain HTTP, so proxies and CDNs handle it. Many LLM APIs stream generated tokens this way.
- **WebSockets.** A <Term id="websocket">WebSocket</Term> starts as an HTTP request asking to switch
  protocols. The server agrees with `101` Switching Protocols, and from then on the connection carries
  messages in both directions. Chat and multiplayer apps use it.
- **gRPC streams.** <Term id="grpc">gRPC</Term> is a framework for calls between services, built on HTTP/2.
  Besides one request and one response, it supports streams of messages in either or both directions.

```text
GET /chat HTTP/1.1
Host: ws.example.com
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==
Sec-WebSocket-Version: 13

HTTP/1.1 101 Switching Protocols
Upgrade: websocket
Connection: Upgrade
Sec-WebSocket-Accept: s3pPLMBiTxaQ9kYGzzhZRbK+xOo=
```

(The WebSocket opening request and response.) After the blank line, the bytes on the connection are no longer
HTTP.

### What long-lived connections cost

A connection that stays open for minutes or hours behaves differently from a short request:

- **Every hop must allow it.** Proxies and load balancers close connections that look idle. Apps send small
  **heartbeat** messages every few tens of seconds to keep them open and to detect dead peers.
- **Deploys break them.** Restarting a server drops every connection on it. Clients must reconnect with
  backoff and jitter, or a deploy turns into a reconnect storm. [Chapter 12](/edge/l7-proxies) covers
  draining.
- **They cost memory, not CPU.** A server holding a million quiet WebSockets is limited by memory per
  connection and file descriptors, not by request rate.
- **Phones are a special case.** A mobile OS suspends background apps and their connections. Real-time
  delivery to phones uses push services instead ([chapter E3](/extras/push-and-realtime)).

::: details Going deeper: protocol details
- WebSockets are RFC 6455 (2011). Messages travel in small frames, and the protocol has its own ping and
  pong frames for heartbeats. RFC 8441 (2018) runs WebSockets over HTTP/2 with an extended `CONNECT`.
- SSE is defined in the WHATWG HTML standard. Browsers reconnect automatically and send a `Last-Event-ID`
  header, so the server can resume where it stopped. Over HTTP/1.1, each SSE stream uses up one of the
  browser's six or so connections to the host; over HTTP/2 it is one stream.
- gRPC sends its final status (`grpc-status`) in **trailers**: headers sent after the body. Every hop must
  pass HTTP/2 trailers end to end, which some older proxies and browsers could not. gRPC-Web exists for
  browsers for this reason.
- gRPC clients usually hold one long-lived HTTP/2 connection per backend, so the uneven-load problem from
  the previous section applies in full.
:::

## Why this matters in real systems

**Idempotency is an API design decision.** Mobile networks drop connections mid-request all the time. An API
that takes an idempotency key on every write lets the app retry safely through tunnels and lift journeys.
Without it, the app must choose between losing an action and doing it twice.

**Cache headers are a security setting.** A missing `private` on an account page is harmless until someone
adds a CDN rule that caches more. Then one user's page is served to others. Teams that put explicit
`Cache-Control` on every response, including `no-store` on personal ones, avoid this class of bug.

**HTTP/2 changes load balancing.** Moving a service from HTTP/1.1 to HTTP/2 or gRPC often makes load uneven
behind a connection-level load balancer. Fewer, longer connections mean fewer chances to rebalance. The fix
is request-level balancing, client-side balancing or a maximum connection age.

**Streaming responses meet proxies.** An ML serving team streams model output with SSE. Users see nothing
until the end, because a proxy on the path buffers whole responses. Streaming needs every hop to pass data
through as it arrives, and to tolerate long idle gaps while the model thinks.

**How to look at it:**

```bash
curl -sv https://example.com/ -o /dev/null                  # request and response headers, ALPN result
curl -sI https://example.com/                               # headers only: cache-control, etag, age
curl -s -o /dev/null -w '%{http_code} %{http_version} %{time_starttransfer}\n' https://example.com/
curl -s -o /dev/null -w '%{num_connects}\n' https://example.com/ https://example.com/   # 1 then 0 when reused
curl --http1.1 -sv https://example.com/ -o /dev/null        # force HTTP/1.1 to compare
```

## Where it breaks

**Steam, 2015: personal pages cached for strangers.** On 25 December 2015, Steam's store was under a
denial-of-service attack. Its web caching partner deployed caching rules to absorb the
load. One rule wrongly cached pages for logged-in users. For about 90 minutes, some users saw store pages
generated for other users, including billing addresses and purchase history; Valve said about 34,000 users
were affected. **Lesson:** caching personal responses must be impossible by default, not merely unconfigured.
([Valve, 2015](https://store.steampowered.com/news/19852/))

**HTTP/2 Rapid Reset, 2023: cancelling as an attack.** From August 2023, attackers opened HTTP/2 streams and
cancelled each one immediately. Cancelled streams do not count against the limit on open streams, so one
connection could start requests endlessly. The server still did work for each one. Cloudflare saw peaks
above 200 million requests per second, from a botnet of about 20,000 machines. Google, Cloudflare and AWS
disclosed it together on 10 October 2023 (CVE-2023-44487). **Lesson:** a protocol feature that lets the
client create work cheaply needs per-connection limits, including on cancellations.
([Cloudflare, 2023](https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. What does idempotent mean, and why does it matter for HTTP?
A request is idempotent if sending it twice has the same effect on the server as sending it once. `GET`,
`PUT` and `DELETE` are; `POST` is not.

It matters because networks fail in an ambiguous way. When a connection drops, the client cannot tell
whether the server did the work. For idempotent requests, it can resend without risk. Client libraries,
proxies and browsers rely on this to retry automatically.

**Senior add-on:** idempotency is about server state, not the response; a repeated `DELETE` may return
`404`. For `POST`, use an idempotency key stored atomically with the result. The same property decides what
may be sent as TLS 0-RTT early data, which an attacker can replay.
:::

::: details 2. Design a payments API so that clients can safely retry.
The client creates a unique idempotency key for each payment attempt and sends it in a header with every
retry. The server records the key, the request and the result in the same transaction as the payment. A
repeat with the same key returns the stored result without charging again.

Handle the edges. Two copies arriving at the same time: lock on the key, so one waits or gets a `409`. The
same key with a different body: reject it as a client bug. Keep keys for a bounded time, such as a day or
more.

**Senior add-on:** retries need limits and backoff with jitter, or they amplify outages
([chapter 17](/operations/timeouts-retries-overload)). Downstream calls, such as to a card network, need
their own idempotency keys, derived from the client's. Return the stored response exactly, including errors,
so retries are predictable.
:::

::: details 3. What is the difference between a 502 and a 504? What do you check for each?
Both come from a proxy or load balancer, not the application. A `502` means the proxy got no valid response:
the backend refused the connection, reset it, or sent something broken. A `504` means the proxy waited for
the backend and gave up.

For a `502`, check whether backends are up, crashing or restarting, and look for connection resets in the
proxy's logs. For a `504`, check backend latency and the proxy's timeout setting.

**Senior add-on:** a low, steady rate of `502`s on reused connections often means an idle-timeout race: the
backend closes idle connections sooner than the proxy does. Find out which hop generated the error first;
the response's headers and body usually name it.
:::

::: details 4. Explain no-cache, no-store, private and max-age.
`max-age` says how many seconds a response stays fresh, so caches can serve it without asking. `no-cache`
means a cache may keep it but must check with the server before each use. `no-store` means nobody may keep it.
`private` means only the user's own browser or app may keep it, not a shared cache like a CDN.

**Senior add-on:** `s-maxage` sets a separate lifetime for shared caches. A response without explicit
freshness may still be cached heuristically. Personal responses should say `private` or `no-store`
explicitly, so a later CDN rule cannot cache them by accident.
:::

::: details 5. How do ETags work, and what do they save?
The server labels each version of a response with an ETag. When a cached copy goes stale, the cache sends
`If-None-Match` with that ETag. If nothing changed, the server replies `304 Not Modified` with no body, and
the cache reuses its copy.

That saves bandwidth and server work, but not the round trip. To save the round trip too, give static files
long lifetimes and put a version in their names.

**Senior add-on:** generate ETags from the content, not from per-server file metadata. Otherwise servers
behind a load balancer disagree and revalidation fails. Weak ETags (`W/"..."`) mean equivalent, not
byte-identical, content.
:::

::: details 6. What problem does HTTP/2 solve over HTTP/1.1, and what problem does it leave?
HTTP/1.1 sends one request at a time per connection, so browsers open about six connections and still queue
requests. HTTP/2 interleaves many requests as streams on one connection. Requests no longer wait for each
other, headers are compressed, and only one set of handshakes is needed.

It leaves TCP's head-of-line blocking. All streams share one TCP byte stream, so one lost packet stalls them
all. On lossy networks this can make HTTP/2 slower than several HTTP/1.1 connections. HTTP/3 over QUIC fixes
this.

**Senior add-on:** HTTP/2 also changes operations. Fewer, longer connections make connection-level load
balancing uneven. Cheap stream creation and cancellation enabled the 2023 Rapid Reset attacks. Server push
was dropped by major browsers in favour of 103 Early Hints.
:::

::: details 7. After moving a service to gRPC, one backend is overloaded while new ones sit idle. Why, and how do you fix it?
gRPC clients keep one long-lived HTTP/2 connection per backend and send all calls over it. A load balancer
that balances connections chose a backend once, when the connection opened. New backends receive no
connections until clients reconnect.

Fix it by balancing per request: an HTTP/2-aware proxy, or client-side load balancing across all backends.
Also set a maximum connection age, so clients reconnect regularly.

**Senior add-on:** on shutdown, servers should send `GOAWAY` so clients move without errors. Check that
every proxy on the path passes HTTP/2 trailers, because gRPC carries its status in them.
:::

::: details 8. Users report random "connection reset" errors that happen more at night. How do you find out why?
Low traffic plus random resets suggests an idle-timeout race. Connections sit idle in a pool, the server
closes them, and the client sends a request at the same moment.

List the idle timeout at every hop: client pool, load balancer, proxy, backend. Check whether any hop closes
idle connections sooner than the hop in front of it. Correlate the errors with connection age in logs, or
capture traffic and look for a request sent right after the server's FIN.

**Senior add-on:** fix the ordering, so each backend outlasts its client, and let clients retry idempotent
requests that fail on a reused connection before any response byte. Do not raise timeouts blindly: idle
connections cost memory on every hop.
:::

::: details 9. How would you send live updates from a server to a browser? Compare the options.
Long polling works everywhere, but each message costs a request. Server-Sent Events keep one response open
and stream events; they are one-way, plain HTTP and reconnect automatically. WebSockets give two-way messages
on an upgraded connection.

For server-to-client updates, such as notifications or streamed model output, SSE is usually simplest. For
chat or games, where the client sends often too, use WebSockets.

**Senior add-on:** all options hold a connection open, so plan for proxy idle timeouts (heartbeats), deploys
(draining and reconnect with jitter), and per-connection memory. On phones in the background, use OS push
services instead.
:::

::: details 10. A personalised page started showing one user's data to another. Where do you look?
Look for a shared cache storing a personal response. Check the response's `Cache-Control`: is it missing
`private` or `no-store`? Then check CDN and proxy rules for anything that caches more than the headers allow,
or ignores cookies and auth.

Turn off caching for the affected paths and purge the cache first. Then find the rule or header change that
started it.

**Senior add-on:** make personal responses uncacheable by default in the application framework, so it never
depends on a CDN rule. Check `Vary` too: a response that changes per user but does not vary per user is
cacheable to everyone.
:::

## Common misconceptions

- **"`no-cache` means do not cache."** It means "revalidate before every use". Only `no-store` forbids
  keeping a copy.
- **"POST requests are never retried."** Some clients and proxies retry them in specific cases, and users
  press the button twice. Design writes to tolerate repeats.
- **"HTTP/2 removed head-of-line blocking."** It removed it between requests. TCP still blocks all streams
  when one packet is lost.
- **"A 5xx means the application is broken."** `502`, `503` and `504` often come from a proxy or CDN. The
  application may be fine, or never reached.
- **"No cache headers means not cached."** Caches may guess a lifetime from `Last-Modified`.

## Key takeaways

- HTTP's **meaning** (methods, status codes, headers) is the same in every version; only the wire format and
  connection handling change.
- **Idempotent** requests can be retried safely. For non-idempotent writes, use an **idempotency key**.
- **Cache-Control** says how long and by whom a response may be cached; **ETags** let caches revalidate with a
  cheap `304`; **Vary** lists what splits the cache.
- HTTP/1.1 sends one request at a time per connection. **HTTP/2** multiplexes many on one connection, but TCP
  still stalls them all on a loss.
- Reused and long-lived connections are fast but cause **idle-timeout races** and **uneven load**. Set
  timeouts in order across hops and give connections a maximum age.

## Review

<Flashcards id="http" :cards="cards" />

<MarkDone id="http" />

## Sources

- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) (RFC, 2022)
- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) (RFC, 2022)
- [RFC 9112: HTTP/1.1](https://www.rfc-editor.org/rfc/rfc9112) (RFC, 2022)
- [RFC 9113: HTTP/2](https://www.rfc-editor.org/rfc/rfc9113) (RFC, 2022)
- [RFC 7541: HPACK, Header Compression for HTTP/2](https://www.rfc-editor.org/rfc/rfc7541) (RFC, 2015)
- [RFC 5861: HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861) (RFC, 2010)
- [RFC 8297: An HTTP Status Code for Indicating Hints](https://www.rfc-editor.org/rfc/rfc8297) (RFC, 2017)
- [RFC 9218: Extensible Prioritization Scheme for HTTP](https://www.rfc-editor.org/rfc/rfc9218) (RFC, 2022)
- [RFC 6455: The WebSocket Protocol](https://www.rfc-editor.org/rfc/rfc6455) (RFC, 2011) and
  [RFC 8441: Bootstrapping WebSockets with HTTP/2](https://www.rfc-editor.org/rfc/rfc8441) (RFC, 2018)
- [The Idempotency-Key HTTP Header Field](https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/) (IETF draft)
- [Remove HTTP/2 Server Push from Chrome](https://developer.chrome.com/blog/removing-push) (Chrome blog, 2022)
- [Update on Christmas Issues](https://store.steampowered.com/news/19852/) (Valve statement, 2015)
- [HTTP/2 Rapid Reset: deconstructing the record-breaking attack](https://blog.cloudflare.com/technical-breakdown-http2-rapid-reset-ddos-attack/) (Cloudflare blog, 2023)
