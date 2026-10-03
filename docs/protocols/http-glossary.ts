// Glossary terms owned by the HTTP chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

const chapter = '/protocols/http'

export const terms: Record<string, GlossaryEntry> = {
  http: {
    term: 'HTTP',
    def: 'The Hypertext Transfer Protocol: a client sends a request (method, path, headers) and the server sends a response (status code, headers, body). Its meaning is the same in HTTP/1.1, HTTP/2 and HTTP/3.',
    chapter,
  },
  'safe-method': {
    term: 'Safe method',
    def: 'An HTTP method that promises not to change server state, such as GET or HEAD. Crawlers, prefetchers and caches may send or store it freely.',
    chapter,
  },
  idempotency: {
    term: 'Idempotency',
    def: 'A request is idempotent if sending it twice has the same effect on the server as sending it once. Idempotent requests can be retried safely after a connection failure.',
    chapter,
  },
  'idempotency-key': {
    term: 'Idempotency key',
    def: 'A unique ID the client sends with a non-idempotent request and reuses on every retry. The server stores it with the result and returns that result for repeats instead of doing the work again.',
    chapter,
  },
  'cache-control': {
    term: 'Cache-Control',
    def: 'The HTTP header that tells caches whether they may store a response, who may store it, and how long it stays fresh.',
    chapter,
  },
  etag: {
    term: 'ETag',
    def: 'A short label for one version of a response. A cache sends it back to ask whether its copy is still current.',
    chapter,
  },
  'conditional-request': {
    term: 'Conditional request',
    def: 'A request that says “send the body only if it changed”, for example with If-None-Match and an ETag. If nothing changed, the server replies 304 Not Modified with no body.',
    chapter,
  },
  vary: {
    term: 'Vary',
    def: 'A response header listing the request headers that change the response. Caches store a separate copy for each combination of their values.',
    chapter,
  },
  'keep-alive': {
    term: 'Keep-alive',
    def: 'Keeping an HTTP connection open after a response so later requests can reuse it without new handshakes. The default since HTTP/1.1.',
    chapter,
  },
  'connection-pool': {
    term: 'Connection pool',
    def: 'A set of open connections that an HTTP client or proxy keeps per destination and reuses for new requests.',
    chapter,
  },
  http2: {
    term: 'HTTP/2',
    def: 'The 2015 binary version of HTTP. It carries many requests at once on one TCP connection as interleaved streams, and compresses headers.',
    chapter,
  },
  multiplexing: {
    term: 'Multiplexing',
    def: 'Carrying several independent conversations over one connection by interleaving their pieces. HTTP/2 and QUIC multiplex requests as streams.',
    chapter,
  },
  stream: {
    term: 'Stream',
    def: 'One request and its response inside an HTTP/2 or HTTP/3 connection, identified by a number. Many streams share one connection.',
    chapter,
  },
  hpack: {
    term: 'HPACK',
    def: 'HTTP/2’s header compression. Both sides remember headers already sent on the connection, so repeats become short references.',
    chapter,
  },
  goaway: {
    term: 'GOAWAY',
    def: 'An HTTP/2 (and HTTP/3) message telling the peer to stop opening new requests on this connection. It names the last request the sender will process, so others can be retried elsewhere.',
    chapter,
  },
  'early-hints': {
    term: '103 Early Hints',
    def: 'An informational response a server sends before the real one, listing resources the page will need so the browser can start fetching them early.',
    chapter,
  },
  sse: {
    term: 'Server-Sent Events (SSE)',
    def: 'A long-lived HTTP response in which the server sends a series of text events to the client. One-way, plain HTTP, with automatic reconnection in browsers.',
    chapter,
  },
  websocket: {
    term: 'WebSocket',
    def: 'A two-way message protocol that starts as an HTTP request and switches the connection over with a 101 response.',
    chapter,
  },
  grpc: {
    term: 'gRPC',
    def: 'A framework for calls between services, built on HTTP/2. It supports single calls and streams of messages in either or both directions.',
    chapter,
  },
}
