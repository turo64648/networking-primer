<script setup lang="ts">
// The whole path in one picture: top row from phone to edge, bottom row from backbone to app server.
const top = [
  { x: 10, cls: 'box-a', t: 'Your phone', m1: 'app, OS, caches', m2: 'radio wakes' },
  { x: 170, cls: 'box-b', t: 'Mobile network', m1: 'radio, gateway', m2: 'carrier NAT' },
  { x: 330, cls: 'box-b', t: 'Internet', m1: 'BGP between networks', m2: 'anycast to a PoP' },
  { x: 490, cls: 'box-c', t: 'Edge PoP', m1: 'L4 balancer, TLS,', m2: 'L7 proxy, cache' },
]
const bottom = [
  { x: 490, cls: 'box-b', t: 'Backbone', m1: 'warm connections', m2: 'to an origin region' },
  { x: 330, cls: 'box-c', t: 'Origin region', m1: 'L4 balancer,', m2: 'L7 proxy' },
  { x: 170, cls: 'box-c', t: 'Reaching the service', m1: 'fabric, discovery,', m2: 'sidecar or VIP' },
  { x: 10, cls: 'box-d', t: 'App server', m1: 'kernel accepts,', m2: 'app responds' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="The path of one request. Top row: phone, mobile network, internet, edge PoP. The phone also asks a recursive resolver. Bottom row, right to left: backbone, origin region, reaching the service, app server.">
      <defs>
        <marker id="cappath-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="b in top" :key="b.t">
        <rect :x="b.x" y="20" width="140" height="80" rx="8" :class="b.cls" />
        <text :x="b.x + 70" y="46" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text :x="b.x + 70" y="66" text-anchor="middle" class="m">{{ b.m1 }}</text>
        <text :x="b.x + 70" y="84" text-anchor="middle" class="m">{{ b.m2 }}</text>
      </template>
      <path d="M150 60 L168 60" class="ln" marker-end="url(#cappath-ah)" />
      <path d="M310 60 L328 60" class="ln" marker-end="url(#cappath-ah)" />
      <path d="M470 60 L488 60" class="ln" marker-end="url(#cappath-ah)" />

      <!-- resolver -->
      <rect x="10" y="135" width="140" height="56" rx="8" class="box" />
      <text x="80" y="159" text-anchor="middle" class="tb">Recursive resolver</text>
      <text x="80" y="178" text-anchor="middle" class="m">DNS: name → PoP</text>
      <path d="M80 100 L80 133" class="ln" marker-start="url(#cappath-ah)" marker-end="url(#cappath-ah)" />

      <!-- PoP down to backbone -->
      <path d="M560 100 L560 218" class="ln" marker-end="url(#cappath-ah)" />
      <text x="572" y="155" class="m">on a miss</text>
      <text x="572" y="172" class="m">or dynamic</text>

      <template v-for="b in bottom" :key="b.t">
        <rect :x="b.x" y="220" width="140" height="80" rx="8" :class="b.cls" />
        <text :x="b.x + 70" y="246" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text :x="b.x + 70" y="266" text-anchor="middle" class="m">{{ b.m1 }}</text>
        <text :x="b.x + 70" y="284" text-anchor="middle" class="m">{{ b.m2 }}</text>
      </template>
      <path d="M490 260 L472 260" class="ln" marker-end="url(#cappath-ah)" />
      <path d="M330 260 L312 260" class="ln" marker-end="url(#cappath-ah)" />
      <path d="M170 260 L152 260" class="ln" marker-end="url(#cappath-ah)" />
    </svg>
    <figcaption>
      The path every walkthrough follows. A cold request crosses every box, including the resolver. A warm
      request skips the resolver and the handshakes. A cache hit stops at the edge PoP. A region failure
      changes which origin region the backbone leads to, and a deploy replaces servers in the bottom row.
    </figcaption>
  </figure>
</template>
