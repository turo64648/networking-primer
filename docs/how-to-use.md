# How to Use This Primer

This primer is meant to be studied over a few weeks, not skimmed the night before. Each chapter builds a mental
model from first principles, then connects it to real systems and to the questions interviewers actually ask.

## What's in each chapter

- **Core explanation.** The concepts in order, each building on the last. Read this part carefully.
- **Diagrams and interactive widgets.** Where watching something move makes it click, there is a widget to play with.
- **Commands to run.** `dig`, `curl`, `mtr`, `openssl` and friends, run against real sites from your own machine, with
  example output. A few short Python scripts where code teaches something the commands cannot.
- **Why it matters in real systems.** How the concept shows up at large websites, CDNs, cloud providers and
  mobile apps. Senior interviews live here.
- **Interview questions.** From basic to senior-level follow-ups, each with a model answer. Try to answer out
  loud before opening it.
- **Where it breaks.** Real, public outages and what they teach.
- **Misconceptions.** Things that sound right but aren't, and are common in interviews.
- **Going deeper boxes.** Collapsed by default. The main text makes sense without them; open them for
  protocol fields, RFC details and company-specific systems that interviewers sometimes probe.
- **Tap-to-see terms.** Words with a dotted underline show a short definition when you tap them. All of
  them are also on the [Glossary](/glossary) page.
- **Sources.** Every chapter ends with dated sources. Networking changes fast; check the date before
  quoting a company's setup as current.
- **Flashcards.** For review a few days later. They ask *why* and *how*, not trivia.

## A suggested routine

1. Read a chapter in one sitting, running the commands and playing with the widgets.
2. The next day, go through the flashcards without re-reading.
3. Answer the interview questions **out loud**, as if to an interviewer, and only then compare with the model answer.
4. A week later, redo the flashcards. Mark the chapter as done once they feel easy.

Your progress (chapters done, known flashcards) is saved in this browser only.

## How interviewers use networking questions

At senior level, networking questions rarely stop at definitions. Expect a chain like:

> "What happens when you type a URL?" → "Why does the first request on a phone take so long?" → "Users in one
> country see p99 latency double after you moved traffic to a new region. How would you find out why?"

So for every concept, aim to be able to explain **what it is**, **what it costs**, and **when it becomes a
problem in production**.
