<script setup lang="ts">
// A path MTU black hole: the "too big" message is dropped by a firewall, so the sender never shrinks its packets.
const boxes = [
  { x: 10, t: 'Server', m: 'link limit 1,500', cls: 'box-a' },
  { x: 175, t: 'Firewall', m: 'drops all ICMP', cls: 'box-d' },
  { x: 340, t: 'Tunnel router', m: 'next link 1,420', cls: 'box-b' },
  { x: 505, t: 'Phone', m: 'waiting…', cls: 'box-a' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="Small packets pass from server to phone. A 1,500-byte packet is dropped at the tunnel router, which sends a too-big message back. The firewall drops that message, so the server keeps resending large packets.">
      <defs>
        <marker id="pktbh-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="b in boxes" :key="b.t">
        <rect :x="b.x" y="15" width="125" height="60" rx="8" :class="b.cls" />
        <text :x="b.x + 62" y="41" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text :x="b.x + 62" y="61" text-anchor="middle" class="m">{{ b.m }}</text>
        <path :d="`M${b.x + 62} 75 L${b.x + 62} 290`" class="ln" opacity="0.35" />
      </template>

      <!-- 1: handshake passes -->
      <text x="320" y="108" text-anchor="middle" class="m">1. Handshake: small packets pass both ways</text>
      <path d="M72 118 L565 118" class="ln" marker-start="url(#pktbh-ah)" marker-end="url(#pktbh-ah)" />

      <!-- 2: big packet dropped -->
      <text x="230" y="158" text-anchor="middle" class="m">2. 1,500-byte packet, “don’t fragment”</text>
      <path d="M72 168 L398 168" class="ln" marker-end="url(#pktbh-ah)" />
      <text x="412" y="174" text-anchor="middle" class="tb">✕</text>

      <!-- 3: ICMP dropped -->
      <text x="320" y="208" text-anchor="middle" class="m">3. “Too big, max 1,420” goes back…</text>
      <path d="M400 218 L244 218" class="ln" marker-end="url(#pktbh-ah)" />
      <text x="234" y="224" text-anchor="middle" class="tb">✕</text>

      <!-- 4: retries -->
      <text x="320" y="262" text-anchor="middle" class="m">4. The server never learns. It resends 1,500 bytes until</text>
      <text x="320" y="280" text-anchor="middle" class="m">the connection times out. Small replies still work.</text>
    </svg>
    <figcaption>
      A path MTU black hole. The connection opens, then hangs as soon as a full-size packet is needed, because the
      only message that could fix it is filtered on the way back. Sizes are examples.
    </figcaption>
  </figure>
</template>
