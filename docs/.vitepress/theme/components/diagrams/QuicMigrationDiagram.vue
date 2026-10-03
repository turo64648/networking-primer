<template>
  <figure class="figure">
    <svg viewBox="0 0 640 300" role="img" aria-label="A phone moves from Wi-Fi to cellular, so its address changes. A TCP server sees an unknown four-tuple and the connection breaks. A QUIC server finds the connection by its connection ID, checks the new path, and carries on.">
      <defs>
        <marker id="quicmig-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- phone -->
      <rect x="10" y="95" width="130" height="80" rx="8" class="box-a" />
      <text x="75" y="125" text-anchor="middle" class="tb">Phone</text>
      <text x="75" y="145" text-anchor="middle" class="m">leaves Wi-Fi,</text>
      <text x="75" y="162" text-anchor="middle" class="m">joins cellular</text>

      <!-- paths -->
      <path d="M140 115 L455 75" class="ln" stroke-dasharray="5 4" marker-end="url(#quicmig-ah)" />
      <text x="290" y="78" text-anchor="middle" class="m">before: from 198.51.100.7 (Wi-Fi)</text>
      <path d="M140 155 L455 195" class="ln" marker-end="url(#quicmig-ah)" />
      <text x="290" y="205" text-anchor="middle" class="m">after: from 203.0.113.9 (cellular)</text>
      <text x="290" y="140" text-anchor="middle" class="tb">same connection ID: 7f3a…</text>

      <!-- server outcomes -->
      <rect x="460" y="30" width="170" height="85" rx="8" class="box-d" />
      <text x="545" y="56" text-anchor="middle" class="tb">TCP server</text>
      <text x="545" y="77" text-anchor="middle" class="m">new address and port:</text>
      <text x="545" y="95" text-anchor="middle" class="m">unknown, connection lost</text>

      <rect x="460" y="155" width="170" height="85" rx="8" class="box-b" />
      <text x="545" y="181" text-anchor="middle" class="tb">QUIC server</text>
      <text x="545" y="202" text-anchor="middle" class="m">looks up connection ID,</text>
      <text x="545" y="220" text-anchor="middle" class="m">checks path, carries on</text>

      <text x="320" y="282" text-anchor="middle" class="m">TCP identifies a connection by addresses and ports; QUIC by an ID inside each packet.</text>
    </svg>
    <figcaption>
      A phone changes network mid-download. Its address changes, so TCP's connection is gone and the app must
      reconnect. QUIC packets carry a connection ID, so the server recognises the connection on the new path.
      (In practice the phone also switches to a fresh ID, for privacy; see below.) Addresses are examples.
    </figcaption>
  </figure>
</template>
