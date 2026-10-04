<script setup lang="ts">
// Reconnects per second after a server drops its clients: all at once vs spread out by jittered backoff.
const storm = [2, 100, 60, 25, 8, 3, 2, 2, 2, 2, 2, 2]
const jitter = [2, 14, 16, 16, 15, 14, 13, 12, 10, 8, 5, 3]
const bar = (i: number) => 40 + i * 22
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 230" role="img" aria-label="Two bar charts of reconnects per second after a server drops its clients. Without jitter, almost all clients reconnect in the first second, far above backend capacity. With jitter, reconnects spread over many seconds and stay below capacity.">
      <!-- left: no jitter -->
      <text x="170" y="22" text-anchor="middle" class="tb">Immediate reconnect</text>
      <line x1="30" y1="70" x2="310" y2="70" class="ln" stroke-dasharray="5 4" />
      <text x="310" y="62" text-anchor="end" class="m">backend capacity</text>
      <template v-for="(v, i) in storm" :key="'s' + i">
        <rect :x="bar(i)" :y="180 - v * 1.4" width="16" :height="v * 1.4" rx="2" class="box-c" />
      </template>
      <line x1="30" y1="180" x2="310" y2="180" class="ln" />
      <text x="170" y="200" text-anchor="middle" class="m">seconds after the drop →</text>

      <!-- right: jitter -->
      <text x="490" y="22" text-anchor="middle" class="tb">Backoff with jitter</text>
      <line x1="340" y1="70" x2="630" y2="70" class="ln" stroke-dasharray="5 4" />
      <text x="630" y="62" text-anchor="end" class="m">backend capacity</text>
      <template v-for="(v, i) in jitter" :key="'j' + i">
        <rect :x="bar(i) + 320" :y="180 - v * 1.4" width="16" :height="v * 1.4" rx="2" class="box-a" />
      </template>
      <line x1="340" y1="180" x2="630" y2="180" class="ln" />
      <text x="490" y="200" text-anchor="middle" class="m">seconds after the drop →</text>
    </svg>
    <figcaption>
      Reconnects per second after one server drops its clients (illustrative shape, not measured data). If every
      client reconnects at once, the first second exceeds what the backends can handle. Random, growing delays
      spread the same reconnects over time.
    </figcaption>
  </figure>
</template>
