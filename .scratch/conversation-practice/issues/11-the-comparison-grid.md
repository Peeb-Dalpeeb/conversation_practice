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

Everything automatable was built and passing; the one thing that needed a person — looking at the
rebuilt evidence row on a projector — was done in ticket 13's rehearsals 3 and 4.

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
      Reopened: the evidence row was rebuilt after the last visual check and no one has looked at
      it since. Geometry is measured and fits; legibility is not measurable.

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

- **Implemented and verified 2026-07-31.** A browser practice sequence lasts for the lifetime of a
  browser tab, including page reloads. The comparison request names only the last two Attempt
  numbers completed in that sequence, so the first demo Attempt receives the one-Attempt screen
  even when tuning Attempts remain on disk; the second demo Attempt compares against the first.
  This is the mechanism that makes tuning and earlier mis-start records harmless without cleanup.
  A completed Attempt inside the current sequence remains a real Attempt—the application cannot
  infer that the Trainee meant to discard it merely from its length.

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

- **The 650 px fit was measured on a pair with unusually short quotes, and acceptance item 9 was
  failing. Fixed 2026-07-31.** Both earlier checks used Attempts 21 → 22, whose longest evidence
  quote is 90 characters. That is not representative: criterion 3 is answered by the Persona turn
  that reveals the prior incident, and those turns are long. The re-check used 17 → 18, whose
  criterion 3 quotes are 133 and 125 characters — the tallest evidence row any pair on disk
  produces for the criterion the spec says the author opens live.

  **17 → 18 is a worst-case layout pair, not the demo.** `surfaced-real-reason` is already met in
  both, so opening criterion 3 there shows two long quotes and no flip. The spec is explicit that
  criterion 3 flipping from not-met to met *is* the demo; ticket 10's handoff called 17 → 18 "the
  demo shape" on its 3/6 → 6/6 score alone, and those two statements do not agree. On disk the
  consecutive pairs where criterion 3 actually flips are 6 → 7, 11 → 12 and 13 → 14. Choosing a
  live pair that flips criterion 3 belongs to the dry run (ticket 13); nothing on this screen can
  produce it.

  Measured against that pair with criterion 3 open, the screen scrolled: 726 px of content in a
  1280×650 viewport (76 px over) and 756 px in a full 1280×720 viewport (36 px over). The last two
  criterion rows sat below the fold. Across all 132 evidence quotes on disk, 15 exceed 100
  characters and the longest is 162; the 162-character case overflowed 650 by 103 px.

  The cause was horizontal, not vertical. The expanded evidence row mirrored the table's
  `50% 25% 25%` columns, so each quote had a 306 px column and a 130-character quote wrapped to five
  lines. The quotes now take the full table width as two 620 px columns, and each names its own
  column (“Previous attempt evidence”) rather than relying on an alignment it no longer has. The
  vertical rhythm is tightened only inside the existing `@media (max-height: 700px)` block, so the
  desktop screen is unchanged and no type or mark size was reduced anywhere — the evidence quote,
  the marks and the criterion labels are still 18.56 / 21.12 / 19.2 px at 1280 wide.

  Re-measured with 17 → 18, criterion 3 open: 650/650 at 1280×650 and 720/720 at 1280×720, no
  scroll in either, and no scroll at 1366×768 or 1920×1080. The worst 162-character quote on disk
  now fits 1280×650 in both columns with the row unchanged at 135 px. Criterion 6 open at 1280×650
  leaves the last quote ending at 610 px with the restart control still on screen. The pairs that
  actually flip criterion 3 were measured too and are no tighter, because their not-met quote is
  short: 13 → 14 (55 and 164 characters) gives the same 135 px row and 11 → 12 gives 108 px, both
  without scroll at 1280×650.

  **What this does not establish.** Every number here is geometry — content height against viewport
  height. Acceptance item 9 asks whether the grid is legible from the back of a room, and that was
  not checked by eye on a projector, or by eye at all. It stays open until someone looks at it.

  Also removed a `margin-left: auto` on the restart control that computed to `0px` — it is an
  inline-flex child of a table cell, so the declaration never did anything. The control's position
  is unchanged; only the dead declaration is gone.

- **Closed by ticket 13's rehearsals 3 and 4, 2026-08-01.** Acceptance item 9 was looked at on the
  projector at 1280×720 and 100% zoom in both runs, with the rebuilt evidence row open: all six rows
  read from the back, criterion 3's quotes were read aloud from both columns, and rehearsal 3
  confirmed the **No qualifying Trainee moment** text legible at the same distance as a quote.

- **Reload and failure recovery hardened 2026-07-31.** The last two completed Attempt numbers are
  stored under a versioned, Scenario-specific `sessionStorage` key. A reload in the same tab keeps
  the practice sequence, and other tabs do not share subsequent sequence updates. Stored data is
  validated as unique positive safe integers and malformed or unavailable browser storage falls
  back to the in-memory sequence. A rendered-App test completes one Attempt, unmounts and remounts
  the page, completes the second, and proves the comparison request names both persisted Attempt
  numbers.

  A stop taken during `connecting`, `data-failed` and `judging-failed` now offer “Back to the
  Briefing” rather than becoming dead ends. Starting a new Attempt also makes callbacks from an
  older recovered Attempt stale: a late successful completion is still remembered in the practice
  sequence, but cannot replace the newer live screen with old Feedback. This race is covered at the
  rendered App seam.

  **Taking the way out retires the Attempt behind it.** The staleness guard first fired only when a
  new Attempt started, so a Trainee who left a failure screen and then stood still could have the
  Briefing replaced by that Attempt's Feedback with no input at all — a screen changing by itself
  while a room watches. Leaving now retires the Attempt directly. The two halves are separate on
  purpose: the completed record is still authoritative, so a retired Attempt's number still enters
  the practice sequence and becomes the Previous attempt, while its Feedback can no longer take
  back a screen the Trainee chose. Both halves are asserted together at the rendered App seam.

  The earlier seam test asserted the opposite — that a late completion took over the Briefing — and
  it described something the connector cannot produce. Every route into `data-failed` and
  `judging-failed` is terminal: `attempt_data_incomplete` returns at `src/client/realtime.ts:512`
  without entering recovery, and the other route is reached only after `recoverNewerAttempt` has
  already exhausted its window. No completion follows either one, so nothing was traded away.

  That also made the `data-failed` copy wrong. It read “Keep this page open and check that the
  local server is running,” which promised a retry that does not exist; keeping the page open
  changed nothing, and a button to leave now sat underneath it. It says the Attempt could not be
  saved and points at taking the Scenario again.
