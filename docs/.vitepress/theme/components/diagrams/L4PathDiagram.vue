<script setup lang="ts">
// The L4 tier: a router spreads flows over balancers (ECMP); a balancer wraps each packet and sends it to
// a server; the server replies straight to the client (direct server return).
const lbs = [
  { y: 60, t: 'L4 balancer 1' },
  { y: 150, t: 'L4 balancer 2' },
  { y: 240, t: 'L4 balancer 3' },
]
const servers = [
  { y: 60, t: 'Server A' },
  { y: 150, t: 'Server B' },
  { y: 240, t: 'Server C' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 320" role="img" aria-label="A client's packets reach an edge router, which spreads flows across three L4 balancers. Balancer 2 wraps a packet and sends it to server A. Server A replies directly to the client, bypassing the balancers.">
      <defs>
        <marker id="l4path-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- return path (DSR) -->
      <path d="M555 60 L555 32 L60 32 L60 148" class="ln ln-dash" marker-end="url(#l4path-ah)" />
      <text x="310" y="22" text-anchor="middle" class="m">reply goes straight back to the client (direct server return)</text>

      <!-- client -->
      <rect x="10" y="150" width="100" height="60" rx="8" class="box-a" />
      <text x="60" y="176" text-anchor="middle" class="tb">Client</text>
      <text x="60" y="195" text-anchor="middle" class="m">to VIP :443</text>

      <!-- router -->
      <rect x="140" y="150" width="120" height="60" rx="8" class="box-b" />
      <text x="200" y="176" text-anchor="middle" class="tb">Edge router</text>
      <text x="200" y="195" text-anchor="middle" class="m">splits flows (ECMP)</text>
      <path d="M110 180 L138 180" class="ln" marker-end="url(#l4path-ah)" />

      <!-- balancers -->
      <template v-for="b in lbs" :key="b.t">
        <rect x="300" :y="b.y" width="130" height="60" rx="8" class="box-c" />
        <text x="365" :y="b.y + 26" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text x="365" :y="b.y + 45" text-anchor="middle" class="m">same lookup table</text>
        <path :d="`M260 180 L298 ${b.y + 30}`" class="ln" marker-end="url(#l4path-ah)" />
      </template>

      <!-- servers -->
      <template v-for="s in servers" :key="s.t">
        <rect x="480" :y="s.y" width="150" height="60" rx="8" class="box-d" />
        <text x="555" :y="s.y + 26" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text x="555" :y="s.y + 45" text-anchor="middle" class="m">VIP on loopback</text>
      </template>

      <!-- one flow: balancer 2 to server A -->
      <path d="M430 180 L478 92" class="ln" marker-end="url(#l4path-ah)" />
      <text x="455" y="150" text-anchor="middle" class="m">wrapped</text>

      <text x="365" y="316" text-anchor="middle" class="m">any balancer picks the same server for a flow</text>
    </svg>
    <figcaption>
      One flow through an L4 tier. The router spreads flows across balancers that all announce the same
      virtual IP (VIP). The balancer that gets a packet wraps it in a new IP header and sends it to a server.
      The server unwraps it and replies to the client directly, so replies never touch the balancers.
    </figcaption>
  </figure>
</template>
