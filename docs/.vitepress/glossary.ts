// Plain-language definitions for terms used across chapters.
// Used by <Term id="..."> popovers and the Glossary page.
//
// Each chapter keeps its own terms in `<chapter folder>/<slug>-glossary.ts`, exporting `terms`.
// They are merged here automatically, so parallel chapter writers never edit this file.
// Shared terms not owned by any one chapter go in `base` below.

export interface GlossaryEntry {
  term: string
  def: string
  chapter?: string // link to the chapter that explains it in full (may be an absolute OS Primer URL)
}

const base: Record<string, GlossaryEntry> = {}

const chapterFiles = import.meta.glob<{ terms: Record<string, GlossaryEntry> }>('../**/*-glossary.ts', { eager: true })

export const glossary: Record<string, GlossaryEntry> = Object.assign(
  {},
  base,
  ...Object.keys(chapterFiles).sort().map((k) => chapterFiles[k].terms),
)
