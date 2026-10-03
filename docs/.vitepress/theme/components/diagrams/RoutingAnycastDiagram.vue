<script setup lang="ts">
// Anycast: three sites announce the same prefix; each user's network picks its own best route.
const sites = [
  { x: 20, t: 'Site in Europe' },
  { x: 235, t: 'Site in US East' },
  { x: 450, t: 'Site in Asia' },
]
const users = [
  { x: 10, t: 'User in Paris', m: '→ Europe' },
  { x: 170, t: 'User in Ohio', m: '→ US East' },
  { x: 330, t: 'User in Mumbai', m: '→ Europe: best BGP route' },
  { x: 490, t: 'User in Singapore', m: '→ Asia' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 380" role="img" aria-label="Three sites in Europe, US East and Asia all announce the same address range. Users in Paris and Ohio reach the nearest site. A user in Mumbai reaches Europe because that is its ISP's best BGP route. A user in Singapore reaches Asia.">
      <defs>
        <marker id="rtany-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="s in sites" :key="s.t">
        <rect :x="s.x" y="20" width="170" height="70" rx="8" class="box-b" />
        <text :x="s.x + 85" y="48" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text :x="s.x + 85" y="70" text-anchor="middle" class="m">announces 203.0.113.0/24</text>
      </template>

      <path d="M80 300 L100 92" class="ln" marker-end="url(#rtany-ah)" />
      <path d="M240 300 L315 92" class="ln" marker-end="url(#rtany-ah)" />
      <path d="M400 300 L115 92" class="ln" marker-end="url(#rtany-ah)" />
      <path d="M560 300 L535 92" class="ln" marker-end="url(#rtany-ah)" />

      <template v-for="u in users" :key="u.t">
        <rect :x="u.x" y="300" width="140" height="58" rx="8" class="box-a" />
        <text :x="u.x + 70" y="324" text-anchor="middle" class="tb">{{ u.t }}</text>
        <text :x="u.x + 70" y="344" text-anchor="middle" class="m">{{ u.m }}</text>
      </template>
    </svg>
    <figcaption>
      Anycast. Every site announces the same address range, and each user's network sends packets along its
      own best BGP route. Most users land on a nearby site, but "best" means fewest networks and cheapest
      business path, not shortest distance, so some land far away. If a site stops announcing, its users
      move to the next-best site.
    </figcaption>
  </figure>
</template>
