# 11 — The comparison grid

**What to build:** After reading their Feedback, the Trainee sees their two most recent
Attempts side by side as a six-by-two grid of met / not-met marks, and can take the Scenario
again immediately — while they still remember what they said. The improvement is the
product.

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

- [x] The comparison always shows the two most recent Attempts for the Scenario, in order.
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

- **Implemented and verified 2026-07-31.** The server reads only the two highest numeric Attempt
  files for the current Scenario and returns a comparison-shaped response with relative labels,
  Rubric descriptions, marks, and evidence — no Attempt numbers, Transcript, or Feedback. A
  completion-seam test posts the recorded event-log fixture 42 times, then proves the response is
  built from Attempts 41 and 42. The one-Attempt response is explicit rather than exceptional.

  Starting again from the comparison calls the Realtime connector anew. A no-reload test starts
  two consecutive Attempts, observes two client-secret requests, and inspects both submitted raw
  event logs to prove each contains only its own marker.

  The real comparison data already on disk was viewed at 1280×720. All six rows and the retry
  control remain visible; opening criterion 3 reveals both quotes without introducing a summary
  headline or Feedback prose. The font sizes and met/not-met marks were kept large while the
  vertical rhythm was tightened enough for the expanded evidence row to fit a 720p projector.
