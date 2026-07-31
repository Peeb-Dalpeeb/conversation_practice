# 12 — Tune the Rubric's strictness and the Feedback's tone

**What to build:** The Assessment can be trusted by someone who just watched the Attempt,
and the Feedback reads like coaching. Hand-tuning work over the Assessment and Feedback
prompts, using persisted Attempt records to read back what each produced.

**The Rubric.** Criterion 3 — surfaced the real reason — is judged strictly. It is the one
thing the whole Scenario is built around and it is not given away for free; a Trainee who
was merely told the cover story has not met it. Verdicts are met or not met with no partial
credit. Evidence quotes must point at the moment the judgment is actually about, attributed
to the right speaker.

All six criteria must stay judgeable by any layperson in the room. That is a design
constraint, not an accident: leadership has to be able to agree with a verdict
independently, and that is how the grader earns trust. Do not add a criterion that requires
expertise, and do not sharpen strictness by making a criterion subtler.

**Strictness here means ground truth, not sterner wording.** Criterion 3's grader
instruction was once the whole of "Surfaced the real reason." — the grader was never told
what the real reason *is*, and measurement confirmed it counted the cover story as meeting
the criterion, quoting "Fees are too high, and I can get something cheaper somewhere else"
as its evidence. Fixed in `8b1c49e` by passing `persona.privateProfile` to the Assessment
call. Keep the fact there and pass it, rather than restating it in the Rubric: this ticket
follows dozens of edits to Jordan's backstory in ticket 10, and a second copy would drift
out of step without anything catching it. If the grid and the grader later need different
text — a short label for the projector, an explicit standard for the grader — that is the
moment to split `RubricCriterion`, not before.

Verified 2026-07-29 across four Transcripts: cover-story-only and a warm Attempt that never
asks both return NOT MET, while a 9-turn and a 22-turn successful Attempt return MET. All
four anchor the quote to a Persona turn rather than to the Trainee turn that asked for it,
which is the line ticket 13 opens on the projector.

**What is still open: criteria phrased as things the Trainee did not do are met vacuously.**
A cover-story-only Attempt still scores 3 of 6, because "did not try to solve anything" and
"did not get defensive" are both satisfied by a Trainee who barely spoke — in that run both
cited "Can you tell me what happened?" as their evidence, which is evidence of neither. An
instruction requiring the Trainee to have had the opportunity and avoided it did not shift
it. This is measured, not predicted.

Re-measured 2026-07-29 against the warm Trainee who never asks and then processes the
cancellation: that Attempt scores **1 of 6**, not the 2 of 6 this ticket previously predicted.
"Did not try to solve anything before understanding why" correctly came back NOT MET, quoting
"Of course. I'll process the cancellation now." So the vacuous inflation is narrower than
recorded: it costs two criteria only when the Attempt stops before the Trainee solves
anything, and one — "did not get defensive" — once the Attempt reaches a solution. That one
criterion is the remaining strictness work.

**Superseded on 2026-07-31 — read the first Comment before acting on this paragraph.** The same
case re-measured as Attempt 22 scores 0 of 6, and `avoided-defensiveness` came back not met on
evidence that proves nothing. The remaining strictness work is still that one criterion, but it
now presents as a correct verdict with a bad quote rather than as an inflated score, which is
harder to see and is the thing to tune against.

Both remaining evidence smells are quote reuse rather than wrong verdicts: the cover-story
run cites "Can you tell me what happened?" for four of its six criteria, and the 9-turn
Attempt cites one Trainee reflection for both "acknowledged the feeling" and "checked that
the customer felt heard". The verdicts are defensible; the quotes stop being independent
proof, which is what the evidence is for.

`npx tsx .scratch/conversation-practice/check-assessment.ts --live` (~$0.25) is the
regression check for all of the above, and it now runs the Feedback call over two of the four
Transcripts — run it after each edit to either prompt.

The Attempts to read back are the two deliberate Trainee failures recorded during ticket 10:
the one that accepted the cover story and stopped, and the one that was warm and courteous
but never asked. If they were not kept, record them before starting.

**The Feedback.** Never contradicts the Assessment — no praise for rapport sitting above
four failed criteria. Written to the Trainee rather than about them. Points at specific
moments from their Attempt rather than at conversations in general. Tells them what to do
differently, not merely what they got wrong. The case to tune against is the warm, courteous,
professional Trainee who never asks what happened and scores 1 of 6 — Attempt 22 on this
machine, which re-measured as 0 of 6: the Feedback must be useful to them without softening the
verdict.

**Measured 2026-07-29, and this is the Feedback's real problem — it coaches towards the cover
story.** Ticket 07's live check ran Feedback over that exact warm Attempt. It did not soften
the verdict and it did not leak the prior incident, both of which the structure was built to
prevent. What it did instead was advise *"ask an open question such as, 'Could you tell me
which fees have been most frustrating?'"* and offer *"It sounds like cost is the deciding
factor and you've found an option that offers better value — is that right?"* as the
acknowledgement to aim for. A Trainee who follows that coaching interrogates the cover story
more thoroughly and never gets near the incident.

The coach is not guessing carelessly. It receives `criterionId` slugs with no criterion text,
so `surfaced-real-reason: not met` beside the quoted price line is all it has, and a pricing
detail is the reasonable inference from it.

Passing the Rubric's `description` text was the first proposal and it is a dead end: criterion
3's description is `'Surfaced the real reason.'`, the slug in a sentence, so it would overrule
ticket 07's "Those two are the entire input" in exchange for no new information on the one
criterion that failed.

**Fix it in the prompt, which is this ticket's job anyway.** One line in
`feedbackInstructions()`: a Persona's stated reason is not necessarily the real one, so where a
criterion about surfacing the real reason is not met, the reason the Persona gave is not
established — coach the Trainee towards asking what sits behind it rather than towards
examining it in more detail. Say what to aim for and not only what to avoid; a bare prohibition
trades confident wrong advice for vagueness, and a Trainee scoring 1 of 6 needs the Feedback to
stay useful. `assessmentInstructions()` already makes this move next door and is allowed to
name the cover story outright because it holds the Private Profile; the Feedback version stays
one level more abstract, which is the amount it can know without being handed the answer. The
instruction describes a shape rather than a fact, so nothing leaks. See ticket 07's Comments
for the observed prose.

This is hand-tuning, deliberately not automated — the Rubric's strictness and the Feedback's
tone are model behaviour, and an automated test over them would be slow, flaky, and would
not catch what matters. The instrument is the persisted Attempt records: run the Scenario,
read back the Assessment and Feedback, edit, run again.

**Blocked by:** 11 — The comparison grid.

**Status:** done

Ticket 11 is finished apart from one human check — whether the grid is legible on a projector —
which nothing here is waiting on.

**Scope note, corrected 2026-07-31.** This ticket was written expecting to touch
`assessmentInstructions()` and `feedbackInstructions()` only. It ended up changing
`src/scenario.ts` as well: `RubricCriterion` gained `assessmentGuidance`, and two `description`
strings were rewritten. `description` is what the comparison grid renders, so the projector text
changed — read the last Comment before ticket 13's rehearsal.

- [x] Criterion 3 is judged strictly; being given the cover story does not meet it, verified
      across several real Attempts.
- [x] Evidence quotes are attributed to the correct speaker — all six recorded wrong-speaker
      instances verified fixed.
- [ ] Evidence quotes point at the moment the verdict is about, independently per criterion.
      **Carried to ticket 15**; it needs a data-contract change, not more prompt tuning.
- [x] All six criteria remain judgeable by a layperson watching the Attempt; none require
      domain expertise.
- [x] The Feedback never praises above a failing Assessment — checked against a real Attempt
      that was warm and courteous but scored low.
- [x] The Feedback is addressed to the Trainee and cites specific moments from their Attempt.
- [x] The Feedback never re-opens or contradicts a verdict.

## Comments

- **From ticket 10's live tuning, 2026-07-31.** Attempts 1–22 are on this machine only (`data/` is
  gitignored). Detail in `.scratch/conversation-practice/ticket-10-run-log.md`.

  **The two deliberate failures this ticket asks for were kept.** Accepts the cover story and stops:
  **Attempt 21**, 2/6. Warm and courteous, never asks: **Attempt 22**, 0/6. Clean successes to use as
  positive controls: **Attempts 18 and 19**, both 6/6 on the final Scenario wording.

  **This ticket's 1-of-6 measurement is superseded, and the correction is worse news than it looks.**
  The warm-never-asks case is recorded above as scoring 1/6 with `avoided-defensiveness` as the one
  remaining vacuous met. Attempt 22 scored **0/6** — that criterion came back not met, but cited
  *Jordan's* line "I still want the account closed" as its evidence. The verdict is right by
  accident on evidence that proves nothing, so the vacuous-met problem can now present as a correct
  verdict with a bad quote. That is harder to spot than the inflated score it replaces.

  **A reproducible strictness defect not yet recorded here, in the same family as criterion 3.**
  `asked-open-question` is marked MET on a bare "why are you closing the account?" — Attempts 12, 13
  and 21 — which never invites the story. It is marked correctly in Attempts 14 and 15, which cite
  genuinely open questions, and correctly not met in Attempt 22, where none was asked. So open is
  distinguished from closed correctly *except* that a bare "why" is accepted as an invitation.

  **The grader is non-deterministic on identical input.** Attempts 1–4 have identical Trainee lines;
  `avoided-defensiveness` graded MET, MET, MET, then not met. Worth fixing here for ticket 11's sake
  as well: the comparison grid can otherwise show a change the Trainee did not make.

  **Wrong-speaker evidence quotes now have six instances** — Attempts 6, 14, 15, 17, 21 and 22, all
  citing a Persona turn on a criterion that grades the Trainee. Direct evidence for this ticket's
  second checkbox.

- **Implemented and live-verified 2026-07-31.** `assessmentInstructions()` now makes negative
  evidence concrete, assigns Trainee and Persona evidence to the right criteria, rejects a bare
  request for a reason as an invitation to the story, makes the no-defensiveness opportunity
  explicit, and treats checking that the customer felt heard as a distinct step. The Rubric itself
  and the Private Profile remain unchanged. `feedbackInstructions()` now praises only actions
  backed by a met verdict and, when the real reason was not surfaced, models an open discovery
  question without repeating the stated reason or suggesting possible answers.

  The prescribed live harness was run after each prompt edit. On the final run, the cover-story
  stop's Assessment had 1 of 6 criteria met with `surfaced-real-reason` not met on a Persona quote;
  the warm-never-asks case had 0 of 6 met; the 22-turn positive control had all 6 met; and the short
  positive fixture had 5 of 6 met because it acknowledged the experience but did not separately
  check that the customer felt heard. Criterion 3 was correctly not met for both failures and met
  for both positive controls, with Persona evidence in all four.

  The final prompt was also run over the persisted records requested by this ticket. Attempts 18
  and 19 remained Assessments with all 6 criteria met. Attempt 21 moved from 2 of 6 criteria met to
  none: `asked-open-question` is now not met on "Why are you closing the account?",
  `surfaced-real-reason` is not met on the price cover story, and every Trainee-behaviour criterion
  cites a Trainee turn. Attempt 22 remained an Assessment with no criteria met and the same correct
  speaker attribution. Its Feedback opens with the premature move to cancellation, models "Could
  you tell me what happened?", explains the next acknowledgment and check, and neither praises
  courtesy nor coaches into fees. The fixed verdicts are never re-opened.

- **Audit follow-up, 2026-07-31.** The audit correctly found that `asked-open-question` still had
  a yes-or-no hole, that the grader applied two standards stricter than their projected
  descriptions, that no durable check covered the new boundary, and that the always-Persona rule
  for `surfaced-real-reason` produced meaningless evidence when Jordan never stated any reason.

  The Rubric now owns typed `assessmentGuidance`, while `assessmentInstructions()` is generic and
  names no criterion IDs. The two projected descriptions that had drifted now say the standards
  actually applied: establish why before moving on or solving, and respond to the real experience
  without defensiveness, excuses, or blame. Open-question guidance explicitly rejects yes-or-no
  questions even when Jordan volunteers a story. Criterion 3 quotes Jordan when Jordan states a
  reason, but falls back to the Trainee action that foreclosed discovery when no reason was stated.
  This is the split between projector text and explicit grader guidance anticipated in this
  ticket, with both stored on the same `RubricCriterion` so they cannot drift by criterion ID.

  The live harness now exits unsuccessfully on a wrong criterion-3 verdict or speaker, a yes-or-no
  question counted as open, a meaningless no-reason quote, or either Feedback failure. Persisted
  Attempts can be regraded without overwriting them using `regrade-attempt.ts`; repeated readings
  report verdict/evidence variation and exact quote reuse, with opt-in strict assertions.

  Final live verification: the synthetic closed-question case correctly returned
  `asked-open-question` not met, and the no-reason case cited the Trainee's discount offer for
  criterion 3. Persisted Attempt 12 now has only `surfaced-real-reason` met; both "Why do you want
  to close the account" and "Did something happen?" are rejected as open questions.

  **Evidence independence remains open, so the second checkbox is reopened.** Three identical
  regrades of Attempt 1 kept every verdict not met, but `avoided-defensiveness` alternated between
  two Trainee quotes. Attempt 14 still reused "Can you tell me what happened?" for four criteria.
  A Transcript that ends immediately after Jordan reveals the incident contains no later Trainee
  quote for acknowledgment, defensiveness, or checking; the current Assessment contract still
  requires an exact quote for all three. Another prompt cannot create independent evidence that
  was never spoken. The honest next design is for Assessment to distinguish quoted evidence from
  "no qualifying Trainee moment" and teach the comparison grid to display that absence. That is a
  data-contract and UI change, not further prompt tuning, and is deliberately not hidden behind a
  completed checkbox.

  `Status:` remains `ready-for-agent`: the repository's documented triage labels do not define a
  completed state, and the evidence-contract work above remains available. The stale harness note
  that called the warm failure 2 of 6 is corrected to the measured 0 of 6.

- **Editorial pass, 2026-07-31. One regression found and fixed; the ticket is closed and the
  remainder is now ticket 15.**

  **`understood-before-solving` was bought by the cover story.** Rewriting its `description` to
  "Established why before moving on or trying to solve it." removed the vacuous-negative phrasing
  but left "why" unbound, and the cover story is a why. Regraded over persisted Attempt 21 — the
  Trainee who asks a bare "why", hears the price story, says *"Understood, the fees are higher than
  you'd like"* and closes the account — the criterion came back **met in three readings of four**,
  taking Attempt 21 from 0 of 6 back to 1 of 6. Criterion 3 was never exposed to this because
  ground truth binds it; criterion 1 is simply the first criterion a Trainee can reach while still
  inside the cover story, and it had nothing binding it.

  Fixed by binding it the same way: the description now reads "Established the real reason before
  moving on or trying to solve it." and its `assessmentGuidance` names the Private Profile as
  ground truth for what counts as why, saying that restating or accepting the price cover story
  never establishes it. Four further readings of Attempt 21 returned not met every time, 0 of 6
  throughout. `scenario.test.ts` now pins the ground-truth clause on both criteria that can be
  reached from inside the cover story, so a future rewording cannot quietly unbind either.

  **The harness gained the case that would have caught it.** `ACCEPTED COVER STORY` is Attempt 21's
  shape and fails the run if `understood-before-solving` comes back met. The harness is now nine
  live calls, roughly $0.40. `assessment.test.ts` no longer keeps a second copy of a Rubric
  description; it asserts against `scenario.rubric[0].description`, since that duplicate is what
  broke when the wording changed.

  **Everything else in the comment above verified independently.** The full harness passes end to
  end, exit 0: criterion 3 correct and Persona-quoted on all four Transcripts that state a reason,
  the no-reason case citing the Trainee's discount offer, and the closed question rejected.
  Persisted Attempts 18 and 19 hold at 6 of 6, Attempt 12's `asked-open-question` is not met on
  both "Why do you want to close the account" and "Did something happen?", and Attempt 22 stays at
  0 of 6.

  **Ticket 13 is not waiting on anything here.** Attempt 1 — the discount opening the demo uses on
  purpose — now cites the Trainee's own *"I can offer you a discount on your next six months"* as
  criterion 3's evidence, which is a line worth putting on a projector, where it used to cite
  Jordan's generic opening. The two rewritten descriptions change what the grid renders; read them
  before narrating the rehearsal.

  `Status:` set to `done`, which is the string the other ten completed tickets in this tracker use
  and which `docs/agents/triage-labels.md` invites the repository to adopt. The second checkbox was
  a compound claim — right speaker *and* right moment. The speaker half is met and verified across
  all six recorded instances; the independence half is unmet, unticked, and carried by ticket 15
  rather than left to hold this one open.
