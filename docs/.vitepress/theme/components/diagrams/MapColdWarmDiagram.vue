<script setup lang="ts">
// Round trips before the first byte of the response: cold over TCP, cold over QUIC, and warm.
const RTT = 100 // pixels per round trip to the edge
const rows = [
  {
    y: 40, label: 'Cold, TCP',
    segs: [
      { w: 60, t: 'wake', c: 'box' },
      { w: RTT, t: 'DNS', c: 'box-c' },
      { w: RTT, t: 'TCP connect', c: 'box-a' },
      { w: RTT, t: 'TLS', c: 'box-b' },
      { w: RTT, t: 'Request', c: 'box-d' },
    ],
  },
  {
    y: 100, label: 'Cold, QUIC',
    segs: [
      { w: 60, t: 'wake', c: 'box' },
      { w: RTT, t: 'DNS', c: 'box-c' },
      { w: RTT, t: 'QUIC + TLS', c: 'box-b' },
      { w: RTT, t: 'Request', c: 'box-d' },
    ],
  },
  {
    y: 160, label: 'Warm',
    segs: [{ w: RTT, t: 'Request', c: 'box-d' }],
  },
]
const placed = rows.map((r) => {
  let x = 90
  const segs = r.segs.map((s) => {
    const p = { ...s, x }
    x += s.w
    return p
  })
  return { ...r, segs, end: x }
})
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 240" role="img" aria-label="Three timelines. A cold request over TCP spends a radio wake-up, then one round trip each for DNS, the TCP connection, TLS and the request. A cold request over QUIC combines connection and TLS into one round trip. A warm request needs only the request's own round trip.">
      <template v-for="r in placed" :key="r.label">
        <text x="10" :y="r.y + 25" class="m">{{ r.label }}</text>
        <template v-for="s in r.segs" :key="s.t">
          <rect :x="s.x" :y="r.y" :width="s.w" height="40" rx="4" :class="s.c" />
          <text :x="s.x + s.w / 2" :y="r.y + 25" text-anchor="middle" :class="s.w < RTT ? 'm' : 't'">{{ s.t }}</text>
        </template>
        <text :x="r.end + 8" :y="r.y + 17" class="m">+ server</text>
        <text :x="r.end + 8" :y="r.y + 33" class="m">time</text>
      </template>
      <text x="10" y="226" class="m">Each wide block is one round trip to the edge. “Wake”: only if the radio was idle.</text>
    </svg>
    <figcaption>
      Round trips before the first byte of the response. A cold request pays for DNS, a connection and
      encryption before it can ask for anything. A warm request reuses all three. DNS may be cached and cost
      almost nothing; the figure shows the case where it is not.
    </figcaption>
  </figure>
</template>
