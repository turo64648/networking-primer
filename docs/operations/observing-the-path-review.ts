export const cards = [
  {
    q: 'Why can server-side latency stay flat while users see the site get slower?',
    a: 'The server only measures its own work. DNS, handshakes, the route, the edge, radio wake-ups and requests that never arrived are all outside its view.',
  },
  {
    q: 'What does real-user monitoring see that synthetic probes do not?',
    a: 'Real devices, real networks and the real traffic mix, including the last mile and specific carriers. Probes usually run from well-connected datacenters.',
  },
  {
    q: 'Why do you still need synthetic probes if you have real-user data?',
    a: 'Probes are steady and repeatable, so a change stands out at once, and they work when there is no traffic. Real-user data is noisy and needs volume.',
  },
  {
    q: 'What is survivorship bias in real-user monitoring?',
    a: 'Users whose requests failed early never send a beacon, so they vanish from the data. Dashboards can look healthier during an outage.',
  },
  {
    q: 'How do you turn a vague p99 regression into a lead?',
    a: 'Slice it by country, network, edge site, protocol, IP family and app version until it concentrates, and split it into phases: DNS, connect, TLS, first byte.',
  },
  {
    q: 'What does the traceparent header carry, and why does it matter?',
    a: 'A trace ID shared by the whole request and the ID of the span that sent it. Every hop logs under the same trace ID, so you can join edge, proxy and server timings.',
  },
  {
    q: 'Why start a trace at the edge rather than at the application?',
    a: 'A trace that starts at the application cannot show time lost at the CDN, load balancer or proxies in front of it.',
  },
  {
    q: 'What does the Server-Timing header add to client-side monitoring?',
    a: 'It sends server-side durations and cache status to the client, so one real-user record shows both how long the user waited and where on the server side the time went.',
  },
  {
    q: 'How does Network Error Logging report a failure the site never saw?',
    a: 'The browser remembers a policy from an earlier successful response. When a later request fails, it sends a report with the phase, error type and server address to a separate collector.',
  },
  {
    q: 'Why must curl -w timings be subtracted?',
    a: 'Each value is measured from the start of the request. Connect minus DNS gives the TCP handshake; TLS minus connect gives the TLS handshake.',
  },
  {
    q: 'Why use --resolve (or an explicit IP) when testing with curl or openssl?',
    a: 'To test the same edge site the affected users reach, rather than the one nearest to you. Different sites can serve different certificates or routes.',
  },
  {
    q: 'An mtr hop shows 40% loss, but later hops show none. Is there a problem at that hop?',
    a: 'No. Routers deprioritise and rate-limit the replies traceroute relies on. Only loss that continues to the final hop affects your traffic.',
  },
  {
    q: 'Why can traceroute mislead you about where latency comes from?',
    a: 'Each hop time includes the reply’s trip back, which may take a different path. The jump may be on the return path, which you cannot see without tracing from the other end.',
  },
  {
    q: 'How do load-balanced paths confuse classic traceroute?',
    a: 'Routers hash each flow onto one of several paths. Classic traceroute changes ports per probe, so probes take different branches and the result mixes them. Flow-stable tools fix this.',
  },
  {
    q: 'What does capturing packets at both ends tell you that one end cannot?',
    a: 'Whether a packet was lost on the path (left one side, never arrived) or reached the far side and got no answer.',
  },
  {
    q: 'A steady 5% of requests time out and retries succeed. What does that pattern suggest?',
    a: 'One bad member of a group, such as a backend or one hashed link. Retries pick a new port or backend and escape it, so group failures by what they share.',
  },
]
