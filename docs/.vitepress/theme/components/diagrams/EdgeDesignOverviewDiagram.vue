<script setup lang="ts">
// The global edge on one page: steering, the layers inside a PoP, the backbone to the origin, and the control plane.
const tiers = [
  { y: 125, t: 'Edge routers', m: 'BGP, ECMP' },
  { y: 185, t: 'L4 balancers', m: 'consistent hash, DSR' },
  { y: 245, t: 'L7 proxies + cache', m: 'TLS, HTTP, WAF, limits' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 400" role="img" aria-label="Users are steered by DNS, anycast or the app to a PoP. Inside the PoP, routers feed L4 balancers, which feed L7 proxies with caches. Misses cross a private backbone to a regional cache and then the origin region. A control plane feeds configuration to the PoP and the regional cache.">
      <defs>
        <marker id="edgedesign-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- steering -->
      <rect x="10" y="20" width="400" height="44" rx="8" class="box-b" />
      <text x="210" y="47" text-anchor="middle" class="tb">Steering: DNS, anycast or the app picks a PoP</text>
      <path d="M62 64 L62 118" class="ln" stroke-dasharray="4 4" marker-end="url(#edgedesign-ah)" />

      <!-- users -->
      <rect x="10" y="120" width="105" height="90" rx="8" class="box-a" />
      <text x="62" y="148" text-anchor="middle" class="tb">Users</text>
      <text x="62" y="168" text-anchor="middle" class="m">phones,</text>
      <text x="62" y="186" text-anchor="middle" class="m">browsers, APIs</text>
      <path d="M115 147 L188 147" class="ln" marker-end="url(#edgedesign-ah)" />

      <!-- PoP -->
      <rect x="170" y="90" width="240" height="230" rx="10" class="box" />
      <text x="290" y="112" text-anchor="middle" class="tb">PoP (tens to hundreds)</text>
      <template v-for="(s, i) in tiers" :key="s.t">
        <rect x="190" :y="s.y" width="200" height="44" rx="6" class="box-c" />
        <text x="290" :y="s.y + 19" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text x="290" :y="s.y + 36" text-anchor="middle" class="m">{{ s.m }}</text>
        <path v-if="i < 2" :d="`M290 ${s.y + 44} L290 ${s.y + 58}`" class="ln" marker-end="url(#edgedesign-ah)" />
      </template>

      <!-- backbone -->
      <path d="M390 267 L468 267" class="ln" marker-end="url(#edgedesign-ah)" />
      <text x="430" y="259" text-anchor="middle" class="m">backbone</text>

      <!-- regional cache and origin -->
      <rect x="470" y="245" width="160" height="44" rx="6" class="box-d" />
      <text x="550" y="264" text-anchor="middle" class="tb">Regional cache</text>
      <text x="550" y="281" text-anchor="middle" class="m">origin shield</text>
      <path d="M550 245 L550 212" class="ln" marker-end="url(#edgedesign-ah)" />
      <rect x="470" y="110" width="160" height="100" rx="8" class="box-d" />
      <text x="550" y="138" text-anchor="middle" class="tb">Origin region</text>
      <text x="550" y="160" text-anchor="middle" class="m">app servers</text>
      <text x="550" y="178" text-anchor="middle" class="m">two or more regions</text>

      <!-- control plane -->
      <rect x="10" y="340" width="620" height="44" rx="8" class="box-b" />
      <text x="320" y="367" text-anchor="middle" class="tb">Control plane: steering map, configs, certificates, health checks</text>
      <path d="M290 338 L290 322" class="ln" stroke-dasharray="4 4" marker-end="url(#edgedesign-ah)" />
      <path d="M550 338 L550 291" class="ln" stroke-dasharray="4 4" marker-end="url(#edgedesign-ah)" />
    </svg>
    <figcaption>
      The design on one page. Steering sends each user to a nearby PoP. Inside it, routers spread packets across L4
      balancers, which pick an L7 proxy; the proxy terminates TLS, applies security rules and serves from cache.
      Misses travel over warm connections on the backbone to a regional cache, then to the origin. Dashed lines: the
      control plane pushes configuration and the steering map; the data path must keep working if it fails.
    </figcaption>
  </figure>
</template>
