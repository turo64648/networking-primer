<script setup lang="ts">
// curl -w timings are cumulative from the start; phases are the differences.
// Illustrative request: dns 20 ms, connect 80, tls 150, first byte 280, total 320. px = 20 + ms * 1.8
const px = (ms: number) => 20 + ms * 1.8
const phases = [
  { a: 0, b: 20, cls: 'box-a', t: 'DNS' },
  { a: 20, b: 80, cls: 'box-b', t: 'TCP' },
  { a: 80, b: 150, cls: 'box-c', t: 'TLS' },
  { a: 150, b: 280, cls: 'box-d', t: 'waiting for server' },
  { a: 280, b: 320, cls: 'box', t: 'body' },
]
const marks = [
  { ms: 20, v: 'time_namelookup' },
  { ms: 80, v: 'time_connect' },
  { ms: 150, v: 'time_appconnect' },
  { ms: 280, v: 'time_starttransfer' },
  { ms: 320, v: 'time_total' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 290" role="img" aria-label="A request timeline split into DNS, TCP connect, TLS, waiting for the server, and body download. Below it, each curl timing variable is drawn as a line from the start of the request to the end of its phase.">
      <defs>
        <marker id="obscurl-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <text x="20" y="22" class="h">One request, as curl -w reports it</text>

      <template v-for="p in phases" :key="p.t">
        <rect :x="px(p.a)" y="52" :width="px(p.b) - px(p.a)" height="36" :class="p.cls" />
        <text :x="(px(p.a) + px(p.b)) / 2" :y="p.t === 'DNS' ? 44 : 75" text-anchor="middle" class="m">{{ p.t }}</text>
      </template>

      <template v-for="(k, i) in marks" :key="k.v">
        <path :d="`M20 ${118 + i * 30} L${px(k.ms)} ${118 + i * 30}`" class="ln" marker-end="url(#obscurl-ah)" />
        <text v-if="px(k.ms) < 400" :x="px(k.ms) + 8" :y="122 + i * 30" class="m">{{ k.v }} = {{ k.ms }} ms</text>
        <text v-else :x="px(k.ms)" :y="112 + i * 30" text-anchor="end" class="m">{{ k.v }} = {{ k.ms }} ms</text>
      </template>

      <text x="20" y="278" class="m">Every value starts at zero. TLS handshake = 150 − 80 = 70 ms.</text>
    </svg>
    <figcaption>
      curl's timings all count from the start of the request, so each one includes the phases before it. Subtract
      neighbours to get a phase: connect minus lookup is the TCP handshake, first byte minus TLS is the server's
      work plus one round trip. Numbers are illustrative.
    </figcaption>
  </figure>
</template>
