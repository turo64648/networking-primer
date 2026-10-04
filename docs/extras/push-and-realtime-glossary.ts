// Glossary terms owned by the Push & Real-Time Extra.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'heartbeat': {
    term: 'Heartbeat',
    def: 'A small message sent on a schedule over an idle connection to keep NAT and load balancer mappings alive and to detect dead connections.',
    chapter: '/extras/push-and-realtime',
  },
  'push-notification-service': {
    term: 'Push notification service',
    def: 'A platform relay such as Apple’s APNs or Google’s FCM. The phone’s OS holds one connection to it, and app servers send messages through it to reach the phone.',
    chapter: '/extras/push-and-realtime',
  },
  'device-token': {
    term: 'Device token',
    def: 'An opaque string the OS gives an app to identify that app on that phone. App servers use it to address push messages.',
    chapter: '/extras/push-and-realtime',
  },
  'web-push': {
    term: 'Web Push',
    def: 'The browser version of push notifications: a website posts encrypted messages to a push service run by the browser vendor, which delivers them to the browser (RFC 8030).',
    chapter: '/extras/push-and-realtime',
  },
  'long-polling': {
    term: 'Long polling',
    def: 'The client sends a request that the server holds open until it has news; after each answer the client asks again. A fallback for real-time updates over plain HTTP.',
    chapter: '/extras/push-and-realtime',
  },
  'reconnect-storm': {
    term: 'Reconnect storm',
    def: 'Many clients reconnecting at the same moment after a server, region or service drops their long-lived connections, overloading handshakes, authentication and backends.',
    chapter: '/extras/push-and-realtime',
  },
}
