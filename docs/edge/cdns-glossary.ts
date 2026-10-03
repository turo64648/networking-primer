// Glossary terms owned by the CDNs chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'cache-key': {
    term: 'Cache key',
    def: 'The string a cache builds from a request (by default host, path and query string, plus any headers named in Vary) to find a stored copy. Requests with the same key share one copy.',
    chapter: '/edge/cdns',
  },
  'cache-hit-ratio': {
    term: 'Cache hit ratio',
    def: 'The share of requests (or bytes) a cache answers from its stored copies without asking the origin. It sets how much load and cost reach the origin.',
    chapter: '/edge/cdns',
  },
  'tiered-cache': {
    term: 'Tiered caching',
    def: 'Arranging CDN caches in levels, so a PoP that misses asks a parent cache before the origin. Parents collect misses from many PoPs and turn many of them into hits.',
    chapter: '/edge/cdns',
  },
  'origin-shield': {
    term: 'Origin shield',
    def: 'A designated cache, near the origin, that every other PoP sends its misses through. The origin sees about one request per object per lifetime.',
    chapter: '/edge/cdns',
  },
  'cache-purge': {
    term: 'Purge (cache invalidation)',
    def: 'Removing or marking stale cached copies before their lifetime ends, by URL, by tag, or all at once.',
    chapter: '/edge/cdns',
  },
  'surrogate-key': {
    term: 'Surrogate key (cache tag)',
    def: 'A label the origin attaches to a response, such as product-123. One purge by that label removes every cached response that carries it.',
    chapter: '/edge/cdns',
  },
  'stale-while-revalidate': {
    term: 'stale-while-revalidate',
    def: 'A Cache-Control directive that lets a cache serve an expired copy for a set time while it fetches a fresh one in the background.',
    chapter: '/edge/cdns',
  },
  'request-collapsing': {
    term: 'Request collapsing',
    def: 'When many requests miss on the same key at once, the cache sends one request to the origin and gives its response to all of them. Also called request coalescing.',
    chapter: '/edge/cdns',
  },
}
