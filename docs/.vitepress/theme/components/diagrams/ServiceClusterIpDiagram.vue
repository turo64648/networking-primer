<script setup lang="ts">
// A connection to a Kubernetes ClusterIP: rewritten on the caller's own node, remembered by conntrack.
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 340" role="img" aria-label="On node A, a client pod connects to the ClusterIP 10.96.0.20 port 80. Kernel rules programmed by kube-proxy pick a pod and rewrite the destination to 10.244.2.7 port 8080 on node B. The connection tracking table remembers the choice. The packet crosses the fabric to node B. Node C has another pod that was not chosen.">
      <defs>
        <marker id="svccip-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- Node A -->
      <rect x="10" y="10" width="300" height="290" rx="10" class="box" />
      <text x="24" y="34" class="h">Node A (the caller’s node)</text>

      <rect x="40" y="50" width="240" height="56" rx="8" class="box-a" />
      <text x="160" y="74" text-anchor="middle" class="tb">Client pod</text>
      <text x="160" y="94" text-anchor="middle" class="m">connects to 10.96.0.20:80</text>

      <rect x="40" y="140" width="240" height="60" rx="8" class="box-b" />
      <text x="160" y="164" text-anchor="middle" class="tb">Kernel rules from kube-proxy</text>
      <text x="160" y="184" text-anchor="middle" class="m">pick a ready pod, rewrite address</text>

      <rect x="40" y="228" width="240" height="56" rx="8" class="box-c" />
      <text x="160" y="252" text-anchor="middle" class="tb">Connection tracking</text>
      <text x="160" y="272" text-anchor="middle" class="m">remembers the choice for later packets</text>

      <path d="M160 106 L160 138" class="ln" marker-end="url(#svccip-ah)" />
      <path d="M160 200 L160 226" class="ln" marker-end="url(#svccip-ah)" />

      <!-- Node B -->
      <rect x="380" y="40" width="250" height="110" rx="10" class="box" />
      <text x="394" y="64" class="h">Node B</text>
      <rect x="400" y="76" width="210" height="56" rx="8" class="box-d" />
      <text x="505" y="100" text-anchor="middle" class="tb">Cart pod</text>
      <text x="505" y="120" text-anchor="middle" class="m">10.244.2.7:8080</text>

      <!-- Node C -->
      <rect x="380" y="180" width="250" height="110" rx="10" class="box" />
      <text x="394" y="204" class="h">Node C</text>
      <rect x="400" y="216" width="210" height="56" rx="8" class="box-d" />
      <text x="505" y="240" text-anchor="middle" class="tb">Cart pod</text>
      <text x="505" y="260" text-anchor="middle" class="m">10.244.3.4:8080 (not chosen)</text>

      <path d="M280 168 L398 108" class="ln" marker-end="url(#svccip-ah)" />
      <text x="342" y="126" text-anchor="middle" class="m">to 10.244.2.7</text>
      <text x="342" y="144" text-anchor="middle" class="m">over the fabric</text>

      <text x="320" y="326" text-anchor="middle" class="m">No machine or interface owns 10.96.0.20. Every node has the same rules.</text>
    </svg>
    <figcaption>
      A connection to a Service's ClusterIP. The caller's own node picks a pod and rewrites the destination once,
      when the connection starts. Connection tracking applies the same rewrite to every later packet and reverses it on
      replies. Addresses are examples.
    </figcaption>
  </figure>
</template>
