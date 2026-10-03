<script setup lang="ts">
// Congestion window per round trip, from the chapter's toy simulation (path carries 30 segments).
const cwnd = [10, 20, 40, 20, 21, 22, 23, 24, 25, 26, 27, 28, 29, 30, 31, 15, 16, 17, 18, 19]
const x = (i: number) => 80 + i * 28
const y = (c: number) => 320 - c * 6.5
const points = cwnd.map((c, i) => `${x(i)},${y(c)}`).join(' ')
const ticks = [0, 10, 20, 30, 40]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 380" role="img" aria-label="Chart of the congestion window over twenty round trips. It doubles from 10 to 40 segments, overshoots the path's capacity of 30, halves to 20 on a loss, then grows by one per round trip to 31, halves again to 15, and climbs again: a sawtooth.">
      <!-- axes -->
      <path d="M60 30 L60 320 L630 320" class="ln" />
      <template v-for="t in ticks" :key="t">
        <text x="52" :y="y(t) + 4" text-anchor="end" class="m">{{ t }}</text>
      </template>
      <text x="60" y="20" class="m">window (segments)</text>
      <text x="345" y="350" text-anchor="middle" class="m">time, in round trips →</text>

      <!-- path capacity -->
      <path :d="`M60 ${y(30)} L630 ${y(30)}`" class="ln" stroke-dasharray="5 5" />
      <text x="626" :y="y(30) - 8" text-anchor="end" class="m">what the path can carry</text>

      <!-- the window -->
      <polyline :points="points" class="ln" fill="none" stroke-width="3" />
      <circle v-for="(c, i) in cwnd" :key="i" :cx="x(i)" :cy="y(c)" r="3" class="box-a" />

      <!-- annotations -->
      <text :x="x(2) + 10" :y="y(40) + 4" class="m">loss: halve</text>
      <text x="80" :y="y(40) - 14" class="m">slow start: doubles</text>
      <text :x="x(4)" :y="y(20) + 24" class="m">avoidance: +1 segment per round trip</text>
      <text :x="x(14) + 10" :y="y(31) - 18" class="m">loss: halve</text>
    </svg>
    <figcaption>
      The congestion window from the simulation below. Slow start doubles it each round trip until a loss,
      then it halves and grows by one segment per round trip. The repeating climb and drop is the classic
      TCP sawtooth.
    </figcaption>
  </figure>
</template>
