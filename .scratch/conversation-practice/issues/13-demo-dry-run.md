# 13 — Demo dry run

**What to build:** A full rehearsal of the demo, performed exactly as it will be performed
in the room, from a cold machine. This is the ticket that proves the thing the project
exists to prove: leadership watches a person do a conversation badly, reads a judgment they
can independently agree with, and then watches the same person do it visibly better.

The run:

1. One command starts everything. No deployment, no setup step, no reset ritual.
2. The author narrates the Briefing and the constraints out loud — they are not on screen
   during an Attempt, and that is deliberate. The app is built for the Trainee; the demo is
   performed *around* it, not inside it.
3. Attempt one is bad on purpose, opening with "I can offer you a discount". A failure the
   room recognises instantly and the author can reproduce reliably under pressure. Jordan
   must not hang up.
4. Attempt two is done properly.
5. The comparison grid goes on the projector. The author opens criterion 3 live and shows
   the exact line. The room reaches the conclusion from the grid rather than being told it.

Twenty-two tuning Attempts are already on disk and must cause no problem at all — no
confusing numbers on screen, no cleanup step, nothing to remember while a room is watching.

Anything that only shows up under real conditions gets found here: a grid that is too small
from the back of the room, a judging wait that feels too long in silence, a hang-up that
fires when it should not, an Attempt that ends before the author has made their point.

**Blocked by:** 08 — The Persona hangs up, and the hard cap; 10 — Tune the Gate; 12 — Tune
the Rubric's strictness and the Feedback's tone.

**Status:** done

- [x] The whole run works from a cold start with one command and no manual setup.
- [x] The deliberate discount opening produces a visibly cold Jordan and does not trigger a
      hang-up.
- [x] Attempt two, done properly, produces a materially different Assessment — criterion 3
      flips from not met to met.
- [x] The comparison grid is readable from the back of the room on a projector.
- [x] Criterion 3 can be opened live and shows the exact line from each Attempt.
- [x] Pre-existing tuning Attempts on disk cause no visible problem and require no cleanup.
- [x] The Briefing and constraints are narrated, not displayed during an Attempt.
- [x] The full run is rehearsed end to end at least twice without intervention.

## Comments

- **From ticket 11, 2026-07-31: the practice sequence now survives a reload, so demo the run in a
  tab that has not been tuned in.** The last two completed Attempt numbers are held in
  `sessionStorage`, keyed per Scenario. This was done so a reload cannot silently destroy a demo
  sequence mid-run — but it also removes the reset that used to happen for free. Before, F5 started
  a fresh sequence; now the sequence lives as long as the tab does.

  What that changes for this run: ticket 11 guarantees that the first demo Attempt shows the
  one-Attempt screen rather than comparing against a leftover tuning Attempt. That guarantee now
  depends on the demo starting in a tab where no Attempt has been completed. Tune in one tab, demo
  in a new one — or close the tab between the two. Attempt two's comparison is unaffected either
  way, because it always shows the last two.

  This is a ritual, and line 10 of this ticket says there is not supposed to be one. It is one
  keystroke rather than a cleanup step, and the alternative — a reload wiping the sequence between
  Attempt one and Attempt two — is worse in front of a room. Worth confirming during the rehearsal
  that it is actually invisible, and worth deciding then whether "no reset ritual" is satisfied.

  Also new from ticket 11: a stop taken while connecting, a failed event log, and a failed judging
  all now offer "Back to the Briefing" instead of dead-ending. Those are the recovery paths to
  exercise if anything goes wrong mid-rehearsal. Taking one of them retires the Attempt behind it,
  so no late report can pull the screen off the Briefing while a room is watching; if that Attempt
  did complete on the server, its number still counts as the Previous attempt.

- **From ticket 12, 2026-07-31: unblocked, and two lines on the projector changed.** Ticket 12 is
  `done`. Its one unfinished thread — evidence quotes that borrow a line on criteria the Attempt
  never reached — is ticket 15 and this rehearsal does not wait on it: the verdicts are right, and
  criterion 3, the one opened live, quotes correctly in every case measured.

  **Two Rubric descriptions were rewritten, so narrate the new wording.** Criterion 1 now reads
  "Established the real reason before moving on or trying to solve it." and criterion 5 "Responded
  to the real experience without defensiveness, excuses, or blame." Both used to be phrased as
  things the Trainee did *not* do, which a Trainee who barely spoke satisfied for free — a room
  reading "Did not get defensive: met" under a total failure is the opposite of the point. The grid
  renders `description`, so this is the text the room reads.

  **The deliberate discount opening now reads well on criterion 3.** Regraded, it comes back not
  met citing the Trainee's own "I can offer you a discount on your next six months" — the moment
  that foreclosed the conversation — where it used to cite Jordan's generic "I'd like to close my
  account." That is the contrast for attempt two to flip against.

  **What the bad Attempt should score.** The cover-story stop measures 0 of 6 and the
  warm-never-asks 0 of 6; a clean Attempt measures 6 of 6. If a rehearsal shows the bad Attempt
  scoring above zero, regrade it with `regrade-attempt.ts <n> --live` before assuming the run was
  better than intended.

  **Re-run `check-assessment.ts --live` (nine calls, ~$0.40) if either prompt or any Rubric
  description is touched between now and the room.** It exits non-zero on every strictness
  boundary this demo depends on.

- **Automated and browser preflight, 2026-07-31.** The prepared demo machine passes environment
  validation, typechecking, all 141 tests, and the production build. A process-down start with
  `npm run dev` brought up both the local API and Vite from one terminal. The Briefing was inspected
  in the real page at a 1280×720 viewport; starting an Attempt replaced it with only the connection
  indicator and stop control.

  The deterministic seams already cover the rest of the plumbing this ticket depends on: the page
  requests only the two Attempt numbers completed in the current tab-scoped practice sequence,
  preserves them across reload, hides evidence until a criterion is opened, and renders both exact
  quotes when it is opened. The comparison endpoint returned a six-row relative-labelled grid from
  persisted Attempts while 22 unrelated tuning Attempts remained on disk. No cleanup was needed.

  This is not recorded as either required rehearsal. The controlled browser cannot supply a human
  spoken performance to the microphone, and projector legibility is explicitly a physical
  acceptance check in the project’s testing decisions. The current-prompt criterion-3 flip and the
  absence of a stochastic Hang-up therefore still need to be observed twice end to end by a person.
  `.scratch/conversation-practice/demo-rehearsal.md` fixes the narration, exact Trainee lines,
  projector checks, and evidence table for those two runs. Status is `ready-for-human` until both
  rows are complete; none of the acceptance boxes is checked on preflight evidence alone.

- **Audit of the preflight, 2026-07-31: two blocking findings before a person runs this.** The
  automated claims re-checked and hold — 141 tests over 8 files, `npm run build` green through
  typecheck, lint and vite. The status flip to `ready-for-human` with no box checked is right, and
  the Attempt-two script in the rehearsal sheet reproduces persisted Attempt 18 turn for turn, which
  scores 6 of 6 on disk. Two things below have to be fixed before the sheet is executable, and the
  status should go back to `ready-for-agent` until they are.

  **Blocking 1: the criterion-3 reveal has never been measured on the script the sheet asks for.**
  The sheet's Attempt one is four offers. That exact shape is already on disk twice — Attempts 4 and
  11 — and on both, criterion 3's evidence is Jordan's line, not the Trainee's: Attempt 4 quotes
  "No, cancel it." at 0 of 6, Attempt 11 quotes "I'm tired of repeating this; close the account." at
  1 of 6. The comment above claiming it now cites "I can offer you a discount on your next six
  months" traces to the synthetic three-turn `noReasonTranscript` in `check-assessment.ts` — persona
  opening, one discount line, "No. Cancel it." — not to the four-offer shape. Three extra Jordan
  refusals are exactly the surface the grader previously chose from, and this is the single line the
  demo pivots on live. Attempt 11 also shows criterion 5 met for free, which is the failure ticket
  12 rewrote that description to close, so the 0-of-6 expectation is unverified for this shape too.
  Run `regrade-attempt.ts 4 11 --live` under the current prompt and add both to `knownExpectations`,
  which covers 12, 18, 19, 21 and 22 but neither of the two Attempts that match the demo script. If
  the quote does not land on the Trainee's opening, that is a Rubric fix, not a rehearsal note.

  **Blocking 2: one sheet observation cannot be made where the sheet puts it.** After Attempt one
  the sheet says to confirm criterion 3 is not met and cites the discount opening. The path after
  Attempt one is the Feedback prose and then the "One more Attempt to compare" notice; there is no
  per-criterion view anywhere in it. The check is impossible as written. Either add a
  `node .scratch/conversation-practice/show-attempt.mjs latest` step in the server terminal, or move
  the check to the projector section where it appears as the Previous attempt column.

  **The grid is unrecoverable if it is lost.** `showComparison` has two call sites, both driven by
  in-memory state. A reload, crash or stray tab close while the grid is on the projector drops to
  the Briefing with no route back — the only way to see it again is a third Attempt, which relabels
  the columns. Ticket 11's recovery paths all lead to the Briefing and do not help here. Add a
  rehearsal step that deliberately reloads on the grid and record what the fallback is.

  **Smaller gaps in the sheet.**

  1. The evidence table records only criterion 3, but ticket 12 made the 0-of-6 / 6-of-6 totals the
     regression tripwire. Add a met-count column for each Attempt.
  2. The sheet settles the question ticket 11 deferred to this rehearsal. Ticket 11 asked the author
     to decide here whether "no reset ritual" is satisfied; the sheet asserts the fresh tab is the
     natural cold-start state and gives the decision no column. Leave it as the author's call.
  3. Two acceptance boxes have no step or column: pre-existing tuning Attempts causing no visible
     problem, and the Briefing being narrated rather than displayed. All eight should map to
     evidence.
  4. The Feedback screen is on the projector twice and is never checked. Ticket 12 tuned its tone
     specifically; Feedback that reads against the verdicts in front of the room is the failure
     grader isolation exists to prevent. Add an observation for it.
  5. "The projector resolution" is unnamed. The preflight measured 1280×720. Unnamed, the two
     rehearsals and the room can differ and the legibility box proves nothing — and that box is also
     ticket 11's last open acceptance line, so one look should close both.
  6. A fresh tab is not reliably fresh: Chrome restores `sessionStorage` on session restore. Say to
     confirm the one-Attempt screen actually appears, and what to do if it does not.
  7. Ticket 12's comment prices `check-assessment.ts --live` at nine calls, ~$0.40; the script's own
     header says ~$0.25. They should agree, since the author is told to run it if a prompt changes
     before the room.
  8. This ticket's body still says roughly forty tuning Attempts are on disk. There are 22.

- **Audit worked, 2026-07-31.** The required live command
  `npx tsx .scratch/conversation-practice/regrade-attempt.ts 4 11 --live` completed under the
  current prompt before the rehearsal sheet was changed. Attempt 4 scored 0 of 6 and criterion 3
  was not met with evidence “I can offer you a discount on your next six months.” Attempt 11 also
  scored 0 of 6 and criterion 3 was not met with evidence “I can offer you a discount on your next
  six months” (no terminal period in that Transcript). The live results therefore do not reopen
  ticket 12. Both Attempts are now in `knownExpectations`, including their 0-of-6 totals, criterion-3
  verdict, and exact evidence text.

  The rehearsal sheet now checks criterion 3 only where the UI exposes it, in the Previous attempt
  column after Attempt two. It names 1280×720 at 100% zoom, checks both Feedback screens, records a
  separate met count for each Attempt, leaves the no-reset-ritual decision to the author, maps the
  tuning-data and narrated-Briefing requirements to observations, detects restored
  `sessionStorage`, and specifies how to restart if the first screen is not the one-Attempt screen.
  A final grid-loss drill records the unrecoverable reload behavior and the room fallback: repeat
  both scripted Attempts in a new browser context rather than taking a third Attempt.

  The live-check cost header now agrees with the nine-call estimate of approximately $0.40, and the
  ticket body records the 22 Attempts actually on disk. Typechecking, lint, all 141 tests, and the
  production build pass. Status is `ready-for-human`; all eight acceptance boxes remain unchecked
  for the author to decide during the two live rehearsals.

- **Both rehearsals ran, and both found the same blocking evidence failure, 2026-07-31.** Attempts
  29/30 and 33/34. Everything the ticket is about held: the deliberate discount opening left Jordan
  cold with no Hang-up, the bad Attempt measured 0 of 6 and the good one 6 of 6, criterion 3 flipped
  from not met to met, all six rows read from the back at 1280×720, the 22 pre-existing Attempts were
  invisible and needed no cleanup, both Feedback screens matched their verdicts, and the reload drill
  confirmed the grid is unrecoverable with repeating both Attempts in a new window as the fallback.

  What failed is the quote under criterion 3, the row opened live. Both rehearsals showed Jordan's
  cover story — "The fees are too high, and somewhere else is cheaper." — where the required evidence
  is the author's own opening, "I can offer you a discount on your next six months." Rehearsal 1 also
  showed "So, can I keep you on with that?" under criteria 5 and 6, behaviours the Trainee never
  demonstrated. This attempt's criterion 3 quoted Jordan's prior-incident disclosure correctly in
  both runs.

  **Fixed under ticket 15, which this ticket no longer routes around.** The not-met branch of
  criterion 3's `assessmentGuidance` used to prefer the closest reason the Persona had stated, and
  the cover story is exactly that; criteria 5 and 6 used to fall back to "the Trainee turn that moved
  on", which in an Attempt that never reached the real experience is the same last turn twice. A
  not-met verdict can now record the absence of a qualifying Trainee moment, and a Persona quote
  under a not-met verdict is refused in code. See ticket 15's comment for the contract.

  **Two fresh rehearsals are required.** The change touches the grader instructions and all six
  Rubric `assessmentGuidance` strings. `check-assessment.ts --live` was re-run afterwards and exits
  zero on every strictness boundary this demo depends on, including criterion 3 in all five of its
  shapes — see ticket 15's comment for the readings. What that run cannot cover is the demo's own
  four-offer shape with Jordan volunteering the cover story at the end, which is the exact shape that
  failed: no fixture reproduces it, and it has never been read under the new wording. Typechecking,
  lint, 151 tests and the production build pass.

  No acceptance box is checked on the first two runs: rehearsal rows 1 and 2 stand as the record of
  what was found, and rows 3 and 4 are for the repeat. Status stays `ready-for-human`.

- **The repeat pair ran and the ticket is done, 2026-08-01.** Rehearsal 3 used Attempts 35 and 36,
  rehearsal 4 Attempts 37 and 38. Both runs were complete and uninterrupted, and both produced the
  demo this ticket exists to prove: the deliberate discount opening left Jordan cold with no
  Hang-up, the bad Attempt measured 0 of 6 and the good one 6 of 6, all six rows read from the back
  at 1280×720 and 100% zoom, the pre-existing Attempts on disk were invisible and needed no cleanup,
  both Feedback screens matched their verdicts, and the reload drill again confirmed the grid is
  unrecoverable with repeating both Attempts in a new window as the fallback. All eight acceptance
  boxes are checked on rows 3 and 4; no box is checked on automated evidence.

  **The criterion-3 evidence failure is gone, and the row now reads correctly in both columns.** In
  both rehearsals the Previous attempt column quoted the author's own opening — "I can offer you a
  discount on your next six months" — and This attempt quoted Jordan's prior-incident disclosure.
  Criteria 4, 5 and 6 read **No qualifying Trainee moment** in the Previous column, and rehearsal 3
  confirmed that text legible from the back at the same distance as the quotes.

  **A Rubric fix was required first, and it was not the one ticket 15 had already made.** Before
  rehearsal 3, `regrade-attempt.ts 29 33 --live` was run against the demo's own four-offer shape,
  which no fixture reproduces. Jordan's cover story was gone — ticket 15's refusal held — but
  criterion 3 had moved to the *third* offer, "There's a cheaper plan I could move you to today.",
  rather than the opening one. Criteria 1 and 3 both name the earliest Trainee turn that stopped
  discovery, which in this shape is the same turn, and the grader instruction's flat ban on reusing
  a quote was walking criterion 3 down the list to keep the columns distinct. Attempt 33 also put
  "So can I keep you on with that?" under criterion 4, where Attempt 29 recorded an absence:
  criteria 5 and 6 each gate their not-met quote on the conversation having reached the behaviour,
  and criterion 4 had no such gate.

  Two changes: the grader instructions now say a turn named by a criterion's `assessmentGuidance`
  is quoted even when another criterion names the same one, and distinctness is never a reason to
  move to a later or weaker turn; and criterion 4 gained criterion 5's gate. Criterion 3's guidance
  restates "earliest" as binding over the avoidance. Re-measured, both Attempts pin on the opening
  offer and record an absence on criterion 4, stable across two readings each
  (`--repeat=2 --assert-stable`, no variation). Both are now in `knownExpectations` with their
  0-of-6 totals and criterion-3 evidence, so the boundary cannot drift back.

  **One consequence the room will see: criteria 1 and 3 show the same quote** in the Previous
  column, because the opening offer is the turn that failed both and each criterion names it
  independently. Attempt 18 likewise shows the acknowledgment turn under criteria 1, 4 and 5 in the
  This attempt column. Ticket 15 leaves reuse across met verdicts to the grader's judgment; the
  rehearsal sheet now names both pairs as expected so neither is scored as a failure. Both
  rehearsals reported these two pairs and no other repeat.

  **`check-assessment.ts --live` was re-run after the Rubric change**, as this ticket requires when
  a prompt or Rubric description is touched. All seven strictness boundaries read GOOD, including
  criterion 3's met branch quoting the Persona turn in both the full and long Attempts. Attempt 18
  regraded at 6 of 6. Typechecking, lint, 151 tests and the production build pass.

  **No reset ritual: the author's decision is that the requirement is satisfied.** "Starting in a
  newly created browser context satisfied no reset residual, I'm fine with that." Both runs began in
  a new window and both showed the one-Attempt screen after Attempt one, which is the proof the
  practice sequence was fresh without any cleanup step. This settles the question ticket 11 deferred
  to this rehearsal.

  **Two boxes rest on blanket confirmations rather than specific observations**, and that is
  recorded rather than smoothed over. The cold-start box and the narrated-Briefing box are supported
  by "Everything checks out." (rehearsal 3) and "Everything is working as described" (rehearsal 4),
  each given in answer to a prompt that named the one-command start, the absence of any other setup
  step, and the Briefing being narrated and then off screen. Rows 1 and 2 carry a distinct quote for
  the Briefing; rows 3 and 4 do not. A specific observation was asked for a second time before
  rehearsal 4 and a blanket answer was given again. Rehearsal 4's fallback, judging wait, no-reset
  decision and intervention cells are likewise one blanket answer — "I approve all of these. They
  all worked great." The verdicts are the author's and are recorded as given.
