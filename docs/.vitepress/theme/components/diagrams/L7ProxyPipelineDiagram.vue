<script setup lang="ts">
// Inside one L7 proxy: the steps a request goes through between the client and a backend.
const steps = [
  { t: '1. Accept and decrypt', m: 'TCP and TLS handshakes end here' },
  { t: '2. Read the request', m: 'method, host, path, headers' },
  { t: '3. Checks', m: 'rate limits, bot score, WAF rules' },
  { t: '4. Route', m: 'host + path → backend group' },
  { t: '5. Pick a server', m: 'two random, use the less busy' },
  { t: '6. Send on a pooled connection', m: 'reused, kept warm' },
]
const backends = [
  { y: 110, t: 'Server A', m: '3 in flight' },
  { y: 200, t: 'Server B', m: '1 in flight' },
  { y: 290, t: 'Server C', m: 'ejected: errors' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 420" role="img" aria-label="A client connects to an L7 proxy. The proxy decrypts the connection, reads the request, runs checks, routes it to a backend group, picks one server and sends the request on a reused connection.">
      <defs>
        <marker id="l7pipe-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- client -->
      <rect x="10" y="160" width="110" height="70" rx="8" class="box-a" />
      <text x="65" y="190" text-anchor="middle" class="tb">Client</text>
      <text x="65" y="210" text-anchor="middle" class="m">HTTP/2 or /3</text>
      <path d="M120 195 L158 195" class="ln" marker-end="url(#l7pipe-ah)" />
      <text x="139" y="186" text-anchor="middle" class="m">TLS</text>

      <!-- proxy -->
      <rect x="160" y="20" width="290" height="380" rx="10" class="box" />
      <text x="305" y="44" text-anchor="middle" class="h">L7 proxy</text>
      <template v-for="(s, i) in steps" :key="s.t">
        <rect x="175" :y="58 + i * 56" width="260" height="46" rx="6" class="box-b" />
        <text x="305" :y="77 + i * 56" text-anchor="middle" class="tb">{{ s.t }}</text>
        <text x="305" :y="95 + i * 56" text-anchor="middle" class="m">{{ s.m }}</text>
      </template>

      <!-- backends -->
      <text x="560" y="96" text-anchor="middle" class="m">API backend group</text>
      <template v-for="b in backends" :key="b.t">
        <rect x="490" :y="b.y" width="140" height="60" rx="8" class="box-d" />
        <text x="560" :y="b.y + 26" text-anchor="middle" class="tb">{{ b.t }}</text>
        <text x="560" :y="b.y + 45" text-anchor="middle" class="m">{{ b.m }}</text>
      </template>
      <path d="M435 359 L488 232" class="ln" marker-end="url(#l7pipe-ah)" />
      <text x="470" y="392" text-anchor="middle" class="m">separate connection</text>
    </svg>
    <figcaption>
      One request through an L7 proxy. The client's connection ends at the proxy (steps 1–2). After checks and
      routing, the proxy picks server B, the less busy of two random choices, and skips C, which it ejected for
      errors. The request travels to B on a second, already open connection.
    </figcaption>
  </figure>
</template>
