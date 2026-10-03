// Glossary terms owned by the Timeouts, Retries & Overload chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'timeout': {
    term: 'Timeout',
    def: 'A limit on how long a caller waits for a step, such as connecting or receiving a response, before giving up. It keeps a slow dependency from tying up the caller’s threads and connections.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'deadline-propagation': {
    term: 'Deadline propagation',
    def: 'Passing the time remaining for a request to every hop that works on it, so each can skip expired work and cancel its own downstream calls.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'backoff-jitter': {
    term: 'Jitter (backoff)',
    def: 'Randomness added to the wait before a retry, so clients that failed at the same moment do not retry at the same moment.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'retry-amplification': {
    term: 'Retry amplification',
    def: 'The multiplication of attempts when several layers each retry: three layers with three attempts each can send 27 calls to the bottom layer per request.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'retry-budget': {
    term: 'Retry budget',
    def: 'A cap on retries as a share of all traffic, such as 10%, so retries rescue scattered failures but stop when most requests fail.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'retry-storm': {
    term: 'Retry storm',
    def: 'A surge of retries that keeps a struggling service overloaded, causing more failures and more retries.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'tail-latency': {
    term: 'Tail latency',
    def: 'The latency of the slowest requests, measured at a high percentile such as the 99th or 99.9th.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'hedged-request': {
    term: 'Hedged request',
    def: 'A copy of a request sent to a second server when the first is slower than usual; the client uses whichever answer arrives first and cancels the other.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'goodput': {
    term: 'Goodput',
    def: 'Useful work completed: responses delivered to callers still waiting for them. Under overload it can fall while the server stays fully busy.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'load-shedding': {
    term: 'Load shedding',
    def: 'Rejecting excess requests quickly and cheaply when a server is past capacity, so the requests it accepts are still served fast.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'circuit-breaker': {
    term: 'Circuit breaker',
    def: 'A wrapper around calls to a dependency that stops calling it for a while after repeated failures, fails fast instead, and lets a few test calls through to detect recovery.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'admission-control': {
    term: 'Admission control',
    def: 'Deciding before sending or accepting a request whether to let it in, for example a client that holds back requests when the backend has been rejecting many.',
    chapter: '/operations/timeouts-retries-overload',
  },
  'metastable-failure': {
    term: 'Metastable failure',
    def: 'An outage that continues after its trigger is gone, because a feedback loop such as retries or a cold cache keeps the system overloaded.',
    chapter: '/operations/timeouts-retries-overload',
  },
}
