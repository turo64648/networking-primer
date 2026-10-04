// Flashcards for the Push & Real-Time Extra. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why can a server not open a connection to a phone when it has a message?',
    a: 'The phone sits behind the carrier’s NAT and firewalls, has no stable public address, and accepts no inbound connections. The phone must open and hold the connection.',
  },
  {
    q: 'Why would ten apps with their own connections drain the battery?',
    a: 'Each connection needs heartbeats to stay alive, and every packet wakes the radio, which then stays at high power for seconds. Ten schedules mean ten times the wake-ups.',
  },
  {
    q: 'Why does an idle connection from a phone die silently?',
    a: 'The carrier’s NAT deletes its mapping after a period of silence. Later packets from the server go nowhere, and neither side is told.',
  },
  {
    q: 'Why do apps send their own heartbeats instead of relying on TCP keepalive?',
    a: 'TCP keepalive defaults to probing after two hours of silence on Linux. NATs and load balancers forget idle flows much sooner, so the application must send something more often.',
  },
  {
    q: 'How does the push relay pattern save battery?',
    a: 'The OS keeps one connection to APNs or FCM for all apps, with one heartbeat schedule. App servers send to the push service, which forwards messages down that shared connection.',
  },
  {
    q: 'What is a device token, and what must your servers do with it?',
    a: 'An opaque string the OS gives an app meaning “this app on this phone”. Servers store it with the user, use it to send pushes, and delete it when the push service says it is unregistered.',
  },
  {
    q: 'Why should a push carry an ID rather than the full data?',
    a: 'Payloads are limited to a few kilobytes and delivery is best effort. The app treats the push as a hint and fetches the real data from your servers.',
  },
  {
    q: 'Why might an Android notification arrive late?',
    a: 'Normal-priority FCM messages can wait until the phone leaves Doze. High-priority messages wake the phone, but Google may downgrade them if they do not lead to a visible notification.',
  },
  {
    q: 'When would you choose Server-Sent Events over WebSockets?',
    a: 'When data flows only from server to client. SSE is plain HTTP, passes through ordinary proxies, and the browser reconnects and resumes from the last event ID by itself.',
  },
  {
    q: 'How does a client avoid losing messages when its connection drops?',
    a: 'Each event carries a sequence number or ID. On reconnect the client sends the last one it saw, and the server replays from there or asks for a full refresh.',
  },
  {
    q: 'What limits how many idle connections one edge server can hold?',
    a: 'Mostly memory: socket buffers, TLS state and session state, tens of kilobytes each with tuning. File descriptor limits, connection tracking and backend source ports come next. CPU is rarely the limit.',
  },
  {
    q: 'How do you drain a proxy holding WebSockets that never end?',
    a: 'Stop sending it new connections, then close existing ones yourself with a “going away” message, spread over minutes. Clients reconnect elsewhere with jitter.',
  },
  {
    q: 'Why cap the lifetime of long-lived connections?',
    a: 'Connections then rotate steadily across servers, so deploys and rebalancing happen without a special mass close, and no server holds stale clients for days.',
  },
  {
    q: 'Why is a reconnect storm worse than the steady load it replaces?',
    a: 'Each reconnect costs a TCP and TLS handshake, an authentication check and often a full state resync. Millions arriving at once overload backends sized for steady state.',
  },
  {
    q: 'How do you defend against reconnect storms?',
    a: 'Clients back off with random jitter, reconnects are made cheap with TLS resumption and resume tokens, and the edge admits reconnects at a rate the backends can absorb.',
  },
]
