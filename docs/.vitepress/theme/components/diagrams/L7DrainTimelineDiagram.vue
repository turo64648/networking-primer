<script setup lang="ts">
// Restarting a proxy: socket handover, GOAWAY, short requests drain, long-lived streams are cut at the deadline.
const marks = [
  { x: 150, t: 'New process', t2: 'takes socket' },
  { x: 250, t: 'Old sends', t2: 'GOAWAY' },
  { x: 380, t: 'Short requests', t2: 'done (seconds)' },
  { x: 560, t: 'Drain deadline', t2: '(minutes)' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="Timeline of a proxy restart. The new process takes the listening socket and serves new connections. The old process sends GOAWAY, short requests finish within seconds, and long-lived connections run until the drain deadline, when they are closed and clients reconnect to the new process.">
      <defs>
        <marker id="l7drain-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- markers -->
      <template v-for="m in marks" :key="m.t">
        <path :d="`M${m.x} 52 L${m.x} 290`" class="ln" stroke-dasharray="4 4" />
        <text :x="m.x" y="22" text-anchor="middle" class="m">{{ m.t }}</text>
        <text :x="m.x" y="40" text-anchor="middle" class="m">{{ m.t2 }}</text>
      </template>

      <!-- old process -->
      <text x="10" y="80" class="tb">Old process</text>
      <rect x="10" y="92" width="240" height="22" rx="4" class="box-b" />
      <text x="130" y="108" text-anchor="middle" class="m">accepts new connections</text>
      <rect x="250" y="92" width="130" height="22" rx="4" class="box-c" />
      <text x="315" y="108" text-anchor="middle" class="m">finishing requests</text>
      <rect x="10" y="122" width="550" height="22" rx="4" class="box-c" />
      <text x="285" y="138" text-anchor="middle" class="m">WebSocket / gRPC stream keeps running</text>
      <text x="575" y="138" class="m">closed</text>

      <!-- new process -->
      <text x="10" y="190" class="tb">New process</text>
      <rect x="150" y="202" width="480" height="22" rx="4" class="box-a" />
      <text x="390" y="218" text-anchor="middle" class="m">accepts all new connections</text>
      <path d="M560 148 L560 198" class="ln" marker-end="url(#l7drain-ah)" />
      <text x="568" y="250" class="m">clients</text>
      <text x="568" y="266" class="m">reconnect</text>

      <!-- axis -->
      <path d="M10 300 L630 300" class="ln" marker-end="url(#l7drain-ah)" />
      <text x="620" y="320" text-anchor="end" class="m">time</text>
    </svg>
    <figcaption>
      A proxy restart. The new process takes over the listening socket, so no connection is refused. The old process
      sends GOAWAY (or <code>Connection: close</code>) and its ordinary requests finish within seconds. Long-lived
      streams keep running until the drain deadline; then they are closed and those clients reconnect to the new
      process.
    </figcaption>
  </figure>
</template>
