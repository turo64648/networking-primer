<script setup lang="ts">
// Round trips before the first request: TCP + TLS 1.3 (left) vs QUIC (right).
// Each arrow is half a round trip. dir 1 = client to server, -1 = server to client.
const left = [
  { y: 70, dir: 1, t: 'SYN' },
  { y: 120, dir: -1, t: 'SYN-ACK' },
  { y: 170, dir: 1, t: 'ACK + ClientHello' },
  { y: 220, dir: -1, t: 'ServerHello … Finished' },
  { y: 270, dir: 1, t: 'Finished + request', key: true },
  { y: 320, dir: -1, t: 'response' },
]
const right = [
  { y: 70, dir: 1, t: 'ClientHello' },
  { y: 120, dir: -1, t: 'ServerHello … Finished' },
  { y: 170, dir: 1, t: 'Finished + request', key: true },
  { y: 220, dir: -1, t: 'response' },
]
function path(cx: number, sx: number, a: { y: number; dir: number }) {
  return a.dir === 1 ? `M${cx} ${a.y} L${sx - 2} ${a.y + 40}` : `M${sx} ${a.y} L${cx + 2} ${a.y + 40}`
}
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 420" role="img" aria-label="With TCP and TLS 1.3, the client sends its request after two round trips. With QUIC, the transport and encryption handshakes are combined, and the request leaves after one round trip.">
      <defs>
        <marker id="quichs-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- headings -->
      <text x="160" y="22" text-anchor="middle" class="h">TCP + TLS 1.3</text>
      <text x="480" y="22" text-anchor="middle" class="h">QUIC</text>
      <text x="45" y="50" text-anchor="middle" class="tb">Phone</text>
      <text x="275" y="50" text-anchor="middle" class="tb">Server</text>
      <text x="365" y="50" text-anchor="middle" class="tb">Phone</text>
      <text x="595" y="50" text-anchor="middle" class="tb">Server</text>

      <!-- time lines -->
      <path d="M45 58 L45 370" class="ln" />
      <path d="M275 58 L275 370" class="ln" />
      <path d="M365 58 L365 370" class="ln" />
      <path d="M595 58 L595 370" class="ln" />

      <template v-for="a in left" :key="'l' + a.y">
        <path :d="path(45, 275, a)" class="ln" marker-end="url(#quichs-ah)" />
        <text x="160" :y="a.y + 2" text-anchor="middle" :class="a.key ? 'tb' : 'm'">{{ a.t }}</text>
      </template>
      <template v-for="a in right" :key="'r' + a.y">
        <path :d="path(365, 595, a)" class="ln" marker-end="url(#quichs-ah)" />
        <text x="480" :y="a.y + 2" text-anchor="middle" :class="a.key ? 'tb' : 'm'">{{ a.t }}</text>
      </template>

      <!-- round-trip markers -->
      <text x="160" y="398" text-anchor="middle" class="m">request leaves after 2 round trips</text>
      <text x="480" y="290" text-anchor="middle" class="m">request leaves after 1 round trip</text>
      <text x="480" y="310" text-anchor="middle" class="m">(0 when resuming with 0-RTT)</text>
    </svg>
    <figcaption>
      A new connection. TCP needs its own handshake before TLS can start, so the request waits two round trips.
      QUIC carries the TLS messages in its first packets, so the request waits one. Each arrow is half a round trip.
    </figcaption>
  </figure>
</template>
