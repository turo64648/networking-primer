<script setup lang="ts">
// Two-hop privacy relay: who sees the user's address and who sees the destination.
const nodes = [
  { x: 10, cls: 'box-a', t: 'Your phone', m1: 'knows everything', m2: '' },
  { x: 172, cls: 'box-b', t: 'Ingress relay', m1: 'sees: your address', m2: 'not: the site' },
  { x: 334, cls: 'box-c', t: 'Egress relay', m1: 'sees: the site', m2: 'not: your address' },
  { x: 496, cls: 'box-d', t: 'Website', m1: 'sees: egress address', m2: 'content via TLS' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 250" role="img" aria-label="A phone connects to an ingress relay, which forwards an encrypted tunnel to an egress relay, which connects to the website. The ingress sees the user's address but not the site; the egress sees the site but not the user's address; TLS to the website runs end to end.">
      <defs>
        <marker id="relay2-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="n in nodes" :key="n.t">
        <rect :x="n.x" y="60" width="134" height="86" rx="8" :class="n.cls" />
        <text :x="n.x + 67" y="88" text-anchor="middle" class="tb">{{ n.t }}</text>
        <text :x="n.x + 67" y="110" text-anchor="middle" class="m">{{ n.m1 }}</text>
        <text :x="n.x + 67" y="128" text-anchor="middle" class="m">{{ n.m2 }}</text>
      </template>

      <path d="M144 103 L170 103" class="ln" marker-end="url(#relay2-ah)" />
      <path d="M306 103 L332 103" class="ln" marker-end="url(#relay2-ah)" />
      <path d="M468 103 L494 103" class="ln" marker-end="url(#relay2-ah)" />

      <!-- layers -->
      <path d="M77 170 L77 182 L401 182 L401 170" class="ln" />
      <text x="239" y="200" text-anchor="middle" class="m">inner tunnel to egress: ingress cannot read it</text>
      <path d="M77 214 L77 226 L563 226 L563 214" class="ln" />
      <text x="320" y="244" text-anchor="middle" class="m">TLS to the website, end to end: no relay reads page content</text>

      <text x="239" y="36" text-anchor="middle" class="m">operator A</text>
      <text x="401" y="36" text-anchor="middle" class="m">operator B</text>
      <path d="M320 20 L320 50" class="ln" />
    </svg>
    <figcaption>
      A two-hop relay. The ingress (run by one company) sees who you are but not where you go. The egress (run by
      another) sees where you go but only the ingress's address. The website sees the egress address. Linking
      user and site needs both operators' records.
    </figcaption>
  </figure>
</template>
