<script setup lang="ts">
// Chain of trust: root signs intermediate, intermediate signs the site's certificate.
// The root is already on the phone; the server sends the other two.
const certs = [
  { y: 20, cls: 'box-a', t: 'Root CA certificate', m: 'self-signed, lives for decades' },
  { y: 110, cls: 'box-b', t: 'Intermediate CA certificate', m: 'signed by the root' },
  { y: 200, cls: 'box-d', t: 'Site certificate: www.example.com', m: 'signed by the intermediate, lives weeks to months' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 280" role="img" aria-label="Three certificates in a chain. The root CA certificate, already stored on the phone, signs the intermediate CA certificate, which signs the site's certificate. The server sends the site certificate and the intermediate during the handshake.">
      <defs>
        <marker id="tlschain-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="c in certs" :key="c.y">
        <rect x="20" :y="c.y" width="360" height="60" rx="8" :class="c.cls" />
        <text x="200" :y="c.y + 25" text-anchor="middle" class="tb">{{ c.t }}</text>
        <text x="200" :y="c.y + 45" text-anchor="middle" class="m">{{ c.m }}</text>
      </template>

      <path d="M200 80 L200 108" class="ln" marker-end="url(#tlschain-ah)" />
      <text x="212" y="99" class="m">signs</text>
      <path d="M200 170 L200 198" class="ln" marker-end="url(#tlschain-ah)" />
      <text x="212" y="189" class="m">signs</text>

      <!-- right-hand brackets -->
      <path d="M395 24 L405 24 L405 76 L395 76" class="ln" />
      <text x="418" y="46" class="t">Already on the phone</text>
      <text x="418" y="64" class="m">in the OS or browser trust store</text>

      <path d="M395 114 L405 114 L405 256 L395 256" class="ln" />
      <text x="418" y="176" class="t">Sent by the server</text>
      <text x="418" y="194" class="m">during the handshake</text>
    </svg>
    <figcaption>
      A certificate chain. The phone trusts a small set of root certificates in advance. The server sends its
      own certificate and the intermediate. The phone checks each signature up the chain until it reaches a root
      it already trusts. If the server forgets the intermediate, the chain has a gap.
    </figcaption>
  </figure>
</template>
