# Networking Primer

A VitePress site: an in-depth networking primer for senior engineering interviews (general software and
infrastructure roles). It follows one request from a phone to the first application server of a large
website. Sibling of the OS Primer (https://turo64648.github.io/os-primer/). Deployed to GitHub Pages by
`.github/workflows/deploy.yml` on every push to `main`.

- **Before writing or editing any chapter, read `STYLE.md` and follow it.**
- Table of contents: `docs/.vitepress/chapters.ts`. Set `ready: true` when a chapter is complete.
- Glossary: each chapter keeps its terms in `<same folder>/<slug>-glossary.ts`, exporting `terms`
  (see the format below). `docs/.vitepress/glossary.ts` merges them automatically. Use `<Term id="...">`
  for the first use of a term in a chapter.
- Flashcards for a chapter live next to it (e.g. `docs/protocols/dns-review.ts`, exporting `cards`).
- Components in `docs/.vitepress/theme/components/` and `components/diagrams/` register themselves by file
  name. Do not edit `theme/index.ts`.
- The reference chapter for tone and structure is `docs/protocols/dns.md`.
- Out of scope: storage, consensus, replication, and fan-out beyond the first application server.
- Check with `npm run build` before pushing; it fails on dead links.

## Writing a chapter

1. Read `STYLE.md`, then the reference chapter and its `-review.ts` file for tone, depth and structure. Read
   the chapter's entry in `chapters.ts` for its scope (the topics are a guide, not a contract), and skim the
   other entries so you know what neighbouring chapters own.
2. Write the chapter at the path given by its `link` in `chapters.ts` (it currently holds a stub; replace
   it), its flashcards in `<same folder>/<slug>-review.ts`, and its glossary terms in
   `<same folder>/<slug>-glossary.ts`.
3. Audience: an experienced engineer, rusty on networking, preparing for senior interviews at big tech and
   AI labs. Depth matters: cover what a senior interviewer might probe, including system design and
   debugging angles, and how it shows up in production.
4. Accuracy comes first. When a fact varies by OS, network, vendor or year, say so. Give orders of
   magnitude, not false precision. Do not invent numbers, quotes, outages or citations. Use web search
   sparingly, to confirm facts you are unsure of and to get real links for the Sources list. If you cannot
   confirm something, cut it.
5. Company systems: pattern first, then a dated example from a public source (see `STYLE.md`).
6. Diagrams: add Vue SVG components in `docs/.vitepress/theme/components/diagrams/`. Conventions: `viewBox`
   640 wide, the shared classes in `custom.css` (`box`, `box-a`…`box-d`, `t`, `tb`, `h`, `m`, `ln`, …),
   plain-language labels, a `<figcaption>`. Keep text inside the viewBox. Use 1–3 diagrams where they help
   understanding; not for decoration. Give components distinctive names to avoid collisions.
7. Widgets are optional. Only add one if interacting with it teaches something the text cannot.
8. Links to chapters that are not written yet are fine; `chapters.ts` has all paths. Link to the OS Primer
   with absolute URLs.
9. Length follows importance and complexity. There is no word target, but be judicious: for each detail, ask
   whether senior or infra interviewers commonly discuss it, or whether it explains real production
   behaviour. If it is deep internals that rarely come up, cut it or keep it to a sentence in "Going deeper".
   Do not repeat what another chapter (here or in the OS Primer) explains in full; recap it and link.
10. Be economical with tokens and tool calls everywhere except the writing itself. Read only the files
   listed in your task. Do not explore the repo. Fetch from the web only to confirm a specific fact or get
   a Sources link, and stop once you have it. `dig` is not installed on the build machine; illustrative
   command output is fine if labelled as such.

### Glossary file format

```ts
// Glossary terms owned by the DNS chapter.
import type { GlossaryEntry } from '../.vitepress/glossary'

export const terms: Record<string, GlossaryEntry> = {
  'recursive-resolver': {
    term: 'Recursive resolver',
    def: 'One or two plain sentences.',
    chapter: '/protocols/dns',
  },
}
```

Ids are kebab-case and global across the book. Before adding a term, check the other `*-glossary.ts` files;
if it exists, use it rather than redefining it. Terms the OS Primer explains in full (e.g. `socket`,
`time-wait`) may be defined here briefly, with `chapter` set to the OS Primer URL.

### When several chapters are written in parallel

- Only create or edit your own chapter's files (`<slug>.md`, `<slug>-review.ts`, `<slug>-glossary.ts`) and
  new diagram/widget components.
- Do **not** edit shared files: `chapters.ts`, `glossary.ts`, `theme/`, `custom.css`, `config.mts`. If you
  need a change there, say so in your report.
- If two chapters both need a term, the one listed first in `chapters.ts` owns it; later chapters may still
  use `<Term id>` for it.
- Do not commit or push (an auto-sync script commits). Do not run `npm run build` (parallel builds
  collide); the integrator builds.
- Your report: at most 5 lines. Files written, anything cut or uncertain, any shared-file changes needed.
