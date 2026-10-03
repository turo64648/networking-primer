# Writing Style Guide

Every chapter follows this guide. The reader is an experienced engineer who is rusty on networking,
often reading on a phone. The goal is understanding they can explain out loud in an interview, not
memorisation.

## The three rules that matter most

1. **Never use a term before you explain it.** Explain it in plain words where it first appears in the
   chapter, even if an earlier chapter already did. If the chapter does not need the term, leave it out.
2. **Show the example before the name.** Describe the concrete situation first, then give the formal term.
3. **Keep two layers.** The main text must make complete sense on its own, in plain language. Header
   fields, RFC details, company-specific systems and exact numbers go in "Going deeper" boxes.

## Sentences and words

- One idea per sentence. Aim for 20 words or fewer; never more than 30.
- Paragraphs of at most 4 sentences.
- Active voice: "the CPU checks the table", not "the table is checked".
- Plain words: "before" (not "prior to"), "use" (not "utilise"), "make sure" (not "ensure").
- One word, one meaning. Pick one term for a thing and use only that term in the chapter. For example,
  do not switch between "recursive resolver", "resolver" and "DNS server" without saying they are the same.
- Spell out acronyms. Use an acronym only if interviewers use it (DNS, TLS, BGP, CDN), and introduce it once:
  "the Border Gateway Protocol (BGP)".
- Do not rely on the reader's memory of something far above. Restate it in a few words where needed.
- No filler: no "it's worth noting", "interestingly", "simply", "just", "obviously".

## Chapter structure

Each chapter uses these parts, in this order:

1. **Title and a two-sentence intro**: what this is and why interviewers care.
2. **"Before you start" box** (`::: info Before you start`): 3–4 plain sentences on what the reader needs
   to know, with links to the chapters that explain it. The chapter must still make sense without them.
3. **Main sections.** Each `##` section starts with a one-line summary in bold, beginning with
   **In short:**. Then the explanation.
4. **"Going deeper" boxes** (`::: details Going deeper: <topic>`) inside sections, for precise details.
5. **Diagrams and widgets** where seeing it helps. Label them in plain words; protocol or RFC names may appear
   in brackets.
6. **Commands** the reader can run: `dig`, `curl -w`, `mtr`, `traceroute`, `openssl s_client`, `ss`, `tcpdump`.
   Show trimmed example output and say what to look for. They must work on stock Linux or macOS; say when
   one needs root. Use short Python only when code teaches something the commands cannot (a toy consistent
   hash, a slow-start simulation), with a comment on the first line showing how to run it.
7. **"Why this matters in real systems"**: short, concrete stories (large websites, CDNs, cloud providers,
   mobile apps, ML serving).
8. **"Where it breaks"**: 2–4 short stories of real, public failures (postmortems, incident reports), each
   with the year and a link, and the lesson in one sentence. If you cannot confirm the details, leave it out.
9. **Interview questions**: each in a `::: details` block. Model answers use plain language first, then a
   "Senior add-on" line with the precise, deeper point. Include at least one design question ("how would
   you build…") and one debugging question ("users see X; how do you find out why?").
10. **Common misconceptions**: short bullet list.
11. **Key takeaways**: at most 5 bullets.
12. **Review**: `<Flashcards>` then `<MarkDone>`. There is no multiple-choice quiz.
13. **Sources** (`## Sources`): a short list of what the chapter relies on. Each item: title, kind (RFC,
    paper, engineering blog, documentation, code) and year, with a link. Prefer RFCs and papers.

## Company-specific systems

Large companies describe their systems (Google's Maglev, Meta's Katran, and so on) in papers and blog posts
that may be years old. To keep the book accurate:

- **Pattern first.** Explain the general technique in plain words. Then give the company system as one
  example of it.
- **Always date it.** "Maglev, described in Google's 2016 paper, …". Never write "Google uses X today" or
  present a description as the current setup.
- **Only what the source says.** Do not fill gaps with guesses. If a detail is not in a public source, leave
  it out.
- Put the company detail in a "Going deeper" box or a "Why this matters" story, not in the main explanation.
- Numbers that change over time (adoption percentages, certificate lifetimes, standard status) get a date:
  "as of 2025".

## Terms and the glossary

- The glossary is merged from per-chapter files (`<slug>-glossary.ts` next to each chapter). Every term that appears in more than one chapter
  belongs there, with a one or two sentence plain definition.
- Wrap a glossary term with `<Term id="anycast">anycast</Term>` **the first time** it appears in a chapter (only
  the first time). The reader can tap it to see the definition.
- Add new terms to the glossary when you write a chapter.

## Flashcards

- Ask **why** and **how**, not trivia. Good: "Why do page tables need to be a tree?" Bad: "How many bits
  index each page table level?"
- Answers are 1–3 plain sentences.
- 12–20 cards per chapter.

## Lists and formatting

- At most 5–6 bullets in a list. Split longer lists into groups.
- Use tables only for comparisons across the same attributes.
- Bold sparingly: key terms at the point they are explained, and the "In short" lines.
- Numbers: give an order of magnitude with units, tied to a setting ("about 70 ms round trip from London to
  New York", "tens of milliseconds on 4G, more when the radio is idle"). Never one flat number for something
  that depends on distance or network. Put exact numbers in "Going deeper".

## Example

Too dense:

> The stub queries the RD-bit-set recursive, which walks root → TLD → authoritative unless the RRset is cached within TTL.

Following this guide:

> Your phone does not find the address by itself. It asks a server run by your network or a public service,
> which does the searching for it. That server is called a **recursive resolver**. It remembers every answer
> for a time the website chooses, so most questions are answered from memory.
>
> `::: details Going deeper: the flags` — the phone's request sets the "recursion desired" (RD) bit, and
> the remembered answer is kept for the record's time-to-live (TTL).

## The OS Primer

This book is a sibling of the [OS Primer](https://turo64648.github.io/os-primer/), which covers what happens
inside one machine. Do not re-teach what it covers (sockets, socket buffers, `TIME_WAIT`, the accept queue,
NAPI, receive-side scaling, kernel bypass). Recap it in one sentence and link to the OS Primer chapter with an
absolute URL, for example [OS Primer, ch. 15](https://turo64648.github.io/os-primer/io/networking).
