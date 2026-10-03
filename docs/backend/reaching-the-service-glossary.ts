// Glossary terms owned by the Reaching the Service chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

const chapter = '/backend/reaching-the-service'

export const terms: Record<string, GlossaryEntry> = {
  'service-discovery': {
    term: 'Service discovery',
    def: 'How a caller learns which instances of a service exist and are healthy right now, through DNS or a service registry.',
    chapter,
  },
  'service-registry': {
    term: 'Service registry',
    def: 'A highly available database of running service instances. Instances register with renewable leases, and callers watch it for changes. ZooKeeper, etcd and Consul are examples.',
    chapter,
  },
  'client-side-load-balancing': {
    term: 'Client-side load balancing',
    def: 'The caller holds the instance list and picks an instance per request inside its own process, with no balancer in between.',
    chapter,
  },
  'sidecar-proxy': {
    term: 'Sidecar proxy',
    def: 'A small proxy running beside each service instance that transparently handles its network calls: discovery, balancing, retries, encryption and metrics.',
    chapter,
  },
  'service-mesh': {
    term: 'Service mesh',
    def: 'A fleet of proxies (sidecars, per-node proxies or libraries) carrying service-to-service traffic, configured by a central control plane. Istio and Linkerd are examples.',
    chapter,
  },
  'control-plane': {
    term: 'Control plane',
    def: 'The part of a system that decides and distributes configuration, such as routes and instance lists. The data plane is the part that carries the traffic.',
    chapter,
  },
  xds: {
    term: 'xDS',
    def: 'Envoy’s family of APIs for streaming configuration (listeners, routes, clusters, endpoints) from a control plane to proxies. gRPC can also consume it directly.',
    chapter,
  },
  pod: {
    term: 'Pod',
    def: 'The unit Kubernetes runs: one or more containers sharing a network namespace and one IP address.',
    chapter,
  },
  'kubernetes-service': {
    term: 'Kubernetes Service',
    def: 'An object that selects a group of pods by label and gives them one stable name and, usually, a virtual address (ClusterIP).',
    chapter,
  },
  'cluster-ip': {
    term: 'ClusterIP',
    def: 'The virtual address of a Kubernetes Service. No interface owns it; rules on every node rewrite connections to it into a real pod address.',
    chapter,
  },
  'headless-service': {
    term: 'Headless Service',
    def: 'A Kubernetes Service with no ClusterIP. Its DNS name returns the ready pods’ addresses directly, for client-side balancing.',
    chapter,
  },
  endpointslice: {
    term: 'EndpointSlice',
    def: 'A Kubernetes object listing the addresses of a Service’s pods and whether each is ready. kube-proxy, ingress controllers and meshes watch it.',
    chapter,
  },
  'readiness-probe': {
    term: 'Readiness probe',
    def: 'A periodic check, such as an HTTP request, that decides whether a pod should receive traffic. Failing it removes the pod from Service endpoints without restarting it.',
    chapter,
  },
  'kube-proxy': {
    term: 'kube-proxy',
    def: 'The Kubernetes agent on each node that programs the kernel (iptables, IPVS or nftables rules) so connections to Service addresses reach pods.',
    chapter,
  },
  netfilter: {
    term: 'netfilter',
    def: 'The Linux kernel’s packet filtering and rewriting framework, configured through iptables or nftables. It also provides connection tracking.',
    chapter,
  },
  dnat: {
    term: 'Destination NAT (DNAT)',
    def: 'Rewriting a packet’s destination address and port, for example from a Service address to a pod address. Connection tracking reverses it on replies.',
    chapter,
  },
  ebpf: {
    term: 'eBPF',
    def: 'A Linux mechanism for running small, verified programs inside the kernel at hook points such as packet arrival or socket connect. Used for fast networking, tracing and security.',
    chapter,
  },
}
