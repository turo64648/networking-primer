<script setup lang="ts">
// One lost packet: over TCP it stalls every HTTP/2 stream; over QUIC it stalls only its own stream.
const packets = [
  { s: 'A', n: 1, cls: 'box-a', lost: true },
  { s: 'B', n: 1, cls: 'box-b' },
  { s: 'C', n: 1, cls: 'box-c' },
  { s: 'A', n: 2, cls: 'box-a' },
  { s: 'B', n: 2, cls: 'box-b' },
  { s: 'C', n: 2, cls: 'box-c' },
]
const rows = [
  { y: 40, title: 'HTTP/2 over TCP: one ordered byte stream', r1: 'Waiting: A, B and C', r2: 'all wait for the resend' },
  { y: 190, title: 'HTTP/3 over QUIC: independent streams', r1: 'Waiting: A only', r2: 'B and C go to the app' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="Three responses, A, B and C, are interleaved in six packets, and the first packet of A is lost. Over TCP, the receiver holds back all three responses until the lost packet is resent. Over QUIC, only response A waits.">
      <template v-for="r in rows" :key="r.y">
        <text x="10" :y="r.y" class="h">{{ r.title }}</text>
        <template v-for="(p, i) in packets" :key="i">
          <rect :x="10 + i * 68" :y="r.y + 22" width="58" height="44" rx="6" :class="p.cls"
            :stroke-dasharray="p.lost ? '5 4' : undefined" :opacity="p.lost ? 0.45 : 1" />
          <text :x="39 + i * 68" :y="r.y + 49" text-anchor="middle" class="tb">{{ p.s }}{{ p.n }}</text>
        </template>
        <text x="39" :y="r.y + 86" text-anchor="middle" class="m">lost</text>
        <path :d="`M418 ${r.y + 44} L448 ${r.y + 44}`" class="ln" marker-end="url(#quicstr-ah)" />
        <rect x="455" :y="r.y + 18" width="175" height="52" rx="8" class="box-d" />
        <text x="542" :y="r.y + 40" text-anchor="middle" class="tb">{{ r.r1 }}</text>
        <text x="542" :y="r.y + 59" text-anchor="middle" class="m">{{ r.r2 }}</text>
      </template>
      <defs>
        <marker id="quicstr-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>
    </svg>
    <figcaption>
      Three responses (A, B, C) share one connection, and the packet carrying A1 is lost. TCP must deliver bytes in
      order, so B and C sit in the receive buffer until A1 is resent. QUIC knows which stream each byte belongs to,
      so only A waits.
    </figcaption>
  </figure>
</template>
