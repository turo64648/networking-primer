<script setup lang="ts">
// Users reach nearby edge PoPs; misses go to a regional parent (origin shield), and only its misses reach the origin.
const edges = [
  { y: 20, t: 'Edge PoP, Sydney' },
  { y: 120, t: 'Edge PoP, Tokyo' },
  { y: 220, t: 'Edge PoP, Paris' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 310" role="img" aria-label="Users connect to nearby edge PoPs. A PoP answers hits itself. On a miss it asks an origin shield, and only the shield's misses reach the origin.">
      <defs>
        <marker id="cdntier-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="e in edges" :key="e.t">
        <!-- users -->
        <rect x="10" :y="e.y + 10" width="90" height="50" rx="8" class="box-a" />
        <text x="55" :y="e.y + 40" text-anchor="middle" class="tb">Users</text>
        <path :d="`M100 ${e.y + 35} L168 ${e.y + 35}`" class="ln" marker-end="url(#cdntier-ah)" />
        <text x="134" :y="e.y + 27" text-anchor="middle" class="m">few ms</text>
        <!-- edge PoP -->
        <rect x="170" :y="e.y" width="160" height="70" rx="8" class="box-b" />
        <text x="250" :y="e.y + 28" text-anchor="middle" class="tb">{{ e.t }}</text>
        <text x="250" :y="e.y + 50" text-anchor="middle" class="m">answers most requests</text>
        <path :d="`M330 ${e.y + 35} L398 155`" class="ln" marker-end="url(#cdntier-ah)" />
      </template>

      <text x="364" y="60" text-anchor="middle" class="m">misses</text>

      <!-- shield -->
      <rect x="400" y="115" width="120" height="80" rx="8" class="box-c" />
      <text x="460" y="145" text-anchor="middle" class="tb">Origin shield</text>
      <text x="460" y="165" text-anchor="middle" class="m">shared parent</text>
      <text x="460" y="181" text-anchor="middle" class="m">cache</text>

      <!-- origin -->
      <path d="M520 155 L548 155" class="ln" marker-end="url(#cdntier-ah)" />
      <rect x="550" y="115" width="85" height="80" rx="8" class="box-d" />
      <text x="592" y="150" text-anchor="middle" class="tb">Origin</text>
      <text x="592" y="170" text-anchor="middle" class="m">rare misses</text>
    </svg>
    <figcaption>
      Each user reaches a nearby PoP, which answers hits itself. Misses from many PoPs go to one shared parent,
      the origin shield, so a file requested in several cities is fetched from the origin about once. City names
      are examples.
    </figcaption>
  </figure>
</template>
