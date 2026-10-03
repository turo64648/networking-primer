<script setup lang="ts">
// Three cases for a cached response: still fresh, stale but unchanged (304), stale and changed (200).
const rows = [
  { y: 150, title: '② Stale, unchanged', req: 'GET  If-None-Match: "v7"', res: '304 Not Modified, no body' },
  { y: 245, title: '③ Stale, changed', req: 'GET  If-None-Match: "v7"', res: '200 OK, new body, ETag "v8"' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 320" role="img" aria-label="A cache holds a response with ETag v7. While it is fresh, the cache answers without asking. When it is stale, the cache sends a conditional request; the server answers 304 if nothing changed, or 200 with a new body and ETag if it did.">
      <defs>
        <marker id="httpcv-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <rect x="10" y="20" width="160" height="290" rx="8" class="box-a" />
      <text x="90" y="46" text-anchor="middle" class="tb">Cache</text>
      <text x="90" y="66" text-anchor="middle" class="m">browser or CDN</text>
      <text x="90" y="84" text-anchor="middle" class="m">holds ETag "v7"</text>

      <rect x="470" y="20" width="160" height="290" rx="8" class="box-d" />
      <text x="550" y="46" text-anchor="middle" class="tb">Origin server</text>
      <text x="550" y="66" text-anchor="middle" class="m">source of truth</text>

      <text x="320" y="56" text-anchor="middle" class="tb">① Fresh (age below max-age)</text>
      <text x="320" y="78" text-anchor="middle" class="m">served from the cache,</text>
      <text x="320" y="96" text-anchor="middle" class="m">nothing sent to the server</text>

      <template v-for="r in rows" :key="r.y">
        <text x="320" :y="r.y - 20" text-anchor="middle" class="tb">{{ r.title }}</text>
        <path :d="`M172 ${r.y} L468 ${r.y}`" class="ln" marker-end="url(#httpcv-ah)" />
        <text x="320" :y="r.y - 5" text-anchor="middle" class="m">{{ r.req }}</text>
        <path :d="`M468 ${r.y + 32} L172 ${r.y + 32}`" class="ln" marker-end="url(#httpcv-ah)" />
        <text x="320" :y="r.y + 27" text-anchor="middle" class="m">{{ r.res }}</text>
      </template>
    </svg>
    <figcaption>
      What a cache does with a stored response. (1) While it is fresh, no request is sent. (2) Once stale, the cache
      asks whether its version changed; a <code>304</code> confirms it and costs a round trip but no body. (3) If the
      content changed, the server sends the new body with a new ETag.
    </figcaption>
  </figure>
</template>
