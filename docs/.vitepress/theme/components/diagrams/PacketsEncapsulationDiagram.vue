<script setup lang="ts">
// Headers inside headers: a TCP segment inside an IP packet inside an Ethernet frame, and who reads each layer.
const parts = [
  { x: 20, w: 90, t: 'Link header', m: '14 bytes', cls: 'box-a' },
  { x: 110, w: 90, t: 'IP header', m: '20 B (IPv6: 40)', cls: 'box-b' },
  { x: 200, w: 90, t: 'TCP header', m: '20+ bytes', cls: 'box-c' },
  { x: 290, w: 270, t: 'Your data', m: 'up to ~1,460 bytes', cls: 'box' },
  { x: 560, w: 60, t: 'Check', m: '4 B', cls: 'box-a' },
]
const spans = [
  { x1: 200, x2: 560, y: 110, t: 'Segment (TCP): read only by the two ends' },
  { x1: 110, x2: 560, y: 160, t: 'Packet (IP): read by every router; TTL changes at each one' },
  { x1: 20, x2: 620, y: 210, t: 'Frame (Ethernet or Wi-Fi): thrown away and rebuilt at every router' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 250" role="img" aria-label="A frame contains a link header, an IP packet and a 4-byte check. The IP packet contains an IP header and a TCP segment. The segment contains a TCP header and the data.">
      <template v-for="p in parts" :key="p.t">
        <rect :x="p.x" y="20" :width="p.w" height="60" :class="p.cls" />
        <text :x="p.x + p.w / 2" y="46" text-anchor="middle" class="tb">{{ p.t }}</text>
        <text :x="p.x + p.w / 2" y="66" text-anchor="middle" class="m">{{ p.m }}</text>
      </template>
      <template v-for="s in spans" :key="s.y">
        <path :d="`M${s.x1 + 2} ${s.y - 14} L${s.x1 + 2} ${s.y - 6} L${s.x2 - 2} ${s.y - 6} L${s.x2 - 2} ${s.y - 14}`" class="ln" fill="none" />
        <text :x="(s.x1 + s.x2) / 2" :y="s.y + 12" text-anchor="middle" class="m">{{ s.t }}</text>
      </template>
    </svg>
    <figcaption>
      One frame on an Ethernet link, with typical IPv4 and TCP header sizes. Each layer wraps the one inside it.
      A 1,500-byte limit applies to the packet (everything from the IP header to the end of the data); the link
      header and check are not counted.
    </figcaption>
  </figure>
</template>
