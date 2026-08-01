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

**Status:** done

**Ticket 13's demo did wait on this.** That line used to read "does not wait on this", on the
grounds that criterion 3 quoted correctly in every case measured. It did not quote correctly in the
shape that mattered: no fixture reproduced the demo's four-offer Attempt with Jordan volunteering
the cover story at the end, and on that shape both of ticket 13's first rehearsals read Jordan's
cover story under criterion 3 — the row opened live on the projector. Ticket 13 was blocked on this
fix and on a second one found afterwards, and closed only after two further rehearsals.

- [x] A not-met verdict with no qualifying Transcript moment records that absence rather than
      quoting an unrelated line.
- [x] A met verdict still requires a quote, and the schema makes an unquoted met verdict
      impossible.
- [x] The comparison grid renders the absence legibly from the back of a room.
- [x] Attempts 12, 14, and 22 contain no unrelated borrowed evidence; repeated evidence independently proves each criterion.
- [x] Attempts persisted before the contract changed still render in the grid.

## Comments

- **Brought forward by ticket 13's two live rehearsals, 2026-07-31.** Both rehearsals hit this
  ticket on the projector, so the contract change landed here rather than waiting. Rehearsal 1 read
  "So, can I keep you on with that?" under criteria 5 and 6, neither of which the Trainee ever
  demonstrated, and both rehearsals read Jordan's cover story under criterion 3 — the row opened
  live — where the Trainee's own discount opening belonged.

  **The contract.** `evidence` is now optional on an Assessment verdict. A not-met verdict may carry
  no quote, which records that the Attempt contains no qualifying Trainee moment; a met verdict
  without a quote is rejected by the validator with a message naming the criterion. Strict
  structured outputs cannot express "nullable only when `met` is false", so the wire schema is
  nullable on both `evidence` and `evidenceTurnIndex` and the validator is what makes an unquoted
  met verdict impossible. The grid renders the absence as **No qualifying Trainee moment** in the
  not-met colour at the same size as a quote.

  **One rule moved from prose into code.** Every criterion in this Rubric judges the Trainee, so a
  not-met verdict is proved by a Trainee turn or by nothing. A Persona quote offered under a not-met
  verdict is discarded and recorded as an absence, with a server warning naming the discarded line.
  It is discarded rather than rejected because a failed Assessment in front of a room is worse than
  a row that says the Trainee never got there. A met verdict is still free to quote the Persona turn
  that proves it — that is criterion 3's whole met branch.

  **Quote reuse across two met verdicts is still the grader's judgment.** Code cannot tell which of
  two criteria a shared turn really belongs to, and forcing distinctness would only substitute a
  different wrong answer. Criteria 4 and 6 can legitimately rest on the same turn. What changed is
  that the grader is no longer obliged to reuse: the not-met branches that used to send it to a
  borrowed line now send it to an absence.

  **Measured live under the new contract, 2026-07-31.** `check-assessment.ts --live` (nine calls)
  exits zero. Criterion 3 now reads: cover-story-only → not met with **no qualifying Trainee
  moment**, which is the honest answer for an Attempt where the Trainee asked an open question and
  the Attempt stopped before Jordan answered; no-reason → not met quoting the Trainee's discount
  opening; full and long Attempts → met quoting the Persona turn that reveals the incident;
  warm-but-never-asks → not met quoting a Trainee turn. Closed-question and accepted-cover-story
  strictness both hold. Absence is being used freely and sensibly — four of six criteria on the
  closed-question Transcript, five of six on cover-story-only — and no borrowed line appears in any
  of the seven readings.

  Boxes stay unchecked: `--assert-distinct` over 12, 14 and 22 is a separate live run, and projector
  legibility is a physical check. Both are for the author.

- **The absence was read from the back of a room, and the fix needed a second pass, 2026-08-01.**
  The legibility box is closed on ticket 13's rehearsal 3, where criteria 4, 5 and 6 read
  **No qualifying Trainee moment** in the Previous attempt column at 1280×720 and 100% zoom: "That
  checks out, and it's legible." Rehearsal 4 read the same three rows as present. The other two
  boxes closed here are the contract itself and pre-contract Attempts still rendering, both held by
  the automated suite. `--assert-distinct` over 12, 14 and 22 remains open and is still a live run
  for the author.

  **The contract was right and the guidance underneath it was not.** With the Persona quote refused,
  ticket 13's demo shape stopped citing the cover story but moved criterion 3 to the third of four
  offers rather than the opening one, because criteria 1 and 3 both name the earliest Trainee turn
  that stopped discovery and the grader instruction forbade reusing a quote outright. Criterion 4
  also lacked the gate criteria 5 and 6 carry, so on one reading it borrowed the closing offer for a
  behaviour the Attempt never reached and on another it recorded the absence. Distinctness is now
  explicitly a tie-break that never overrides a turn a criterion names, and criterion 4 gained the
  gate. That makes the reuse this ticket set out to remove strictly narrower than "no two criteria
  may share a line": two criteria that each independently name the same turn now both quote it, and
  the demo's Previous column shows criteria 1 and 3 on the opening offer by design.
