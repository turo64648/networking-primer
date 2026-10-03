// Flashcards for the Last Mile & Mobile chapter. Strings may contain inline HTML.

export const cards = [
  {
    q: 'Why does Wi-Fi latency get worse in a crowded place even if your own traffic is light?',
    a: 'A Wi-Fi channel carries one transmission at a time, so every device on it takes turns. Collisions and weak signals cause resends, and slow devices hold the channel longer.',
  },
  {
    q: 'Why do mobile users often appear to be in the wrong city?',
    a: 'Carrier traffic enters the internet at a packet gateway, often behind carrier-grade NAT. Servers see the gateway’s address, which may be hundreds of kilometres from the user.',
  },
  {
    q: 'Why is the first request after a quiet period slow on cellular?',
    a: 'The radio has dropped to idle to save battery. It must wake up and get radio resources first (the promotion delay), and the app may also need DNS, TCP and TLS again.',
  },
  {
    q: 'Why does an analytics ping every 20 seconds drain a phone’s battery?',
    a: 'Each packet restarts the radio’s tail timer, often around ten seconds on 4G. Frequent small requests keep the radio in its high-power state almost all the time.',
  },
  {
    q: 'What is bufferbloat, and why is it worse on radio links?',
    a: 'Large buffers fill under load, so every packet waits behind the queue, adding up to seconds. Radio links change speed constantly, so devices keep deep buffers to avoid running dry.',
  },
  {
    q: 'Why can a good speed test coexist with laggy video calls?',
    a: 'Speed tests measure throughput, often with idle latency. Calls need low latency under load, which bufferbloat and Wi-Fi contention destroy.',
  },
  {
    q: 'What does the “1 ms” 5G figure actually measure?',
    a: 'A one-way radio-hop target for special low-latency uses, on an unloaded cell, for tiny packets. It excludes the carrier core, the internet and the server.',
  },
  {
    q: 'Why do idle long-lived connections die silently behind NAT?',
    a: 'The NAT deletes mappings for quiet flows to save memory, and tells nobody. The next packet gets a new port or is dropped, so the server no longer recognises the connection.',
  },
  {
    q: 'How often should a mobile app send keepalives?',
    a: 'Often enough to beat the shortest NAT timeout on the path, which can be around 30 seconds for UDP, but no more, since each keepalive wakes the radio. Many apps use the platform push service instead.',
  },
  {
    q: 'Why does carrier-grade NAT break per-IP rate limiting?',
    a: 'Hundreds or thousands of subscribers share one public IPv4 address. A limit sized for one user throttles all of them, and a ban blocks innocent users.',
  },
  {
    q: 'What should you rate-limit on instead of the IPv4 address?',
    a: 'An account, session, device or API token where possible. For IPv6, the <code>/64</code> prefix, since one device or home can pick any address in it.',
  },
  {
    q: 'Why should servers log the source port and accurate time?',
    a: 'Behind CGNAT, the public address alone does not identify a subscriber. The carrier needs address, port and timestamp to find who sent the traffic.',
  },
  {
    q: 'What is CGNAT port exhaustion and what does the user see?',
    a: 'The subscriber uses up their block of ports on the shared address. New connections fail or hang while existing ones work, so some sites load and others do not.',
  },
  {
    q: 'How does an IPv6-only phone reach an IPv4-only server?',
    a: 'DNS64 invents an IPv6 address that embeds the server’s IPv4 address. The carrier’s NAT64 recognises the prefix and translates the packets to IPv4.',
  },
  {
    q: 'Why do apps with hard-coded IPv4 addresses fail on IPv6-only networks, and what fixes it?',
    a: 'No DNS lookup happens, so DNS64 cannot help, and the phone has no IPv4. An on-phone translator (464XLAT) fixes it; connecting by name avoids the problem.',
  },
  {
    q: 'Why does serving IPv6 from your edge help mobile users?',
    a: 'IPv6 users on IPv6-only carriers then reach you directly, skipping NAT64 and its shared, possibly rate-limited, IPv4 addresses.',
  },
  {
    q: 'How does Happy Eyeballs hide broken IPv6?',
    a: 'It races IPv6 against IPv4 after a short delay and uses whichever connects. Users fall back quietly, so the only symptom is a small delay; monitor each family separately.',
  },
  {
    q: 'What happens to open connections when a phone moves from Wi-Fi to cellular?',
    a: 'The phone’s IP address changes, so TCP connections tied to the old address die. Apps should reconnect on network change; QUIC and Multipath TCP can survive the move.',
  },
]
