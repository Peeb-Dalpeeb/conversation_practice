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

Roughly forty tuning Attempts are already on disk and must cause no problem at all — no
confusing numbers on screen, no cleanup step, nothing to remember while a room is watching.

Anything that only shows up under real conditions gets found here: a grid that is too small
from the back of the room, a judging wait that feels too long in silence, a hang-up that
fires when it should not, an Attempt that ends before the author has made their point.

**Blocked by:** 08 — The Persona hangs up, and the hard cap; 10 — Tune the Gate; 12 — Tune
the Rubric's strictness and the Feedback's tone.

**Status:** ready-for-human

- [ ] The whole run works from a cold start with one command and no manual setup.
- [ ] The deliberate discount opening produces a visibly cold Jordan and does not trigger a
      hang-up.
- [ ] Attempt two, done properly, produces a materially different Assessment — criterion 3
      flips from not met to met.
- [ ] The comparison grid is readable from the back of the room on a projector.
- [ ] Criterion 3 can be opened live and shows the exact line from each Attempt.
- [ ] Pre-existing tuning Attempts on disk cause no visible problem and require no cleanup.
- [ ] The Briefing and constraints are narrated, not displayed during an Attempt.
- [ ] The full run is rehearsed end to end at least twice without intervention.

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
