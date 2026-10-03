<script setup lang="ts">
// Many simultaneous misses for one key: without collapsing all go to origin; with collapsing one does.
const ys = [30, 60, 90, 120]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="Top: without collapsing, four simultaneous misses for the same page each go to the origin. Bottom: with collapsing, the cache sends one request to the origin and the other requests wait for its response.">
      <defs>
        <marker id="cdncol-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- without collapsing -->
      <text x="10" y="18" class="h">Without collapsing</text>
      <template v-for="y in ys" :key="'a' + y">
        <rect x="10" :y="y - 10" width="80" height="22" rx="5" class="box-a" />
        <text x="50" :y="y + 5" text-anchor="middle" class="m">user</text>
        <path :d="`M90 ${y} L218 ${y}`" class="ln" marker-end="url(#cdncol-ah)" />
        <path :d="`M330 ${y} L468 ${y}`" class="ln" marker-end="url(#cdncol-ah)" />
      </template>
      <rect x="220" y="20" width="110" height="110" rx="8" class="box-b" />
      <text x="275" y="70" text-anchor="middle" class="tb">Cache</text>
      <text x="275" y="90" text-anchor="middle" class="m">copy expired</text>
      <rect x="470" y="20" width="160" height="110" rx="8" class="box-d" />
      <text x="550" y="66" text-anchor="middle" class="tb">Origin</text>
      <text x="550" y="86" text-anchor="middle" class="m">4 identical requests</text>

      <!-- with collapsing -->
      <text x="10" y="183" class="h">With collapsing</text>
      <template v-for="y in ys" :key="'b' + y">
        <rect x="10" :y="y + 155" width="80" height="22" rx="5" class="box-a" />
        <text x="50" :y="y + 170" text-anchor="middle" class="m">user</text>
        <path :d="`M90 ${y + 165} L218 ${y + 165}`" class="ln" marker-end="url(#cdncol-ah)" />
      </template>
      <rect x="220" y="185" width="110" height="110" rx="8" class="box-b" />
      <text x="275" y="228" text-anchor="middle" class="tb">Cache</text>
      <text x="275" y="248" text-anchor="middle" class="m">1 fetch,</text>
      <text x="275" y="264" text-anchor="middle" class="m">3 requests wait</text>
      <path d="M330 240 L468 240" class="ln" marker-end="url(#cdncol-ah)" />
      <rect x="470" y="185" width="160" height="110" rx="8" class="box-d" />
      <text x="550" y="232" text-anchor="middle" class="tb">Origin</text>
      <text x="550" y="252" text-anchor="middle" class="m">1 request</text>
    </svg>
    <figcaption>
      A popular page expires while many users ask for it. Without collapsing, every miss goes to the origin at
      once. With collapsing, the cache sends one request, and the waiting users all get its response.
    </figcaption>
  </figure>
</template>
