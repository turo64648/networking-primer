// Glossary terms owned by the Observing & Debugging the Path chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'synthetic-monitoring': {
    term: 'Synthetic monitoring',
    def: 'Running scripted requests from machines you control, on a schedule, to measure availability and latency. Steady and repeatable, but blind to real users’ networks and devices.',
    chapter: '/operations/observing-the-path',
  },
  'distributed-tracing': {
    term: 'Distributed tracing',
    def: 'Tagging every hop’s work on one request with a shared trace ID, so the time spent in each proxy and service can be shown as one timeline.',
    chapter: '/operations/observing-the-path',
  },
  'trace-context': {
    term: 'Trace Context (traceparent)',
    def: 'A W3C standard header, traceparent, that carries a request’s trace ID and parent span ID between hops, so tools from different vendors can join one trace.',
    chapter: '/operations/observing-the-path',
  },
  'server-timing': {
    term: 'Server-Timing',
    def: 'An HTTP response header that reports server-side durations and notes, such as cache status, to the client, where real-user monitoring can record them.',
    chapter: '/operations/observing-the-path',
  },
  'network-error-logging': {
    term: 'Network Error Logging (NEL)',
    def: 'A browser feature where a site sets a policy once, and the browser later reports failed requests (DNS, connection, TLS, HTTP errors) to a collector the site names.',
    chapter: '/operations/observing-the-path',
  },
}
