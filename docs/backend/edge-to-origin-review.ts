// Flashcards for the Edge to Origin chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why is an uncacheable request often faster through a nearby PoP than directly to the origin?',
    a: 'The handshakes happen over the short round trip to the PoP. The PoP forwards the request on a connection to the origin that is already open, so only the request and response cross the long distance.',
  },
  {
    q: 'Why does split TCP save little on the first byte when the PoP has no open connection to the origin?',
    a: 'The PoP must do its own TCP and TLS handshakes across the long distance before forwarding. Those long round trips are the cost split TCP was meant to remove.',
  },
  {
    q: 'Besides handshakes, how does split TCP help a phone on a lossy network?',
    a: 'Slow start ramps up faster over the short round trip, and lost packets are resent by the nearby PoP instead of the far origin. Each leg can also use its own tuning.',
  },
  {
    q: 'What does split TCP give up?',
    a: 'End-to-end semantics: an acknowledgement from the proxy does not mean the origin has the data. The proxy holds state and buffers, and with TLS it sees plaintext and needs the site’s keys.',
  },
  {
    q: 'Why do warm pooled connections speed up large responses, not only the first byte?',
    a: 'A connection that has carried traffic already has a large congestion window, so it sends at full speed at once. A new connection would start small and ramp up over several round trips.',
  },
  {
    q: 'Why must the edge’s idle timeout for pooled connections be shorter than the origin’s?',
    a: 'Otherwise the edge sometimes sends a request on a connection the origin has just closed. The request fails with a 502, and the origin never logs it.',
  },
  {
    q: 'Why can many PoPs overload an origin with connections, and how do you fix it?',
    a: 'Every proxy process in every PoP keeps its own pool, which multiplies into huge connection counts. Multiplex with HTTP/2, share pools, or route misses through a few shield PoPs.',
  },
  {
    q: 'When is one multiplexed HTTP/2 connection to the origin a bad idea?',
    a: 'On a lossy path. TCP delivers bytes in order, so one lost packet stalls every stream on the connection. Spreading load over several connections limits the damage.',
  },
  {
    q: 'What does a private backbone give you that the public internet does not?',
    a: 'Predictable latency, planned capacity and priorities between traffic classes, because one operator controls every link. The cost is money, staff and a shared point of failure.',
  },
  {
    q: 'What is the difference between hot-potato and cold-potato routing?',
    a: 'Hot potato hands traffic to the next network at the nearest exit to save your own capacity. Cold potato keeps it on your own network as far as possible, usually for better control of the path.',
  },
  {
    q: 'What problem does backbone traffic engineering solve?',
    a: 'Shortest-path routing overloads the best links and leaves expensive alternatives idle. Placing traffic deliberately by demand and priority lets links run full while user traffic stays protected.',
  },
  {
    q: 'How does a central traffic-engineering controller run links near full without hurting users?',
    a: 'It gives user-facing traffic its share first and lets bulk copies fill the remaining capacity. When a link fails, bulk traffic is squeezed first.',
  },
  {
    q: 'What new risks does central traffic engineering bring?',
    a: 'A bad input or config can reach every site at once, and the controller itself can fail. Routers must keep forwarding on last good paths, and changes must roll out in stages.',
  },
  {
    q: 'Why might a PoP not send a request to the nearest origin region?',
    a: 'The user’s data may live in another region, the nearest region may lack capacity or scarce hardware like GPUs, or it may be unhealthy.',
  },
  {
    q: 'Which requests may the edge retry in another region during failover?',
    a: 'Only idempotent requests, or ones with an idempotency key. Resending a payment blindly can charge twice.',
  },
  {
    q: 'Why is an IP allowlist of CDN address ranges weak protection for an origin?',
    a: 'Every other customer of that CDN sends from the same ranges, so they could reach your origin through it. Use mTLS with a certificate specific to you, or an outbound tunnel.',
  },
  {
    q: 'Why must the origin trust X-Forwarded-For only on connections from the edge?',
    a: 'Anyone who reaches the origin directly can forge the header. Per-user rate limits, logging and geolocation would then use fake addresses.',
  },
]
