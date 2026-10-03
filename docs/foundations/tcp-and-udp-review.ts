// Flashcards for the TCP & UDP chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does a cold HTTPS request take about three round trips before the first byte arrives?',
    a: 'TCP’s handshake takes one round trip, the TLS 1.3 handshake a second, and the request and response a third. The DNS lookup comes before all of them.',
  },
  {
    q: 'Why does the 4-tuple matter outside TCP itself?',
    a: 'Load balancers hash it to keep a connection on one backend, NAT devices rewrite it, and a client talking to one server address can run out of local ports. When a phone’s address changes, the 4-tuple changes and TCP connections break.',
  },
  {
    q: 'How does a TCP receiver tell the sender what it has?',
    a: 'Every byte has a sequence number. The receiver acknowledges the next byte it expects, meaning everything before it arrived in order. With SACK it also lists ranges it holds beyond a gap.',
  },
  {
    q: 'Why does TCP wait for three duplicate ACKs before a fast retransmit?',
    a: 'One or two duplicates may only mean packets were reordered. Three in a row strongly suggest a loss, so the sender resends without waiting for a timer.',
  },
  {
    q: 'What problem does SACK solve?',
    a: 'A cumulative ACK names only the first gap, so several losses in one window are found one round trip at a time. SACK lists what did arrive, so the sender resends all the gaps at once.',
  },
  {
    q: 'Why are retransmission timeouts so much worse than fast retransmits?',
    a: 'The sender waits for the timer instead of reacting in about one round trip, the timer doubles on each retry, and a timeout collapses the congestion window. Tail losses on short responses hit this most.',
  },
  {
    q: 'Why can a TCP connection look open for minutes after the network recovered or the peer died?',
    a: 'Each lost retry doubles the timeout, so the next attempt can be far away. Linux keeps retrying a dead peer for about 15 minutes by default, so apps need their own deadlines or heartbeats.',
  },
  {
    q: 'What is the difference between flow control and congestion control?',
    a: 'Flow control protects the receiver through the receive window it advertises. Congestion control protects the network through the sender’s own congestion window. The sender obeys the smaller.',
  },
  {
    q: 'Why does a faster link not always make a download faster?',
    a: 'A connection sends at most one window per round trip, so throughput is about window ÷ round trip. A small window or a long round trip caps it whatever the link speed.',
  },
  {
    q: 'Why are new TCP connections slow even on a fast network?',
    a: 'Slow start begins with about 10 segments (around 14 KB) and doubles each round trip. A short response finishes before the window gets large, so it is bound by round trips, not bandwidth.',
  },
  {
    q: 'Why do warm connections matter, and how can they go cold?',
    a: 'A reused connection skips the handshakes and already has a large window. By default Linux resets the window after the connection has been idle for about one timeout period.',
  },
  {
    q: 'How do CUBIC and BBR decide how fast to send?',
    a: 'CUBIC is loss-based: it grows until a packet is lost, then cuts by about 30%. BBR is model-based: it measures the path’s bandwidth and minimum round trip and paces packets at that rate.',
  },
  {
    q: 'Why does loss-based congestion control struggle on mobile links?',
    a: 'Radio noise causes losses that are not congestion, and CUBIC slows down for them anyway. Large cellular buffers also let it build long queues before any loss, adding delay.',
  },
  {
    q: 'What is head-of-line blocking in TCP, and why does it hurt HTTP/2?',
    a: 'TCP hands bytes to the app strictly in order, so one lost packet stalls all later data. HTTP/2 puts many requests on one connection, so one loss stalls all of them.',
  },
  {
    q: 'Why did TCP Fast Open see little deployment?',
    a: 'Middleboxes dropped SYNs that carried data or the new option, so clients had to retry and lost more time than they saved. Browsers disabled it, and its cookie raised tracking concerns.',
  },
  {
    q: 'What does UDP not give you, and why do DNS and QUIC use it anyway?',
    a: 'No handshake, delivery guarantee, ordering or congestion control. DNS wants one cheap round trip and can retry itself; QUIC builds its own transport in the application, because middleboxes and kernels make changing TCP slow.',
  },
]
