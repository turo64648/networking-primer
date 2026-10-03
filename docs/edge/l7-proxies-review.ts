// Flashcards for the L7 Proxies chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'What can an L7 proxy do that an L4 load balancer cannot?',
    a: 'It reads each HTTP request, so it can route by host, path or header, balance individual requests, enforce rate limits, retry on another server and log per request. An L4 balancer only places whole connections.',
  },
  {
    q: 'Why does an L7 proxy have “two connections”, and why does that matter?',
    a: 'The client connects to the proxy, and the proxy connects separately to the backend. The two sides can use different protocols, TLS settings and lifetimes, which enables protocol translation, buffering and connection reuse.',
  },
  {
    q: 'Why must a backend not trust the whole <code>X-Forwarded-For</code> header?',
    a: 'Clients can send the header with fake values. Only entries appended by proxies you control are reliable; trusting the rest lets attackers dodge IP-based limits.',
  },
  {
    q: 'How does request buffering protect backends?',
    a: 'The proxy reads a slow client’s upload completely, sends it to the backend in one fast burst, and feeds the response back at the client’s pace. A backend worker is busy for milliseconds instead of seconds.',
  },
  {
    q: 'What is request smuggling?',
    a: 'The proxy and backend disagree on where an HTTP/1.1 request ends (Content-Length vs chunked encoding). An attacker hides a second request inside the first, which the backend processes out of the proxy’s sight.',
  },
  {
    q: 'Why does round robin hurt tail latency when requests vary in cost?',
    a: 'It keeps sending a slow or busy server its full share. Requests queue on it, and its latency becomes the service’s tail latency.',
  },
  {
    q: 'Why can “always pick the least-loaded server” go wrong with many proxies?',
    a: 'Each proxy sees only its own traffic and slightly stale counts, so they all pick the same idle-looking server and overload it together.',
  },
  {
    q: 'How does the power of two choices work, and why is it good?',
    a: 'Pick two servers at random and use the one with fewer active requests. Randomness spreads the proxies’ choices, and the comparison avoids overloaded servers almost as well as perfect knowledge.',
  },
  {
    q: 'Why can a broken server attract more traffic under least request?',
    a: 'If it fails requests instantly, it has almost nothing in flight, so it always looks idle. Outlier detection, which ejects servers with unusual error rates, fixes this.',
  },
  {
    q: 'What does outlier detection catch that active health checks miss?',
    a: 'Gray failures: a server that passes a cheap <code>/healthz</code> probe but fails real requests. Passive checks watch real responses, so they notice within seconds at no extra cost.',
  },
  {
    q: 'Why cap how many servers health checks may remove?',
    a: 'A shared dependency failure or a bad check can mark every server unhealthy at once, leaving nowhere to send traffic. A maximum ejection share and a panic mode that balances across all servers keep the service partly up.',
  },
  {
    q: 'Why is a token bucket the common rate-limiting algorithm?',
    a: 'It allows short bursts up to the bucket size while holding the average to the refill rate, and needs only a count and a timestamp per key.',
  },
  {
    q: 'What is the trade-off between local and global rate limits?',
    a: 'Local limits are fast and need no coordination, but the effective limit depends on how many proxies a client hits. Global limits are accurate but add a network call and a dependency, so systems usually combine them.',
  },
  {
    q: 'Why is rate limiting by IP address crude?',
    a: 'Many mobile users can share one address behind carrier-grade NAT, and a botnet has thousands of addresses. Keys tied to accounts, sessions or API keys are fairer.',
  },
  {
    q: 'Why are L7 DDoS attacks hard to filter?',
    a: 'Each request is valid HTTPS and looks like a real user. The damage comes from cost per request, such as uncached searches, so defences rely on scoring, challenges and limits on expensive routes.',
  },
  {
    q: 'How did the HTTP/2 Rapid Reset attack get around stream limits?',
    a: 'Clients opened streams and cancelled them immediately. Cancelled streams no longer count against the concurrent stream limit, so one connection could start requests without bound.',
  },
  {
    q: 'How does a proxy restart without refusing new connections?',
    a: 'The new process takes over the listening socket (passed from the old process, or shared with <code>SO_REUSEPORT</code>). The old one stops accepting, sends GOAWAY or <code>Connection: close</code>, drains, and exits.',
  },
  {
    q: 'Why do WebSockets make deploys harder, and how do you soften the impact?',
    a: 'They never finish on their own, so after a drain period they must be closed and every client reconnects. Restart in small batches, spread the closes over time, and make clients reconnect with backoff and jitter.',
  },
  {
    q: 'Why should a proxy’s upstream idle timeout be shorter than the backend’s?',
    a: 'Otherwise the backend may close an idle pooled connection just as the proxy sends a request on it, and the user sees a 502. If the proxy always closes first, the race cannot happen.',
  },
]
