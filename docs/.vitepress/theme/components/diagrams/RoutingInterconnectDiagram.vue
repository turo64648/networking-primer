<script setup lang="ts">
// How a website's network connects: paid transit, peering at an exchange, and a private link.
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 390" role="img" aria-label="A phone's mobile ISP and a website's network each buy transit from large providers. They also meet at an internet exchange to peer for free, and they have a direct private link. The website prefers the private link, then the exchange, then transit.">
      <!-- transit providers -->
      <rect x="40" y="20" width="210" height="64" rx="8" class="box-d" />
      <text x="145" y="46" text-anchor="middle" class="tb">Transit provider A</text>
      <text x="145" y="66" text-anchor="middle" class="m">sells a route to everywhere</text>
      <rect x="390" y="20" width="210" height="64" rx="8" class="box-d" />
      <text x="495" y="46" text-anchor="middle" class="tb">Transit provider B</text>
      <text x="495" y="66" text-anchor="middle" class="m">sells a route to everywhere</text>
      <path d="M250 52 L390 52" class="ln" />
      <text x="320" y="44" text-anchor="middle" class="m">peer with each other</text>

      <!-- exchange -->
      <rect x="225" y="150" width="190" height="70" rx="8" class="box-c" />
      <text x="320" y="178" text-anchor="middle" class="tb">Internet exchange</text>
      <text x="320" y="198" text-anchor="middle" class="m">one shared switch,</text>
      <text x="320" y="213" text-anchor="middle" class="m">hundreds of networks</text>

      <!-- ISP and website -->
      <rect x="15" y="280" width="200" height="80" rx="8" class="box-a" />
      <text x="115" y="308" text-anchor="middle" class="tb">Phone's mobile ISP</text>
      <text x="115" y="328" text-anchor="middle" class="m">its own network (AS)</text>
      <rect x="425" y="280" width="200" height="80" rx="8" class="box-b" />
      <text x="525" y="308" text-anchor="middle" class="tb">Website's network</text>
      <text x="525" y="328" text-anchor="middle" class="m">PoP with its own AS</text>

      <!-- transit links -->
      <path d="M115 280 L145 84" class="ln" />
      <text x="88" y="190" text-anchor="middle" class="m">ISP pays</text>
      <path d="M525 280 L495 84" class="ln" />
      <text x="555" y="190" text-anchor="middle" class="m">site pays</text>

      <!-- peering at the exchange -->
      <path d="M215 300 L262 220" class="ln" />
      <path d="M425 300 L378 220" class="ln" />
      <text x="320" y="245" text-anchor="middle" class="m">peering: no payment</text>

      <!-- private link -->
      <path d="M215 345 L425 345" class="ln" stroke-dasharray="6 4" />
      <text x="320" y="337" text-anchor="middle" class="m">private link (PNI)</text>
      <text x="320" y="375" text-anchor="middle" class="m">dedicated capacity</text>
    </svg>
    <figcaption>
      Three ways the same two networks can exchange traffic. A large website usually prefers the private link,
      then peering at the exchange, and uses paid transit for everything else and as a fallback. Every
      network on the internet connects in some mix of these ways.
    </figcaption>
  </figure>
</template>
