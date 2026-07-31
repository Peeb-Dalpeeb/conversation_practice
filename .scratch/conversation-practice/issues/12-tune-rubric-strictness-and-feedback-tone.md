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
professional Trainee who never asks what happened and scores 1 of 6: the Feedback must be
useful to them without softening the verdict.

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

**Status:** ready-for-agent

- [ ] Criterion 3 is judged strictly; being given the cover story does not meet it, verified
      across several real Attempts.
- [ ] Evidence quotes point at the moment the verdict is about and are attributed to the
      correct speaker.
- [ ] All six criteria remain judgeable by a layperson watching the Attempt; none require
      domain expertise.
- [ ] The Feedback never praises above a failing Assessment — checked against a real Attempt
      that was warm and courteous but scored low.
- [ ] The Feedback is addressed to the Trainee and cites specific moments from their Attempt.
- [ ] The Feedback never re-opens or contradicts a verdict.

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
