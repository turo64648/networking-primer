<script setup lang="ts">
// TLS 1.2 vs TLS 1.3 full handshakes, after the TCP handshake. Time runs downward.
// Each panel has a client line and a server line; arrows slope down from sender to receiver.
type Msg = { y: number; toServer: boolean; label: string; label2?: string; req?: boolean }

const panels = [
  {
    x: 0,
    title: 'TLS 1.2: two round trips',
    foot: 'request leaves after 2 round trips',
    msgs: [
      { y: 100, toServer: true, label: 'ClientHello' },
      { y: 145, toServer: false, label: 'ServerHello, certificate,', label2: 'server key share' },
      { y: 190, toServer: true, label: 'client key share, Finished' },
      { y: 235, toServer: false, label: 'Finished' },
      { y: 280, toServer: true, label: 'HTTP request', req: true },
    ] as Msg[],
  },
  {
    x: 320,
    title: 'TLS 1.3: one round trip',
    foot: 'request leaves after 1 round trip',
    msgs: [
      { y: 100, toServer: true, label: 'ClientHello + key share' },
      { y: 145, toServer: false, label: 'ServerHello + key share,', label2: 'certificate, signature, Finished' },
      { y: 190, toServer: true, label: 'Finished + HTTP request', req: true },
    ] as Msg[],
  },
]

const step = 45
const cx = (p: { x: number }) => p.x + 50
const sx = (p: { x: number }) => p.x + 270
const angle = (Math.atan2(step, 220) * 180) / Math.PI

function arrow(p: { x: number }, m: Msg) {
  const a = m.toServer ? cx(p) + 2 : sx(p) - 2
  const b = m.toServer ? sx(p) - 4 : cx(p) + 4
  return `M${a} ${m.y} L${b} ${m.y + step}`
}
function labelTransform(p: { x: number }, m: Msg) {
  const mx = (cx(p) + sx(p)) / 2
  const my = m.y + step / 2
  return `rotate(${m.toServer ? angle : -angle} ${mx} ${my})`
}
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 380" role="img" aria-label="Side by side: in TLS 1.2 the client sends its HTTP request after two round trips of handshake messages. In TLS 1.3 the client sends its key share in the first message, the server replies with everything at once, and the client sends its request after one round trip.">
      <defs>
        <marker id="tlshs-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="p in panels" :key="p.title">
        <text :x="p.x + 160" y="22" text-anchor="middle" class="tb">{{ p.title }}</text>

        <rect :x="cx(p) - 40" y="36" width="80" height="28" rx="6" class="box-a" />
        <text :x="cx(p)" y="55" text-anchor="middle" class="t">Phone</text>
        <rect :x="sx(p) - 40" y="36" width="80" height="28" rx="6" class="box-d" />
        <text :x="sx(p)" y="55" text-anchor="middle" class="t">Server</text>

        <line :x1="cx(p)" y1="64" :x2="cx(p)" y2="340" class="ln" />
        <line :x1="sx(p)" y1="64" :x2="sx(p)" y2="340" class="ln" />

        <text :x="p.x + 160" y="86" text-anchor="middle" class="m">(TCP handshake first: 1 round trip)</text>

        <template v-for="m in p.msgs" :key="m.y">
          <path :d="arrow(p, m)" class="ln" marker-end="url(#tlshs-ah)" />
          <text
            :x="p.x + 160"
            :y="m.y + step / 2 - (m.label2 ? 18 : 6)"
            text-anchor="middle"
            :class="m.req ? 'tb' : 'm'"
            :transform="labelTransform(p, m)"
          >{{ m.label }}</text>
          <text
            v-if="m.label2"
            :x="p.x + 160"
            :y="m.y + step / 2 - 6"
            text-anchor="middle"
            class="m"
            :transform="labelTransform(p, m)"
          >{{ m.label2 }}</text>
        </template>

        <text :x="p.x + 160" y="365" text-anchor="middle" class="m">{{ p.foot }}</text>
      </template>
    </svg>
    <figcaption>
      A full handshake on a new connection, after the TCP handshake. In TLS 1.2 (left) the two sides need two
      round trips before the phone can send its request. In TLS 1.3 (right) the phone guesses the key exchange
      and sends its key share in the first message, so the server can reply with everything at once.
    </figcaption>
  </figure>
</template>
