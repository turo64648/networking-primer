<script setup lang="ts">
// A two-tier leaf-spine fabric: every leaf connects to every spine. One rack-to-rack path is highlighted.
const spines = [0, 1, 2, 3].map((i) => ({ i, x: 110 + i * 140 }))
const leaves = [0, 1, 2, 3, 4, 5].map((i) => ({ i, x: 60 + i * 104 }))
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 370" role="img" aria-label="Four spine switches on top and six rack switches below. Every rack switch connects to every spine. Traffic from rack 1 to rack 5 can go through any of the four spines.">
      <text x="10" y="22" class="h">Spine switches</text>
      <text x="10" y="196" class="h">Leaf (top-of-rack) switches</text>

      <!-- every leaf to every spine -->
      <template v-for="l in leaves" :key="'l' + l.i">
        <path v-for="s in spines" :key="'e' + l.i + s.i" :d="`M${l.x} 210 L${s.x} 74`" class="ln" style="opacity: 0.35" />
      </template>

      <!-- highlighted equal paths from leaf 1 to leaf 5 -->
      <template v-for="s in spines" :key="'p' + s.i">
        <path :d="`M${leaves[0].x} 210 L${s.x} 74 L${leaves[4].x} 210`" class="ln" style="stroke-width: 2.5; fill: none" />
      </template>

      <template v-for="s in spines" :key="'s' + s.i">
        <rect :x="s.x - 50" y="34" width="100" height="40" rx="8" class="box-b" />
        <text :x="s.x" y="59" text-anchor="middle" class="tb">Spine {{ s.i + 1 }}</text>
      </template>

      <template v-for="l in leaves" :key="'r' + l.i">
        <rect :x="l.x - 44" y="210" width="88" height="36" rx="8" :class="l.i === 0 || l.i === 4 ? 'box-a' : 'box-d'" />
        <text :x="l.x" y="233" text-anchor="middle" class="tb">Leaf {{ l.i + 1 }}</text>
        <rect :x="l.x - 30" y="256" width="60" height="44" rx="4" class="box" />
        <text :x="l.x" y="276" text-anchor="middle" class="m">rack of</text>
        <text :x="l.x" y="291" text-anchor="middle" class="m">servers</text>
      </template>

      <text x="320" y="326" text-anchor="middle" class="t">Rack 1 to rack 5: leaf → any spine → leaf, four equal paths (bold)</text>
      <text x="320" y="350" text-anchor="middle" class="m">Example leaf: 48 servers × 25 Gb/s down, 4 × 100 Gb/s up = 3:1 oversubscription</text>
    </svg>
    <figcaption>
      A two-tier leaf-spine fabric. Every rack switch connects to every spine, so any two racks are two switch
      hops apart and have one path per spine. Adding a spine adds a path and capacity; losing one removes a
      quarter here. Numbers are an example, not a standard.
    </figcaption>
  </figure>
</template>
