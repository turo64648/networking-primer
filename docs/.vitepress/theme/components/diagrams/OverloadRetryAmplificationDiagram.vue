<script setup lang="ts">
// Retry amplification: four tiers, each caller tries the next one up to 3 times, so attempts multiply.
const tiers = [
  { x: 10, t: 'Frontend', m: 'one user request', n: '1' },
  { x: 170, t: 'API service', m: 'tried up to 3×', n: '3' },
  { x: 330, t: 'Inner service', m: 'tried up to 3×', n: '9' },
  { x: 490, t: 'Database', m: 'down or overloaded', n: '27' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 210" role="img" aria-label="A frontend calls an API service, which calls an inner service, which calls a database. Each caller tries up to three times. When the database fails, it receives 27 calls for one user request.">
      <defs>
        <marker id="ovamp-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="(s, i) in tiers" :key="s.t">
        <rect :x="s.x" y="40" width="140" height="70" rx="8" :class="i === 3 ? 'box-d' : 'box-b'" />
        <text :x="s.x + 70" y="69" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text :x="s.x + 70" y="90" text-anchor="middle" class="m">{{ s.m }}</text>
        <text :x="s.x + 70" y="150" text-anchor="middle" class="tb">{{ s.n }}</text>
        <text :x="s.x + 70" y="170" text-anchor="middle" class="m">{{ i === 0 ? 'request' : 'calls arrive' }}</text>
        <path v-if="i < 3" :d="`M${s.x + 142} 75 L${s.x + 158} 75`" class="ln" marker-end="url(#ovamp-ah)" />
        <text v-if="i < 3" :x="s.x + 150" y="30" text-anchor="middle" class="m">×3</text>
      </template>
      <text x="320" y="200" text-anchor="middle" class="m">calls reaching each tier when everything below the frontend fails</text>
    </svg>
    <figcaption>
      Each team sets "up to 3 attempts", which looks safe on its own. When the database fails, the inner
      service tries it 3 times per call, the API tries the inner service 3 times, and the frontend tries the API
      3 times: 3 × 3 × 3 = 27 database calls for one user request. Retrying at one layer, with a budget, keeps it
      near 1.
    </figcaption>
  </figure>
</template>
