import { defineConfig } from 'vitepress'
import { parts } from './chapters'

export default defineConfig({
  title: 'Networking Primer',
  description: 'An in-depth networking primer for senior engineering interviews',
  // Set VITEPRESS_BASE=/repo-name/ when deploying to a GitHub Pages project site.
  base: process.env.VITEPRESS_BASE || '/',
  cleanUrls: true,
  lastUpdated: false,
  head: [
    ['link', { rel: 'preconnect', href: 'https://fonts.googleapis.com' }],
    ['link', { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossorigin: '' }],
    ['link', { rel: 'stylesheet', href: 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap' }],
  ],
  markdown: {
    theme: { light: 'github-light', dark: 'github-dark' },
  },
  themeConfig: {
    nav: [
      { text: 'Start here', link: '/how-to-use' },
      { text: 'Chapters', link: '/#chapters' },
      { text: 'Glossary', link: '/glossary' },
      { text: 'OS Primer', link: 'https://turo64648.github.io/os-primer/' },
    ],
    sidebar: [
      { text: 'Start here', items: [
          { text: 'How to use this primer', link: '/how-to-use' },
          { text: 'Glossary', link: '/glossary' },
        ] },
      ...parts.map((p) => ({
        text: p.title,
        collapsed: false,
        items: p.chapters.map((c) => ({
          text: `${c.num}. ${c.title}${c.ready ? '' : ' (soon)'}`,
          link: c.link,
        })),
      })),
    ],
    outline: { level: [2, 3], label: 'On this page' },
    search: { provider: 'local' },
    docFooter: { prev: 'Previous', next: 'Next' },
  },
})
