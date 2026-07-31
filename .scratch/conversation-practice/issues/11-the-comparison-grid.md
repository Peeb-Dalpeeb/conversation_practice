# 11 — The comparison grid

**What to build:** After reading their Feedback, the Trainee sees the two most recent Attempts
completed in the current browser practice sequence side by side as a six-by-two grid of met /
not-met marks, and can take the Scenario again immediately — while they still remember what they
said. The improvement is the product.

The two Attempts are labelled **relatively**: "Previous attempt" and "This attempt". Not
"Attempt 40" and "Attempt 41". By demo day roughly forty tuning Attempts will be sitting on
disk, and absolute numbering would put "Attempt 41" on a projector under narration saying
"attempt one". Relative labels are honest at any number, the spoken narration supplies "one"
and "two", and there is no pre-demo reset ritual to forget while a room is watching. Dozens
of tuning Attempts must sit harmlessly alongside the demo Attempts.

Evidence quotes are hidden until a criterion is clicked, then reveal the quoted line from
both Attempts. Twelve quoted lines plus a grid does not survive a projector, and hiding them
keeps the grid readable — but the author needs to open criterion 3 live and show the exact
line, controlling the reveal instead of competing with a wall of text.

No headline. No "3 criteria improved" summary. The room reaches the conclusion from the grid
itself, which is stronger proof than being told it. Do not show the Feedback paragraphs here
either — Feedback is written for the Trainee, not for an audience.

A first Attempt, with nothing to compare against, gets a coherent screen — not an error and
not an empty grid that looks broken before the tool has been used twice.

The grid must be legible from the back of a room on a projector. That is the actual
acceptance criterion and it is verified by running it and looking at it, not by a test.

**Blocked by:** 07 — Feedback, and reading it after an Attempt.

**Status:** done

- [x] The comparison always shows the two most recent Attempts completed in the current browser
      practice sequence, in order.
- [x] They are labelled "Previous attempt" and "This attempt" — never absolute numbers.
- [x] The presentation is a six-by-two grid of met / not-met marks.
- [x] Clicking a criterion reveals the evidence quotes from both Attempts; they are hidden
      until asked for.
- [x] There is no summary headline stating the conclusion, and no Feedback prose on the
      comparison screen.
- [x] A single existing Attempt yields a coherent no-comparison screen rather than an error.
- [x] The Trainee can start another Attempt from this screen.
- [x] Dozens of pre-existing Attempts on disk change nothing about what is displayed; no
      reset or cleanup step is needed.
- [x] The grid is legible from the back of a room on a projector, verified by looking at it.

## Comments

- **From ticket 10's live tuning, 2026-07-31 — three things this ticket cannot derive.** Attempts
  1–22 are on this machine only (`data/` is gitignored). Detail in
  `.scratch/conversation-practice/ticket-10-run-log.md`.

  **Cross-Attempt isolation currently rests on the page reload, and this ticket removes it.** Attempt
  3 verified there is no channel between Attempts: `session.created` carries no `conversation`
  field, the `conversation.item.added` count matches that Attempt's turns exactly, no item predates
  the first Trainee line, and `instructions` is exactly `buildPersonaInstructions` output. Each
  Attempt also mints a fresh 60-second client secret (`src/server/realtime.ts:77`). **All of that
  was verified under F5.** If "start another Attempt from this screen" leaks any conversation state,
  "Previous attempt" and "This attempt" become a fresh Jordan compared against one who remembers —
  which silently voids the comparison this screen exists to make. Re-verify from the raw event log,
  the same way, and note the 60-second expiry means the control must re-mint rather than reuse.

  **Mis-started Attempts persist as real records.** Attempt 20 is a two-turn abort sitting on disk
  as a legitimate Attempt, and it would have been "Previous attempt" for Attempt 21. A one-click
  restart makes mis-starts more frequent, and "the two most recent Attempts" will put a two-turn
  fragment on a projector.

  **Real pairs already on disk, so the grid can be built and judged without running anything.**
  Attempts 17 (3/6) → 18 (6/6) are consecutive and are the demo shape — a genuine improvement.
  21 (2/6) → 22 (0/6) is a decline. 18 → 19 is 6/6 twice.

  **Caution for the grid's premise: the grader is non-deterministic on identical input.** Attempts
  1–4 have identical Trainee lines; `avoided-defensiveness` graded MET, MET, MET, then not met. A
  cell can therefore differ between two Attempts without the Trainee having changed anything.
  Ticket 12 owns the fix; this ticket should know the grid can show a change that did not happen.

- **Implemented and verified 2026-07-31.** A browser practice sequence begins when the page loads.
  The comparison request names only the last two Attempt numbers completed in that sequence, so
  the first demo Attempt receives the one-Attempt screen even when tuning Attempts remain on disk;
  the second demo Attempt compares against the first. This is the mechanism that makes tuning and
  earlier mis-start records harmless without cleanup. A completed Attempt inside the current
  sequence remains a real Attempt—the application cannot infer that the Trainee meant to discard
  it merely from its length.

  The server orders the selected Attempts by their persisted numbers and returns relative labels,
  Rubric descriptions, marks, and evidence—no Attempt numbers, Transcript, or Feedback. With no
  explicit selection it still compares the latest two valid, current-Rubric Attempts. Unreadable
  JSON and Assessments incompatible with the current Rubric are skipped rather than collapsing the
  whole screen. A completion-seam test posts the recorded event-log fixture 42 times and proves the
  default response is built from Attempts 41 and 42; another proves exact selection and malformed
  record recovery.

  **Reveal-flow decision:** Feedback remains on its own screen and “See your comparison” is an
  explicit author-controlled reveal. This makes the transition in the written “Feedback, then
  comparison” flow a deliberate click rather than an automatic replacement of the Feedback.

  Starting again from the comparison calls the Realtime connector anew. The automated no-reload
  tests prove the App control calls the connector again, two client-secret requests are made, and
  the two submitted client-side raw-event-log buffers contain disjoint markers. They do **not**
  reproduce ticket 10's live provider readings: `session.created` conversation identity, exact
  `conversation.item.added` count, earliest item relative to the first Trainee line, and exact
  `buildPersonaInstructions` output remain a live dry-run check. No additional live microphone run
  was performed while addressing these findings.

  The grid was rechecked in an actual 1280×650 browser viewport with criterion 6 expanded using the
  real latest compatible pair on disk. Both bottom-row evidence quotes and the restart control are
  visible together, and the document height equals the 650 px viewport (no vertical scroll). This
  is stricter than the original 1280×720 criterion-3 check.
