<script setup lang="ts">
// Origin region failure: the PoP stops using region A and sends new requests to region B. Timeline below.
const marks = [
  { x: 40, t: 'Failure', m: '0 s' },
  { x: 170, t: 'Detected', m: 'seconds' },
  { x: 310, t: 'Traffic moved', m: 'tens of seconds' },
  { x: 450, t: 'Survivors scale', m: 'minutes' },
  { x: 590, t: 'Fail back', m: 'slowly, later' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="An edge PoP sends requests to origin region A, which fails. In-flight requests to A fail. After detection, new requests go to region B. A timeline shows failure, detection in seconds, traffic moved in tens of seconds, survivors scaling in minutes, and slow failback.">
      <defs>
        <marker id="capfail-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <rect x="20" y="60" width="160" height="80" rx="8" class="box-c" />
      <text x="100" y="92" text-anchor="middle" class="tb">Edge PoP</text>
      <text x="100" y="112" text-anchor="middle" class="m">users stay here</text>

      <rect x="440" y="20" width="180" height="64" rx="8" class="box-d" stroke-dasharray="6 4" />
      <text x="530" y="47" text-anchor="middle" class="tb">Region A (failed)</text>
      <text x="530" y="67" text-anchor="middle" class="m">connections time out</text>

      <rect x="440" y="116" width="180" height="64" rx="8" class="box-b" />
      <text x="530" y="143" text-anchor="middle" class="tb">Region B</text>
      <text x="530" y="163" text-anchor="middle" class="m">farther, needs headroom</text>

      <path d="M180 85 L438 52" class="ln" stroke-dasharray="6 4" marker-end="url(#capfail-ah)" />
      <text x="300" y="56" text-anchor="middle" class="m">1. in-flight requests fail</text>
      <path d="M180 115 L438 148" class="ln" marker-end="url(#capfail-ah)" />
      <text x="300" y="150" text-anchor="middle" class="m">3. new requests and retries</text>

      <!-- timeline -->
      <path d="M40 235 L600 235" class="ln" />
      <template v-for="k in marks" :key="k.t">
        <circle :cx="k.x" cy="235" r="5" class="box-a" />
        <text :x="k.x" y="222" text-anchor="middle" class="m">{{ k.t }}</text>
        <text :x="k.x" y="257" text-anchor="middle" class="m">{{ k.m }}</text>
      </template>
    </svg>
    <figcaption>
      When an origin region fails, users keep their edge PoP and connection. Requests in flight to region A
      fail or retry; once health checks and outlier detection mark it down, the PoP sends new requests to
      region B. Moving traffic is fast; giving it enough capacity is the slow part. Times are orders of
      magnitude.
    </figcaption>
  </figure>
</template>
