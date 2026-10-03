---
title: "13. CDNs"
---

<script setup>
import { cards } from './cdns-review'
</script>

# 13. CDNs

A <Term id="cdn">content delivery network (CDN)</Term> keeps copies of a website's responses in hundreds of
sites close to users, so most requests never travel to the website's own servers. Interviewers like it
because one design question touches caching, consistency, failure handling and attack defence at once.

::: info Before you start
- Large websites run many sites near users, called **points of presence (PoPs)**. How each user is sent to
  one is [chapter 10](/edge/steering).
- At a PoP, a proxy ends the user's TLS connection and reads the HTTP request.
  [Chapter 12](/edge/l7-proxies) covers those proxies; this chapter covers the cache inside them.
- HTTP responses carry headers that tell caches how long to keep them (`Cache-Control`) and how to check
  whether a copy is still good (`ETag`). [Chapter 6](/protocols/http#caching-headers) explains them.

The chapter makes sense without them. Names and addresses in the examples are placeholders.
:::

## What a CDN does and why it helps

**In short:** a CDN answers requests from a nearby copy. That cuts the round trips the user waits for, cuts
the load on the website's servers, and spreads traffic over many sites.

Say a user in Sydney loads a page from a site whose servers are in Virginia. Every round trip crosses the
Pacific: on the order of 200 ms. The page needs a TCP handshake, a TLS handshake and then dozens of
requests for images, scripts and styles. If a server in Sydney holds copies of those files, each round trip
takes a few milliseconds instead.

The website's own servers are called the <Term id="origin">origin</Term>. A CDN puts caching proxies in
<Term id="pop">points of presence (PoPs)</Term> around the world. The user reaches a nearby PoP. If the PoP
has a fresh copy of the response, it answers at once: a **hit**. If not, it fetches the response from the
origin, keeps a copy, and answers: a **miss**.

A CDN helps in four ways:

- **Latency.** Hits are answered from a few milliseconds away. Even misses are faster, because the user's
  handshakes end at the nearby PoP, and the PoP keeps warm connections to the origin
  ([chapter 14](/backend/edge-to-origin)).
- **Origin offload.** If 95% of requests are hits, the origin serves one request in twenty. It can be far
  smaller.
- **Bandwidth cost.** Large files (images, video, software downloads) are served from PoPs that sit inside
  or next to users' networks, often over cheap peering links instead of paid transit.
- **Absorbing spikes and attacks.** A sudden flood of traffic lands on hundreds of PoPs, not on one origin.

The CDN can be a company you pay (Akamai, Cloudflare, Fastly, CloudFront and others) or one you build. The
largest websites run their own PoPs, and video services often place cache servers inside ISPs' networks.

<CdnTieredCacheDiagram />

## What to cache

**In short:** cache anything that is the same for many users. Give files that never change a long lifetime
and a new URL for each version. Keep short lifetimes for things that change, and never share responses built
for one user.

Content falls into a few groups:

| Kind of content | Example | Typical policy |
|---|---|---|
| **Versioned static files** | `/app.3f9a2c.js`, `/logo.v12.png` | Cache for a year. A new version gets a new URL. |
| **Media** | Images, video segments, downloads | Cache long. These are most of the bytes. |
| **Shared HTML and API responses** | Home page, product page, public price list | Cache for seconds to minutes, or purge on change. |
| **Personalised responses** | Your inbox, your cart, your account page | Do not cache at a shared cache. |

The first row is the most important pattern. If a file's URL contains a hash of its contents, the file at
that URL never changes. The CDN and the browser can keep it for a year, and a deploy never has to purge
anything: the new HTML points at new URLs. Only the HTML itself needs a short lifetime.

The origin states the policy with headers. Recap from [chapter 6](/protocols/http#caching-headers):
<Term id="cache-control">`Cache-Control`</Term> says how long a response stays fresh (`max-age`) and whether
shared caches may store it at all (`private`, `no-store`). After it goes stale, a cache can ask the origin
"has this changed?" with a <Term id="conditional-request">conditional request</Term>, and get a short
`304 Not Modified` instead of the whole body.

A CDN often needs a different lifetime from the browser. A news home page might live 10 seconds in the
browser but be purged on demand at the CDN, so the CDN can keep it for an hour. HTTP has `s-maxage` for
shared caches, and CDNs offer headers that only they read.

::: details Going deeper: CDN-specific headers and defaults
- `s-maxage` overrides `max-age` for shared caches (RFC 9111, 2022).
- `CDN-Cache-Control` (RFC 9213, 2022) targets CDNs only and is removed before the browser sees it. Some
  vendors have their own: `Surrogate-Control` (Fastly and others).
- Defaults vary by vendor. Many CDNs do not cache a response that carries `Set-Cookie`, or a request that
  carries an `Authorization` header, unless told to. Some cache nothing that lacks explicit headers; others
  apply a default lifetime by file extension. Read your vendor's rules before trusting them.
- `Cache-Control: immutable` tells browsers not to revalidate a fresh response on reload. It suits
  hashed URLs.
:::

## Cache keys and hit ratio

**In short:** the cache finds a stored copy by its cache key, by default the host, path and query string.
Every extra variation in the key splits traffic into smaller pieces and lowers the hit ratio.

### The cache key

The cache needs to know whether two requests want the same response. It builds a string from parts of the
request, called the <Term id="cache-key">cache key</Term>, and looks it up. By default the key is the host,
the path and the full query string.

Small differences break sharing. These URLs return the same page, but have three different keys:

```text
/shoes?color=red&size=9
/shoes?size=9&color=red
/shoes?color=red&size=9&utm_source=newsletter
```

So CDNs let you **normalise** the key: sort query parameters, drop tracking parameters such as `utm_*`,
lower-case the host. Normalising has a limit: anything you drop from the key must not change the response.

The <Term id="vary">`Vary`</Term> header adds request headers to the key. `Vary: Accept-Encoding` stores
compressed and uncompressed copies separately, which is correct. `Vary: User-Agent` is a trap: there are
thousands of distinct User-Agent strings, so each copy is shared by few users. The fix is to reduce the
header to a few classes at the edge (for example "mobile" and "desktop") and key on that.

### Hit ratio

The <Term id="cache-hit-ratio">cache hit ratio</Term> is the share of requests answered from cache. It
drives everything else: origin load, cost and the latency most users see. Two versions matter:

- **Request hit ratio:** share of requests served from cache. It drives origin request load.
- **Byte hit ratio:** share of bytes served from cache. It drives bandwidth cost.

They differ. A site might hit 98% on big video segments and 60% on small API calls.

Hit ratio falls for four main reasons:

- **The long tail.** Popular files are always cached. Most files are requested rarely, so their copies
  expire or are evicted before the next request.
- **Too many PoPs.** Each PoP has its own cache. With 300 PoPs, a file needs 300 misses to be warm
  everywhere, and a rarely requested file is cold in most of them.
- **Limited space.** A PoP's disks and memory are finite. When they fill, the cache evicts the least
  recently used copies. A bigger catalogue means more misses.
- **Fragmented keys and short lifetimes,** as above.

The next section's tiered caching attacks the first two. The rest is your job: normalise keys, give long
lifetimes, and version URLs instead of shortening TTLs.

::: details Going deeper: when the key is wrong, users get the wrong response
If something changes the response but is **not** in the key, the cache can serve one user's response to
another.
- **Web cache poisoning:** an attacker sends a request with a header the origin uses but the cache does not
  key on (for example a forwarded host header). The origin builds a response with the attacker's value, and
  the cache serves it to everyone. James Kettle's 2018 research for PortSwigger made it widely known.
- **Web cache deception:** an attacker lures a logged-in user to `/account/settings/x.css`. The origin
  ignores the suffix and returns the account page; the CDN sees `.css`, caches it, and the attacker fetches
  it. Omer Gil described it in 2017.
- The defence for both: key on everything that changes the response, cache by the origin's headers rather
  than by file extension, and mark personal responses `private`.
:::

## Tiered caching and the origin shield

**In short:** on a miss, a PoP asks a larger regional cache before it asks the origin. One designated PoP,
the origin shield, can stand in front of the origin so it sees each object about once.

Without tiers, a new file requested in 300 PoPs causes up to 300 fetches from the origin. With
<Term id="tiered-cache">tiered caching</Term>, PoPs are arranged in levels. A PoP that misses asks a parent
PoP. Only if the parent also misses does the request go to the origin.

The parent sees misses from many children, so its "long tail" is much shorter: a file requested once in
Paris and once in Madrid is a hit at the second request if both ask the same parent. Parents usually have
bigger caches too.

The extreme version is an <Term id="origin-shield">origin shield</Term>: one PoP (or a small group) close to
the origin that every other PoP goes through. The origin sees roughly one request per object per lifetime,
however many PoPs ask.

The costs:

- **An extra hop on misses.** A child-to-parent-to-origin path is longer than child-to-origin, unless the
  parent sits on a fast private network.
- **A new hot spot.** The shield carries all miss traffic. If it fails or overloads, every PoP's misses
  fail with it. Good designs let children fall back to another parent or straight to the origin.
- **More layers to debug.** A stale copy can sit in the child or the parent, each with its own `Age`.

::: details Going deeper: how the parent is chosen
Parents are usually picked by geography (each region's PoPs share one parent) or by hashing the cache key
across a set of parents with consistent hashing. Hashing spreads the load and makes each object live on one
parent, so the parents' combined cache holds more distinct objects. Facebook's 2013 SOSP paper on photo
caching ("An Analysis of Facebook Photo Caching") measured how much each layer (browser, edge, origin
cache) absorbed and found that edge caches alone missed a large share of the long tail.
:::

## Purging and invalidation

**In short:** a lifetime says how long a copy may live; a purge removes it early. Prefer new URLs for
versioned files, purge by tag for content that changes, and treat "purge everything" as dangerous.

Lifetimes alone force a bad choice for content that changes unpredictably. A long lifetime serves an old
price for hours; a short one sends most requests to the origin. A <Term id="cache-purge">purge</Term> lets
you keep a long lifetime and remove copies the moment the content changes.

Three ways to invalidate, from best to worst:

1. **Change the URL.** Hashed file names never need purging. This is the right answer for static assets.
2. **Purge by URL or by tag.** The origin labels each response with tags, called
   <Term id="surrogate-key">surrogate keys</Term>, such as `product-123` and `category-shoes`. When product
   123 changes, one purge call for `product-123` removes every page that showed it, whatever its URL.
3. **Purge everything.** Every PoP drops its whole cache. Every request becomes a miss at once.

Purge-all is the dangerous one. The origin was sized for a 95% hit ratio and now sees twenty times its
normal load. That is a <Term id="thundering-herd">thundering herd</Term> of your own making, and a
purge-all during an incident can turn a small problem into an origin outage.

Two details matter in practice. A purge takes time to reach every PoP: from well under a second to tens of
seconds, depending on the vendor and year. And a purge does not reach browsers or other caches outside the
CDN, so the browser lifetime must stay short for anything you may need to change.

::: details Going deeper: soft purge
A **soft purge** marks copies as stale instead of deleting them. The next request triggers a refresh, but the
stale copy can still be served while the refresh runs, or if the origin fails. Fastly offers it by that name;
other vendors have similar options. It avoids the empty-cache herd of a hard purge.
:::

## Serving stale and collapsing requests

**In short:** a cache can serve a slightly old copy while it refreshes in the background, or while the origin
is down. When many users miss on the same object at once, it sends one request to the origin, not thousands.

### Serving stale

When a copy expires, the next user would normally wait for the origin. With
<Term id="stale-while-revalidate">stale-while-revalidate</Term>, the cache answers that user with the old
copy at once and fetches a new one in the background. Users never wait on a refresh, and popular objects
stay warm.

`stale-if-error` goes further: if the origin returns errors or does not answer, the cache keeps serving the
old copy for a set time. This is the HTTP version of the DNS <Term id="serve-stale">serve-stale</Term>
behaviour from [chapter 4](/protocols/dns). It turns a short origin outage into slightly old pages instead of
an error page. The cost is correctness: for prices, stock levels or anything legal, decide how old is too
old.

```http
Cache-Control: max-age=60, stale-while-revalidate=30, stale-if-error=86400
```

This response is fresh for 60 seconds. For the next 30, the cache serves it and refreshes in the background.
If the origin is failing, the cache may serve it for up to a day.

### Request collapsing

Picture a breaking news page whose copy expires while 5,000 users per second request it. Without care, every
one of those requests misses and goes to the origin in the same instant.

With <Term id="request-collapsing">request collapsing</Term> (also called request coalescing), the cache
sends **one** request to the origin for that key. The other requests wait for it, then all get the same
response. Combined with tiered caching, the origin sees one request per object, not one per PoP per user.

<CdnRequestCollapsingDiagram />

Collapsing has a trap. If the response turns out to be uncacheable (personalised, or `no-store`), the
waiting requests got nothing useful from waiting: now each must go to the origin, one after another. A page
that should take 100 ms can take seconds. Caches avoid this by remembering "this URL is not cacheable" for a
short time and sending later requests straight through. Watch for this when a once-cacheable page starts
setting a cookie.

::: details Going deeper: names in different products
- Varnish calls the "remember that this is uncacheable" marker hit-for-pass (or hit-for-miss).
- NGINX implements collapsing with `proxy_cache_lock`; `proxy_cache_use_stale` covers serving stale
  (`updating` and `error` cases).
- `stale-while-revalidate` and `stale-if-error` are defined in RFC 5861 (2010). Support at CDNs and browsers
  varies; check yours.
:::

## Dynamic content and edge compute

**In short:** responses that cannot be cached still gain from a CDN: shorter handshakes, warm connections to
the origin, and attack absorption. Edge compute runs small pieces of your code in the PoP.

An API call that returns your feed cannot be cached. Sending it through a CDN still helps:

- **Short handshakes.** TCP and TLS end at a PoP a few milliseconds away, instead of across an ocean.
- **Warm, tuned paths to origin.** The PoP reuses long-lived connections to the origin, often over the CDN's
  own backbone ([chapter 14](/backend/edge-to-origin)). The user pays one long round trip per request, not
  three or four for new handshakes.
- **Protection.** The origin is hidden behind the CDN, as the next section explains.

Some "dynamic" content is shared for a moment. **Microcaching** stores it for one to a few seconds. A page
that gets 1,000 requests per second then costs the origin about one request per second per cache, and users
see data at most a second old.

**Edge compute** lets you run your own code in the PoP: products such as Cloudflare Workers, Fastly
Compute and Lambda@Edge. Common uses are small and request-shaped: redirects, A/B test assignment, checking
a signed token before serving cached content, rewriting headers, or building a cache key. Programs run in
tight limits on CPU time and memory. Data that lives in one region is still one long round trip away, so
edge code that calls the origin on every request saves little.

## Absorbing attacks at the edge

**In short:** a CDN spreads an attack across many PoPs and answers cacheable requests from cache. Attackers
respond by requesting things that are not cached, and by going around the CDN to the origin, so you must
close both doors.

A <Term id="ddos">distributed denial-of-service (DDoS)</Term> attack sends more traffic than a target can
handle. A CDN helps in layers:

- **Spread.** Many CDNs announce the same addresses from every PoP with <Term id="anycast">anycast</Term>
  ([chapter 9](/internet/internet-routing)), so attack traffic lands at the PoP nearest each attacking
  machine. No single site takes all of it.
- **Packet floods stop at the edge.** Floods of raw packets never reach the origin, because the origin is
  not the address users connect to.
- **Cache absorbs request floods.** A million requests per second for the home page are a million cache hits.

Attackers know this, so request floods target **misses**. **Cache busting** adds a random query string
(`/?x=8f3a1`) so every request has a new key and goes to the origin. Defences: ignore unknown query
parameters in the key, rate-limit by client, and challenge suspicious clients. Those request-level rules
belong to the proxy layer ([chapter 12](/edge/l7-proxies)).

The second door is the origin itself. If attackers find its address, they skip the CDN entirely. So
**lock down the origin**: accept traffic only from the CDN's address ranges, or better, require a secret
header or a client certificate that only the CDN presents. Old DNS records, mail servers and leaked
headers often reveal origin addresses.

## Debugging: is it cached?

**In short:** response headers tell you whether a request hit, how old the copy is, and which PoP served it.
Read them before guessing.

```bash
# Ask twice; the second request should hit
curl -sI https://www.example.com/app.3f9a2c.js | grep -iE 'cache|age|via|x-served|etag|vary'
curl -sI https://www.example.com/app.3f9a2c.js | grep -iE 'cache|age|via|x-served|etag|vary'

# Time to first byte: a hit is fast, a miss includes the trip to origin
curl -o /dev/null -s -w 'ttfb %{time_starttransfer}s total %{time_total}s\n' https://www.example.com/
```

Illustrative output from the second request:

```text
cache-control: public, max-age=31536000, immutable
age: 5321
cache-status: ExampleCDN; hit
x-served-by: cache-syd-1234
```

What to look for:

- **A hit/miss header.** Names vary: `X-Cache`, `CF-Cache-Status`, or the standard `Cache-Status`.
- **`Age`:** seconds since the copy was fetched from the origin. Stuck at 0 means the response is not cached.
- **Which PoP.** Many CDNs name it in a header. A user far from the PoP is a steering question
  ([chapter 10](/edge/steering)).
- **Why it missed.** Check for `Set-Cookie`, `Cache-Control: private` or `no-store`, a broad `Vary`, or a
  query string that changes per request.

<Term id="ttfb">Time to first byte (TTFB)</Term> separates the cases: a hit's TTFB is about one round trip to
the PoP, a miss adds the PoP-to-origin trip and the origin's own work.

::: details Going deeper: Cache-Status
`Cache-Status` (RFC 9211, 2022) is a standard header where each cache on the path adds an entry, such as
`ExampleCDN; hit` or `ExampleCDN; fwd=uri-miss; stored`. It shows whether each tier hit and why it
forwarded. Adoption varies by vendor (as of 2025), so expect vendor headers too.
:::

## Why this matters in real systems

**Deploys depend on versioned URLs.** A team ships a new front end. The HTML is cached for 5 minutes and
points at `app.js`, which is cached for a day. For hours, some users get new HTML with old JavaScript, or the
reverse, and the page breaks. Hashed file names remove the problem: old HTML points at old files and new HTML
at new ones.

**The origin is sized for the hit ratio.** If the origin can take 5% of traffic and the hit ratio drops to
80%, it gets four times its load. Purges, deploys that change URLs, a new query parameter in links, or a
CDN failover to a cold provider can all do that. Watch hit ratio and origin requests per second as closely
as error rates.

**Video and software downloads are CDN problems.** Streaming services split video into small segments, each
a cacheable file. A popular release is served almost entirely from PoPs and caches placed inside ISPs. The
hard part is the first minutes, before caches are warm, which is when tiering and collapsing matter most.

**Multi-CDN.** Large sites often use two or more CDN providers, steering between them by measured
performance and health ([chapter 10](/edge/steering)). The catch: each provider has its own cache, so
traffic moved to a cold provider misses, and purges must reach all of them.

**ML serving.** Responses from a model are usually personalised and not cacheable, but model files,
container images and static assets for the app are. A CDN in front of an inference API mostly helps through
TLS termination near users, warm origin connections, and attack absorption.

## Where it breaks

**Steam, 2015: personal pages cached for everyone.** On 25 December 2015, Steam's store came under a large
denial-of-service attack. Valve's caching partner deployed new caching rules to protect the servers. One
configuration wrongly cached pages for logged-in users, so for about 90 minutes some users saw pages built for
others, including about 34,000 users' account details. **Lesson:** a cache rule that ignores who is logged in
is a data leak; personal responses must be marked uncacheable at the origin, not left to edge rules.
([Kotaku, 2015, quoting Valve's statement](https://kotaku.com/valve-says-steams-christmas-malfunction-affected-about-1750324479))

**Fastly, 2021: one customer setting, global errors.** On 8 June 2021, a valid configuration change by one
customer triggered a latent software bug. 85% of Fastly's network returned errors, and many large sites went
down together ([chapter 1](/foundations/the-map) tells the story). Most service was back within 49 minutes.
**Lesson:** a shared CDN is a shared failure domain; one tenant's config can reach every PoP.
([Fastly, 2021](https://www.fastly.com/blog/summary-of-june-8-outage))

**Akamai, 2021: a config update breaks the CDN's DNS.** On 22 July 2021, a software configuration update
triggered a bug in the DNS component of Akamai's secure content delivery network. Sites of airlines, banks
and other large companies were unreachable for up to an hour, until Akamai rolled the update back. The
caches were fine; users could not find them. **Lesson:** a CDN is also a steering system, and its DNS is part
of your availability.
([Akamai, 2021](https://www.akamai.com/blog/news/akamai-summarizes-service-disruption-resolved))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. How does a CDN make a website faster? Does it help for responses that cannot be cached?
For cacheable content, the user gets the response from a PoP a few milliseconds away instead of an origin
across the world, and the origin serves only the misses. For uncacheable content it still helps: TCP and TLS
handshakes end nearby, the PoP reuses warm connections to the origin, and the CDN may route over its own
backbone. The user pays one long round trip per request instead of several.

**Senior add-on:** separate latency from offload and cost. Offload is what lets the origin be small; byte
hit ratio drives bandwidth cost. Mention that misses can get slower with tiers, and that a CDN also adds a
shared failure domain.
:::

::: details 2. Design the caching strategy for an e-commerce site: static assets, product pages, prices and the cart.
Static assets: hashed URLs, cached for a year, `immutable`; deploys need no purges. Product pages: shared by
all users, so cache at the CDN with a long lifetime, tag each page with surrogate keys such as the product and
category IDs, and purge by tag when the catalogue changes. Keep the browser lifetime short so purges take
effect. Use `stale-while-revalidate` and `stale-if-error` so refreshes and origin trouble do not hurt users.

Prices and stock that change by the second: either a short microcache or a small uncacheable API call that
the page fetches. Cart and account: `private`, never at a shared cache. Personal bits on shared pages (the
user's name, cart count) come from a separate request or are filled in by the browser.

**Senior add-on:** key design. Normalise query strings, drop tracking parameters, avoid `Vary: Cookie` or
`User-Agent`, and make sure nothing that changes the response is missing from the key (cache poisoning and
deception). Plan origin capacity for a cold cache and avoid purge-all.
:::

::: details 3. The CDN hit ratio dropped from 95% to 70% overnight. How do you find out why?
First, size the impact: origin requests went up about six times, so check origin health. Then find which
traffic is missing. Break the hit ratio down by host, path pattern, PoP and content type. A change limited to
one path points at that service; a change everywhere points at a CDN config change or a purge.

Then look at the misses themselves. Common causes: a deploy added a per-request query parameter or a
`Set-Cookie` header; a new `Vary` header; a shorter `max-age`; a purge-all; traffic steered to new or cold
PoPs or a second CDN; or an attack sending random query strings.

**Senior add-on:** compare request and byte hit ratio, since they point to different content. Use
`Cache-Status` or vendor headers and the origin's logs to see why each tier forwarded. Check the deploy and CDN
config change logs against the time of the drop.
:::

::: details 4. What is an origin shield? When would you not use one?
A designated PoP, or small group, near the origin. Every other PoP sends its misses there, so the origin sees
about one request per object per lifetime, and the shield's big shared cache absorbs the long tail.

Skip or soften it when misses must be fast and the shield adds a long detour, when the origin can easily take
the miss traffic, or when you cannot make the shield redundant. A single shield is a hot spot and a single
point of failure for all misses.

**Senior add-on:** describe fallback (children go to another parent or straight to origin if the shield
fails), consistent hashing across several shields, and that stale copies can now live at two tiers.
:::

::: details 5. A breaking news page expires and the origin falls over. What happened, and how do you prevent it?
Thousands of users requested the page in the moment its copy expired. Each PoP missed, and without
safeguards every request went to the origin at once: a thundering herd.

Prevention: request collapsing, so each cache sends one request per object; tiered caching or a shield, so
PoPs share one fetch; `stale-while-revalidate`, so users get the old copy while one background request
refreshes it; and `stale-if-error`, so a struggling origin does not become an error page.

**Senior add-on:** watch for collapsing on responses that turn out uncacheable, which serialises the waiting
requests; caches need a short "do not wait on this URL" marker. Spread expiry with jittered lifetimes for many
objects that were cached at the same moment.
:::

::: details 6. How do you invalidate content at a CDN? What are the risks?
Best: change the URL, using content hashes for static files. Next: purge by URL or by surrogate key (tag), so
one call removes every page that used a changed object. Last resort: purge everything.

Risks: purge-all empties every cache at once and the origin takes the full load; purges take time to reach
every PoP; and they do not reach browsers or other caches, which keep their copies until their own lifetime
ends.

**Senior add-on:** soft purge marks copies stale instead of deleting them, so they can still be served while
refreshing or during errors. Purges must reach every tier and every CDN in a multi-CDN setup.
:::

::: details 7. Attackers flood your site with requests to random URLs like `/?q=8f3a1`. Your CDN is in front. Why is the origin struggling?
Each random query string makes a new cache key, so every request misses and goes to the origin. The CDN is
passing the attack through.

Fixes: drop unknown query parameters from the key (or ignore the query string on paths that do not use it),
rate-limit and challenge clients at the edge, and add request collapsing. Also check that attackers are not
going around the CDN to the origin's address directly.

**Senior add-on:** origin lockdown: allow only the CDN's address ranges, and require a secret header or mutual
TLS so a leaked origin address is useless. Origin addresses leak through old DNS records, mail servers and
certificates.
:::

::: details 8. Users report seeing another user's account page. The CDN was changed yesterday. What happened?
A shared cache stored a personalised response and served it to others. Usually a cache rule started caching
a path that varies by user (for example "cache everything for 5 minutes"), or the response lacks
`Cache-Control: private`, or the key ignores the cookie or token that selects the user.

Act first: bypass or purge the cache for those paths, then roll back the rule. Then fix the origin to mark
personal responses `private` or `no-store`, so edge rules cannot cache them by accident.

**Senior add-on:** web cache deception (a static-looking suffix on a personal URL) causes the same symptom;
cache by the origin's headers, not by file extension. Treat it as a data leak: work out which users and pages
were exposed.
:::

::: details 9. Should you run your own CDN or buy one? What changes at very large scale?
Buying gets you hundreds of PoPs, peering, attack capacity and features at once, and costs grow with traffic.
Building pays off when traffic is enormous and predictable (video, software downloads, a social network's
images), when you can place caches inside ISPs, and when you need control over caching and routing.

**Senior add-on:** many large companies do both: their own PoPs for bulk traffic, commercial CDNs for reach,
overflow and a second failure domain. Multi-CDN brings cold caches on failover, purges across providers, and
the need for steering by real-user measurement.
:::

## Common misconceptions

- **"A CDN only helps static files."** Uncacheable requests gain from nearby handshakes, warm origin
  connections and attack absorption.
- **"A short TTL is the safe choice."** It sends more traffic to the origin. Long TTLs with versioned URLs and
  purges are both faster and safer.
- **"Purge everything is a harmless reset."** It can take down an origin sized for a high hit ratio.
- **"A hit ratio is one number."** Request and byte hit ratios differ, and both vary by PoP and content type.
- **"Behind a CDN, the origin is protected."** Only if attackers cannot reach it directly and cannot force
  misses.

## Key takeaways

- A CDN answers from a nearby copy. Hits save round trips and origin load; even misses gain from warm
  connections.
- The **cache key** decides what is shared. Normalise it, keep `Vary` narrow, and never leave out what changes
  the response.
- **Tiered caching** and an **origin shield** shrink the long tail and protect the origin, at the cost of a
  hop and a hot spot.
- Prefer **versioned URLs**, then **tag purges**; purge-all is a self-inflicted herd.
- **Stale serving** and **request collapsing** keep users served and the origin calm when copies expire or the
  origin fails.

## Review

<Flashcards id="cdns" :cards="cards" />

<MarkDone id="cdns" />

## Sources

- [RFC 9111: HTTP Caching](https://www.rfc-editor.org/rfc/rfc9111) (RFC, 2022)
- [RFC 5861: HTTP Cache-Control Extensions for Stale Content](https://www.rfc-editor.org/rfc/rfc5861) (RFC, 2010)
- [RFC 9211: The Cache-Status HTTP Response Header Field](https://www.rfc-editor.org/rfc/rfc9211) (RFC, 2022)
- [RFC 9213: Targeted HTTP Cache Control](https://www.rfc-editor.org/rfc/rfc9213) (RFC, 2022)
- [An Analysis of Facebook Photo Caching](https://dl.acm.org/doi/10.1145/2517349.2522722) (paper, SOSP 2013)
- [Practical Web Cache Poisoning](https://portswigger.net/research/practical-web-cache-poisoning) (PortSwigger research, 2018)
- [Summary of June 8 outage](https://www.fastly.com/blog/summary-of-june-8-outage) (Fastly incident report, 2021)
- [Akamai summarizes service disruption](https://www.akamai.com/blog/news/akamai-summarizes-service-disruption-resolved) (Akamai blog, 2021)
- [Valve says Steam's Christmas malfunction affected about 34,000 users](https://kotaku.com/valve-says-steams-christmas-malfunction-affected-about-1750324479) (news, 2015)
