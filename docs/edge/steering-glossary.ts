// Glossary terms owned by the Steering Users & Failing Over chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'traffic-steering': {
    term: 'Traffic steering',
    def: 'Choosing which site serves each user, based on network delay, health, spare capacity and cost. Done with DNS answers, anycast routing or logic in the client. Also called global load balancing.',
    chapter: '/edge/steering',
  },
  region: {
    term: 'Region',
    def: 'A large datacenter site, or a group of nearby ones, that runs the application. Edge sites (PoPs) forward requests to regions.',
    chapter: '/edge/steering',
  },
  'real-user-monitoring': {
    term: 'Real-user monitoring (RUM)',
    def: 'Measurements taken by real users’ browsers or apps, such as how long a fetch from each site takes. Used to build steering maps and to spot failures that probes miss.',
    chapter: '/edge/steering',
  },
  'health-check': {
    term: 'Health check',
    def: 'A regular test of whether a server or site can serve, such as a request every few seconds. Several failures in a row mark it down; several successes mark it up again.',
    chapter: '/edge/steering',
  },
  'gray-failure': {
    term: 'Gray failure',
    def: 'A partial failure: a system that passes its health checks but fails some real requests, or only for some users. Hard to detect and a common cause of long incidents.',
    chapter: '/edge/steering',
  },
  'fail-open': {
    term: 'Fail open',
    def: 'When every target looks unhealthy, assume the checks are wrong and keep sending traffic to all of them, rather than to none.',
    chapter: '/edge/steering',
  },
  failover: {
    term: 'Failover',
    def: 'Moving users or requests away from a failed site or server to healthy ones. How fast it happens depends on the steering method.',
    chapter: '/edge/steering',
  },
  'thundering-herd': {
    term: 'Thundering herd',
    def: 'Many clients doing the same thing at the same moment, such as reconnecting after a failure. The sudden burst can overload the system that receives it.',
    chapter: '/edge/steering',
  },
  'active-active': {
    term: 'Active-active',
    def: 'A setup where every site serves real traffic all the time, so failover moves load between sites that are known to work. The opposite is a standby site that serves only in emergencies.',
    chapter: '/edge/steering',
  },
  drain: {
    term: 'Drain',
    def: 'Removing traffic from a site or server on purpose and gradually, letting existing connections finish, for example before maintenance.',
    chapter: '/edge/steering',
  },
}
