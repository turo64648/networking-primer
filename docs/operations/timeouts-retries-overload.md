---
title: "17. Timeouts, Retries & Overload"
---

<script setup>
import { cards } from './timeouts-retries-overload-review'
</script>

# 17. Timeouts, Retries & Overload

Every hop on the path, from the phone to the first application server, has to decide how long to wait,
whether to try again, and what to do when it has more work than it can handle. Those choices decide whether
a small failure stays small or turns into an outage. That is why interviewers probe them in almost every
system design round.

::: info Before you start
- A request passes through several layers: the app, the edge proxy, internal load balancers and the service.
  [Chapter 1](/foundations/the-map) gives the whole path.
- Some requests are safe to send twice, and some are not. [Chapter 6](/protocols/http#methods-and-idempotency)
  explains this property, called idempotency.
- Proxies spot broken servers and cap how fast clients may send. [Chapter 12](/edge/l7-proxies) covers that.

The chapter makes sense without them. Service names and numbers in the examples are illustrative.
:::

## Why waiting and retrying are policy decisions

**In short:** timeouts, retries and overload controls are set separately at every hop, but they interact.
A choice that looks safe at one hop can multiply load or waste work at another.

A user taps "refresh". The app sends a request to the edge, which sends it to an API service, which calls
another service, which calls a database. Every one of these callers has its own settings: how long to wait,
how many times to retry, how many requests to queue. Different teams set them, often by leaving the
defaults.

Most of the time this works. The trouble starts when something gets slow. Callers time out and retry. The
retries add load to the slow part, which gets slower, which causes more timeouts. This chapter is about
setting these values as one policy across the path, so the system degrades gently instead of falling over.

The tools fall into three groups:

- **Waiting well:** timeouts and deadlines, so no one waits longer than the answer is worth.
- **Trying again well:** retries with backoff, jitter and budgets, plus hedged requests for slow tails.
- **Saying no well:** load shedding, circuit breakers and admission control, so an overloaded server stays
  useful.

## Timeouts

**In short:** a timeout bounds how long a caller waits. Without one, a slow dependency ties up threads,
connections and memory until the caller fails too.

Imagine a service with 200 worker threads. A dependency becomes slow and stops answering. With no timeout,
each request that reaches that dependency holds a thread forever. Within seconds, all 200 threads are stuck,
and the service stops serving even the requests that never touch the slow dependency. A
<Term id="timeout">timeout</Term> is the limit that prevents this.

Waiting costs resources even when nothing is computed. A waiting request holds a thread or a coroutine, a
pooled connection, memory for its buffers, and often a slot in a queue upstream. So the real question is
not "how long might the answer take?" but "how long is it worth holding these resources for it?"

### The timeouts on one request

There is not one timeout but several, one per phase:

| Timeout | Bounds | Typical setting |
|---|---|---|
| **Connect** | Opening the TCP connection | Low: a few times the round trip, often under a second inside a datacenter |
| **TLS handshake** | Setting up encryption | Similar to connect |
| **Response start** | From sending the request to the first byte back | Depends on the work; set from measured latency |
| **Idle (read)** | Silence between bytes on an open connection | Matters most for streams and large downloads |
| **Total** | The whole request, start to finish | The one that matches what the user waits for |

A connect timeout should be short. A server that does not answer a connection attempt within a few round
trips is usually down or unreachable. Waiting longer rarely helps.

The total timeout is the one people forget. A per-read timeout of 10 seconds still lets a server that sends
one byte every 9 seconds hold the request for hours.

::: warning Defaults are often "forever" or "very long"
On default Linux, a connection attempt to a host that never answers gives up after about two minutes
(other systems differ). Python's `requests` library and Go's default `http.Client` have no overall timeout
unless you set one. Proxies have their own defaults: Envoy's route timeout is 15 seconds, and NGINX waits 60
seconds between reads from a backend. Know what yours are.
:::

### Choosing a value

Set timeouts from measured latency, not from a guess. Look at the latency distribution of the dependency
when it is healthy. Pick a timeout a bit above a high percentile, such as the 99.9th. Then roughly one
healthy request in a thousand times out by mistake, and you choose that rate on purpose.

Too short, and you time out healthy requests and retry them, adding load for nothing. Too long, and stuck
requests pile up and hold resources. When a dependency's latency drifts up over months, a timeout that once
fit starts firing on healthy requests. Review timeouts when latency changes.

::: details Going deeper: what to measure
- The AWS Builders' Library article on timeouts (2019) describes this method: choose an acceptable rate of
  false timeouts, such as 0.1%, and set the timeout at the matching percentile of the dependency's latency.
- Measure latency at the caller, not only at the callee. The caller's view includes network delay, queueing
  in connection pools and TLS setup.
- A timeout fires on the caller only. The callee keeps working unless something tells it to stop, which is
  the next section's subject.
- The connect timeout on Linux follows `net.ipv4.tcp_syn_retries` (default 6, about 127 seconds). Apps
  usually set their own shorter value.
:::

## Deadlines and how they travel

**In short:** a deadline is a point in time by which the whole request must finish. Passing it down to every
hop lets each one stop work that nobody is waiting for.

Here is the waste that timeouts alone cause. The app waits 2 seconds. Behind it, the API service waits 5
seconds for its dependency, and that dependency waits 10 seconds for the database. At 2 seconds the app
gives up. But the API service, its dependency and the database keep working for up to 8 more seconds, on a
result that will be thrown away. When the app retries, the second copy of the work starts while the first
is still running.

The fix is to pass along how much time is left. The app says "I need an answer within 2 seconds". The API
service subtracts the time it has already used, keeps a small margin, and tells its dependency "you have
1.7 seconds". Each hop does the same. This is <Term id="deadline-propagation">deadline propagation</Term>.

With a deadline, each hop can make good decisions:

- **Before starting work**, check the deadline. If it has already passed, drop the request. This matters
  most for requests that waited in a queue.
- **When calling a dependency**, give it only the time that is left, not a fixed timeout of its own.
- **When the deadline passes**, cancel downstream calls, so the hops below free their resources too.

A useful rule of thumb follows: timeouts should **shrink as you go down the stack**. If an inner hop waits
longer than the outer one, the outer hop has already given up and the inner one wastes its work.

::: details Going deeper: how deadlines are carried
- <Term id="grpc">gRPC</Term> carries the deadline as a `grpc-timeout` header on each call. Libraries
  such as gRPC-Go pass it on to outgoing calls when the code passes along the request's context, and
  cancel them when it expires.
- HTTP has no standard deadline header. Teams use their own, or proxy-specific ones. Envoy, for example,
  can send `x-envoy-expected-rq-timeout-ms` to tell the backend how long the proxy will wait.
- Deadlines are sent as a **remaining duration**, not an absolute time, so machines with slightly
  different clocks still agree.
- Long-running work such as streaming or model inference needs an idle timeout between chunks, not only a
  total deadline. Otherwise a healthy long answer looks like a hung one.
:::

## Retries

**In short:** many failures are brief, so trying again often works. Retry only requests that are safe to
repeat, only for errors that might go away, and only a bounded number of times.

Networks drop packets, servers restart during deploys, and one server out of hundreds may be having a bad
moment. A second attempt, often to a different server, usually succeeds. Retries turn many short blips into
nothing the user notices. That is why every HTTP client library, proxy and SDK offers them.

But a retry is extra work sent to a system that just failed. Used carelessly, retries are the single most
common way small problems become big ones. Three questions decide whether to retry.

**Is the request safe to repeat?** If the first attempt timed out, you do not know whether the server did
the work. Repeating a "charge this card" request might charge twice. Retry automatically only
<Term id="idempotency">idempotent</Term> requests, or requests that carry an
<Term id="idempotency-key">idempotency key</Term> the server uses to spot duplicates.
[Chapter 6](/protocols/http#methods-and-idempotency) covers both.

**Could this error go away?** Some failures are worth a second try. Others will fail the same way every
time:

| Retry | Do not retry |
|---|---|
| Connection refused or reset before the request was sent | 400-range errors such as bad request or not found |
| `503 Service Unavailable`, `502`, `504` | Errors that say "overloaded, do not retry" |
| `429 Too Many Requests`, after the time in `Retry-After` | Requests whose deadline has already passed |
| Timeouts, for idempotent requests only | Anything not safe to repeat |

**How many times?** Usually a small number, such as 2 or 3 attempts in total. Most transient failures
clear on the second try. Further attempts mostly add load during real outages.

::: details Going deeper: signals that a retry is safe
- A connection that failed to open never carried the request, so retrying it is always safe.
- In HTTP/2, a `REFUSED_STREAM` error or a `GOAWAY` frame tells the client which requests the server did
  not process. Those can be retried even if they are not idempotent ([chapter 6](/protocols/http)).
- `Retry-After` (RFC 9110) on a 503 or 429 tells the client how long to wait, in seconds or as a date.
  Honouring it lets the server spread returning clients.
- Retrying on a different server helps with one bad machine. Envoy, gRPC and most client libraries can
  prefer a different host for the retry.
:::

## Backoff and jitter

**In short:** wait longer after each failure, and randomise the wait. Backoff gives the system time to
recover; randomness keeps clients from coming back all at once.

If a client retries immediately, it hits the service again while the cause is still there. So clients
wait before retrying, and they double the wait after each failure: 100 ms, then 200, then 400, up to a cap.
This is <Term id="exponential-backoff">exponential backoff</Term>. A brief blip costs a short delay, and a
long outage gets fewer and fewer retries.

Backoff alone has a flaw. Suppose a service blips and 1,000 clients fail at the same moment. They all wait
exactly 100 ms and retry at the same moment, then all wait 200 ms and retry together again. Each wave hits
the service as one spike. Many clients waking at once to hit one resource is a
<Term id="thundering-herd">thundering herd</Term>.

The fix is to add randomness to each wait, called <Term id="backoff-jitter">jitter</Term>. The most common
form, "full jitter", picks a random wait between zero and the backoff value. The same 1,000 clients then
spread their retries across the whole interval.

### Try it: see what jitter does

This small simulation has 1,000 clients fail at once and retry after a 1-second backoff. It counts how many
arrive in each 100 ms window. It also shows retry amplification, covered in the next section.

```python
# Run with: python3 retry_sim.py
import random
random.seed(1)

def call(layer, fail_p, attempts, stats):
    """One call into `layer`. Layer 0 calls the database, which fails with probability fail_p."""
    for _ in range(attempts):
        if layer == 0:
            stats["db"] += 1
            ok = random.random() >= fail_p
        else:
            ok = call(layer - 1, fail_p, attempts, stats)
        if ok:
            return True
    return False

print("Backend calls per user request, 3 retrying layers (frontend -> API -> service -> database)")
print("fail_p  1 attempt/layer  3 attempts/layer  success with 3")
for p in (0.0, 0.1, 0.5, 0.9, 1.0):
    row = []
    for attempts in (1, 3):
        stats, ok = {"db": 0}, 0
        for _ in range(10_000):
            ok += call(2, p, attempts, stats)
        row.append((stats["db"] / 10_000, ok / 10_000))
    print(f"{p:5.1f}  {row[0][0]:15.1f}  {row[1][0]:16.1f}  {row[1][1]:13.0%}")

print()
print("1000 clients fail at t=0 and retry once; arrivals per 100 ms window")
base = 1.0  # seconds of backoff
none = [base] * 1000
full = [random.uniform(0, base) for _ in range(1000)]
equal = [base / 2 + random.uniform(0, base / 2) for _ in range(1000)]
for name, times in (("no jitter", none), ("full jitter", full), ("equal jitter", equal)):
    buckets = [0] * 11
    for t in times:
        buckets[min(int(t * 10), 10)] += 1
    print(f"{name:13s} peak={max(buckets):4d}  " + " ".join(f"{b:4d}" for b in buckets))
```

Real output (Python 3, seed 1):

```text
Backend calls per user request, 3 retrying layers (frontend -> API -> service -> database)
fail_p  1 attempt/layer  3 attempts/layer  success with 3
  0.0              1.0               1.0           100%
  0.1              1.0               1.1           100%
  0.5              1.0               2.0           100%
  0.9              1.0               9.3            94%
  1.0              1.0              27.0             0%

1000 clients fail at t=0 and retry once; arrivals per 100 ms window
no jitter     peak=1000     0    0    0    0    0    0    0    0    0    0 1000
full jitter   peak= 115   101  100  104   93   94   90  110  115   82  111    0
equal jitter  peak= 230     0    0    0    0    0  206  198  185  230  181    0
```

Look at the bottom block first. Without jitter, all 1,000 retries land in one window. Full jitter spreads
them evenly, so the peak drops about ninefold. "Equal jitter" keeps half the wait fixed and randomises the
rest, so it spreads them over half the interval.

::: details Going deeper: backoff formulas
- **Full jitter:** `sleep = random(0, min(cap, base × 2^attempt))`. Marc Brooker's 2015 AWS Architecture
  Blog post compared variants and found full jitter did the least total work with good completion times.
- **Decorrelated jitter** bases each wait on the previous one: `sleep = min(cap, random(base, previous × 3))`.
- Always cap the backoff, often at tens of seconds for servers and minutes for mobile clients. Without a
  cap, a client that failed many times may wait hours after the service recovers.
- `curl --retry 3` retries timeouts and errors such as 429, 500, 502, 503 and 504, doubling its wait from
  one second and honouring `Retry-After`. Check your version's man page.
:::

## Retry amplification across layers

**In short:** if every layer retries, the attempts multiply. Three layers with three attempts each can turn
one user request into 27 calls to a broken database, at exactly the moment it can least afford them.

Go back to the path: the frontend calls the API, the API calls a service, the service calls the database.
Each team, sensibly on its own, sets "up to 3 attempts". Now the database fails every request. The service
tries the database 3 times per call. The API tries the service 3 times, so 9 database calls. The frontend
tries the API 3 times, so 27. This is <Term id="retry-amplification">retry amplification</Term>.

<OverloadRetryAmplificationDiagram />

The simulation above shows the full picture. When the database is healthy, retries cost almost nothing.
When 10% of calls fail, three layers of retries hide the failures at a cost of about 10% extra load, which
is what retries are for. When 90% fail, they still rescue most requests, but each user request now costs
the database about 9 calls. When it is fully down, they rescue nothing and multiply its load 27 times.
(The simulation treats failures as independent; real failures are often correlated, which makes retries
rescue even less.)

That last row is the dangerous one. A database that slowed down because it had too much work now gets far
more work. It cannot recover while the multiplied retries keep coming.

The fixes:

- **Retry at one layer only.** Common choices are the layer just above the failing one, or the edge and the
  client. Every other layer passes the error up. The Google SRE book recommends the layer immediately
  above.
- **Say "do not retry" explicitly.** A server that is overloaded returns an error that tells callers not to
  retry, and callers pass it up unchanged instead of retrying it.
- **Use retry budgets**, the next section.

## Retry budgets

**In short:** cap retries as a share of normal traffic, not only per request. When most requests fail, the
budget runs out and retries stop, instead of multiplying load.

"Up to 3 attempts per request" is a per-request limit. It allows retries to triple total traffic when
everything fails. A <Term id="retry-budget">retry budget</Term> adds a limit across all requests: for
example, retries may add at most 10% on top of first attempts. When 1% of requests fail, every failure gets
retried. When 80% fail, only a small share is retried and the rest fail fast.

A budget keeps the useful part of retries, rescuing scattered failures, and removes the harmful part,
multiplying load during an outage. The client tracks it locally, often as a
<Term id="token-bucket">token bucket</Term>: each success adds a fraction of a token, each retry spends a
whole one, and retries stop when the bucket is empty.

::: details Going deeper: budgets in real systems
- The Google SRE book (2016, "Handling Overload") describes a per-request limit of 3 attempts and a
  per-client budget that allows retries only while they stay under 10% of requests.
- gRPC's retry design includes **retry throttling**: a per-server token count that drops on failures and
  rises on successes. When it falls below half its maximum, the client stops retrying.
- Envoy can set a retry budget on a cluster as a percentage of active requests, so concurrent retries
  cannot exceed that share. Check the docs of your version for defaults.
- AWS SDKs' "standard" retry mode (as of 2024) caps attempts and draws retries from a client-side token
  bucket, so a failing service quickly sees fewer retries.
:::

## Hedged requests

**In short:** for latency, not errors: if a request is slower than most, send a second copy to another
server and use whichever answers first. A small amount of extra load cuts the slowest responses sharply.

Most requests to a service are fast, but a few are slow because the server they hit was busy, collecting
garbage, or sharing a disk with a noisy neighbour. These slow few are the <Term id="tail-latency">tail
latency</Term>, measured at a high percentile such as the 99th. Users notice the tail, and pages that make
many calls are likely to hit it.

A <Term id="hedged-request">hedged request</Term> attacks the tail. The client sends the request to one
server. If no answer arrives within, say, the 95th-percentile latency, it sends a copy to a second server.
It uses the first reply and cancels the other. Because only the slowest few percent get a copy, the extra
load stays small.

Hedging only works when the request is idempotent, and when the slowness is about that one server rather
than the whole service. If the whole service is overloaded, hedges add load and make it worse. So hedging
needs the same budget as retries: send a hedge only when the hedge rate is low. Avoid hedging expensive
requests, such as long model-inference calls, where a duplicate wastes a lot.

::: details Going deeper: "The Tail at Scale"
- Dean and Barroso's 2013 paper popularised hedging. In its example, a read of 1,000 keys spread across 100
  servers saw its 99.9th-percentile latency fall from 1,800 ms to 74 ms when hedging after 10 ms, with
  only 2% more requests.
- The paper also describes **tied requests**: send to two servers at once, and each tells the other to
  cancel when it starts the work. This avoids the wait before the hedge.
- Its core point is about fan-out: if one server is slow 1% of the time, a request that waits for 100
  servers is slow most of the time. Fan-out beyond the first application server is outside this book.
:::

## Load shedding

**In short:** when a server has more work than it can do, it should reject the excess quickly and cheaply,
rather than accept everything and serve everyone slowly.

Picture a server that can handle 1,000 requests per second, receiving 1,500. If it accepts them all, its
queue grows without limit. Every request waits longer, and soon most wait longer than their callers'
timeouts. The server is then at full CPU doing work whose results nobody receives. Useful output, called
<Term id="goodput">goodput</Term>, falls toward zero even though the server is busier than ever.

<Term id="load-shedding">Load shedding</Term> avoids this. The server notices it is past capacity and
rejects the extra requests at once, with a cheap error such as a `503`. The 1,000 requests it accepts are
served at normal speed, and the rejected 500 can go elsewhere or retry later.

### How servers decide what to shed

- **Bound the queue.** Keep the queue short and reject when it is full. A long queue only turns overload
  into latency.
- **Drop requests that waited too long.** If a request has sat in the queue past its deadline, or past a
  fixed limit, drop it without doing the work.
- **Limit concurrency, not only rate.** Cap the number of requests in progress. Some systems adapt this cap
  from measured latency, lowering it when latency rises.
- **Shed by priority.** Tag requests by importance. A checkout beats a background refresh, and user traffic
  beats batch jobs. Shed the least important first.
- **Reject early and cheaply.** Rejection should cost far less than serving. Shed at the proxy or at the
  front of the server, before parsing bodies or calling dependencies.

Shedding happens at every hop, with different information. The edge proxy can shed by client or route and
by its own queue sizes. The service knows its own CPU, queues and request priorities. Each hop should
protect itself; none should rely on its callers to be polite. Rate limits per client, from
[chapter 12](/edge/l7-proxies#rate-limiting), are related but different: they stop one client from taking
too much, even when the server has room. Load shedding protects the server whoever is sending.

::: details Going deeper: shedding in practice
- The Google SRE book (2016) describes request **criticality** levels, from "critical plus" down to
  "sheddable", that propagate with each call, so a whole call tree is shed or kept together.
- Facebook's "Fail at Scale" (ACM Queue, 2015) describes switching queues to last-in-first-out under
  overload, and a controlled-delay queue that drops requests waiting too long. Both keep fresh requests
  fast instead of serving stale ones late.
- The kernel's own accept queue is a bounded queue in front of the server. The
  [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking) covers it.
- Rejected requests should cost little, but they are not free. A server receiving many times its capacity
  can be overwhelmed by rejections alone, which is why shedding at an earlier hop also matters.
:::

## Circuit breakers

**In short:** when calls to a dependency keep failing, stop calling it for a while and fail fast. Then let a
few test calls through to see whether it has recovered.

A service calls a dependency that is down. Each call waits for its timeout, holding a thread, before it
fails. Retries make it worse. A <Term id="circuit-breaker">circuit breaker</Term> wraps the calls and
watches the results. It has three states:

- **Closed:** calls flow normally. The breaker counts failures.
- **Open:** failures crossed a threshold, such as half of calls in the last 10 seconds. Calls fail at once,
  without touching the dependency.
- **Half-open:** after a cool-down, a few test calls go through. If they succeed, the breaker closes. If
  not, it opens again.

The benefits are twofold. The caller stops wasting threads on calls that will fail. And the dependency gets
breathing room to recover. While open, the caller can return a fallback: cached data, a default, or a page
without that feature.

Breakers have costs too. A breaker that trips on one bad server cuts off the healthy ones, unless it
watches each server separately. And a breaker that trips across a whole fleet at once can turn a partial
failure into a total one.

::: details Going deeper: three similar ideas
- **Outlier detection** ejects individual bad servers from a load-balancing pool, based on their errors
  ([chapter 12](/edge/l7-proxies#health-checks-and-outlier-detection)). It works per server.
- A **circuit breaker** in the classic sense, popularised by Michael Nygard's book *Release It!* (2007),
  works per dependency and fails calls fast.
- Envoy uses the name "circuit breakers" for something different: caps on connections, pending requests,
  active requests and active retries per cluster. Calls over the cap fail at once. They behave like
  concurrency limits, not the three-state breaker above.
:::

## Admission control at the client

**In short:** clients can watch how often their requests are rejected and stop sending the ones that will
probably fail. That keeps rejections from costing the server almost as much as real work.

Load shedding at the server still costs the server something per request: accepting the connection, reading
the request, sending the error. If clients keep sending at full rate, a heavily overloaded server can spend
much of its effort rejecting. <Term id="admission-control">Admission control</Term> moves the decision
earlier, to the caller, or to a proxy in front of the server.

One well-known form works like this. Each client tracks two numbers over the last minute or two: requests
it tried, and requests the backend accepted. While they are close, it sends everything. Once tries exceed
accepts by some multiple, the client rejects a share of new requests itself, without sending them. The more
the backend rejects, the more the client holds back. As the backend recovers, the share falls back to zero.

::: details Going deeper: the formula
- The Google SRE book (2016) gives the client's local rejection probability as
  `max(0, (requests − K × accepts) / (requests + 1))`, with K typically 2. A larger K lets more requests
  through to the backend during overload.
- This is a form of **adaptive throttling**, similar in spirit to how TCP backs off when it sees loss
  ([chapter 3](/foundations/tcp-and-udp)): senders reduce their rate from signals, without a central
  controller.
:::

## Retry storms and metastable failures

**In short:** some outages keep going after their cause is gone, because the system's own reactions, mostly
retries, keep it overloaded. Recovery then needs a deliberate, large cut in load.

Here is a typical story. A service runs at 70% of capacity: efficient and healthy. A brief network blip
makes some calls time out. Callers retry. The retries push load past 100%, so more calls time out, so more
retries arrive. The blip ends after 30 seconds, but the outage does not. The load is now mostly retries of
requests that will time out anyway. This is a <Term id="retry-storm">retry storm</Term>.

The 2021 paper "Metastable Failures in Distributed Systems" names the pattern. A system is in a **stable**
state when it can absorb a blip. It is **vulnerable** when it runs hot enough that a blip could tip it over;
it still looks healthy. A **trigger** (a spike, a slow dependency, a cache flush) tips it into a
**metastable** state, a <Term id="metastable-failure">metastable failure</Term>. There a **sustaining
effect** keeps it broken after the trigger is gone. Retries are the classic sustaining effect. Losing a
cache is another: with the cache cold, every request hits the slow database, which is too busy to fill the
cache.

<OverloadMetastableDiagram />

Two lessons follow. First, the trigger is not the root cause. The cause is the feedback loop, and the
vulnerable state that made the loop possible. Second, removing the trigger is not enough. To recover, you
must cut load well below the level that tipped the system over, then raise it slowly.

### How to recover, and how to prevent it

Recovery means breaking the loop:

- **Shed hard** at the edge, often far below normal capacity, until the backend is healthy.
- **Stop retries**: turn them off by configuration, or return "do not retry" errors.
- **Let traffic back in slowly**, by percentage or by priority, watching latency.
- **Warm caches** before full traffic returns, or let traffic in slowly so the cache fills as it goes.

Prevention means keeping the loop from forming: retry budgets, jittered backoff, deadlines that drop stale
work, bounded queues, and spare capacity. Load-test past 100% of capacity, and check that goodput stays
flat instead of collapsing. A system that degrades gently under overload can still fail, but it will not
lock itself into failure.

::: details Going deeper: why these are hard to spot
- Before the trigger, metrics look excellent: high utilisation and low latency. The vulnerability is
  invisible until something pushes.
- Mobile clients make it worse. Millions of phones retrying with the same app logic act like one huge
  synchronised client. App retry logic is hard to fix quickly, because users update slowly. Server-sent
  `Retry-After` values and remotely controlled retry settings help.
- Regional failover moves a whole region's traffic, including its retries, onto the survivors
  ([chapter 10](/edge/steering#when-a-region-dies)). A survivor running hot is a vulnerable system waiting
  for that trigger.
:::

## Try it: timeouts and retries from the command line

`curl` exposes most of the knobs in this chapter:

```bash
# Separate connect and total timeouts; print where the time went
curl -o /dev/null -s --connect-timeout 2 --max-time 5 \
  -w 'connect %{time_connect}s  first byte %{time_starttransfer}s  total %{time_total}s  code %{http_code}\n' \
  https://example.com/

# Retry up to 3 times with backoff, giving up after 20 s overall
curl -o /dev/null -sS --retry 3 --retry-max-time 20 --max-time 5 https://example.com/

# Watch a connect timeout against an address that drops packets (a TEST-NET address)
curl -sS --connect-timeout 3 http://192.0.2.1/
```

Example output, trimmed and illustrative:

```text
connect 0.031s  first byte 0.142s  total 0.143s  code 200
curl: (28) Failed to connect to 192.0.2.1 port 80 after 3001 ms: Timeout was reached
```

What to look for: `first byte` minus `connect` shows how long the TLS setup and the server took. Exit code
28 means a timeout fired. Without `--connect-timeout`, the last command would wait for the operating
system's own limit, about two minutes on default Linux.

On a server, `ss -tn state syn-sent` lists connections still waiting for a reply. A growing list during an
incident means a dependency has stopped answering, and callers are waiting on connect timeouts.

## Why this matters in real systems

**Mobile apps after an outage.** When a service comes back, every phone that failed tries again. If the
app retries on a fixed schedule, they all return together and knock the service down again. Apps that use
capped exponential backoff with full jitter, and honour `Retry-After`, spread the return over minutes.
Large apps also keep a server-side switch to slow or stop client retries.

**The edge as a shock absorber.** The edge proxy sees every request first. It is the natural place for
global retry policy, deadlines and coarse shedding by route and priority
([chapter 12](/edge/l7-proxies)). Teams often let the edge retry connection failures to a different
backend, and forbid retries deeper in the stack.

**Deploys and restarts.** Restarting servers drop connections and briefly lower capacity. Retries to a
different server hide this from users, as long as they are budgeted. Graceful draining, so servers stop
taking new work before they exit, removes most of these errors in the first place
([chapter 11](/edge/l4-load-balancing)).

**ML serving.** Inference requests can take seconds and use scarce accelerators. Fixed total timeouts fit
badly; streaming responses need idle timeouts between tokens. Overload is usually handled with bounded
queues and priority-based admission, because a hedged or retried request doubles expensive work.

**Failover needs headroom.** Moving a failed region's traffic to others is only safe if they have spare
capacity for it, plus its retries. Otherwise the failover itself is the trigger for the next metastable
failure ([chapter 10](/edge/steering#capacity-aware-steering-and-evacuation)).

## Where it breaks

**Amazon DynamoDB, 2015: retries that kept a metadata service down.** On 20 September 2015, a network
disruption made DynamoDB's storage servers ask a metadata service for their membership data at once. That
data had grown large, so requests ran past their time limit. Servers then took themselves out of service
and kept retrying, which kept the metadata service overloaded. AWS recovered by pausing requests to it,
which cut retry load enough to add capacity. Error rates reached about 55% for hours.
**Lesson:** when retries sustain an overload, you must stop them before adding capacity can help.
([AWS, 2015](https://aws.amazon.com/message/5467D2/))

**AWS us-east-1, 2021: backoff that did not back off.** On 7 December 2021, an automated scaling activity
caused a surge of connections on AWS's internal network. Delays led to "even more connection attempts and
retries". AWS reported that its clients' back-off behaviour had a latent issue that stopped them backing
off properly. The congestion lasted hours and affected many services and their monitoring.
**Lesson:** backoff that is never exercised under real load may not work when you need it.
([AWS, 2021](https://aws.amazon.com/message/12721/))

**Dyn, 2016: legitimate retries multiplied an attack.** During the DDoS attack on DNS provider Dyn on
21 October 2016, Dyn reported that resolvers' retries multiplied traffic 10 to 20 times over normal
volume. Retries by well-behaved clients became part of the load ([chapter 4](/protocols/dns)).
**Lesson:** under overload, honest clients' retries can rival the attack itself.
([Dyn analysis, archived](https://web.archive.org/web/20161231191203/http://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/))

## Interview questions

Answer each question out loud before you open the model answer.

::: details 1. How do you choose a timeout for a call to a dependency?
Measure the dependency's latency from the caller's side when it is healthy. Set the timeout a little above a
high percentile, such as the 99.9th, so false timeouts are rare and chosen on purpose. Use a short connect
timeout and a separate total timeout.

Then check it fits the caller's own budget. The caller's caller is waiting too.

**Senior add-on:** better still, propagate a deadline and use the remaining time instead of a fixed value.
Make inner timeouts shorter than outer ones, and revisit them when latency drifts, because a stale timeout
starts firing on healthy traffic.
:::

::: details 2. Why is "retry 3 times" at every layer dangerous?
Retries multiply across layers. Three layers with three attempts each send up to 27 calls to the bottom
layer per user request. That happens exactly when the bottom layer is failing, often because it is
overloaded.

**Senior add-on:** retry at one layer, use a retry budget (for example, retries at most 10% of traffic),
and have overloaded servers return a "do not retry" error that callers pass up unchanged.
:::

::: details 3. What is jitter, and why does backoff need it?
Jitter is randomness added to the wait before a retry. Without it, clients that failed together retry
together, in synchronised waves that hit the recovering service as spikes.

**Senior add-on:** full jitter (a random wait between zero and the backoff value) spreads retries evenly.
Always cap the backoff, and honour `Retry-After` so the server can spread clients itself.
:::

::: details 4. Design the retry and timeout policy for a mobile app SDK used by millions of phones.
Use a total deadline per user action, such as a few seconds for interactive calls. Retry only idempotent
calls or calls with idempotency keys, on connection failures, 503s and timeouts. Use capped exponential
backoff with full jitter, and honour `Retry-After`. Retry at most two or three times.

Add a client-side budget: if most recent calls failed, stop retrying and show an error or cached data.

**Senior add-on:** make retry settings remotely configurable, because shipped app code changes slowly. Plan
for the moment the service comes back: millions of phones returning at once. Spread reconnects over minutes
and let the server signal "back off" explicitly. Keep retries out of background sync loops that run on
every phone at the same time.
:::

::: details 5. Design overload protection for a service behind an edge proxy.
At the edge: per-client rate limits, deadlines on every request, retries only for connection failures and
to a different backend, and a retry budget. In the service: a bounded queue, a concurrency limit, dropping
requests whose deadline has passed, and shedding by priority. Return cheap 503s with `Retry-After`.

Callers of the service use circuit breakers and fallbacks, so a failure there does not spread.

**Senior add-on:** test it. Load-test past capacity and check that goodput stays flat instead of falling.
Keep spare capacity for regional failover. Have a runbook and switches to shed hard and disable retries
during an incident.
:::

::: details 6. A dependency had a 1-minute blip. Your service has been down for 30 minutes since, even though the dependency is healthy. What is going on, and what do you do?
It looks like a metastable failure. The blip caused timeouts and retries. The retries keep load above
capacity, so requests keep timing out, which causes more retries. Check the ratio of retries to first
attempts, queue lengths, and whether most completed work is for requests whose callers already gave up.
Also check for a cold cache.

To recover, cut load hard: shed at the edge, turn retries off, then let traffic back in gradually while
watching latency.

**Senior add-on:** the blip was the trigger, not the root cause. The fix afterwards is to remove the
sustaining effect: retry budgets, jitter, deadline checks before work, bounded queues, and more headroom.
:::

::: details 7. Users see high 99th-percentile latency, but the median is fine. How do you investigate, and would hedging help?
First find where the slow requests go. Is it a few servers (a bad host, garbage collection pauses, a noisy
neighbour) or everything at busy times (overload)? Break latency down by server, by route and by time.

Hedging helps if the slowness is about individual servers: a copy sent to another server after the 95th
percentile usually comes back fast. It hurts if the whole service is overloaded, because hedges add load.

**Senior add-on:** budget hedges like retries, hedge only idempotent and cheap requests, and cancel the
losing copy. "The Tail at Scale" (2013) is the reference.
:::

::: details 8. What is the difference between a circuit breaker, outlier detection and a rate limiter?
A circuit breaker sits in the caller and stops calls to a whole failing dependency for a while, failing
fast. Outlier detection, in a load balancer, removes individual bad servers from a pool. A rate limiter
caps how much a client may send, whether or not the server is struggling.

**Senior add-on:** they protect different things: the caller's resources, the pool's quality and fairness
between clients. Load shedding is a fourth: the server protecting itself from total load. Note that
Envoy's "circuit breakers" are concurrency caps, not three-state breakers.
:::

::: details 9. Why does a server's useful throughput fall when it accepts too much work?
With unbounded queues, every request waits longer as load rises. Past a point, most requests wait longer
than their callers' timeouts. The server still does the work, but nobody receives the results. Callers
retry, which adds even more work.

**Senior add-on:** fix it with bounded queues, early rejection, dropping requests past their deadline,
and concurrency limits. Some systems switch to last-in-first-out under overload so fresh requests stay
fast.
:::

::: details 10. When is it safe to retry a request that timed out?
Only if repeating it is harmless: a read, an idempotent write, or a write with an idempotency key the
server checks. A timeout means you do not know whether the server did the work.

**Senior add-on:** some failures prove the request was not processed: a connection that never opened, or
HTTP/2's `REFUSED_STREAM` and `GOAWAY`. Those are safe to retry for any request.
:::

## Common misconceptions

- **"Retries make a system more reliable."** They hide scattered failures. During an outage they multiply
  load and can keep the system down.
- **"A longer timeout is safer."** It holds threads and connections longer, so a slow dependency exhausts
  the caller sooner.
- **"Exponential backoff is enough."** Without jitter, clients that failed together retry together.
- **"The outage ends when the trigger is fixed."** In a metastable failure, retries and cold caches keep it
  going until load is cut.
- **"An overloaded server should queue requests rather than reject them."** Long queues turn overload into
  timeouts; fast rejection keeps the accepted requests fast.

## Key takeaways

- Every hop needs **timeouts**, and a **deadline** passed down the path lets each hop drop work nobody is
  waiting for.
- **Retry** only safe requests and transient errors, with **capped exponential backoff and jitter**.
- Retries **multiply across layers**: retry at one layer and enforce a **retry budget**.
- Under overload, **reject early and cheaply** (load shedding, circuit breakers, admission control) so
  goodput stays flat.
- **Metastable failures** outlive their trigger; recovery needs a large, deliberate cut in load.

## Review

<Flashcards id="timeouts-retries-overload" :cards="cards" />

<MarkDone id="timeouts-retries-overload" />

## Sources

- [Metastable Failures in Distributed Systems](https://sigops.org/s/conferences/hotos/2021/papers/hotos21-s11-bronson.pdf)
  (paper, HotOS, 2021), Bronson, Aghayev, Charapko and Zhu
- [The Tail at Scale](https://research.google/pubs/the-tail-at-scale/) (paper, Communications of the ACM,
  2013), Dean and Barroso
- [Handling Overload](https://sre.google/sre-book/handling-overload/) and
  [Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/) (Google SRE
  book, 2016)
- [Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)
  (Amazon Builders' Library, 2019)
- [Exponential Backoff and Jitter](https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/)
  (AWS Architecture Blog, 2015)
- [Fail at Scale](https://queue.acm.org/detail.cfm?id=2839461) (ACM Queue, 2015), Facebook
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110) (RFC, 2022), for `Retry-After` and
  status codes
- [Summary of the Amazon DynamoDB Service Disruption](https://aws.amazon.com/message/5467D2/) (incident
  report, 2015)
- [Summary of the AWS Service Event in the Northern Virginia (US-EAST-1) Region](https://aws.amazon.com/message/12721/)
  (incident report, 2021)
- [Dyn Analysis Summary of Friday October 21 Attack](https://web.archive.org/web/20161231191203/http://dyn.com/blog/dyn-analysis-summary-of-friday-october-21-attack/)
  (engineering blog, 2016, archived)
