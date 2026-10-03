// Flashcards for the Timeouts, Retries & Overload chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does a service with no timeout on a dependency fail when that dependency hangs?',
    a: 'Each waiting request holds a thread, a connection and memory. Within seconds they are all stuck, and the service stops serving even requests that never touch the dependency.',
  },
  {
    q: 'How do you pick a timeout value?',
    a: 'Measure the dependency’s healthy latency from the caller’s side and set the timeout a little above a high percentile, such as the 99.9th. That makes false timeouts rare and chosen on purpose.',
  },
  {
    q: 'What problem does deadline propagation solve?',
    a: 'Without it, inner hops keep working after the outer caller has given up. Passing the remaining time down lets each hop skip expired work, give dependencies only the time left, and cancel downstream calls.',
  },
  {
    q: 'Why should timeouts shrink as you go down the stack?',
    a: 'If an inner hop waits longer than the hop above it, the outer hop has already given up, and the inner one wastes its work on a result nobody will receive.',
  },
  {
    q: 'Which three questions decide whether to retry a failed request?',
    a: 'Is it safe to repeat (idempotent or carrying an idempotency key)? Could the error go away (a 503 or a reset, not a 400)? Have we used up the small attempt limit or the retry budget?',
  },
  {
    q: 'Why is a timed-out write dangerous to retry?',
    a: 'A timeout means you do not know whether the server did the work. Repeating a non-idempotent write, such as a payment, can do it twice unless the server deduplicates with an idempotency key.',
  },
  {
    q: 'What does jitter add to exponential backoff?',
    a: 'Backoff spaces retries out over time; jitter randomises each wait so clients that failed together do not retry together in synchronised waves.',
  },
  {
    q: 'How do retries amplify across layers?',
    a: 'Attempts multiply. Three layers with three attempts each can send 27 calls to the bottom layer per user request, exactly when it is failing.',
  },
  {
    q: 'How does a retry budget differ from a per-request retry limit?',
    a: 'A per-request limit still lets retries triple total traffic when everything fails. A budget caps retries as a share of all traffic, such as 10%, so retries stop when most requests fail.',
  },
  {
    q: 'What is a hedged request, and when does it hurt?',
    a: 'A copy sent to a second server when the first is slower than, say, the 95th percentile; the first answer wins. It hurts when the whole service is overloaded, because the copies add load.',
  },
  {
    q: 'Why does goodput fall when a server accepts more work than it can do?',
    a: 'Queues grow, requests wait past their callers’ timeouts, and the server spends its capacity on results nobody receives. Callers then retry, adding even more work.',
  },
  {
    q: 'What does load shedding do, and where should it happen?',
    a: 'It rejects excess requests quickly and cheaply so the accepted ones stay fast. Every hop should do it for itself, as early as possible, ideally dropping the least important requests first.',
  },
  {
    q: 'What are the three states of a circuit breaker?',
    a: 'Closed: calls flow and failures are counted. Open: calls fail at once without touching the dependency. Half-open: after a cool-down, a few test calls decide whether to close or open again.',
  },
  {
    q: 'How does client-side admission control work?',
    a: 'Each client compares requests it tried with requests the backend accepted. When tries exceed accepts by some multiple, it rejects a share of new requests locally, so the backend does not pay for rejecting them.',
  },
  {
    q: 'What makes a failure metastable?',
    a: 'A trigger tips a system that was running hot into overload, and a sustaining effect, usually retries or a cold cache, keeps it overloaded after the trigger is gone.',
  },
  {
    q: 'How do you recover from a retry storm?',
    a: 'Cut load well below the level that tipped the system over: shed hard at the edge, stop retries, then let traffic back in gradually and warm caches as it returns.',
  },
  {
    q: 'Why are mobile clients a special risk after an outage?',
    a: 'Millions of phones running the same retry logic act like one synchronised client, and shipped app code changes slowly. Jittered backoff, Retry-After and remotely configurable retry settings help.',
  },
]
