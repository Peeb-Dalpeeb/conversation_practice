# Handoff — conversation practice PoC

Written 2026-07-28, at the end of a `/grill-with-docs` session. Resume grilling from
**Question 11** below. Everything above it is settled — do not re-open it without a reason.

## What this is

A proof of concept for a tool where employees practise difficult conversations out loud
against an AI, get judged against a rubric, read feedback, and try again to see if they
improve.

It has two jobs, in order: prove to the author that it can be built, then serve as a demo
that wins buy-in from their organization's leadership. The author drives the demo
personally.

## Settled decisions

1. **Proof of concept, not a product.** Not being sold. No multi-tenancy, no
   `Organization` model, no auth, no accounts, no manager roles, no assignments. If the
   org buys in, the data layer gets rebuilt later with better information.
2. **Build for demo quality on the surfaces leadership will look at.** Simple in *scope*,
   not simple in polish. A spike that can't be shown is half-wasted.
3. **One scenario, hard-coded in a file.** No authoring UI, no scenario picker, no persona
   library. The authoring system is the largest chunk of the eventual product and proves
   nothing.
4. **The scenario is deliberately generic and non-proprietary** — the author declined to
   use a real internal process. It is also chosen so that *product knowledge cannot help
   you*, because the author must perform it live without domain expertise.

### The scenario — "The Customer Who's Had Enough"

The trainee is a service representative. The customer opens with *"I'd like to close my
account."* The briefing tells the trainee up front that they have **no discounts, no
waivers, and no authority to change anything** — only the conversation. That constraint is
what guarantees the exercise tests listening rather than knowledge.

**Persona: Jordan Avery.**

- *Private profile:* Jordan does not really want to leave. Three weeks ago they called with
  a simple question and got someone rushed and dismissive who made them feel stupid.
  They've been stewing since. The cancellation is a protest.
- *Cover story if pressed:* "Your fees are too high. I found somewhere cheaper."
- *Behaviour rules:* open firm and clipped; get **colder** if the trainee jumps to saving
  the account with offers or discounts; comply flatly and end the call if the trainee just
  processes the cancellation without asking anything; reveal the real story only in
  response to open questions; stay cold if the trainee blames the other employee or
  apologises in a hollow scripted way.
- *Gate:* Jordan softens **only** when the incident is acknowledged without excuses.
  "That shouldn't have happened to you" passes. "We were extremely busy that week" does
  not. Until the gate is met, Jordan does not soften, does not thank the representative,
  and does not reconsider leaving.

**Why the gate is named explicitly:** language models are relentlessly agreeable and will
soften for anyone, including a trainee who opens with a discount. If that happens, attempt
one and attempt two look identical and the demo has no contrast. This is the single most
likely way the build fails. A stated flip condition is far more reliable than a described
mood.

**Rubric — six criteria, all judgeable by any layperson in the room:**

1. Didn't try to solve anything before understanding why
2. Asked an open question that invited the story
3. **Surfaced the real reason** (the earlier interaction) — the objective anchor, binary
4. Acknowledged the feeling specifically, without excuses
5. Didn't get defensive, didn't blame a colleague or "the system"
6. Checked that Jordan felt heard before moving on

Each criterion is assessed with a **quoted line from the transcript as evidence**. That
improves consistency and lets leadership independently agree with the grade, which is how
the grader earns trust.

**The demo:** attempt one, the author deliberately opens with *"I can offer you a
discount"* — a failure anyone recognises instantly and one that can be performed reliably
under pressure. Attempt two, they ask what happened. Same person, visibly better.

### Vocabulary

Locked and written to `CONTEXT.md` at the repo root. Use those terms; challenge drift.
Notably: **Assessment** (per-criterion machine judgment) and **Feedback** (coaching prose
the trainee reads) are deliberately different things. "Session" and "grade" were
deliberately rejected.

### Provider and architecture

5. **OpenAI, not Anthropic.** The author has $50 of OpenAI credit. Persona and grader both
   run on OpenAI. Anthropic/Claude SDK guidance does not apply.
6. **Grader isolation is mandatory.** The model that just played Jordan must never assess
   its own conversation — it was in it, it will be generous, and a grader that always says
   "great job" is worse than none. Here this is structural rather than disciplinary: Jordan
   runs on a realtime audio model, the grader on `GPT-5.6 Sol`. Different model, different
   call, different context.
7. **ElevenLabs was evaluated and rejected.** Their success-evaluation feature genuinely
   covers Scenario, Persona, Gate, Transcript, Rubric, and Assessment — criteria evaluated
   against the transcript returning pass/fail with rationale. But its output lands in a
   developer dashboard as agent-QA, not as trainee-facing **Feedback**, and their analytics
   are built for aggregate agent performance and A/B testing configs — not for putting one
   trainee's attempt one beside attempt two. Those two gaps are the whole demo.
8. **Browser built-in speech was dropped.** Its only rationale was zero spend and zero
   accounts; the author already has both. It is worse in every dimension and the plumbing
   would be thrown away.
9. **Build on the OpenAI Realtime API.** `gpt-realtime-2.1` / `gpt-realtime-2.1-mini`,
   speech-to-speech in one live session, WebRTC from the browser, ephemeral credentials
   minted server-side via `POST /v1/realtime/client_secrets`. **Turn-taking and
   interruption are handled inside the session** — that was the strongest argument for a
   managed voice platform and it evaporates.

**Five pieces to build:**

1. A small local server — mints ephemeral session credentials (the API key must never
   reach the browser) and runs the grading call.
2. A browser page — opens the realtime session, shows the briefing, start/stop control,
   renders feedback and the comparison.
3. A scenario file — persona, private profile, gate, rubric.
4. A grader call — transcript + rubric to `GPT-5.6 Sol`, structured per-criterion output
   with quoted evidence.
5. Storage and comparison — JSON on disk, attempts numbered per scenario, attempt one
   beside attempt two.

10. **Both tuning and demo run on `gpt-realtime-2.1` (flagship). No model split.**
    (Question 11, settled 2026-07-28.) The handoff had proposed tuning on the mini to
    protect the budget. Verified pricing killed the premise: flagship is only ~2.5x the
    mini per attempt, not an order of magnitude, because Jordan's *output* audio dominates
    and mini output is just 3.2x cheaper. Splitting saves ~$15 across the entire build. The
    Gate is the single most likely way this fails, and tuning it against a model that may
    hold a conditional rule differently means demoing behaviour never actually rehearsed.
    Not worth $15.

## Verified facts (checked against OpenAI docs 2026-07-28)

**User-side transcription exists.** Enabled at `audio.input.transcription` (`model`,
`language`, `delay`). Emits `conversation.item.input_audio_transcription.delta` and
`.completed`. Supported: `gpt-realtime-whisper` (streaming), `gpt-4o-transcribe` (more
accurate, non-streaming), `gpt-4o-mini-transcribe`, `whisper-1` (legacy).

**But the Transcript is a reconstruction, not a recording** — and this is load-bearing:

- Transcription is **not native to the model**. Jordan consumes audio directly; the
  transcript comes from a *separate asynchronous pass*. The docs call it "guidance of input
  audio content rather than precisely what the model heard."
- **Turn ordering is not guaranteed.** Must be reassembled via `item_id` and
  `input_audio_buffer.committed.previous_item_id`.
- Consequence: five of the six rubric criteria judge *the trainee's words*, which reach the
  grader via ASR — not via the channel Jordan reacted to. Jordan can visibly soften at
  something the Transcript renders wrong.

**Pricing, per 1M tokens.** Flagship audio $32 in / $0.40 cached / $64 out. Mini audio
$10 / $0.30 / $20. `gpt-5.6-sol` $5 in / $0.50 cached / $30 out (short context).
Transcription: `gpt-realtime-whisper` $0.017/min, `gpt-4o-transcribe` $0.006/min.
Audio bills at **1 token per 100ms heard, 1 per 50ms spoken** (600 / 1,200 tok per min).

**Cost of a 10-min attempt** (~22 turns, even speaking split, caching working): flagship
~$1.05, mini ~$0.41. If caching busts: ~$4.00 / ~$1.30. A 2–3 min Gate tuning run is ~$0.25
on flagship. **$50 ≈ 150 tuning runs plus 20 full attempts.** Budget is not the binding
constraint.

**Context accumulates and is rebilled each turn** — "turns later in the session will be
more expensive" — but **prompt caching is automatic**, if best-effort. Cost controls
offered: `retention_ratio` truncation, `token_limits.post_instructions`, manual item
deletion. ⚠ Truncation drops conversation items; if it ever ate early turns Jordan would
forget what the trainee had already uncovered. Instructions appear to be preserved
separately. Confirm before enabling.

**`gpt-5.6-sol` confirmed real.** Grader cost ~$0.04/attempt — noise.

11. **The Transcript is produced out-of-band by Jordan's own model.** (Question 12, settled
    2026-07-28.) A second `response.create` on the same socket with `conversation: "none"`,
    `output_modalities: ["text"]`, scoped to the latest turn. ~$0.11/attempt against $0.06
    for in-session `gpt-4o-transcribe` — cost was not the deciding factor.

    Rejected: in-session ASR. It is a *different* model's guess at the trainee's words, so
    two failures become possible on stage. (a) The evidence quote differs from what the
    room just heard the author say, and the grader's credibility — the whole basis of
    decision #4 — dies live. (b) Jordan visibly softens while the Assessment reports the
    criterion unmet, and the demo contradicts itself. Criterion 3 is binary; one slipped
    clause flips it. OpenAI's own cookbook (`realtime_out_of_band_transcription`) exists
    for exactly this reason: "The same model is used for both transcription and generation,
    minimizing inconsistencies between what the user says and how the agent responds."

    Note `gpt-4o-transcribe` *does* stream `.delta` events — live captions were never the
    thing at stake here, contrary to the earlier framing.

12. **Jordan can genuinely end the session, via a tool call.** (Question 13, settled
    2026-07-28 — the author overruled a recommendation to let only the trainee stop an
    Attempt.) The hang-up is the scenario's sharpest lesson: you did your job correctly and
    learned nothing about why the customer left. Neutering it costs more than the demo
    control it buys. Mechanism is an explicit tool call, not phrase-matching on "goodbye" —
    the model must *decide*, and a tool call can be logged and constrained. Grading fires
    on that call. The trainee can also stop an Attempt manually. Add a ~12 minute hard cap
    as a cost guard (plumbing, not a design decision).

13. **Jordan may end the call only once cancellation is actually underway.** (Question 14,
    settled 2026-07-28.) Narrow and factual: the trainee has asked for account details,
    confirmed the cancellation, or stated it is done. Same reasoning that produced the
    named Gate — "a stated flip condition is far more reliable than a described mood" —
    applied to the hang-up, because decision 12 hands the model a button that ends the live
    demo. Critically, **the deliberate discount opening in attempt one can never trigger
    it**, so the demo's contrast is safe.

    Rejected: letting Jordan judge when it's over (the described-mood approach already
    rejected once for the Gate, and here it fails on stage rather than during tuning); a
    minimum-turn floor (not a fact about the character, and it stretches a fast correct
    cancellation); an exit for trainee hostility (fuzzy, fires unpredictably, unrehearsable).

14. **Feedback comes from a second call that sees the Assessment and the Transcript, and is
    instructed not to re-judge.** (Question 15, settled 2026-07-28.) Grade first, coach
    second. ~$0.04 extra — cost is irrelevant here; structure is the point.

    The failure being designed out: a trainee who is warm, courteous and professional but
    never asks what happened scores 2 of 6. A single call producing verdicts *and* prose
    writes "you built great rapport!" directly above a scorecard showing four failures.
    Leadership believes one of the two and you cannot control which. That is the same drift
    grader isolation (decision 6) already defends against, reappearing one layer down —
    and the glossary already commits to the fix by defining Feedback as *derived from* the
    Assessment.

    Rejected: one combined call (nothing structurally prevents the drift); Assessment-only
    input (strictest, but the coaching goes generic and cannot point at the moment it went
    wrong); deterministic templating (cannot contradict the grade and costs nothing, but
    reads mechanical, against decision 2's demo-polish bar).

15. **The comparison is a six-by-two grid, met/not-met, with evidence quotes revealed on
    click.** (Question 16, settled 2026-07-28.) Legible from the back of a room on a
    projector; you open criterion 3 live to show the exact line, controlling the reveal
    rather than competing with a wall of text. Criterion 3 flipping from not-met to met
    *is* the demo — everything else on that screen is supporting material.

    Rejected: all quotes inline (twelve quoted lines plus a grid doesn't survive a
    projector); a "3 criteria improved" headline (states the conclusion instead of letting
    the room reach it, which is weaker proof); including both Feedback paragraphs (Feedback
    is written for the trainee, not for an audience).

16. **The comparison always shows the latest two attempts, labelled relatively** —
    "Previous attempt" / "This attempt". (Question 17, settled 2026-07-28.) By demo day
    roughly forty tuning attempts sit on disk, so absolute numbering would put "Attempt 41"
    on the projector under narration saying "attempt one". Relative labels are honest at
    any number and the spoken narration supplies "one" and "two". No pre-demo reset ritual
    to forget while a room watches.

    Rejected: absolute numbering plus clearing storage (a manual step on demo day is a
    liability); separate practice/demo storage (real plumbing for a cosmetic problem); an
    attempt picker (most UI, and one more thing to click correctly while presenting).

17. **Node + TypeScript.** (Question 18, settled 2026-07-28.) The author's normal stack is
    TypeScript and React. One language across server and page; types earn their keep
    against the realtime event zoo, turn reassembly via `item_id` /
    `previous_item_id`, out-of-band responses, and the end-call tool. The server is ~100
    lines — mint a credential, run two grading calls, read and write JSON — so author
    fluency outweighs ecosystem fit.

    Rejected: plain JS (faster loop, but no types where event handling is most
    error-prone); Python server (two languages in a five-file project); Next.js (heaviest
    scaffolding for four screens, and the framework fights raw WebRTC).

18. **React via Vite for the page.** (Question 19, settled 2026-07-28.) The page carries
    most of the build's real state: connection lifecycle (idle → live → ended), a
    transcript accumulating as `.completed` events land out of order, and the comparison
    grid's expandable evidence rows. Costs a Vite config and a dev proxy to the Node
    server. Rejected: plain DOM (instant refresh, but hand-rolled state in the least
    practised style); server-rendered React (the realtime session is entirely client-side,
    so SSR buys little).

19. **During an attempt the screen shows near-nothing** — a speaking/listening indicator
    and a stop control. No briefing, no live transcript. (Question 20, settled
    2026-07-28.)

    **This established a governing principle, which supersedes part of decision 2: the
    application is built for the trainee, not for the demo audience. The demo is performed
    *around* the app, not *inside* it.** An employee taking this for real would not be
    reading text on screen — they would be talking to a customer. The author narrates the
    briefing and constraints to the room verbally when pitching; the app does not need to
    carry that. Decision 2's demo-polish bar still applies to the surfaces the trainee
    uses, and above all to the comparison screen — but "leadership will look at it" is no
    longer a reason to put something on screen *during* an attempt.

    Rejected: briefing sidebar and/or live captions. The reasoning offered for them — that
    the room needs the constraints visible to judge the attempt fairly, and that laptop
    audio is often hard to follow — was real but solved in the wrong place. Narration
    solves it without compromising the trainee experience.

    ⚠ **Consequence to handle:** with no transcript on screen, a silent transcription
    failure is invisible until after the attempt ends — and the grader cannot work without
    it. Suggest a hidden debug panel behind a keyboard shortcut so the author can verify
    the out-of-band transcript is flowing during tuning, without it ever appearing in the
    trainee experience.

    Note: the briefing is still shown **before** an attempt begins — that remains settled
    from the scenario definition and was not revoked here.

## ADRs — written 2026-07-28

- `docs/adr/0001-grader-isolation.md`
- `docs/adr/0002-build-rather-than-configure-elevenlabs.md`
- `docs/adr/0003-transcript-comes-from-the-persona-model.md`

Deliberately **not** written, having failed the three-gate test:

- **Jordan's constrained hang-up.** Genuine trade-off and genuinely subtle, but it is a line
  in a prompt file and trivially reversible. The constraint carries its own comment where it
  lives.
- **The near-nothing screen during an attempt.** Someone will read it as unfinished and add
  captions back — but it is cheap to reverse and is recorded as a governing principle in
  decision 19 above. Reconsider if anyone else starts working on this.
