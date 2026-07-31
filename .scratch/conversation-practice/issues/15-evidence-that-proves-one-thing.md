# 15 — Evidence that proves one thing

**What to build:** An Assessment where each criterion's evidence is independent proof of that
criterion, and where a criterion with no qualifying moment says so instead of borrowing a line
that proves nothing.

This is the half of ticket 12's second acceptance criterion that prompt tuning cannot reach.
Speaker attribution was fixed there and holds: every criterion about the Trainee now quotes a
Trainee turn, across all six recorded wrong-speaker instances. What remains is quote reuse.

**Why another prompt edit will not do it.** Ticket 12 tried one — "give each criterion its own
best evidence" — and measured it making no difference, and on one Attempt making reuse worse. The
reason is structural rather than a wording problem. A Transcript that ends the moment Jordan
reveals the incident contains no later Trainee turn to acknowledge it, to be non-defensive about
it, or to check that it landed. The Assessment contract requires an exact Transcript quote for all
six verdicts regardless, so the grader must reach for a line that is not about the verdict. Told
to vary the quotes it will substitute weaker evidence; told to pick the best it will repeat the
one good line. Both are correct responses to a contract that asks for something that was never
said.

Measured on this machine, 2026-07-31, after ticket 12's final prompt:

- Attempt 14 cites "Can you tell me what happened?" for four of six criteria.
- Attempt 12 cites "Did something happen?" for three.
- The cover-story-only Transcript cites one Trainee line for five of six.
- Attempt 22 has two separate pairs sharing a quote.

In each case the Attempt genuinely contains no qualifying Trainee moment for the criteria that
had to borrow.

**The shape of the fix.** Let a verdict carry either a quote or the absence of one. `evidence`
becomes optional, or gains a sibling that records "no qualifying Trainee moment", and the
validator accepts a not-met verdict that declines to quote rather than rejecting the whole
Attempt. The comparison grid then has to render that absence — and rendering it well is most of
the value, because "never got here" is a different and more useful thing for a room to read than
a line that does not support the verdict.

**Do not let this soften a verdict.** Absence of evidence is only ever available to a not-met
verdict. A met verdict without a quote is the flattering-grader failure `docs/adr/0001` exists to
prevent, and the strict schema should keep it impossible.

**The instrument already exists.** `npx tsx .scratch/conversation-practice/regrade-attempt.ts 12
14 22 --live --assert-distinct` fails on exactly the reuse this ticket removes, over persisted
Attempts and without modifying them. Attempts 1–22 are on this machine only (`data/` is
gitignored).

**Related, and deliberately not fixed here: evidence-quote variation between identical readings.**
Three readings of Attempt 1 kept every verdict stable and alternated `avoided-defensiveness`
between two Trainee quotes; four readings of Attempt 21 varied four criteria's quotes. Verdicts
have been stable in every repeat measured since ticket 12. The comparison grid renders evidence,
so two identical Attempts can still show different text — worth knowing before the grid is trusted
to show change, and `--assert-stable` reports it. Fixing it is a different question from this one
and may need nothing more than the tie-break rule already in the prompt to bite harder.

**Blocked by:** 12 — Tune the Rubric's strictness and the Feedback's tone.

**Status:** ready-for-agent

Ticket 13's demo does not wait on this. The grid is legible and the verdicts are right; the
weakness is in the supporting quote on criteria the Attempt never reached, and criterion 3 — the
one opened live on the projector — quotes correctly in every case measured.

- [ ] A not-met verdict with no qualifying Transcript moment records that absence rather than
      quoting an unrelated line.
- [ ] A met verdict still requires a quote, and the schema makes an unquoted met verdict
      impossible.
- [ ] The comparison grid renders the absence legibly from the back of a room.
- [ ] `regrade-attempt.ts --assert-distinct` passes over Attempts 12, 14 and 22.
- [ ] Attempts persisted before the contract changed still render in the grid.
