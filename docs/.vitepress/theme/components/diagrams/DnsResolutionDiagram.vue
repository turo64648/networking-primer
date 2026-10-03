<script setup lang="ts">
// A cold lookup: the phone asks a recursive resolver, which asks root, .com and example.com's servers.
const servers = [
  { y: 30, t: 'Root servers', m: 'points to .com servers', step: '2' },
  { y: 160, t: '.com servers', m: 'points to example.com', step: '3' },
  { y: 290, t: 'example.com servers', m: '“192.0.2.10, keep 300 s”', step: '4' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 390" role="img" aria-label="The phone asks a recursive resolver. On a cache miss, the resolver asks the root servers, then the .com servers, then example.com's own servers, and returns the address to the phone.">
      <defs>
        <marker id="dnsres-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- phone -->
      <rect x="10" y="158" width="150" height="88" rx="8" class="box-a" />
      <text x="85" y="184" text-anchor="middle" class="tb">Your phone</text>
      <text x="85" y="204" text-anchor="middle" class="m">app → stub resolver</text>
      <text x="85" y="222" text-anchor="middle" class="m">small local caches</text>

      <!-- recursive resolver -->
      <rect x="215" y="158" width="170" height="88" rx="8" class="box-b" />
      <text x="300" y="184" text-anchor="middle" class="tb">Recursive resolver</text>
      <text x="300" y="204" text-anchor="middle" class="m">run by ISP or public</text>
      <text x="300" y="222" text-anchor="middle" class="m">large shared cache</text>
      <text x="300" y="272" text-anchor="middle" class="m">steps 2–4 happen</text>
      <text x="300" y="290" text-anchor="middle" class="m">only on a cache miss</text>

      <!-- phone <-> resolver -->
      <path d="M160 190 L213 190" class="ln" marker-end="url(#dnsres-ah)" />
      <text x="187" y="182" text-anchor="middle" class="m">1</text>
      <path d="M215 214 L162 214" class="ln" marker-end="url(#dnsres-ah)" />
      <text x="187" y="232" text-anchor="middle" class="m">5</text>

      <!-- servers -->
      <template v-for="s in servers" :key="s.step">
        <rect x="455" :y="s.y" width="180" height="70" rx="8" class="box-d" />
        <text x="545" :y="s.y + 29" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text x="545" :y="s.y + 50" text-anchor="middle" class="m">{{ s.m }}</text>
        <path :d="`M387 202 L453 ${s.y + 35}`" class="ln" marker-start="url(#dnsres-ah)" marker-end="url(#dnsres-ah)" />
        <text :x="420" :y="(202 + s.y + 35) / 2 - 6" text-anchor="middle" class="m">{{ s.step }}</text>
      </template>
    </svg>
    <figcaption>
      A lookup for <code>www.example.com</code> when nothing is cached. (1) The phone asks one recursive resolver.
      (2–4) The resolver asks three levels of servers, each pointing it closer to the answer. (5) It returns the
      address to the phone and keeps a copy. Addresses here are examples.
    </figcaption>
  </figure>
</template>
