<script setup lang="ts">
// An IPv6-only phone reaching an IPv4-only server: DNS64 + NAT64, and the on-phone CLAT (464XLAT).
</script>

<template>
  <figure class="figure">
    <svg viewBox="0 0 640 340" role="img" aria-label="An IPv6-only phone. For names, the carrier's DNS64 invents an IPv6 address that embeds the server's IPv4 address, and the carrier's NAT64 translates the packets to IPv4. For apps that use IPv4 directly, a translator on the phone turns IPv4 into IPv6 first. IPv6 servers are reached directly.">
      <defs>
        <marker id="lmn64-ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
          <path d="M0 0 L10 5 L0 10 z" class="arrowhead" />
        </marker>
      </defs>

      <!-- phone -->
      <rect x="10" y="20" width="170" height="250" rx="10" class="box-a" />
      <text x="95" y="44" text-anchor="middle" class="tb">IPv6-only phone</text>
      <rect x="22" y="62" width="146" height="54" rx="6" class="box" />
      <text x="95" y="84" text-anchor="middle" class="t">App uses a name</text>
      <text x="95" y="103" text-anchor="middle" class="m">example.com</text>
      <rect x="22" y="140" width="146" height="54" rx="6" class="box" />
      <text x="95" y="162" text-anchor="middle" class="t">App uses an IPv4</text>
      <text x="95" y="181" text-anchor="middle" class="m">address: 192.0.2.10</text>
      <rect x="22" y="208" width="146" height="50" rx="6" class="box-c" />
      <text x="95" y="229" text-anchor="middle" class="t">On-phone translator</text>
      <text x="95" y="247" text-anchor="middle" class="m">IPv4 → IPv6 (CLAT)</text>
      <path d="M95 194 L95 206" class="ln" marker-end="url(#lmn64-ah)" />

      <!-- carrier -->
      <rect x="230" y="20" width="190" height="250" rx="10" class="box-b" />
      <text x="325" y="44" text-anchor="middle" class="tb">Carrier network</text>
      <rect x="242" y="62" width="166" height="54" rx="6" class="box" />
      <text x="325" y="84" text-anchor="middle" class="t">DNS64</text>
      <text x="325" y="103" text-anchor="middle" class="m">invents 64:ff9b::c000:20a</text>
      <rect x="242" y="160" width="166" height="54" rx="6" class="box" />
      <text x="325" y="182" text-anchor="middle" class="t">NAT64</text>
      <text x="325" y="201" text-anchor="middle" class="m">IPv6 → IPv4, shared address</text>

      <path d="M168 89 L240 89" class="ln" marker-end="url(#lmn64-ah)" />
      <path d="M168 110 Q205 150 240 178" class="ln" marker-end="url(#lmn64-ah)" />
      <text x="204" y="140" text-anchor="middle" class="m">v6</text>
      <path d="M168 233 Q205 220 240 200" class="ln" marker-end="url(#lmn64-ah)" />
      <text x="204" y="238" text-anchor="middle" class="m">v6</text>

      <!-- internet -->
      <rect x="470" y="150" width="160" height="74" rx="8" class="box-d" />
      <text x="550" y="178" text-anchor="middle" class="tb">IPv4-only server</text>
      <text x="550" y="198" text-anchor="middle" class="m">192.0.2.10</text>
      <path d="M408 187 L468 187" class="ln" marker-end="url(#lmn64-ah)" />
      <text x="438" y="178" text-anchor="middle" class="m">v4</text>

      <rect x="470" y="40" width="160" height="74" rx="8" class="box-d" />
      <text x="550" y="68" text-anchor="middle" class="tb">IPv6 server</text>
      <text x="550" y="88" text-anchor="middle" class="m">reached directly</text>
      <path d="M420 77 L468 77" class="ln" marker-end="url(#lmn64-ah)" />

      <text x="320" y="300" text-anchor="middle" class="m">The invented address carries the IPv4 address in its last 32 bits</text>
      <text x="320" y="318" text-anchor="middle" class="m">(c000:20a is 192.0.2.10). The phone never has a real IPv4 address.</text>
    </svg>
    <figcaption>
      How an IPv6-only phone reaches an IPv4-only server. Apps that use names get an invented IPv6 address from
      DNS64, and the carrier's NAT64 translates the packets. Apps that use IPv4 addresses directly go through a
      translator on the phone first; the pair is called 464XLAT. Servers with IPv6 skip translation.
    </figcaption>
  </figure>
</template>
