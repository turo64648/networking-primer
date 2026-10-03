// Flashcards for the CDNs chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does a CDN speed up requests that cannot be cached?',
    a: 'TCP and TLS handshakes end at a nearby PoP, and the PoP reuses warm connections to the origin, often over the CDN’s backbone. The user pays one long round trip per request instead of several.',
  },
  {
    q: 'Why should static files have a content hash in their URL?',
    a: 'The file at a hashed URL never changes, so caches can keep it for a year and deploys need no purges. New HTML points at new URLs, so old and new versions never mix.',
  },
  {
    q: 'What is a cache key, and why does normalising it matter?',
    a: 'The string a cache builds from the request (by default host, path and query) to find a stored copy. Sorting parameters and dropping tracking ones let requests that want the same response share one copy.',
  },
  {
    q: 'Why is <code>Vary: User-Agent</code> bad for hit ratio?',
    a: 'There are thousands of distinct User-Agent strings, so the cache keeps a separate copy for each and few users share any copy. Reduce the header to a few classes at the edge and key on that.',
  },
  {
    q: 'What goes wrong if something that changes the response is missing from the cache key?',
    a: 'The cache serves one request’s response to others. Attackers use it for cache poisoning (an unkeyed header) and deception (a personal page cached as a static file).',
  },
  {
    q: 'Why do request hit ratio and byte hit ratio differ?',
    a: 'Large files such as video segments are usually cached well, small API responses less so. Request hit ratio drives origin load; byte hit ratio drives bandwidth cost.',
  },
  {
    q: 'Why does adding more PoPs tend to lower the hit ratio?',
    a: 'Each PoP has its own cache, so traffic for a file is split across more caches. Rarely requested files are then cold in most of them.',
  },
  {
    q: 'How does tiered caching help the long tail?',
    a: 'A PoP that misses asks a parent cache that collects misses from many PoPs. A file requested once in each of several cities becomes a hit at the parent, and the origin sees far fewer requests.',
  },
  {
    q: 'What are the costs of an origin shield?',
    a: 'Misses take an extra hop, and the shield becomes a hot spot that carries all miss traffic. If it fails without a fallback, every PoP’s misses fail.',
  },
  {
    q: 'Why is “purge everything” dangerous?',
    a: 'Every cache empties at once, so every request misses. An origin sized for a 95% hit ratio suddenly sees about twenty times its load.',
  },
  {
    q: 'What do surrogate keys (cache tags) solve?',
    a: 'They let one purge call remove every cached response that used a changed object, such as all pages showing product 123, whatever their URLs.',
  },
  {
    q: 'Why does a CDN purge not fix what users see straight away?',
    a: 'It takes time to reach every PoP, and it does not reach browsers or other caches outside the CDN. They keep their copies until their own lifetimes end.',
  },
  {
    q: 'What do <code>stale-while-revalidate</code> and <code>stale-if-error</code> do?',
    a: 'The first serves the old copy at once while the cache refreshes in the background. The second keeps serving the old copy when the origin fails, turning an outage into slightly old pages.',
  },
  {
    q: 'What is request collapsing, and what is its trap?',
    a: 'Concurrent misses for one key send a single request to the origin and share the response. If the response turns out uncacheable, the waiting requests then go to the origin one after another, so caches remember such URLs and skip waiting.',
  },
  {
    q: 'What is microcaching good for?',
    a: 'Caching shared “dynamic” responses for a second or so. The origin sees about one request per second per cache instead of thousands, and users see data at most a second old.',
  },
  {
    q: 'How do attackers get past a CDN’s cache, and how do you stop them?',
    a: 'They add random query strings so every request misses, or they hit the origin’s address directly. Drop unknown parameters from the key, rate-limit at the edge, and accept origin traffic only from the CDN with a secret header or client certificate.',
  },
  {
    q: 'How do you tell from the outside whether a response was a cache hit?',
    a: 'Read the headers: a hit/miss header (<code>Cache-Status</code>, <code>X-Cache</code> or a vendor name), <code>Age</code> above zero, and the PoP name. A hit’s time to first byte is about one round trip to the PoP.',
  },
]
