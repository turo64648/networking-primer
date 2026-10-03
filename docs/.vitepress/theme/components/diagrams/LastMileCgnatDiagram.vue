<script setup lang="ts">
// Carrier-grade NAT: several subscribers share one public IPv4 address, each with its own block of ports.
const subs = [
  { y: 30, name: 'Phone A', addr: '100.64.0.11', ports: 'ports 1024–2047' },
  { y: 120, name: 'Phone B', addr: '100.64.0.12', ports: 'ports 2048–3071' },
  { y: 210, name: 'Phone C', addr: '100.64.0.13', ports: 'ports 3072–4095' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="Three phones with private addresses send traffic through the carrier's NAT. It rewrites them all to one public address, giving each phone its own range of ports. The website sees one address for all three.">
      <defs>
        <marker id="lmcg-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="s in subs" :key="s.name">
        <rect x="10" :y="s.y" width="150" height="66" rx="8" class="box-a" />
        <text x="85" :y="s.y + 26" text-anchor="middle" class="tb">{{ s.name }}</text>
        <text x="85" :y="s.y + 47" text-anchor="middle" class="m">{{ s.addr }}</text>
        <path :d="`M160 ${s.y + 33} L248 153`" class="ln" marker-end="url(#lmcg-ah)" />
      </template>

      <!-- CGNAT -->
      <rect x="250" y="80" width="190" height="150" rx="8" class="box-b" />
      <text x="345" y="106" text-anchor="middle" class="tb">Carrier-grade NAT</text>
      <text x="345" y="126" text-anchor="middle" class="m">one public address,</text>
      <text x="345" y="144" text-anchor="middle" class="m">a port block per phone:</text>
      <template v-for="(s, i) in subs" :key="'p' + s.name">
        <text x="345" :y="170 + i * 20" text-anchor="middle" class="m">{{ s.name.slice(-1) }}: {{ s.ports }}</text>
      </template>

      <!-- server -->
      <rect x="490" y="110" width="140" height="86" rx="8" class="box-d" />
      <text x="560" y="138" text-anchor="middle" class="tb">Website</text>
      <text x="560" y="158" text-anchor="middle" class="m">sees 203.0.113.7</text>
      <text x="560" y="176" text-anchor="middle" class="m">for all three</text>
      <path d="M440 153 L488 153" class="ln" marker-end="url(#lmcg-ah)" />

      <text x="320" y="300" text-anchor="middle" class="m">Blocking or rate-limiting 203.0.113.7 hits every phone behind it.</text>
      <text x="320" y="318" text-anchor="middle" class="m">To identify one phone, the carrier needs the address, port and time.</text>
    </svg>
    <figcaption>
      Carrier-grade NAT. Each phone gets a private address the internet cannot reach. The carrier's NAT shares
      one public address among them and hands each a block of ports. Real deployments put hundreds or more
      subscribers on one address; addresses here are examples.
    </figcaption>
  </figure>
</template>
