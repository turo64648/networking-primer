<script setup lang="ts">
// The whole path of one request, from phone to first app server, coloured by who runs each hop.
const top = [
  { x: 10, t: 'Your phone', m: 'app, OS, radio', ch: 'ch 8', c: 'box-a' },
  { x: 136, t: 'Wi-Fi / cell', m: 'first radio hop', ch: 'ch 8', c: 'box-a' },
  { x: 262, t: 'NAT', m: 'shared address', ch: 'ch 8', c: 'box-b' },
  { x: 388, t: 'Your ISP', m: 'access network', ch: 'ch 9', c: 'box-b' },
  { x: 514, t: 'Internet', m: 'routes via BGP', ch: 'ch 9', c: 'box-c' },
]
const bottom = [
  { x: 262, t: 'Backbone', m: 'private WAN', ch: 'ch 14' },
  { x: 136, t: 'Datacenter', m: 'switch fabric', ch: 'ch 15' },
  { x: 10, t: 'App server', m: 'first service', ch: 'ch 16' },
]
const edge = [
  { y: 232, t: '1  L4 load balancer · ch 11' },
  { y: 272, t: '2  TLS + HTTP proxy · ch 5, 12' },
  { y: 312, t: '3  CDN cache · ch 13' },
]
const legend = [
  { x: 10, c: 'box-a', t: 'You' },
  { x: 90, c: 'box-b', t: 'Your ISP or carrier' },
  { x: 250, c: 'box-c', t: 'Other networks' },
  { x: 380, c: 'box-d', t: 'The website or its CDN' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 410" role="img" aria-label="One request's path. Top row, left to right: your phone, the Wi-Fi or cell radio hop, NAT, your ISP, and the internet between networks. Then down to the website's edge site near you, which has an L4 load balancer, a TLS and HTTP proxy, and a CDN cache. Bottom row, right to left: the website's backbone, its datacenter, and the first app server. A DNS lookup happens first.">
      <defs>
        <marker id="mappath-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- top row: the user's side and the internet -->
      <template v-for="(b, i) in top" :key="b.t">
        <rect :x="b.x" y="40" width="116" height="80" rx="8" :class="b.c" />
        <text :x="b.x + 58" y="66" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text :x="b.x + 58" y="86" text-anchor="middle" class="m">{{ b.m }}</text>
        <text :x="b.x + 58" y="105" text-anchor="middle" class="m">{{ b.ch }}</text>
        <path v-if="i < top.length - 1" :d="`M${b.x + 116} 80 L${b.x + 125} 80`" class="ln" marker-end="url(#mappath-ah)" />
      </template>
      <text x="10" y="24" class="m">Left to right, then down and back along the bottom row.</text>

      <!-- DNS first -->
      <path d="M68 120 L68 138" class="ln" marker-start="url(#mappath-ah)" marker-end="url(#mappath-ah)" />
      <rect x="10" y="140" width="242" height="36" rx="8" class="box" />
      <text x="131" y="163" text-anchor="middle" class="m">First: DNS lookup to a resolver · ch 4</text>

      <!-- down into the edge -->
      <path d="M572 120 L572 194" class="ln" marker-end="url(#mappath-ah)" />

      <!-- edge PoP -->
      <rect x="388" y="196" width="242" height="158" rx="8" class="box-d" />
      <text x="509" y="220" text-anchor="middle" class="tb">Edge site near you · ch 10</text>
      <template v-for="e in edge" :key="e.y">
        <rect x="400" :y="e.y" width="218" height="34" rx="6" class="box" />
        <text x="412" :y="e.y + 22" class="m">{{ e.t }}</text>
      </template>
      <path d="M400 329 L380 329" class="ln" marker-end="url(#mappath-ah)" />

      <!-- bottom row: behind the edge -->
      <template v-for="(b, i) in bottom" :key="b.t">
        <rect :x="b.x" y="290" width="116" height="70" rx="8" class="box-d" />
        <text :x="b.x + 58" y="314" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text :x="b.x + 58" y="333" text-anchor="middle" class="m">{{ b.m }}</text>
        <text :x="b.x + 58" y="350" text-anchor="middle" class="m">{{ b.ch }}</text>
        <path v-if="i > 0" :d="`M${b.x + 126} 325 L${b.x + 118} 325`" class="ln" marker-end="url(#mappath-ah)" />
      </template>
      <text x="320" y="282" text-anchor="middle" class="m">only on a cache miss</text>

      <!-- legend: who runs each hop -->
      <template v-for="l in legend" :key="l.t">
        <rect :x="l.x" y="382" width="14" height="14" rx="3" :class="l.c" />
        <text :x="l.x + 20" y="394" class="m">{{ l.t }}</text>
      </template>
    </svg>
    <figcaption>
      One request from a phone to the first app server, coloured by who runs each hop. The edge site handles
      steps 1–3 in order; if the CDN cache has the answer, the request goes no further. The chapter numbers show
      where each hop is explained.
    </figcaption>
  </figure>
</template>
