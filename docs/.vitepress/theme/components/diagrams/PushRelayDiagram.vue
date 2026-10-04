<script setup lang="ts">
// The push relay: many app servers send to one push service, which uses one shared connection to the phone.
const senders = [
  { y: 30, t: 'Chat app servers' },
  { y: 130, t: 'News site servers' },
  { y: 230, t: 'Shop servers' },
]
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 330" role="img" aria-label="Three app servers each send an HTTPS request with a device token to the push service. The push service forwards the messages over one shared long-lived connection to the phone's operating system, which shows notifications or wakes apps.">
      <defs>
        <marker id="pushrelay-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- senders -->
      <template v-for="s in senders" :key="s.t">
        <rect x="10" :y="s.y" width="160" height="60" rx="8" class="box-d" />
        <text x="90" :y="s.y + 35" text-anchor="middle" class="tb">{{ s.t }}</text>
        <path :d="`M172 ${s.y + 30} L253 165`" class="ln" marker-end="url(#pushrelay-ah)" />
      </template>
      <text x="200" y="300" text-anchor="middle" class="m">HTTPS request:</text>
      <text x="200" y="318" text-anchor="middle" class="m">device token + small payload</text>

      <!-- push service -->
      <rect x="255" y="115" width="150" height="100" rx="8" class="box-b" />
      <text x="330" y="148" text-anchor="middle" class="tb">Push service</text>
      <text x="330" y="170" text-anchor="middle" class="m">APNs or FCM</text>
      <text x="330" y="190" text-anchor="middle" class="m">stores if offline</text>

      <!-- shared connection -->
      <path d="M407 165 L463 165" class="ln" marker-end="url(#pushrelay-ah)" />
      <text x="435" y="108" text-anchor="middle" class="m">one shared</text>
      <text x="435" y="124" text-anchor="middle" class="m">connection,</text>
      <text x="435" y="140" text-anchor="middle" class="m">kept by heartbeats</text>

      <!-- phone -->
      <rect x="465" y="60" width="165" height="210" rx="12" class="box-a" />
      <text x="547" y="88" text-anchor="middle" class="tb">Phone</text>
      <rect x="480" y="105" width="135" height="50" rx="6" class="box" />
      <text x="547" y="128" text-anchor="middle" class="t">OS push client</text>
      <text x="547" y="145" text-anchor="middle" class="m">one per phone</text>
      <path d="M547 157 L547 183" class="ln" marker-end="url(#pushrelay-ah)" />
      <rect x="480" y="185" width="135" height="65" rx="6" class="box" />
      <text x="547" y="208" text-anchor="middle" class="t">Notification shown</text>
      <text x="547" y="226" text-anchor="middle" class="m">or app woken</text>
      <text x="547" y="242" text-anchor="middle" class="m">to fetch data</text>
    </svg>
    <figcaption>
      Every app's servers send to the platform's push service with the device token. The phone keeps only one
      connection, owned by the operating system, so one heartbeat schedule covers every app.
    </figcaption>
  </figure>
</template>
