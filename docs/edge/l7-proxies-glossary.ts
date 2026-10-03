// Glossary terms owned by the L7 Proxies chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'reverse-proxy': {
    term: 'Reverse proxy',
    def: 'A server that accepts client connections on behalf of backend servers, reads each request, and forwards it to one of them on a separate connection. Clients only ever talk to the proxy.',
    chapter: '/edge/l7-proxies',
  },
  'power-of-two-choices': {
    term: 'Power of two choices',
    def: 'A balancing rule: pick two servers at random and send the request to the less busy one. It avoids overloaded servers almost as well as picking the global minimum, without every balancer piling onto the same server.',
    chapter: '/edge/l7-proxies',
  },
  'outlier-detection': {
    term: 'Outlier detection',
    def: 'Passive health checking: a proxy watches real responses and temporarily stops sending traffic to a server whose errors stand out, such as several failures in a row.',
    chapter: '/edge/l7-proxies',
  },
  'rate-limiting': {
    term: 'Rate limiting',
    def: 'Capping how many requests a client, key or route may make per unit of time. Requests over the limit are rejected, usually with HTTP 429.',
    chapter: '/edge/l7-proxies',
  },
  'token-bucket': {
    term: 'Token bucket',
    def: 'A rate-limiting algorithm: a bucket refills with tokens at a fixed rate up to a maximum, and each request spends one. It allows short bursts while holding the average rate.',
    chapter: '/edge/l7-proxies',
  },
  waf: {
    term: 'WAF (web application firewall)',
    def: 'Software in the HTTP path, usually in a proxy, that matches requests against rules (for example patterns for SQL injection) and blocks or logs the ones that match.',
    chapter: '/edge/l7-proxies',
  },
  'bot-management': {
    term: 'Bot management',
    def: 'Telling automated clients from humans, using signals such as TLS and HTTP fingerprints and behaviour, then allowing, challenging or blocking them. Wanted bots such as search crawlers are verified separately.',
    chapter: '/edge/l7-proxies',
  },
  slowloris: {
    term: 'Slowloris',
    def: 'An attack that opens many connections and sends request headers very slowly, so a server that reserves a slot per connection runs out. Timeouts and event-driven servers defend against it.',
    chapter: '/edge/l7-proxies',
  },
}
