<script setup lang="ts">
// HTTP/1.1: a few connections, each carrying one request at a time.
// HTTP/2: one connection carrying interleaved frames from many streams.
const h1 = [
  { y: 52, label: 'Connection 1', reqs: [{ x: 140, w: 120, t: 'page', c: 'box-a' }, { x: 290, w: 150, t: 'image 1', c: 'box-d' }] },
  { y: 92, label: 'Connection 2', reqs: [{ x: 140, w: 210, t: 'slow script', c: 'box-b' }, { x: 380, w: 110, t: 'image 2', c: 'box-d' }] },
  { y: 132, label: 'Connection 3', reqs: [{ x: 140, w: 100, t: 'style', c: 'box-c' }, { x: 270, w: 120, t: 'font', c: 'box-a' }] },
]
const order = ['box-a', 'box-b', 'box-c', 'box-d']
const names = ['1', '3', '5', '7']
const frames = Array.from({ length: 14 }, (_, i) => ({ x: 140 + i * 34, c: order[i % 4], n: names[i % 4] }))
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="With HTTP/1.1, three connections each carry one request at a time, and further requests wait for a free connection. With HTTP/2, one connection carries small frames from many requests, interleaved.">
      <text x="10" y="24" class="h">HTTP/1.1: each connection carries one request at a time</text>
      <template v-for="l in h1" :key="l.y">
        <text x="10" :y="l.y + 5" class="m">{{ l.label }}</text>
        <path :d="`M130 ${l.y} L630 ${l.y}`" class="ln" />
        <template v-for="r in l.reqs" :key="r.t">
          <rect :x="r.x" :y="l.y - 13" :width="r.w" height="26" rx="5" :class="r.c" />
          <text :x="r.x + r.w / 2" :y="l.y + 5" text-anchor="middle" class="m">{{ r.t }}</text>
        </template>
      </template>
      <text x="130" y="172" class="m">image 3, image 4… wait for a free connection</text>

      <text x="10" y="216" class="h">HTTP/2: one connection, many streams interleaved</text>
      <text x="10" y="257" class="m">Connection 1</text>
      <path d="M130 252 L630 252" class="ln" />
      <template v-for="(f, i) in frames" :key="i">
        <rect :x="f.x" y="239" width="30" height="26" rx="4" :class="f.c" />
        <text :x="f.x + 15" y="257" text-anchor="middle" class="m">{{ f.n }}</text>
      </template>
      <text x="130" y="292" class="m">Numbers are stream IDs. A slow response no longer blocks the others,</text>
      <text x="130" y="312" class="m">but one lost TCP packet still stalls every stream.</text>
    </svg>
    <figcaption>
      Time runs left to right. With HTTP/1.1, the browser opens a few connections (about six per host in practice)
      and each carries one request and response at a time. With HTTP/2, small frames from many requests take turns on
      a single connection.
    </figcaption>
  </figure>
</template>
