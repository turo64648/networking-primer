<script setup lang="ts">
// Three places to do balancing at the last hop: a central balancer, a client library, or sidecars.
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 420" role="img" aria-label="Three designs. Top: the caller sends to a load balancer at a stable virtual address, which forwards to one instance. Middle: the caller's own library reads the instance list from a registry and connects directly to an instance. Bottom: the caller's local sidecar proxy, configured by a control plane, connects to the instance's sidecar.">
      <defs>
        <marker id="svcmod-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- Row 1: central load balancer -->
      <text x="10" y="22" class="h">1. Central load balancer</text>
      <rect x="10" y="34" width="150" height="60" rx="8" class="box-a" />
      <text x="85" y="60" text-anchor="middle" class="tb">Caller</text>
      <text x="85" y="80" text-anchor="middle" class="m">knows one address</text>
      <rect x="245" y="34" width="150" height="60" rx="8" class="box-b" />
      <text x="320" y="60" text-anchor="middle" class="tb">Load balancer</text>
      <text x="320" y="80" text-anchor="middle" class="m">stable VIP</text>
      <rect x="480" y="34" width="150" height="60" rx="8" class="box-d" />
      <text x="555" y="60" text-anchor="middle" class="tb">Instance</text>
      <text x="555" y="80" text-anchor="middle" class="m">one of many</text>
      <path d="M160 64 L243 64" class="ln" marker-end="url(#svcmod-ah)" />
      <path d="M395 64 L478 64" class="ln" marker-end="url(#svcmod-ah)" />
      <text x="320" y="114" text-anchor="middle" class="m">extra hop; balancer holds the instance list</text>

      <!-- Row 2: client library -->
      <text x="10" y="156" class="h">2. Client-side library</text>
      <rect x="245" y="166" width="150" height="46" rx="8" class="box-c" />
      <text x="320" y="194" text-anchor="middle" class="tb">Registry</text>
      <rect x="10" y="226" width="150" height="60" rx="8" class="box-a" />
      <text x="85" y="252" text-anchor="middle" class="tb">Caller</text>
      <text x="85" y="272" text-anchor="middle" class="m">+ balancing library</text>
      <rect x="480" y="226" width="150" height="60" rx="8" class="box-d" />
      <text x="555" y="252" text-anchor="middle" class="tb">Instance</text>
      <text x="555" y="272" text-anchor="middle" class="m">one of many</text>
      <path d="M243 196 L120 224" class="ln" stroke-dasharray="5 4" marker-end="url(#svcmod-ah)" />
      <text x="160" y="200" text-anchor="middle" class="m">instance list</text>
      <path d="M160 256 L478 256" class="ln" marker-end="url(#svcmod-ah)" />
      <text x="320" y="248" text-anchor="middle" class="m">direct connection, picked per request</text>

      <!-- Row 3: sidecars -->
      <text x="10" y="318" class="h">3. Sidecar mesh</text>
      <rect x="245" y="326" width="150" height="40" rx="8" class="box-c" />
      <text x="320" y="351" text-anchor="middle" class="tb">Control plane</text>
      <rect x="10" y="356" width="150" height="56" rx="8" class="box-a" />
      <text x="85" y="380" text-anchor="middle" class="tb">Caller</text>
      <text x="85" y="398" text-anchor="middle" class="m">→ local sidecar</text>
      <rect x="480" y="356" width="150" height="56" rx="8" class="box-d" />
      <text x="555" y="380" text-anchor="middle" class="tb">Instance</text>
      <text x="555" y="398" text-anchor="middle" class="m">sidecar →</text>
      <path d="M245 352 L162 370" class="ln" stroke-dasharray="5 4" marker-end="url(#svcmod-ah)" />
      <path d="M395 352 L478 370" class="ln" stroke-dasharray="5 4" marker-end="url(#svcmod-ah)" />
      <path d="M160 396 L478 396" class="ln" marker-end="url(#svcmod-ah)" />
      <text x="320" y="390" text-anchor="middle" class="m">mutual TLS between sidecars</text>
    </svg>
    <figcaption>
      Three places to put the balancing choice. Solid arrows carry requests; dashed arrows carry instance lists and
      configuration. Real systems often mix them, for example a library inside services and a central proxy at the edge.
    </figcaption>
  </figure>
</template>
