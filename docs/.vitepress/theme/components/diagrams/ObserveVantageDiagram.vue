<script setup lang="ts">
// Which observation tool sees which stretch of the path.
const stops = [
  { x: 10, t: 'Phone', m: 'app or browser' },
  { x: 137, t: 'Radio & carrier', m: 'last mile, NAT' },
  { x: 264, t: 'Internet', m: 'transit, peering' },
  { x: 391, t: 'Edge site', m: 'CDN, load balancer' },
  { x: 518, t: 'App server', m: 'first service' },
]
const bars = [
  { x1: 10, x2: 630, cls: 'box-a', label: 'Real-user monitoring: what users get, end to end, by phase' },
  { x1: 10, x2: 630, cls: 'box-b', label: 'Network Error Logging: failures before any response arrives' },
  { x1: 264, x2: 630, cls: 'box-c', label: 'Synthetic probes: steady, but skip the last mile' },
  { x1: 391, x2: 630, cls: 'box-d', label: 'Traces, logs, Server-Timing: per hop' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="A path of five stops: phone, radio and carrier, internet, edge site, app server. Real-user monitoring and Network Error Logging span the whole path from the phone. Synthetic probes start from the internet. Traces, logs and Server-Timing cover the edge and app server.">
      <defs>
        <marker id="obsvan-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <text x="10" y="20" class="h">Who sees which stretch</text>

      <template v-for="(b, i) in bars" :key="i">
        <rect :x="b.x1" :y="34 + i * 36" :width="b.x2 - b.x1" height="26" rx="6" :class="b.cls" />
        <text :x="b.x1 + 10" :y="51 + i * 36" class="m">{{ b.label }}</text>
      </template>

      <template v-for="(s, i) in stops" :key="s.t">
        <rect :x="s.x" y="196" width="112" height="64" rx="8" class="box" />
        <text :x="s.x + 56" y="222" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text :x="s.x + 56" y="242" text-anchor="middle" class="m">{{ s.m }}</text>
        <path v-if="i < stops.length - 1" :d="`M${s.x + 113} 228 L${s.x + 126} 228`" class="ln" marker-end="url(#obsvan-ah)" />
      </template>

      <text x="320" y="288" text-anchor="middle" class="m">mtr, tcpdump and curl see the path from wherever you run them</text>
    </svg>
    <figcaption>
      Each signal covers a different stretch. Real-user data and error reports start on the phone, so they include
      the radio and the carrier. Probes usually run in datacenters and skip the last mile. Traces and server logs
      start where your own systems start.
    </figcaption>
  </figure>
</template>
