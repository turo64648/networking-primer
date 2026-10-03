// Flashcards for the HTTP chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does HTTP keep its meaning separate from its wire format?',
    a: 'Methods, status codes and headers mean the same in HTTP/1.1, HTTP/2 and HTTP/3. Caches, proxies and apps can rely on that meaning while the way bytes travel improves underneath.',
  },
  {
    q: 'Why does idempotency matter more on a network than in a local function call?',
    a: 'When a connection drops, the client cannot tell whether the server did the work. An idempotent request can be resent without risk; a non-idempotent one might run twice.',
  },
  {
    q: 'How does an idempotency key make a POST safe to retry?',
    a: 'The client sends the same unique key with every attempt. The server stores the key with the result, atomically with the work, and returns the stored result for repeats instead of doing the work again.',
  },
  {
    q: 'Why should servers accept only idempotent requests in TLS 0-RTT early data?',
    a: 'An attacker can capture and replay early data. If the request is idempotent, running it again changes nothing.',
  },
  {
    q: 'What do a 502 and a 504 each suggest about the backend?',
    a: 'Both come from a proxy. A <code>502</code> means it got no valid response (refused, reset, broken): the backend is down or crashed. A <code>504</code> means it waited and gave up: the backend is alive but too slow.',
  },
  {
    q: 'What is the difference between <code>no-cache</code> and <code>no-store</code>?',
    a: '<code>no-cache</code> lets a cache keep the response but requires checking with the server before each use. <code>no-store</code> forbids keeping it at all.',
  },
  {
    q: 'Why should personal responses say <code>private</code> or <code>no-store</code> explicitly?',
    a: 'Without it, a shared cache may store them, heuristically or because of a CDN rule. Then one user’s page can be served to others.',
  },
  {
    q: 'What does a 304 response save, and what does it not?',
    a: 'It saves sending the body again, because the cache’s copy is still valid. It still costs a round trip to ask.',
  },
  {
    q: 'Why do sites put a version or hash in static file names?',
    a: 'The file can then be cached for a very long time without revalidation. A change gets a new name, which no cache has seen.',
  },
  {
    q: 'What does <code>Vary</code> do, and how can it hurt?',
    a: 'It tells caches which request headers change the response, so they store one copy per value. Varying on headers with many values, such as User-Agent or Cookie, splits the cache until it almost never hits.',
  },
  {
    q: 'Why did browsers open about six connections per host with HTTP/1.1?',
    a: 'An HTTP/1.1 connection carries one request at a time, so a slow response blocks the rest. Parallel connections work around that, at the cost of extra handshakes and competing slow starts.',
  },
  {
    q: 'How does HTTP/2 let many requests share one connection?',
    a: 'Each request and response is a numbered stream, cut into small frames. Frames from different streams interleave on the connection, and the other side reassembles them.',
  },
  {
    q: 'What head-of-line blocking does HTTP/2 leave in place?',
    a: 'TCP’s. All streams share one ordered byte stream, so one lost packet stalls every stream until it is resent. HTTP/3 over QUIC removes this.',
  },
  {
    q: 'Why was HTTP/2 server push dropped, and what replaced it?',
    a: 'Servers often pushed files the browser already had, and measured gains were small or negative. 103 Early Hints replaced it: the server lists needed files and the browser decides what to fetch.',
  },
  {
    q: 'How do mismatched idle timeouts cause random errors?',
    a: 'If a server closes idle connections sooner than its client, the client can send a request on a connection that is closing. Each hop should time out later than the hop in front of it.',
  },
  {
    q: 'Why can HTTP/2 or gRPC make load uneven behind a load balancer?',
    a: 'Clients send all requests over a few long-lived connections. A balancer that picks a backend per connection cannot spread those requests, and new backends get nothing until clients reconnect.',
  },
  {
    q: 'When would you choose Server-Sent Events over WebSockets?',
    a: 'When data flows mainly from server to client, such as notifications or streamed model output. SSE is plain HTTP, passes through proxies and CDNs, and reconnects automatically.',
  },
  {
    q: 'What does every hop need to support long-lived connections?',
    a: 'Idle timeouts longer than the app’s heartbeat interval, no buffering of streamed responses, and draining on deploys so clients can reconnect gradually.',
  },
]
