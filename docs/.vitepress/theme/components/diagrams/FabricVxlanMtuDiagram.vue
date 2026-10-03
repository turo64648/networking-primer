<script setup lang="ts">
// VXLAN encapsulation: four outer headers (50 bytes over IPv4) wrapped around the VM's original frame.
const outer = [
  { x: 10, w: 82, t: 'Outer Ethernet', b: '14 B' },
  { x: 96, w: 82, t: 'Outer IP', b: '20 B' },
  { x: 182, w: 62, t: 'UDP', b: '8 B' },
  { x: 248, w: 72, t: 'VXLAN', b: '8 B, net ID' },
]
const inner = [
  { x: 330, w: 82, t: 'Inner Ethernet', b: '14 B' },
  { x: 416, w: 214, t: 'VM’s IP packet', b: 'up to 1,500 B' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 250" role="img" aria-label="A VXLAN packet: outer Ethernet 14 bytes, outer IP 20 bytes, UDP 8 bytes and VXLAN 8 bytes, 50 bytes in total, wrapped around the VM's original Ethernet frame and IP packet of up to 1,500 bytes. The underlay must carry 1,550-byte IP packets.">
      <!-- braces -->
      <path d="M10 52 L10 42 L320 42 L320 52" class="ln" style="fill: none" />
      <text x="165" y="32" text-anchor="middle" class="tb">Added by the tunnel endpoint: 50 bytes</text>
      <path d="M330 52 L330 42 L630 42 L630 52" class="ln" style="fill: none" />
      <text x="480" y="32" text-anchor="middle" class="tb">Original frame from the VM</text>

      <rect v-for="h in outer" :key="h.t" :x="h.x" y="60" :width="h.w" height="64" rx="6" class="box-d" />
      <rect v-for="h in inner" :key="h.t" :x="h.x" y="60" :width="h.w" height="64" rx="6" class="box-a" />
      <template v-for="h in [...outer, ...inner]" :key="'t' + h.t">
        <text :x="h.x + h.w / 2" y="88" text-anchor="middle" class="m">{{ h.t }}</text>
        <text :x="h.x + h.w / 2" y="108" text-anchor="middle" class="m">{{ h.b }}</text>
      </template>

      <!-- what the underlay must carry -->
      <path d="M96 136 L96 146 L630 146 L630 136" class="ln" style="fill: none" />
      <text x="363" y="166" text-anchor="middle" class="t">Underlay IP packet: 20 + 8 + 8 + 14 + 1,500 = 1,550 bytes</text>
      <text x="320" y="200" text-anchor="middle" class="m">Fix 1: jumbo frames (about 9,000 bytes) on every underlay link</text>
      <text x="320" y="222" text-anchor="middle" class="m">Fix 2: give VMs or containers an MTU of 1,450 so the result fits in 1,500</text>
    </svg>
    <figcaption>
      VXLAN over IPv4 wraps the VM's whole Ethernet frame in four new headers. A full 1,500-byte inner packet
      needs the underlay to carry 1,550-byte IP packets. If one underlay link is still at 1,500, full-size
      packets on that path are dropped while small ones get through. An IPv6 outer header adds 20 bytes more.
    </figcaption>
  </figure>
</template>
