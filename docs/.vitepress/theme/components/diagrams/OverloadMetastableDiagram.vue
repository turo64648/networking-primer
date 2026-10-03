<script setup lang="ts">
// Metastable failure: stable -> vulnerable -> metastable, a retry loop that sustains it, and the way back.
const states = [
  { x: 10, t: 'Stable', a: 'spare capacity', b: 'absorbs a blip', cls: 'box-a' },
  { x: 235, t: 'Vulnerable', a: 'running hot', b: 'still looks healthy', cls: 'box-c' },
  { x: 460, t: 'Metastable', a: 'most work wasted', b: 'stays broken', cls: 'box-d' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 255" role="img" aria-label="Three states. Stable moves to vulnerable as load grows. A trigger moves vulnerable to metastable. A loop of retries and timeouts keeps the system metastable. Recovery requires cutting load far below the trigger level.">
      <defs>
        <marker id="ovms-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <template v-for="s in states" :key="s.t">
        <rect :x="s.x" y="90" width="170" height="70" rx="8" :class="s.cls" />
        <text :x="s.x + 85" y="115" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text :x="s.x + 85" y="134" text-anchor="middle" class="m">{{ s.a }}</text>
        <text :x="s.x + 85" y="150" text-anchor="middle" class="m">{{ s.b }}</text>
      </template>

      <!-- forward arrows -->
      <path d="M182 115 L233 115" class="ln" marker-end="url(#ovms-ah)" />
      <text x="207" y="105" text-anchor="middle" class="m">load</text>
      <path d="M407 115 L458 115" class="ln" marker-end="url(#ovms-ah)" />
      <text x="432" y="105" text-anchor="middle" class="m">trigger</text>

      <!-- sustaining loop -->
      <path d="M515 88 C 515 40, 575 40, 575 86" class="ln" marker-end="url(#ovms-ah)" />
      <text x="500" y="30" text-anchor="middle" class="m">sustaining effect: retries, timeouts, cold cache</text>

      <!-- recovery arrows -->
      <path d="M545 162 L545 205 L320 205 L320 164" class="ln" marker-end="url(#ovms-ah)" />
      <text x="432" y="228" text-anchor="middle" class="m">recover: cut load far below the trigger level</text>
      <path d="M260 162 L260 185 L95 185 L95 164" class="ln" marker-end="url(#ovms-ah)" />
      <text x="177" y="178" text-anchor="middle" class="m">more headroom</text>
    </svg>
    <figcaption>
      A system running hot is vulnerable but looks healthy. A trigger, such as a spike or a brief slowdown,
      tips it into overload. Retries, timeouts or a cold cache then keep it there after the trigger is gone.
      Getting back needs a large, deliberate cut in load, then spare capacity so it does not happen again.
      (After Bronson et al., 2021.)
    </figcaption>
  </figure>
</template>
