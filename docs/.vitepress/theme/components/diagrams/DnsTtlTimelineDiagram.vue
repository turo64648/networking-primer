<script setup lang="ts">
// How long each layer keeps handing out the old address after a DNS change.
const X0 = 150
const X1 = 630
const CHANGE = 240
const TTL_END = 470
const rows = [
  { t: 'Authoritative', m: 'source of truth', oldEnd: CHANGE, note: '' },
  { t: 'Resolver', m: 'obeys the TTL', oldEnd: TTL_END, note: '' },
  { t: 'Resolver', m: 'stretches the TTL', oldEnd: 570, note: '' },
  { t: 'Client app', m: 'reuses a connection', oldEnd: X1, note: 'old IP until it reconnects' },
]
const y = (i: number) => 62 + i * 56
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 290" role="img" aria-label="Timeline: the authoritative server switches to the new address at the change. A resolver that obeys the TTL switches one TTL later. A resolver that stretches the TTL switches later still. An app with an open connection keeps using the old address until it reconnects.">
      <line :x1="CHANGE" y1="44" :x2="CHANGE" y2="282" class="ln-dash" />
      <line :x1="TTL_END" y1="44" :x2="TTL_END" y2="282" class="ln-dash" />
      <text :x="CHANGE" y="34" text-anchor="middle" class="m">record changed</text>
      <text :x="TTL_END" y="34" text-anchor="middle" class="m">one TTL later</text>

      <template v-for="(r, i) in rows" :key="i">
        <text x="10" :y="y(i) + 15" class="tb">{{ r.t }}</text>
        <text x="10" :y="y(i) + 33" class="m">{{ r.m }}</text>
        <rect :x="X0" :y="y(i)" :width="r.oldEnd - X0" height="36" rx="6" class="box-c" />
        <text :x="(X0 + r.oldEnd) / 2" :y="y(i) + 23" text-anchor="middle" class="m">{{ r.note || 'old IP' }}</text>
        <template v-if="r.oldEnd < X1">
          <rect :x="r.oldEnd" :y="y(i)" :width="X1 - r.oldEnd" height="36" rx="6" class="box-a" />
          <text :x="(r.oldEnd + X1) / 2" :y="y(i) + 23" text-anchor="middle" class="m">new IP</text>
        </template>
      </template>
    </svg>
    <figcaption>
      Changing a record does not change what clients use. Each layer keeps its copy until its own timer runs out,
      and the timer started when that layer fetched the answer. Resolvers that stretch the TTL, and apps that keep
      connections open, hold on to the old address much longer.
    </figcaption>
  </figure>
</template>
