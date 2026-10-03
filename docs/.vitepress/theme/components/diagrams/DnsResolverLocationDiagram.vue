<script setup lang="ts">
// The authoritative server sees the resolver, not the user, unless the resolver sends the user's subnet (ECS).
const rows = [
  { h: 'Resolver near the user', r: 'ISP resolver', rm: 'in Madrid', a: 'sees a Madrid IP', res: 'Madrid', resm: 'server nearby', good: true },
  { h: 'Resolver far from the user (VPN, office, distant public resolver)', r: 'Far resolver', rm: 'in Frankfurt', a: 'sees a Frankfurt IP', res: 'Frankfurt', resm: 'server far away', good: false },
  { h: 'Far resolver that sends the user’s subnet (EDNS Client Subnet)', r: 'Far resolver', rm: '+ user’s subnet', a: 'sees: Madrid subnet', res: 'Madrid', resm: 'server nearby', good: true },
]
const y = (i: number) => 22 + i * 100
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 320" role="img" aria-label="Three cases. A user in Madrid with a Madrid resolver gets a Madrid server. With a Frankfurt resolver the authoritative server sees Frankfurt and returns a Frankfurt server. With EDNS Client Subnet, the Frankfurt resolver passes the user's subnet and the user gets a Madrid server again.">
      <defs>
        <marker id="dnsloc-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>
      <template v-for="(r, i) in rows" :key="i">
        <text x="10" :y="y(i)" class="m">{{ r.h }}</text>

        <rect x="10" :y="y(i) + 12" width="105" height="58" rx="8" class="box-a" />
        <text x="62" :y="y(i) + 37" text-anchor="middle" class="tb">User</text>
        <text x="62" :y="y(i) + 56" text-anchor="middle" class="m">in Madrid</text>

        <rect x="145" :y="y(i) + 12" width="140" height="58" rx="8" class="box-b" />
        <text x="215" :y="y(i) + 37" text-anchor="middle" class="tb">{{ r.r }}</text>
        <text x="215" :y="y(i) + 56" text-anchor="middle" class="m">{{ r.rm }}</text>

        <rect x="320" :y="y(i) + 12" width="150" height="58" rx="8" class="box-d" />
        <text x="395" :y="y(i) + 37" text-anchor="middle" class="tb">Authoritative</text>
        <text x="395" :y="y(i) + 56" text-anchor="middle" class="m">{{ r.a }}</text>

        <rect x="500" :y="y(i) + 12" width="130" height="58" rx="8" :class="r.good ? 'box-a' : 'box-c'" />
        <text x="565" :y="y(i) + 37" text-anchor="middle" class="tb">{{ r.res }}</text>
        <text x="565" :y="y(i) + 56" text-anchor="middle" class="m">{{ r.resm }}</text>

        <path :d="`M115 ${y(i) + 41} L143 ${y(i) + 41}`" class="ln" marker-end="url(#dnsloc-ah)" />
        <path :d="`M285 ${y(i) + 41} L318 ${y(i) + 41}`" class="ln" marker-end="url(#dnsloc-ah)" />
        <path :d="`M470 ${y(i) + 41} L498 ${y(i) + 41}`" class="ln" marker-end="url(#dnsloc-ah)" />
      </template>
    </svg>
    <figcaption>
      A location-aware authoritative server picks an answer based on who asked it. That is the resolver, not the
      user. A far-away resolver gets a far-away answer, unless it passes on part of the user’s address.
    </figcaption>
  </figure>
</template>
