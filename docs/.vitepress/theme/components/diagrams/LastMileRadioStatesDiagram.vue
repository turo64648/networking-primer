<script setup lang="ts">
// Cellular radio states over time: idle, promotion delay, connected, tail timer, back to idle.
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="A timeline of the phone's cellular radio. It starts idle. The first request waits while the radio is promoted to connected. Data flows. The radio stays connected for a tail period after the last packet; a second request in that period is fast. Then the radio drops back to idle.">
      <defs>
        <marker id="lmrs-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- state labels on the left -->
      <text x="10" y="94" class="m">Connected</text>
      <text x="10" y="154" class="m">Waking up</text>
      <text x="10" y="214" class="m">Idle</text>

      <!-- guide lines -->
      <path d="M80 90 L630 90" class="ln" stroke-dasharray="2 4" opacity="0.4" />
      <path d="M80 210 L630 210" class="ln" stroke-dasharray="2 4" opacity="0.4" />

      <!-- radio state line -->
      <path d="M80 210 L140 210 L140 150 L220 150 L220 90 L540 90 L540 210 L630 210" class="ln" stroke-width="2.5" />

      <!-- data bursts -->
      <rect x="222" y="70" width="60" height="18" rx="3" class="box-a" />
      <text x="252" y="83" text-anchor="middle" class="m">data</text>
      <rect x="380" y="70" width="34" height="18" rx="3" class="box-a" />
      <text x="397" y="83" text-anchor="middle" class="m">data</text>

      <!-- request arrows -->
      <path d="M140 30 L140 140" class="ln" marker-end="url(#lmrs-ah)" />
      <text x="140" y="22" text-anchor="middle" class="tb">1st request</text>
      <path d="M380 30 L380 66" class="ln" marker-end="url(#lmrs-ah)" />
      <text x="380" y="22" text-anchor="middle" class="tb">2nd request</text>

      <!-- promotion span -->
      <path d="M140 240 L220 240" class="ln" marker-start="url(#lmrs-ah)" marker-end="url(#lmrs-ah)" />
      <text x="180" y="260" text-anchor="middle" class="m">promotion delay</text>
      <text x="180" y="276" text-anchor="middle" class="m">(the slow start)</text>

      <!-- tail span -->
      <path d="M284 240 L540 240" class="ln" marker-start="url(#lmrs-ah)" marker-end="url(#lmrs-ah)" />
      <text x="412" y="260" text-anchor="middle" class="m">tail timer: radio stays on, using battery,</text>
      <text x="412" y="276" text-anchor="middle" class="m">restarted by every packet</text>

      <text x="380" y="122" text-anchor="middle" class="m">no wait: radio</text>
      <text x="380" y="138" text-anchor="middle" class="m">already connected</text>
    </svg>
    <figcaption>
      A phone's cellular radio over time. The first request after a quiet period waits while the radio wakes
      up. A second request during the tail timer goes out at once. Durations depend on the network and its
      settings: on 4G the wake-up is around 100 ms or more and the tail is often around 10 seconds.
    </figcaption>
  </figure>
</template>
