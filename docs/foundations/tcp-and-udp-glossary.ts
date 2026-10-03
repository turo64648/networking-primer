// Glossary terms owned by the TCP & UDP chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

const chapter = '/foundations/tcp-and-udp'

export const terms: Record<string, GlossaryEntry> = {
  tcp: {
    term: 'TCP (Transmission Control Protocol)',
    def: 'The transport protocol that turns lossy packet delivery into a reliable, ordered stream of bytes between two programs, after a handshake. It also slows down for the receiver and the network.',
    chapter,
  },
  udp: {
    term: 'UDP (User Datagram Protocol)',
    def: 'A minimal transport protocol that sends single messages to a port, with no handshake, no delivery guarantee, no ordering and no congestion control. DNS and QUIC run on it.',
    chapter,
  },
  datagram: {
    term: 'Datagram',
    def: 'A single, self-contained message sent over UDP. It arrives whole, or not at all, and possibly out of order.',
    chapter,
  },
  port: {
    term: 'Port',
    def: 'A 16-bit number that identifies a program on a machine, such as 443 for HTTPS. The IP address picks the machine; the port picks the program.',
    chapter,
  },
  'four-tuple': {
    term: '4-tuple',
    def: 'The four values that name a TCP connection: client address, client port, server address, server port. Load balancers hash it and NAT devices rewrite it.',
    chapter,
  },
  'three-way-handshake': {
    term: 'Three-way handshake',
    def: 'How TCP opens a connection: SYN, SYN-ACK, ACK. It agrees on starting sequence numbers and costs one round trip before the client can send its request.',
    chapter,
  },
  'tcp-fast-open': {
    term: 'TCP Fast Open (TFO)',
    def: 'A TCP extension that lets a returning client send data inside its SYN, saving one round trip. Middleboxes that drop such packets kept it from wide use.',
    chapter,
  },
  'tcp-segment': {
    term: 'Segment (TCP)',
    def: 'One chunk of a TCP byte stream, sent in one packet with a TCP header.',
    chapter,
  },
  'sequence-number': {
    term: 'Sequence number',
    def: 'The number TCP gives each byte it sends, counted from a random start. The receiver uses it to reorder data, drop duplicates and find gaps.',
    chapter,
  },
  'tcp-ack': {
    term: 'Acknowledgement (ACK)',
    def: 'A TCP receiver’s reply saying which byte it expects next, meaning everything before it arrived in order. The sender resends what is never acknowledged.',
    chapter,
  },
  'duplicate-ack': {
    term: 'Duplicate ACK',
    def: 'A repeated acknowledgement for the same byte, sent when later segments arrive after a gap. Three in a row make the sender resend the missing segment at once (fast retransmit).',
    chapter,
  },
  sack: {
    term: 'SACK (selective acknowledgement)',
    def: 'A TCP option where the receiver lists the ranges it already holds, so the sender can resend exactly the missing pieces after several losses.',
    chapter,
  },
  rto: {
    term: 'Retransmission timeout (RTO)',
    def: 'The timer after which a TCP sender resends unacknowledged data when no ACKs arrive. It is based on measured round trips and doubles after each expiry.',
    chapter,
  },
  'exponential-backoff': {
    term: 'Exponential backoff',
    def: 'Doubling the wait before each new retry, so a sender backs off quickly from a network or service that is failing. Used by TCP timeouts and by well-behaved clients.',
    chapter,
  },
  'receive-window': {
    term: 'Receive window',
    def: 'How much more data a TCP receiver says it can buffer, sent in every ACK. The sender may not have more than this unacknowledged.',
    chapter,
  },
  'flow-control': {
    term: 'Flow control',
    def: 'Keeping a fast sender from overrunning a slow receiver. In TCP it works through the receive window.',
    chapter,
  },
  'congestion-window': {
    term: 'Congestion window (cwnd)',
    def: 'The sender’s own estimate of how much data the network path can hold in flight. It grows while things go well and shrinks on signs of congestion.',
    chapter,
  },
  'congestion-control': {
    term: 'Congestion control',
    def: 'How a sender adjusts its rate to the network path, using signals such as loss and delay, so connections share links without overflowing their queues.',
    chapter,
  },
  'initial-window': {
    term: 'Initial window',
    def: 'The congestion window a new TCP connection starts with, typically 10 segments (about 14 KB). It limits what the server can send in the first round trip.',
    chapter,
  },
  'slow-start': {
    term: 'Slow start',
    def: 'The start-up phase of TCP congestion control: the window doubles every round trip from the initial window until a loss. Short transfers often finish during it.',
    chapter,
  },
  aimd: {
    term: 'AIMD (additive increase, multiplicative decrease)',
    def: 'The classic TCP rule after slow start: add one segment to the window per round trip, and halve it on a loss. It produces the familiar sawtooth.',
    chapter,
  },
  cubic: {
    term: 'CUBIC',
    def: 'A loss-based congestion control algorithm and the long-time default on Linux. It grows the window along a cubic curve and cuts it by about 30% on loss.',
    chapter,
  },
  bbr: {
    term: 'BBR',
    def: 'A model-based congestion control algorithm from Google that estimates the path’s bandwidth and minimum round trip and paces packets at that rate, instead of treating each loss as congestion.',
    chapter,
  },
  bufferbloat: {
    term: 'Bufferbloat',
    def: 'Large queues in routers and modems that fill up under load, adding long delays for every flow on the link before any packet is dropped.',
    chapter,
  },
  'head-of-line-blocking': {
    term: 'Head-of-line blocking',
    def: 'When one lost or slow item holds up everything queued behind it. In TCP, one lost packet stalls all later bytes, even those for unrelated requests on the same connection.',
    chapter,
  },
}
