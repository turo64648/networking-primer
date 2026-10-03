<script setup lang="ts">
// Load on three sites before and after site A fails, with nearest-only and capacity-aware steering.
// Bar height: 100% of capacity = 120 px. Baseline y = 230, so the capacity line sits at y = 110.
const panels = [
  { x: 10, title: 'Normal day', note: 'all sites at 60%', loads: [60, 60, 60] },
  { x: 220, title: 'A fails: nearest only', note: 'B gets all of A’s users', loads: [0, 120, 60] },
  { x: 430, title: 'A fails: capacity-aware', note: 'A’s users split B and C', loads: [0, 90, 90] },
]
const names = ['A', 'B', 'C']
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="Three panels of load on sites A, B and C. Normally each runs at 60 percent. If A fails and its users all go to the nearest site B, B reaches 120 percent and overloads. If steering is capacity-aware, A's users are split, and B and C each run at 90 percent.">
      <template v-for="p in panels" :key="p.title">
        <text :x="p.x + 100" y="30" text-anchor="middle" class="tb">{{ p.title }}</text>
        <line :x1="p.x + 10" y1="110" :x2="p.x + 190" y2="110" class="ln" stroke-dasharray="5 4" />
        <text :x="p.x + 190" y="104" text-anchor="end" class="m">capacity</text>
        <template v-for="(load, i) in p.loads" :key="i">
          <rect v-if="load > 0" :x="p.x + 25 + i * 60" :y="230 - load * 1.2" width="40" :height="load * 1.2"
                rx="3" :class="load > 100 ? 'box-d' : 'box-b'" />
          <text :x="p.x + 45 + i * 60" :y="load > 0 ? 224 - load * 1.2 : 222" text-anchor="middle" class="m">
            {{ load > 0 ? load + '%' : 'down' }}
          </text>
          <text :x="p.x + 45 + i * 60" y="250" text-anchor="middle" class="tb">{{ names[i] }}</text>
        </template>
        <text :x="p.x + 100" y="278" text-anchor="middle" class="m">{{ p.note }}</text>
      </template>
    </svg>
    <figcaption>
      Why failover needs spare capacity and capacity-aware steering. Site A fails. If all of A's users go to the
      nearest site, B overloads and may fail too, pushing everyone onto C. Splitting A's users across B and C
      keeps both under capacity. Numbers are illustrative.
    </figcaption>
  </figure>
</template>
