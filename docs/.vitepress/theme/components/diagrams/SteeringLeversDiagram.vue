<script setup lang="ts">
// The three places where a user's choice of site can be made: in the app, in DNS, and in BGP (anycast).
const pops = [
  { y: 30, t: 'Site: Frankfurt' },
  { y: 125, t: 'Site: London' },
  { y: 220, t: 'Site: Madrid' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="Three control points. The app on the phone can choose a site from a list. Authoritative DNS can choose which address to return. With anycast, BGP routing chooses which site receives packets for one shared address.">
      <defs>
        <marker id="steerlev-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- phone -->
      <rect x="10" y="110" width="130" height="90" rx="8" class="box-a" />
      <text x="75" y="138" text-anchor="middle" class="tb">Your phone</text>
      <text x="75" y="160" text-anchor="middle" class="m">1. the app can</text>
      <text x="75" y="178" text-anchor="middle" class="m">pick from a list</text>

      <!-- DNS -->
      <rect x="185" y="20" width="185" height="80" rx="8" class="box-b" />
      <text x="277" y="46" text-anchor="middle" class="tb">Authoritative DNS</text>
      <text x="277" y="68" text-anchor="middle" class="m">2. picks which address</text>
      <text x="277" y="86" text-anchor="middle" class="m">to return</text>

      <!-- internet -->
      <rect x="185" y="170" width="185" height="90" rx="8" class="box-c" />
      <text x="277" y="196" text-anchor="middle" class="tb">The internet (BGP)</text>
      <text x="277" y="218" text-anchor="middle" class="m">3. with anycast, picks</text>
      <text x="277" y="236" text-anchor="middle" class="m">the site for one address</text>

      <!-- phone to DNS and to internet -->
      <path d="M140 135 L183 80" class="ln" marker-end="url(#steerlev-ah)" />
      <text x="150" y="98" text-anchor="middle" class="m">look up</text>
      <path d="M140 185 L183 205" class="ln" marker-end="url(#steerlev-ah)" />
      <text x="158" y="216" text-anchor="middle" class="m">connect</text>

      <!-- sites -->
      <template v-for="p in pops" :key="p.t">
        <rect x="440" :y="p.y" width="190" height="56" rx="8" class="box-d" />
        <text x="535" :y="p.y + 33" text-anchor="middle" class="tb">{{ p.t }}</text>
        <path :d="`M372 215 L438 ${p.y + 28}`" class="ln" marker-end="url(#steerlev-ah)" />
      </template>
    </svg>
    <figcaption>
      Where the choice of site can be made. (1) An app you control can choose from a list of sites. (2) DNS
      can return a different address to different resolvers. (3) With anycast, every site shares one address,
      and internet routing decides which site each network reaches. Large systems combine all three.
    </figcaption>
  </figure>
</template>
