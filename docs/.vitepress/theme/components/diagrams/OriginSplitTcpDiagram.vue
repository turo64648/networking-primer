<script setup lang="ts">
// Direct connection to a far origin vs split TCP through a nearby PoP with a warm origin connection.
const direct = [
  { y: 140, t: 'TCP handshake' },
  { y: 172, t: 'TLS handshake' },
  { y: 204, t: 'request and response' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 400" role="img" aria-label="Without an edge, the phone makes three long round trips to the origin. With split TCP, the phone makes two short handshakes with a nearby PoP, and only the request crosses the long distance on an already open connection.">
      <defs>
        <marker id="osplit-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <rect x="10" y="20" width="140" height="56" rx="8" class="box-a" />
      <text x="80" y="44" text-anchor="middle" class="tb">Phone</text>
      <text x="80" y="62" text-anchor="middle" class="m">Lisbon</text>
      <rect x="250" y="20" width="140" height="56" rx="8" class="box-b" />
      <text x="320" y="44" text-anchor="middle" class="tb">Edge PoP</text>
      <text x="320" y="62" text-anchor="middle" class="m">Lisbon</text>
      <rect x="490" y="20" width="140" height="56" rx="8" class="box-d" />
      <text x="560" y="44" text-anchor="middle" class="tb">Origin</text>
      <text x="560" y="62" text-anchor="middle" class="m">Virginia</text>

      <!-- direct -->
      <text x="10" y="118" class="h">Without an edge: 3 long round trips</text>
      <template v-for="d in direct" :key="d.t">
        <path :d="`M80 ${d.y} L558 ${d.y}`" class="ln" marker-start="url(#osplit-ah)" marker-end="url(#osplit-ah)" />
        <text x="320" :y="d.y - 6" text-anchor="middle" class="m">{{ d.t }} (~150 ms)</text>
      </template>
      <text x="630" y="232" text-anchor="end" class="tb">first byte ≈ 500 ms</text>

      <!-- split -->
      <text x="10" y="276" class="h">Split TCP, warm origin connection</text>
      <path d="M80 306 L318 306" class="ln" marker-start="url(#osplit-ah)" marker-end="url(#osplit-ah)" />
      <text x="200" y="300" text-anchor="middle" class="m">TCP handshake (~20 ms)</text>
      <path d="M80 338 L318 338" class="ln" marker-start="url(#osplit-ah)" marker-end="url(#osplit-ah)" />
      <text x="200" y="332" text-anchor="middle" class="m">TLS handshake (~20 ms)</text>
      <path d="M80 370 L558 370" class="ln" marker-start="url(#osplit-ah)" marker-end="url(#osplit-ah)" />
      <text x="200" y="364" text-anchor="middle" class="m">request (~20 ms)</text>
      <text x="440" y="364" text-anchor="middle" class="m">on an open connection (~150 ms)</text>
      <text x="630" y="394" text-anchor="end" class="tb">first byte ≈ 200 ms</text>
    </svg>
    <figcaption>
      A new HTTPS request from Lisbon to an origin in Virginia. Directly, every handshake crosses the ocean.
      Through a nearby PoP, the handshakes are short and only the request and response make the long trip,
      on a connection the PoP opened earlier. Times are rough round trips; real ones depend on the route.
    </figcaption>
  </figure>
</template>
