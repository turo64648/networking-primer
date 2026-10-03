<script setup lang="ts">
// Bucket table with two choices per bucket. After a change, bucket 1 moved from B to D. D forwards packets
// it has no connection for to B, so B's existing flows survive.
const rows = [
  { b: '0', first: 'A', second: '–', hi: false },
  { b: '1', first: 'D (new)', second: 'B (old)', hi: true },
  { b: '2', first: 'C', second: '–', hi: false },
  { b: '3', first: 'A', second: '–', hi: false },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 280" role="img" aria-label="A table of buckets, each with a first and second server. Bucket 1 has D first and B second. A packet of an old flow hashes to bucket 1 and goes to D. D has no connection for it and forwards it to B, which owns the flow. New connections stay on D.">
      <defs>
        <marker id="l4sc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- table -->
      <text x="45" y="40" text-anchor="middle" class="h">Bucket</text>
      <text x="135" y="40" text-anchor="middle" class="h">First</text>
      <text x="225" y="40" text-anchor="middle" class="h">Second</text>
      <template v-for="(r, i) in rows" :key="r.b">
        <rect x="10" :y="52 + i * 44" width="260" height="36" rx="6" :class="r.hi ? 'box-b' : 'box'" />
        <text x="45" :y="75 + i * 44" text-anchor="middle" class="t">{{ r.b }}</text>
        <text x="135" :y="75 + i * 44" text-anchor="middle" class="t">{{ r.first }}</text>
        <text x="225" :y="75 + i * 44" text-anchor="middle" class="t">{{ r.second }}</text>
      </template>
      <text x="140" y="250" text-anchor="middle" class="m">every balancer holds the same table</text>

      <!-- balancer -->
      <rect x="330" y="30" width="200" height="56" rx="8" class="box-c" />
      <text x="430" y="54" text-anchor="middle" class="tb">L4 balancer</text>
      <text x="430" y="73" text-anchor="middle" class="m">old flow hashes to bucket 1</text>
      <path d="M272 114 L328 62" class="ln ln-dash" />

      <!-- D -->
      <rect x="310" y="150" width="150" height="70" rx="8" class="box-d" />
      <text x="385" y="174" text-anchor="middle" class="tb">Server D</text>
      <text x="385" y="194" text-anchor="middle" class="m">no connection for it</text>
      <text x="385" y="210" text-anchor="middle" class="m">new flows stay here</text>
      <path d="M400 86 L388 148" class="ln" marker-end="url(#l4sc-ah)" />
      <text x="418" y="122" class="m">1st try</text>

      <!-- B -->
      <rect x="490" y="150" width="140" height="70" rx="8" class="box-a" />
      <text x="560" y="174" text-anchor="middle" class="tb">Server B</text>
      <text x="560" y="194" text-anchor="middle" class="m">owns the flow,</text>
      <text x="560" y="210" text-anchor="middle" class="m">replies to client</text>
      <path d="M460 185 L488 185" class="ln" marker-end="url(#l4sc-ah)" />
      <text x="475" y="140" text-anchor="middle" class="m">forwarded</text>
    </svg>
    <figcaption>
      Second-chance forwarding. Bucket 1 has just moved from server B to server D. New connections in that
      bucket go to D. A packet of a connection B already holds goes to D first; D does not recognise it and
      passes it to B. The balancers keep no per-connection state.
    </figcaption>
  </figure>
</template>
