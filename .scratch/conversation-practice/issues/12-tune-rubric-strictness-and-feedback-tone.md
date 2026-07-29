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

**Strictness here means ground truth, not sterner wording.** Criterion 3's entire grader
instruction is the words "Surfaced the real reason." — the grader is never told what the
real reason *is*, so nothing lets it separate the cover story from the prior incident. The
fix is to give the Assessment call the Persona's private profile; the author has approved
this. Keep the fact in `persona.privateProfile` and pass it, rather than restating it in the
Rubric — this ticket follows dozens of edits to Jordan's backstory in ticket 10, and a
second copy of that fact will drift out of step without anything catching it. If the grid
and the grader then need different text — a short label for the projector, an explicit
standard for the grader — that is the moment to split `RubricCriterion`, not before.

Run `npx tsx .scratch/conversation-practice/check-assessment.ts --live` before starting. It
judges a cover-story-only Transcript and reports whether the grader already gets this right,
which decides how much of the above is actually needed.

The Attempts to read back are the two deliberate Trainee failures recorded during ticket 10:
the one that accepted the cover story and stopped, and the one that was warm and courteous
but never asked. If they were not kept, record them before starting.

**The Feedback.** Never contradicts the Assessment — no praise for rapport sitting above
four failed criteria. Written to the Trainee rather than about them. Points at specific
moments from their Attempt rather than at conversations in general. Tells them what to do
differently, not merely what they got wrong. The case to tune against is the warm, courteous,
professional Trainee who never asks what happened and scores 2 of 6: the Feedback must be
useful to them without softening the verdict.

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
