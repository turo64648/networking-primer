// Flashcards for the L4 Load Balancing chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why do large sites put an L4 tier in front of their L7 proxies?',
    a: 'It is cheap per packet, works for any protocol, keeps the client’s address, and gives a stable VIP so the L7 fleet can change freely behind it.',
  },
  {
    q: 'Why is ECMP from the router straight to the backends not enough at scale?',
    a: 'Router hashing moves many flows whenever the set changes, breaking their connections. It also ignores application health and load, and supports a limited number of paths.',
  },
  {
    q: 'Why must every L4 balancer pick the same backend for the same flow?',
    a: 'ECMP moves flows between balancers when one is added or fails. If all balancers agree, a moved flow still reaches its backend.',
  },
  {
    q: 'Why does <code>hash mod N</code> break so many connections?',
    a: 'Changing N changes the answer for almost every key. Removing one of ten backends moves about nine in ten flows, not one in ten.',
  },
  {
    q: 'How is a Maglev table built, and why is it even?',
    a: 'Each backend has its own pseudo-random order of preferred slots. Backends take turns claiming their next free slot until the table is full, so each gets almost the same number.',
  },
  {
    q: 'Why does a Maglev table move only a little more than the failed backend’s share?',
    a: 'Each backend’s preferences depend only on its own name, so removing one mostly frees its own slots. A few others shift as the freed slots are refilled.',
  },
  {
    q: 'What does connection tracking protect, and what does it not?',
    a: 'It keeps flows on their backend when the table changes. It does not help a flow that ECMP moves to another balancer, which has no record of it, and its table can be filled by floods.',
  },
  {
    q: 'How does second-chance forwarding keep flows alive without balancer state?',
    a: 'Each bucket lists a current and a previous backend. A backend that gets a non-new packet it does not recognise forwards it to the previous one, which owns the connection.',
  },
  {
    q: 'Why do balancers wrap packets instead of rewriting the destination?',
    a: 'Rewriting means replies must come back through the balancer to be rewritten again. Wrapping lets the backend see the original packet to the VIP and reply directly.',
  },
  {
    q: 'Why does direct server return let a few balancers front a large fleet?',
    a: 'Responses are usually much larger than requests, and with DSR they skip the balancer. It only handles the small inbound side.',
  },
  {
    q: 'What does DSR cost?',
    a: 'Encapsulation overhead and MTU care, setup on every backend, and a balancer that sees only half of each connection. ICMP errors to the VIP need routing to the right backend.',
  },
  {
    q: 'Why does hashing on the four-tuple break QUIC?',
    a: 'QUIC connections can change address and port when a phone switches networks or a NAT rebinds. The new four-tuple hashes to a different backend, which does not know the connection.',
  },
  {
    q: 'How does QUIC-LB let any balancer route a migrated connection?',
    a: 'The server encodes its own identity, encrypted, in the connection IDs it issues. Balancers share the key and decode the backend; outsiders see random bytes, so paths cannot be linked.',
  },
  {
    q: 'Why should health checks be limited in how much capacity they can remove?',
    a: 'A broken checker or shared dependency can mark every backend unhealthy at once. Capping removals and failing open keeps a checker bug from becoming an outage.',
  },
  {
    q: 'How does connection draining work, and why does it need a deadline?',
    a: 'The backend gets no new flows but keeps existing ones until they finish. Long-lived connections may never finish, so the server asks clients to reconnect and closes the rest after a timeout.',
  },
  {
    q: 'Why can a backend be overloaded even when the table gives it an equal share?',
    a: 'Equal slots mean equal numbers of flows, not equal work. A few busy long-lived connections, such as gRPC streams, can carry most of the load.',
  },
]
