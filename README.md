# Networking Primer

An in-depth networking primer for senior engineering interviews: the path of one request from a phone to the
first application server of a large website. Built with [VitePress](https://vitepress.dev). Sibling of the
[OS Primer](https://turo64648.github.io/os-primer/).

## Run locally

```bash
npm install
npm run dev       # http://localhost:5173
npm run build     # static site in docs/.vitepress/dist
npm run preview   # serve the built site
```

## Layout

- `docs/.vitepress/chapters.ts`: the table of contents. Sidebar, home page and stub pages all read it.
  Set `ready: true` when a chapter is written.
- `docs/<part>/<chapter>.md`: chapter content, with `<chapter>-review.ts` (flashcards) and
  `<chapter>-glossary.ts` (glossary terms) next to it.
- `docs/.vitepress/theme/components/`: widgets and SVG diagrams, registered automatically by file name.

Deployed to GitHub Pages by `.github/workflows/deploy.yml` on every push to `main`.
