<script setup lang="ts">
// Two ways from a PoP to the origin: across several public networks, or on the operator's own backbone.
const isps = [
  { x: 170, t: 'Network A' },
  { x: 290, t: 'Network B' },
  { x: 410, t: 'Network C' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="Upper path: from the PoP through three other networks to the origin, each handing traffic off early. Lower path: from the PoP onto the operator's own backbone, which carries it all the way to the origin region.">
      <defs>
        <marker id="obb-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <rect x="10" y="125" width="120" height="70" rx="8" class="box-b" />
      <text x="70" y="155" text-anchor="middle" class="tb">Edge PoP</text>
      <text x="70" y="175" text-anchor="middle" class="m">Lisbon</text>
      <rect x="510" y="125" width="120" height="70" rx="8" class="box-d" />
      <text x="570" y="155" text-anchor="middle" class="tb">Origin region</text>
      <text x="570" y="175" text-anchor="middle" class="m">Virginia</text>

      <!-- public internet -->
      <text x="320" y="24" text-anchor="middle" class="h">Public internet</text>
      <template v-for="i in isps" :key="i.t">
        <rect :x="i.x" y="40" width="80" height="44" rx="20" class="box" />
        <text :x="i.x + 40" y="67" text-anchor="middle" class="m">{{ i.t }}</text>
      </template>
      <path d="M100 125 L172 86" class="ln" marker-end="url(#obb-ah)" />
      <path d="M250 62 L288 62" class="ln" marker-end="url(#obb-ah)" />
      <path d="M370 62 L408 62" class="ln" marker-end="url(#obb-ah)" />
      <path d="M470 86 L540 123" class="ln" marker-end="url(#obb-ah)" />
      <text x="320" y="108" text-anchor="middle" class="m">each network hands off at its nearest exit</text>

      <!-- backbone -->
      <rect x="150" y="220" width="340" height="50" rx="8" class="box-c" />
      <text x="320" y="242" text-anchor="middle" class="tb">Operator's private backbone</text>
      <text x="320" y="260" text-anchor="middle" class="m">own fibre, own routing, priorities</text>
      <path d="M100 195 L152 232" class="ln" marker-end="url(#obb-ah)" />
      <path d="M490 232 L540 197" class="ln" marker-end="url(#obb-ah)" />
      <text x="320" y="296" text-anchor="middle" class="m">one operator carries it the whole way</text>
    </svg>
    <figcaption>
      Two ways to cross the long leg. Over the public internet, several networks each route to suit themselves
      (hot-potato routing). On a private backbone, the operator keeps the traffic on its own network until the
      origin region (cold-potato routing), so it controls latency, capacity and priorities.
    </figcaption>
  </figure>
</template>
