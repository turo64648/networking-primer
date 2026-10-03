// Flashcards for the Map chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Name the main stretches of the path from a phone to the first app server, and who runs each.',
    a: 'The phone and its Wi-Fi (the user), the radio access and NAT (home router or carrier), the ISP and other networks (various operators), then the edge PoP, backbone and datacenter (the website or its CDN).',
  },
  {
    q: 'Why does a round trip cost at least 1 ms per 100 km of distance?',
    a: 'Light in fiber covers about 200 km per millisecond, and a round trip covers the distance twice. Real paths are longer than the straight line and add queueing, so measured RTTs are higher.',
  },
  {
    q: 'Why do round trips usually matter more than bandwidth for web and API requests?',
    a: 'Most responses are small, so little time is spent sending bytes. Each round trip costs the distance there and back, and no amount of bandwidth shortens it.',
  },
  {
    q: 'What does a cold request pay for that a warm one does not?',
    a: 'A DNS lookup, a TCP handshake and a TLS handshake: about three round trips before the request itself. A warm request reuses an open connection and pays only its own round trip.',
  },
  {
    q: 'How does QUIC change the cold-request count?',
    a: 'It combines the connection and TLS handshakes into one round trip. On a resumed session, the client can even send its request in the first message (0-RTT).',
  },
  {
    q: 'Why do large websites end TLS at an edge site near the user?',
    a: 'The handshake round trips then cross a short distance. The edge forwards requests to the origin over warm connections, so the long distance is paid once per request instead of several times.',
  },
  {
    q: 'What decides which edge site (PoP) a user reaches?',
    a: 'Either DNS returns the address of a nearby PoP, or anycast announces one address from every PoP and internet routing picks a nearby one.',
  },
  {
    q: 'What are the three stages inside a typical edge site?',
    a: 'An L4 load balancer spreads connections by address and port; an L7 proxy ends TLS and reads the HTTP request; a CDN cache answers if it holds a fresh copy.',
  },
  {
    q: 'Why is the first request after a pause slow on a phone?',
    a: 'The radio may be idle to save battery and must wake up before sending. The connection may also have closed, so the request is cold and pays for new handshakes.',
  },
  {
    q: 'Why is a redirect expensive on a cold page load?',
    a: 'It costs a full round trip before the real request. If it points to a new hostname, that may also need a new DNS lookup, connection and TLS handshake.',
  },
  {
    q: 'How do you split a request into phases with <code>curl -w</code>?',
    a: 'Print <code>time_namelookup</code>, <code>time_connect</code>, <code>time_appconnect</code> and <code>time_starttransfer</code>. They are cumulative, so subtract neighbours: connect minus DNS is the TCP handshake, and so on.',
  },
  {
    q: 'In <code>curl -w</code> output, what does a large gap between TLS and first byte suggest?',
    a: 'Setup was fine, so the time went to the server or the trip from edge to origin, such as a cache miss or slow application work.',
  },
  {
    q: 'Why can server dashboards look healthy while users see slow requests?',
    a: 'Servers see only their own work. DNS, handshakes, radio wake-ups, distance and packet loss happen before the request arrives, so you need timings from real users’ devices.',
  },
  {
    q: 'Why does an edge near users not fully fix a distant origin?',
    a: 'Cached content and handshakes become fast, but every dynamic request still pays one round trip to the origin, and screens with several sequential calls pay it several times. Only moving compute and data closer removes that.',
  },
  {
    q: 'Why do big websites often reach users without crossing third-party networks?',
    a: 'They connect their own networks directly to many large ISPs, so traffic can pass from the user’s ISP straight into the website’s network.',
  },
]
