<script setup lang="ts">
// A cold HTTPS request over TCP + TLS 1.3: three round trips before the first byte of the response.
const PHONE = 230
const SERVER = 470
const fromPhone = [
  { y: 70, label: 'SYN: “let’s talk”' },
  { y: 170, label: 'ACK + TLS hello' },
  { y: 270, label: 'TLS done + HTTP GET' },
]
const fromServer = [
  { y: 120, label: 'SYN-ACK' },
  { y: 220, label: 'TLS hello + certificate' },
  { y: 320, label: 'HTTP response' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 400" role="img" aria-label="Timeline between a phone and a server. The TCP handshake takes one round trip, the TLS 1.3 handshake a second, and the HTTP request and response a third, so the first byte of the page arrives after three round trips.">
      <defs>
        <marker id="tcphs-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <text :x="PHONE" y="36" text-anchor="middle" class="tb">Phone</text>
      <text :x="SERVER" y="36" text-anchor="middle" class="tb">Server</text>
      <path :d="`M${PHONE} 50 L${PHONE} 385`" class="ln" />
      <path :d="`M${SERVER} 50 L${SERVER} 385`" class="ln" />

      <template v-for="m in fromPhone" :key="m.y">
        <path :d="`M${PHONE} ${m.y} L${SERVER - 2} ${m.y + 50}`" class="ln" marker-end="url(#tcphs-ah)" />
        <text :x="PHONE - 10" :y="m.y + 4" text-anchor="end" class="m">{{ m.label }}</text>
      </template>
      <template v-for="m in fromServer" :key="m.y">
        <path :d="`M${SERVER} ${m.y} L${PHONE + 2} ${m.y + 50}`" class="ln" marker-end="url(#tcphs-ah)" />
        <text :x="SERVER + 10" :y="m.y + 4" class="m">{{ m.label }}</text>
      </template>

      <text x="350" y="174" text-anchor="middle" class="t">1 round trip</text>
      <text x="350" y="274" text-anchor="middle" class="t">2 round trips</text>
      <text :x="PHONE - 10" y="374" text-anchor="end" class="tb">3 round trips:</text>
      <text :x="PHONE - 10" y="392" text-anchor="end" class="m">first byte of the page</text>
    </svg>
    <figcaption>
      A cold HTTPS request over TCP. The TCP handshake costs one round trip, the TLS 1.3 handshake a second,
      and the request and response a third. At 70 ms per round trip, the page starts arriving after about
      210 ms, before any server time.
    </figcaption>
  </figure>
</template>
