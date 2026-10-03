---
title: 4. DNS
---

<script setup>
import { cards } from './dns-review'
</script>

# 4. DNS

Before a phone can send a single byte to a website, it must turn the site's name into an address. The
<Term id="dns">Domain Name System (DNS)</Term> does that, and large websites also use it to choose which
servers each user reaches. Interviewers like it because it touches caching, failover, latency and outages
all at once.

::: info Before you start
- Every machine on the internet is reached by an **IP address**, such as `192.0.2.10` (IPv4) or
  `2001:db8::10` (IPv6). [Chapter 2](/foundations/packets-and-links) covers addresses.
- **UDP** sends single messages with no connection and no delivery guarantee. **TCP** sets up a connection
  and delivers a reliable stream. [Chapter 3](/foundations/tcp-and-udp) covers both.
- A request from a phone passes through several networks and services before it reaches a server.
  [Chapter 1](/foundations/the-map) gives the whole path.

The chapter makes sense without them. Addresses and names in the examples are placeholders.
:::

## What DNS does

**In short:** DNS is a huge, distributed table that maps names to data, mostly IP addresses. No single
server holds it all.

People and apps use names like `www.example.com`. Networks deliver packets to IP addresses. Something has
to connect the two, and the answer must be able to change: a site moves to a new server, adds a second
region, or sends users to a server near them.

DNS stores small pieces of data under names. Each piece is a <Term id="dns-record">record</Term>, and each
record has a type. The ones you meet most:

| Type | Holds | Example use |
|---|---|---|
| **A** | An IPv4 address | `www.example.com` → `192.0.2.10` |
| **AAAA** | An IPv6 address | `www.example.com` → `2001:db8::10` |
| **CNAME** | Another name to look up instead | `www.example.com` → `example.cdn-provider.net` |
| **NS** | The servers that answer for a part of the tree | `example.com` → `ns1.example.net` |
| **HTTPS** | How to connect: protocols, address hints | "this site speaks HTTP/3" |

One name can have several records of the same type. A lookup then returns all of them, for example two or
three addresses. That small fact is the basis of DNS load balancing, covered later.

A <Term id="cname">CNAME</Term> deserves an early mention. It says "this name is an alias; go and look up
that other name". Sites often point their name at a <Term id="cdn">CDN</Term> or a cloud load balancer this
way. The provider can then change the real addresses without asking the site owner.

### The name tree

Names are read right to left, from the most general part. `www.example.com` sits under `example.com`,
which sits under `com`, which sits under the root (written as a single dot).

Different organisations run different parts of this tree. The registry for `.com` does not store
`www.example.com`'s address. It only stores which servers are in charge of `example.com`. Those servers hold
the actual records. Pointing downward like this is called <Term id="delegation">delegation</Term>, and each
separately run part of the tree is a <Term id="dns-zone">zone</Term>.

This split is why DNS scales. Millions of zone owners change their own records without asking anyone, and
no central server has to know everything.

::: details Going deeper: zones, SOA and glue
- Each zone has one **SOA** (start of authority) record. It holds the zone's serial number, timers for
  secondary servers, and the lifetime of "does not exist" answers (see negative caching below).
- A parent delegates with **NS records** in its own zone. When the child's server names sit inside the
  child zone (`ns1.example.com` for `example.com`), the parent also stores their addresses. These are
  **glue records**. Without them, the resolver could not find the server it needs to ask.
- A CNAME cannot sit next to other records with the same name. The top of a zone (`example.com` itself)
  must have SOA and NS records, so it cannot be a CNAME. DNS providers work around this with
  non-standard "ALIAS" or "CNAME flattening" features. The newer HTTPS record (below) offers a standard way.
- The base protocol is defined in RFC 1034 and RFC 1035 (1987). Most of it is still unchanged.
:::

## Who answers: stub, recursive and authoritative

**In short:** your phone asks one server to do the searching. That server walks down the name tree,
caches what it learns, and returns the answer.

Three kinds of software take part in every lookup:

- The <Term id="stub-resolver">stub resolver</Term> is the DNS client built into the phone's operating
  system. Apps ask it, usually through a call like `getaddrinfo`. It does not search by itself. It forwards
  the question and waits.
- The <Term id="recursive-resolver">recursive resolver</Term> does the searching. Your ISP, your company or
  a public service such as `1.1.1.1` or `8.8.8.8` runs it. It serves many users and keeps a large cache.
- An <Term id="authoritative-server">authoritative server</Term> holds the real records for a zone. It is
  the source of truth. Everyone else only keeps copies.

In this chapter "resolver" on its own always means the recursive resolver.

Here is a lookup when nothing is cached:

<DnsResolutionDiagram />

1. The phone's stub resolver asks the recursive resolver for `www.example.com`.
2. The resolver asks one of the <Term id="root-server">root servers</Term>. They do not know the address.
   They reply with the servers in charge of `.com`.
3. The resolver asks a `.com` server. It replies with the servers in charge of `example.com`.
4. The resolver asks an `example.com` server. That server knows the answer: `192.0.2.10`, which may be
   cached for 300 seconds.
5. The resolver returns the address to the phone and keeps a copy.

This is the slow, rare case. The resolver caches every step. The servers for `.com` change rarely, so they
stay cached for a day or two. For a popular name, the answer is almost always already in the cache, and
the lookup is one short round trip from the phone to the resolver.

As a rough guide, a cached answer from a nearby resolver takes a few milliseconds to a few tens of
milliseconds. A full cold lookup adds one round trip per level, so it often takes tens to a few hundred
milliseconds. On a mobile network, the phone-to-resolver hop alone can be tens of milliseconds.

::: details Going deeper: flags and root servers
- The stub sets the **RD** (recursion desired) flag: "please do the whole search for me". The resolver
  replies with **RA** (recursion available). Authoritative servers set **AA** (authoritative answer) on
  answers from their own zone. You can see all three in `dig` output.
- There are 13 root server names, `a.root-servers.net` to `m.root-servers.net`, run by 12 organisations.
  Each name is served from many sites using <Term id="anycast">anycast</Term>: the same address announced
  from many places, with routing delivering you to a nearby one. There are well over a thousand root
  server sites in total (as of 2025). [Chapter 9](/internet/internet-routing) explains anycast.
- Many home routers run a small **forwarder**. The phone asks the router, and the router passes the question
  on to the ISP's resolver. It adds one more cache to the chain.
:::

### Try it: follow a lookup

`dig` ships with macOS. On Linux it comes in the `dnsutils`, `bind-utils` or `bind` package, depending on
the distribution. Ask your usual resolver:

```text
$ dig www.example.com

;; ->>HEADER<<- opcode: QUERY, status: NOERROR, id: 41237
;; flags: qr rd ra; QUERY: 1, ANSWER: 2, AUTHORITY: 0, ADDITIONAL: 1

;; ANSWER SECTION:
www.example.com.        278     IN      A       192.0.2.10
www.example.com.        278     IN      A       192.0.2.11

;; Query time: 4 msec
;; SERVER: 192.168.1.1#53(192.168.1.1) (UDP)
```

This output is trimmed and illustrative; your names, addresses and numbers will differ. What to look for:

- `status: NOERROR` means the name exists. `NXDOMAIN` would mean it does not.
- `278` is the remaining cache time in seconds. The resolver had this answer cached, and its timer is
  counting down. Run the command again and it will be lower.
- `Query time` shows how long the resolver took. A few milliseconds means a cache hit.
- `SERVER` shows which resolver answered. Here it is a home router.

To see the walk down the tree, use `+trace`. `dig` then does the searching itself, starting at the root,
instead of asking your resolver:

```text
$ dig +trace www.example.com
.                   518400  IN  NS  a.root-servers.net.
.                   518400  IN  NS  b.root-servers.net.
;; Received 239 bytes from 192.168.1.1#53(192.168.1.1) in 3 ms

com.                172800  IN  NS  a.gtld-servers.net.
com.                172800  IN  NS  b.gtld-servers.net.
;; Received 1170 bytes from 199.7.83.42#53(l.root-servers.net) in 21 ms

example.com.        172800  IN  NS  ns1.example.net.
example.com.        172800  IN  NS  ns2.example.net.
;; Received 330 bytes from 192.5.6.30#53(a.gtld-servers.net) in 28 ms

www.example.com.    300     IN  A   192.0.2.10
;; Received 60 bytes from 198.51.100.53#53(ns1.example.net) in 35 ms
```

(Trimmed and illustrative.) Each block is one level of the tree, and the last line of each block says who
answered and how long it took. Notice the TTL: `300` is the full value set by the zone owner, because this
answer came straight from the authoritative server.

To ask a specific resolver, put it after `@`: `dig @1.1.1.1 www.example.com`. Comparing resolvers is a
common first step when users in one place see something different.

## Caching and TTLs

**In short:** every answer comes with a lifetime chosen by the zone owner. Several caches along the way
keep it for up to that long. A change reaches users only as those copies expire.

Every record carries a <Term id="dns-ttl">time to live (TTL)</Term>: the number of seconds a cache may keep
it. The zone owner chooses it. A resolver that caches an answer with a TTL of 300 counts down from 300 and
fetches it again after five minutes. (The IP header also has a field called TTL. It is unrelated.)

### The caching layers

There is not one cache but several, stacked between the app and the authoritative server:

| Layer | Where | Typical behaviour |
|---|---|---|
| **App or runtime** | Browser, JVM, HTTP client library | Browsers keep a short cache of their own. Some runtimes and libraries cache longer than the TTL, or forever. |
| **Operating system** | systemd-resolved on many Linux systems, mDNSResponder on macOS and iOS, Android's resolver | Usually follows the TTL. Some systems have no OS cache at all (plain glibc). |
| **Home router or office forwarder** | Your local network | Often caches, with uneven quality. |
| **Recursive resolver** | ISP, company, public service | The big shared cache. Usually follows the TTL, within its own minimum and maximum. |

Each layer starts its own countdown when it fetches the answer. The countdowns are not synchronised. So
right after a change, different users can see different answers for up to a full TTL, sometimes longer.

There is a hidden cache too: **open connections**. An app that already has a connection to `192.0.2.10`
keeps using it. It does not look the name up again until it opens a new connection. Connection pools,
HTTP/2 connections and long-lived streams can last hours.

### Choosing a TTL

A TTL trades speed of change against load and dependence on DNS:

- **Short TTLs (30–60 seconds)** let you move traffic quickly, for example during a regional failover.
  The cost: more queries reach your authoritative servers, more users wait for a full lookup, and you depend
  more on your DNS provider staying up. If it goes down, cached answers run out within a minute.
- **Long TTLs (hours to a day)** make lookups fast and cheap, and let users ride out a DNS outage on cached
  answers. The cost: a mistake or a move takes hours to undo.

A common pattern for planned moves is to **lower the TTL in advance**. If the TTL is one day, set it to 60
seconds at least one day before the move. Wait for the old long TTL to run out everywhere. Then make the
change, and raise the TTL again once you are sure.

Short TTLs cost less than they seem for popular names. One busy resolver serves many users. It refreshes the
name once per TTL, and every other user gets the cached answer.

### When the TTL is not obeyed

The TTL is a request, not a guarantee. Some layers keep answers longer:

- Some resolvers enforce a **minimum TTL**, often to reduce their own load. A 30-second TTL may be kept for
  several minutes.
- Some resolvers and runtimes cap the TTL at a **maximum**, often a day. That helps after mistakes rather than
  hurting.
- Some resolvers <Term id="serve-stale">serve stale</Term> answers: if the authoritative servers cannot be
  reached when a record expires, they keep using the old answer instead of failing. This is a deliberate
  resilience feature, and it means a "dead" address can live on during an outage.
- Some app runtimes cache for a long time. Java, for example, caches lookups forever when a security
  manager is installed, a common setup in older deployments. Check the defaults of the runtime and HTTP client you use.

<DnsTtlTimelineDiagram />

The practical rule: plan for most traffic to move within a TTL or two, and a long tail to take much longer.
That tail is mostly clients holding open connections and caches that ignore your TTL.

::: details Going deeper: numbers and settings
- **Serve-stale** is described in RFC 8767 (2020). It recommends giving stale answers a TTL of 30 seconds and
  keeping expired records for about 1 to 3 days. It also suggests capping every TTL at 7 days.
- Resolver software exposes the limits directly: Unbound has `cache-min-ttl` and `cache-max-ttl`, and
  dnsmasq has `min-cache-ttl`. Defaults vary by product and version.
- In Java, the `networkaddress.cache.ttl` security property controls the lookup cache. Modern JVMs without a
  security manager cache successful lookups for about 30 seconds by default. Check the version you run.
- In Chrome, `chrome://net-internals/#dns` shows the browser's own cache and lets you clear it.
:::

### Try it: see the caches

`dig` talks to the resolver directly, so it **skips the operating system's cache**. To see what an app would
get, ask the OS:

```bash
getent ahosts www.example.com              # Linux: goes through the normal app path
dscacheutil -q host -a name www.example.com   # macOS
resolvectl query www.example.com           # Linux with systemd-resolved; shows if cached
resolvectl flush-caches                    # clear the systemd-resolved cache
```

On macOS, `sudo dscacheutil -flushcache; sudo killall -HUP mDNSResponder` clears the OS cache (needs root).
When `dig` and an app disagree, the difference is usually one of these local caches, or `/etc/hosts`.

## Negative caching

**In short:** "this name does not exist" is cached too. If someone looks up a name before you create it,
they may not see it for a while after you do.

Resolvers also cache failures. Without that, a typo or a missing name would send a fresh query to the
authoritative servers every time. There are two kinds of "no" answer:

- <Term id="nxdomain">NXDOMAIN</Term>: the name does not exist at all.
- **NODATA**: the name exists, but has no record of the type asked for. For example, a name with an IPv4
  address but no IPv6 address returns NODATA for an AAAA query.

Caching these answers is called <Term id="negative-caching">negative caching</Term>. The lifetime comes from
the zone's SOA record, not from any record of the missing name, because that record does not exist.

Here is how it bites. A deploy script checks whether `api-v2.example.com` resolves, finds that it does not,
then creates it. Or a monitoring system starts probing a new name a few minutes early. The resolver has now
cached "does not exist". Until that expires, users of that resolver cannot see the new name, even though
the record exists. The fix is to create names well before anything looks them up, and to know your zone's
negative TTL.

```text
$ dig nothing-here.example.com

;; ->>HEADER<<- opcode: QUERY, status: NXDOMAIN, id: 5150

;; AUTHORITY SECTION:
example.com.   1800  IN  SOA  ns1.example.net. hostmaster.example.com. 2024061501 10000 2400 604800 1800
```

(Trimmed and illustrative.) The answer has no address, only the zone's SOA record. The last number in it,
and the SOA record's own TTL, set how long the "no" is cached. Here both are 1800 seconds: 30 minutes.

::: details Going deeper: the exact rule
- RFC 2308 (1998) defines negative caching. The negative answer is cached for the smaller of the SOA
  record's TTL and the SOA's last field (historically called MINIMUM).
- Validating resolvers can go further. With DNSSEC, a signed "nothing exists between name A and name B"
  answer lets a resolver answer NXDOMAIN for other names in that range without asking (RFC 8198).
- Some providers return NODATA instead of NXDOMAIN for missing names, as part of their DNSSEC design. Tools
  then show `NOERROR` with an empty answer. Both mean "no record for you".
:::

## Location-aware answers

**In short:** an authoritative server can give different answers depending on who asks. But it sees the
resolver's address, not the user's, so a far-away resolver can get a far-away answer.

Large websites run servers in many places. They want each user to reach a nearby one. One way is to make
the authoritative server location-aware: it looks at where the question came from and returns the address
of a nearby site. This is often called <Term id="geodns">GeoDNS</Term>.

### The resolver is not the user

The question reaching the authoritative server comes from the recursive resolver. The user's phone never
talks to it. So the server picks an answer near the **resolver**.

That works well when the resolver is near the user, as an ISP's resolver usually is. It works badly when it
is not:

- A company sends all employees' DNS through resolvers in its head office.
- A VPN routes the user's DNS through a resolver in another country.
- A public resolver's nearest site is far from the user. Large public resolvers use anycast and have many
  sites, which reduces this, but coverage varies by region and by network.

<DnsResolverLocationDiagram />

### EDNS Client Subnet

<Term id="ecs">EDNS Client Subnet (ECS)</Term> lets the resolver pass on part of the user's address. The
resolver adds a note to its question: "this is for a client in `203.0.113.0/24`". The authoritative server
can then answer for the user's area instead of the resolver's.

ECS has real costs:

- **Privacy.** Every authoritative server that receives ECS learns roughly where each user is and what name
  they looked up. The resolver usually shortens the address to limit this, but it still narrows things a lot.
- **Cache efficiency.** The resolver must now store separate answers for each subnet, instead of one answer
  for everyone. Hit rates drop, and more queries reach the authoritative servers.
- **Uneven support.** Resolvers choose whether to send it, and to whom. Cloudflare's `1.1.1.1`, for example,
  has said it does not send ECS, for privacy reasons. Google Public DNS does send it to authoritative servers
  that support it.

So location from DNS is always an estimate. How to choose between DNS steering and anycast steering, and
how to measure where users really are, is [chapter 10](/edge/steering)'s subject. This chapter only gives the
mechanism.

::: details Going deeper: ECS details
- ECS is defined in RFC 7871 (2016). It recommends that resolvers shorten IPv4 addresses to 24 bits and IPv6
  addresses to 56 bits.
- The authoritative server replies with a **scope**: how wide a range of clients the answer is valid for.
  The resolver caches it for that range only. A scope of `/0` means "valid for everyone".
- ECS rides inside <Term id="edns">EDNS</Term>, an extension that lets DNS messages carry options. You can
  add it by hand to test: `dig @8.8.8.8 www.example.com +subnet=203.0.113.0/24`. Look for a
  `CLIENT-SUBNET` line in the reply. Some resolvers ignore or strip a subnet sent by a client.
:::

## Load balancing with DNS, and its limits

**In short:** returning several addresses, or different addresses to different resolvers, spreads load
coarsely. DNS cannot see load, cannot move one user at a time, and cannot take back an answer it has given.

The simplest form returns several A records and rotates their order. This is **round-robin DNS**. Smarter
authoritative servers go further:

- **Weighted answers:** send 90% of answers to one site and 10% to another, for example during a migration.
- **Health-checked answers:** stop returning an address when probes say it is down.
- **Location-aware answers:** as described above.

This is useful and widely used. But DNS has hard limits as a load balancer:

- **The unit is the resolver, not the user.** One answer to a big ISP resolver may serve millions of users.
  Weighting 50/50 across resolvers does not give 50/50 across users.
- **Answers cannot be recalled.** Once cached, an answer lives until its TTL ends, or longer (see above).
- **Clients reorder and pin.** Operating systems sort returned addresses by their own rules, such as
  preferring IPv6 or a "closer" address. Apps then hold connections for a long time.
- **No view of load or failure inside a request.** DNS answers before the connection starts. It cannot
  retry a failed request or notice that one server is slow.

That is why large sites use DNS for coarse steering between sites and regions, and do fine-grained balancing
with load balancers behind a stable address. [Chapter 10](/edge/steering) covers steering and failover, and
[chapter 11](/edge/l4-load-balancing) covers load balancing.

Clients also use DNS answers in a smart way. Most modern clients ask for IPv4 and IPv6 addresses at the same
time. Then they try both kinds of connection nearly in parallel, using the first that works. This is
<Term id="happy-eyeballs">Happy Eyeballs</Term>, covered in [chapter 8](/internet/last-mile). So a
missing or broken AAAA record shows up as a small delay rather than an error.

## UDP, TCP and truncated answers

**In short:** DNS normally uses one small UDP message each way. If the answer is too big, the server says
so and the client asks again over TCP. Networks that block DNS over TCP break large answers.

A DNS question and its answer usually fit in a single UDP message each. There is no connection to set up, so
a lookup costs one round trip. Resolvers send a very large number of these, so this low cost matters.

The original protocol limited UDP answers to 512 bytes. EDNS lets a client say
"I can accept bigger answers", and today most do. But big UDP messages may be split into IP fragments, and
many networks drop fragments. So large answers can vanish without any error.

When an answer does not fit in the size the client allows, the server sends what it can and sets a flag:
<Term id="dns-truncation">truncation (TC)</Term>. The client then repeats the question over TCP, which has no
size problem. This costs extra round trips for the TCP handshake, but it works.

It works only if TCP port 53 is open. Some firewalls still allow DNS over UDP only. Small answers then work,
and big ones fail. DNSSEC-signed answers and names with many records are the usual victims. TCP is a
required part of DNS, not an optional fallback.

```text
$ dig +bufsize=512 +dnssec DNSKEY com
;; Truncated, retrying in TCP mode.
...
;; SERVER: 192.168.1.1#53(192.168.1.1) (TCP)
```

(Trimmed and illustrative.) `+bufsize=512` tells the server to keep UDP answers under 512 bytes, and this
signed answer is larger. `dig` sees the truncation flag and retries over TCP. `dig +tcp` forces TCP from the
start, which is a quick test of whether TCP 53 is reachable.

::: details Going deeper: sizes and standards
- EDNS is defined in RFC 6891 (2013). The client advertises its UDP buffer size in an OPT pseudo-record.
- After years of fragmentation problems, the DNS Flag Day 2020 effort recommended a default buffer size of
  **1232 bytes**. It is small enough to avoid fragmentation on almost all paths.
- RFC 7766 (2016) made TCP support mandatory for DNS software. RFC 9210 (2022) says operators should keep
  TCP reachable.
- Resolvers can keep TCP connections open and send many queries over one, which removes most of the setup
  cost.
:::

## HTTPS and SVCB records

**In short:** a newer record type tells the client how to connect, not only where. One lookup can say
"this site speaks HTTP/3" and carry address hints and encryption keys.

Before this record existed, a browser learned that a site supports HTTP/3 only after connecting once over
an older protocol. The site's response told it "HTTP/3 is available here". The first visit could not
benefit.

The <Term id="https-record">HTTPS record</Term> (a special form of the general **SVCB** record) puts that
information in DNS. Clients ask for it alongside the A and AAAA records:

```text
$ dig www.example.com HTTPS
www.example.com.  300  IN  HTTPS  1 . alpn="h3,h2" ipv4hint=192.0.2.10 ipv6hint=2001:db8::10
```

(Illustrative.) Read it as: "connect to this same name (`.`); it supports HTTP/3 (`h3`) and HTTP/2 (`h2`);
here are its addresses as hints". Older `dig` versions may not know the type name; use `TYPE65` instead.

The record can also carry keys for <Term id="ech">Encrypted Client Hello (ECH)</Term>, which hides the site
name in the <Term id="tls">TLS</Term> handshake. [Chapter 5](/protocols/tls) covers ECH, and
[chapter 7](/protocols/quic) covers how clients use this record to start <Term id="quic">QUIC</Term> and
fall back when UDP is blocked.

::: details Going deeper: SVCB details
- SVCB and HTTPS are defined in RFC 9460 (2023). A priority of `0` means **AliasMode**: "look up this other
  name instead". Unlike a CNAME, it is allowed at the top of a zone.
- A priority of `1` or more means **ServiceMode**, with parameters such as `alpn`, `port`, `ipv4hint`,
  `ipv6hint` and `ech`. Several records with different priorities let a site offer alternatives.
- Address hints are hints only. Clients should still look up A and AAAA records and prefer those.
:::

## Encrypted DNS: DoT and DoH

**In short:** classic DNS is sent in plain text, so the network can read and change it. Encrypted DNS hides
lookups from the local network, but moves trust to the resolver and takes visibility away from network
operators.

Classic DNS travels unencrypted over UDP port 53. Anyone on the path can see every name you look up: the
Wi-Fi operator, the ISP, a government. They can also block names or change answers.

Two standards wrap DNS in TLS encryption:

- <Term id="dot">DNS over TLS (DoT)</Term> uses a dedicated port, 853. Android's "Private DNS" setting,
  added in Android 9 (2018), uses it.
- <Term id="doh">DNS over HTTPS (DoH)</Term> sends DNS queries as HTTPS requests, normally on port 443. On
  the wire, it looks like any other web traffic.

Both protect the hop from the device to the resolver. Neither hides the lookup from the resolver itself,
and the resolver still talks to authoritative servers in plain text.

### What it changes for operators

Encryption moves the decision of **who sees your lookups** from the network to the device or the app:

- **Networks lose visibility and control.** ISPs and companies that filtered or logged DNS can no longer do
  it by watching port 53. DoT is easy to spot and block by its port; DoH mostly is not.
- **Apps can choose their own resolver.** Firefox turned DoH on by default for US users in 2020, using a
  resolver it chose. Chrome, from 2020, switches to DoH only if your current resolver offers it.
- **The resolver may move.** If an app sends DNS to a different resolver, the location the authoritative
  server sees changes. That changes which site location-aware DNS picks, as in the previous section.
- **Split-horizon DNS can break.** Companies often answer internal names only from their own resolvers. A
  browser that bypasses them cannot find internal sites.

Browsers and operating systems have added escape hatches for this. For example, Firefox does not enable its
default DoH on a network whose resolver says NXDOMAIN for the special name `use-application-dns.net`.
Managed devices can also be configured to use the company's resolver.

```bash
# Ask a public resolver's DoH endpoint (Cloudflare's JSON API, not the standard binary format)
curl -s -H 'accept: application/dns-json' 'https://cloudflare-dns.com/dns-query?name=example.com&type=A'

# Make curl itself resolve names over DoH; -v shows the connection
curl -v --doh-url https://cloudflare-dns.com/dns-query https://example.com -o /dev/null
```

If you have `kdig` (from the Knot DNS tools), `kdig @1.1.1.1 +tls example.com` sends a DoT query.

::: details Going deeper: standards and newer pieces
- DoT is RFC 7858 (2016). DoH is RFC 8484 (2018), which carries the normal binary DNS message in an HTTPS
  request. **DNS over QUIC** (DoQ) is RFC 9250 (2022).
- **Discovery of Designated Resolvers** (RFC 9462, 2023) lets a device ask its plain-text resolver whether
  it has an encrypted version, and upgrade to it.
- Apple platforms gained system-wide support for encrypted DNS settings in iOS 14 and macOS 11 (2020).
- Encrypted DNS still leaks the site name elsewhere: in the TLS handshake (unless ECH is used) and in the
  server's IP address.
:::

## Can you trust the answer?

**In short:** plain DNS answers carry no proof of who wrote them. Attackers who can forge answers can send
users anywhere. DNSSEC adds signatures; encryption alone does not prove the answer is genuine.

A resolver accepts an answer if it seems to match the question it sent. An attacker who guesses the right
details can race the real server and get a forged answer accepted. If that forged answer is cached, every
user of the resolver goes to the attacker's address until it expires. This is
<Term id="cache-poisoning">cache poisoning</Term>.

Resolvers defend by making answers hard to guess: random query IDs and random source ports. That made blind
forgery much harder, but not impossible. And it does nothing against someone who controls the network path.

<Term id="dnssec">DNSSEC</Term> addresses this with digital signatures. The zone owner signs its records, and
a validating resolver checks the signature along a chain of trust that starts at the root. A forged answer
fails the check, and the resolver refuses it.

Note the difference from DoH and DoT. They encrypt the hop to the resolver, so nobody on that hop can read or
change the answer. DNSSEC proves the records came from the zone owner, whoever passed them along. The two
solve different problems.

DNSSEC adds operational risk. If signatures expire or keys are rolled wrongly, validating resolvers return
`SERVFAIL` and the domain disappears for their users. The Slack story below shows how that can happen.

::: details Going deeper: how DNSSEC works
- Each signed zone publishes its public keys in **DNSKEY** records, and a signature for each set of records
  in an **RRSIG** record.
- The parent zone holds a **DS** record: a hash of the child's key. The root signs `.com`'s DS, `.com` signs
  `example.com`'s DS, and so on. Resolvers trust the root's key, configured in advance (the **trust
  anchor**).
- Proof that a name does **not** exist uses **NSEC** or **NSEC3** records, which list the gap between
  existing names.
- A validating resolver sets the **AD** (authenticated data) flag on answers it verified. `dig +dnssec`
  shows the RRSIG records and the flag. `delv www.example.com` (shipped with BIND) validates itself and
  prints `; fully validated` on success.
- The parent's DS record has its own TTL, set by the parent. `.com` uses one day. Removing DNSSEC therefore
  means removing the DS record first, then waiting for that TTL, before removing keys.
- The core specification is RFC 4033 to 4035 (2005). How widely zones are signed and resolvers validate
  varies a lot by country and top-level domain.
:::

## Why this matters in real systems

**Failover speed is a DNS question.** A team plans a regional failover that should take two minutes. In
practice, it takes as long as the TTL, plus resolvers that stretch it, plus clients that keep connections
open. Mobile apps that hold a connection for hours are the slowest to move. Teams that need fast failover use
short TTLs and also make clients reconnect, or use anycast addresses that do not change at all
([chapter 10](/edge/steering)).

**DNS is a dependency of everything.** If your authoritative DNS is down, users can reach you only while
their cached answers last. Short TTLs shorten that grace period. Many large sites use two independent DNS
providers for their public zones, serving the same records from both, so one provider's outage does not take
them offline.

**CDNs steer with CNAMEs and location-aware answers.** A site points `www` at its CDN with a CNAME. The CDN's
authoritative servers then return an address near the resolver, as described above. Users behind a distant
resolver get a distant server. This is one reason CDNs measure real users' performance instead of trusting
DNS location ([chapter 13](/edge/cdns)).

**DNS is often the first slow step.** On a cold page load, the lookup happens before the connection, the TLS
handshake and the request. Browsers hide some of it by resolving names before they are needed (`dns-prefetch`
and `preconnect` hints). Mobile apps can do the same by resolving or connecting at startup.

**Internal service discovery uses DNS too.** Inside a datacenter or a Kubernetes cluster, services often find
each other by name. The same caching and TTL problems apply, at much higher query rates
([chapter 16](/backend/reaching-the-service)).

**How to look at it:**

```bash
dig www.example.com +noall +answer          # just the answer lines, with TTLs
dig @1.1.1.1 www.example.com +short         # compare with another resolver
dig @ns1.example.net www.example.com +norec # ask the authoritative server directly
dig +trace www.example.com                  # walk the tree yourself
curl -o /dev/null -s -w 'dns %{time_namelookup}s\n' https://example.com/  # lookup time inside a request
```

## Where it breaks

**Dyn, 2016: a DNS provider under attack.** On 21 October 2016, a
<Term id="ddos">distributed denial-of-service (DDoS)</Term> attack hit Dyn, a large DNS provider. Its analysis
names the Mirai botnet of hacked devices as the main source. Many well-known sites that used Dyn for their
authoritative DNS became unreachable for many users. Dyn also reported that resolvers' legitimate retries
multiplied the traffic 10 to 20 times. **Lesson:** your DNS provider is part of your availability; consider a
second, independent provider. ([Dyn analysis, archived](https://web.archive.org/web/20161231191203/http://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/))

**Facebook, 2021: DNS servers took themselves offline.** On 4 October 2021, a maintenance command cut
Facebook's backbone network. Facebook's DNS servers are designed to stop announcing their addresses over
<Term id="bgp">BGP</Term> when they cannot reach the datacenters. They all did so at once. With no route to
the authoritative servers, Facebook's names stopped resolving worldwide for about six hours. **Lesson:** a
health check that can withdraw every instance at once is a single point of failure.
([Facebook engineering, 2021](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/))

**Slack, 2021: a DNSSEC rollback that cached badly.** On 30 September 2021, Slack enabled DNSSEC on
`slack.com`, saw some failures, and rolled back: it removed the DS record from `.com`, then its keys. But
validating resolvers had already cached the DS record, which `.com` serves with a 24-hour TTL. They still
expected signatures, found none, and returned `SERVFAIL`. Some users could not reach Slack for hours, until caches were flushed or expired.
**Lesson:** a parent's TTL controls how fast you can undo a change, and you do not set it.
([Slack engineering, 2021](https://slack.engineering/what-happened-during-slacks-dnssec-rollout/))

**Cloudflare 1.1.1.1, 2025: a resolver disappears.** On 14 July 2025, a configuration change caused
Cloudflare to withdraw the routes to its 1.1.1.1 resolver addresses worldwide. Users who used only that
resolver could not look up any name for about an hour. DoH queries to a separate hostname were mostly
unaffected. **Lesson:** devices configured with a single resolver provider have no fallback; configure a
second one from a different provider.
([Cloudflare, 2025](https://blog.cloudflare.com/cloudflare-1-1-1-1-incident-on-july-14-2025/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. What happens, DNS-wise, when you type a URL into a browser?
The browser checks its own cache, then asks the operating system, which checks its cache. If neither has the
answer, the OS's stub resolver sends the question to the recursive resolver, usually over UDP.

The resolver answers from its cache if it can. If not, it asks a root server, which points to the `.com`
servers. Those point to the site's authoritative servers, which return the address and a TTL. The resolver
caches every step and returns the answer. Modern browsers ask for A, AAAA and often HTTPS records in
parallel.

**Senior add-on:** mention the costs and caches. A cached answer takes milliseconds; a cold one, one round
trip per level. Each cache layer counts its own TTL. A CNAME to a CDN adds another lookup, and the CDN's
answer often depends on the resolver's location.
:::

::: details 2. What is the difference between a recursive resolver and an authoritative server? Why split them?
The authoritative server holds the real records for a zone and answers only for it. The recursive resolver
answers anything, for its clients, by asking authoritative servers and caching the results.

The split makes DNS scale. Authoritative servers only serve their own zone, and caches in resolvers absorb
most of the traffic. Clients stay simple: they ask one server.

**Senior add-on:** the split is also where problems live. Location-aware answers see the resolver, not the
user. Caching in resolvers decides how fast changes spread. And a resolver outage takes out every name for
its users, even though every website is fine.
:::

::: details 3. Design DNS-based failover between two regions.
Run health checks against each region from several outside locations. The authoritative DNS (often a managed
provider) returns region A's address while A is healthy, and B's when A fails. Use a short TTL, such as 30–60
seconds, so answers expire quickly.

Then deal with the parts DNS cannot control. Some resolvers and runtimes keep answers longer. Clients keep
open connections to the dead region. So make clients reconnect on errors, with timeouts and retries. Make sure
region B can take all the traffic at once. Avoid flapping: require several failed checks before failing over,
and fail back slowly.

**Senior add-on:** DNS failover moves most traffic in minutes and the long tail in much longer. For faster
moves, put both regions behind anycast addresses or a global load balancer, and use DNS only for coarse
steering ([chapter 10](/edge/steering)). Also make the DNS layer itself redundant: two providers, and health
checks that cannot mark every region down at once. Test the failover regularly.
:::

::: details 4. You changed a record an hour ago. Some users still reach the old IP address. How do you find out why?
First, check what the authoritative servers return, directly: `dig @ns1.example.net name +norec`. Make sure
every one of them has the new answer. A secondary server that did not update is a common cause.

Then check what users' resolvers return. Ask the big public resolvers, and ideally the resolvers of affected
users, and look at the remaining TTL. Find out what the TTL was **before** the change. If it was one day,
caches can legitimately hold the old answer for a day.

Then look at the client. Is the app holding an old connection? Does its runtime cache lookups? Does the
affected machine have an `/etc/hosts` entry or a stale OS cache? Compare `dig` with `getent` or
`dscacheutil`.

**Senior add-on:** look at the old servers' access logs to see who still arrives, by network and user agent.
That separates "one ISP's resolver stretches TTLs" from "our mobile app never reconnects". Keep the old
address serving, or redirecting, until traffic to it reaches zero. Next time, lower the TTL well before the
change.
:::

::: details 5. How do you choose a TTL?
Ask how fast you need to change the answer, and how much you can depend on your DNS provider.

Short TTLs (tens of seconds) let you fail over and shift traffic quickly. They cost more queries, more cold
lookups for users, and less protection if your DNS provider goes down. Long TTLs (hours) are cheap, fast for
users and survive DNS outages. But mistakes take hours to undo.

A common split: short TTLs on names used for traffic steering, long TTLs on stable things such as NS and mail
records. Lower a TTL ahead of planned changes.

**Senior add-on:** for popular names, short TTLs cost little, because each resolver refreshes once per TTL
for all its users. Long TTLs on NS and DS records are set partly by the parent zone, and they decide how
fast you can change DNS providers or undo DNSSEC.
:::

::: details 6. You created a new subdomain. It works for you, but some users get NXDOMAIN for half an hour. Why?
Probably negative caching. Something looked the name up before it existed. That might be a deploy script, a
monitor, or a user. Their resolver cached "does not exist" for the zone's negative TTL. You did not ask
before, so your resolver has no such entry.

Check the SOA record of the zone: its TTL and its last field set the negative cache time. Ask the affected
resolver directly to confirm.

**Senior add-on:** create names before anything references them, and keep the zone's negative TTL modest,
such as minutes rather than hours. Many public resolvers offer a way to flush one name from their cache, which
helps in an incident.
:::

::: details 7. Users in Asia report being sent to servers in the US. What could cause that?
Location-aware DNS picks a server near the resolver, not the user. Check which resolvers these users use. A
company resolver in the US, a VPN, or a public resolver site far away would all cause it.

If the resolver supports EDNS Client Subnet, the authoritative server can see the user's subnet. If it does
not, the server only knows the resolver's address. Also check whether the geolocation database maps those
addresses correctly.

**Senior add-on:** measure from real users (client-side timing data) rather than trusting DNS location.
Consider anycast for the entry address, which routes each user's packets to a nearby site regardless of
resolver. ECS helps, but costs privacy and cache efficiency, and many resolvers do not send it.
:::

::: details 8. Why does DNS use UDP? When does it use TCP, and what breaks if TCP port 53 is blocked?
UDP lets a lookup be one message each way, with no connection setup. That keeps lookups fast and lets
resolvers handle huge numbers of them.

TCP is used when an answer is too big for UDP: the server sets the truncation flag and the client asks again
over TCP. It is also used for zone transfers between servers, and by some resolvers by choice.

If TCP 53 is blocked, small answers still work and large ones fail. DNSSEC-signed answers and names with many
records hit this first. The failure looks random by name, which makes it hard to spot.

**Senior add-on:** big UDP answers can also fail through IP fragmentation, because many networks drop
fragments. That is why the DNS Flag Day 2020 effort recommended a 1232-byte buffer, after which servers
truncate and clients use TCP.
:::

::: details 9. Can you use DNS as a load balancer? What are the limits?
Yes, coarsely. Returning several addresses spreads clients across them. Weighted, health-checked and
location-aware answers let you shift traffic between sites.

The limits: one cached answer serves everyone behind a resolver, so balance is uneven. Answers cannot be
recalled before their TTL ends. Clients sort addresses and keep connections. And DNS cannot see load or retry
a failed request.

**Senior add-on:** use DNS to pick a site or region, and load balancers behind a stable address to spread
connections inside it. Mention that clients do not always pick the first address: address-selection rules
and Happy Eyeballs reorder them.
:::

::: details 10. What do DNS over HTTPS and DNS over TLS change, for users and for operators?
For users, the local network can no longer read or change their lookups. But the resolver still sees them
all, so trust moves to whoever runs it.

For operators, network-level DNS filtering and logging stop working, and apps may pick resolvers the network
did not choose. Internal names served only by a company resolver may stop resolving. The resolver's location
can change, which changes location-aware answers.

**Senior add-on:** DoT uses port 853 and is easy to block or allow. DoH runs on 443 and blends in. Operators
manage it with device policy and with signals browsers honour, such as Firefox's canary domain and resolver
discovery (RFC 9462), rather than by blocking.
:::

::: details 11. What does DNSSEC protect against, and what does it not?
It protects against forged answers. Records are signed by the zone owner, and validating resolvers reject
anything that does not check out. That stops cache poisoning and tampering on the path.

It does not encrypt anything, so lookups are still visible. It does not protect the last hop to the device
unless the device validates itself. And it does not help if the zone's own data is wrong.

**Senior add-on:** DNSSEC adds an availability risk. Expired signatures or a bad key change make validating
resolvers return `SERVFAIL`, and the parent's DS record TTL (one day for `.com`) limits how fast you can roll
back. Slack's 2021 outage is a public example.
:::

::: details 12. Your DNS provider is under a large DDoS attack. How do you design so that you stay up?
Use two independent authoritative DNS providers, both serving the full zone, both listed in the NS records.
Resolvers try another NS server when one fails, so either provider alone can keep you online.

Keep TTLs on stable records long enough to ride out a short outage on cached answers. Keep the zone in code,
and push it to both providers automatically so they never drift.

**Senior add-on:** the hard part is features that do not translate between providers, such as health checks,
weighting and location-aware answers. Use only what both support, or accept that the backup gives plainer
answers. Resolvers that serve stale answers help further. Dyn in 2016 is the standard example.
:::

## Common misconceptions

- **"Changing a record takes effect after the TTL."** For most traffic, roughly. The long tail of stretched
  TTLs, local caches and open connections can take much longer.
- **"The website's DNS sees my IP address."** It sees your resolver's address, plus a shortened subnet only
  if the resolver sends ECS.
- **"DNS only uses UDP."** TCP is a required part of DNS, used for large answers, zone transfers and
  encrypted transports.
- **"DoH makes DNS secure."** It hides lookups from the local network. It does not prove the answer is
  genuine (that is DNSSEC), and the resolver still sees everything.
- **"`dig` shows what my app sees."** `dig` skips the operating system's cache, `/etc/hosts` and any app
  cache.
- **"Round-robin DNS spreads load evenly."** One cached answer can serve millions of users behind one
  resolver.

## Key takeaways

- Your phone asks a **recursive resolver**, which walks the tree from root to **authoritative server** and
  caches every step. Most lookups are cache hits.
- The **TTL** sets how long caches keep an answer. Several caches, stretched TTLs and open connections make
  real change slower than the TTL.
- **"Does not exist" is cached too**, for a time set by the zone's SOA record.
- Location-aware DNS sees the **resolver, not the user**. ECS helps at a cost in privacy and caching.
- DNS steers coarsely. Encryption (DoH, DoT) and signatures (DNSSEC) solve different problems, and both
  shift operational risk.

## Review

<Flashcards id="dns" :cards="cards" />

<MarkDone id="dns" />

## Sources

- [RFC 1034: Domain Names, Concepts and Facilities](https://www.rfc-editor.org/rfc/rfc1034) (RFC, 1987)
- [RFC 1035: Domain Names, Implementation and Specification](https://www.rfc-editor.org/rfc/rfc1035) (RFC, 1987)
- [RFC 2308: Negative Caching of DNS Queries](https://www.rfc-editor.org/rfc/rfc2308) (RFC, 1998)
- [RFC 4033: DNS Security Introduction and Requirements](https://www.rfc-editor.org/rfc/rfc4033) (RFC, 2005)
- [RFC 6891: Extension Mechanisms for DNS (EDNS(0))](https://www.rfc-editor.org/rfc/rfc6891) (RFC, 2013)
- [RFC 7766: DNS Transport over TCP](https://www.rfc-editor.org/rfc/rfc7766) (RFC, 2016) and
  [RFC 9210: DNS Transport over TCP, Operational Requirements](https://www.rfc-editor.org/rfc/rfc9210) (RFC, 2022)
- [RFC 7858: DNS over TLS](https://www.rfc-editor.org/rfc/rfc7858) (RFC, 2016)
- [RFC 7871: Client Subnet in DNS Queries](https://www.rfc-editor.org/rfc/rfc7871) (RFC, 2016)
- [RFC 8484: DNS Queries over HTTPS](https://www.rfc-editor.org/rfc/rfc8484) (RFC, 2018)
- [RFC 8767: Serving Stale Data to Improve DNS Resiliency](https://www.rfc-editor.org/rfc/rfc8767) (RFC, 2020)
- [RFC 9460: Service Binding and Parameter Specification via the DNS (SVCB and HTTPS)](https://www.rfc-editor.org/rfc/rfc9460) (RFC, 2023)
- [DNS Flag Day 2020](https://www.dnsflagday.net/2020/) (industry initiative, 2020)
- [Dyn Analysis Summary of Friday October 21 Attack](https://web.archive.org/web/20161231191203/http://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/) (engineering blog, 2016, archived)
- [More details about the October 4 outage](https://engineering.fb.com/2021/10/05/networking-traffic/outage-details/) (Facebook engineering blog, 2021)
- [What happened during Slack's DNSSEC rollout](https://slack.engineering/what-happened-during-slacks-dnssec-rollout/) (engineering blog, 2021)
- [Cloudflare 1.1.1.1 incident on July 14, 2025](https://blog.cloudflare.com/cloudflare-1-1-1-1-incident-on-july-14-2025/) (incident report, 2025)
