# 08 — The Persona hangs up, and the hard cap

**What to build:** The Persona can end the call itself. A Trainee who simply processes the
cancellation without asking anything gets Jordan complying flatly and hanging up — and
learns the Scenario's sharpest lesson: you did the job correctly and learned nothing about
why the customer left. Judging fires exactly as it does for a Trainee-initiated stop.

The hang-up is an explicit tool call, not phrase-matching on "goodbye". The model must
*decide*, and a tool call can be logged, constrained, and reasoned about when it misfires.

**It is available only once cancellation is actually underway** — stated narrowly and
factually in the Scenario file: the Trainee has asked for account details, confirmed the
cancellation, or stated that it is done. This is the same reasoning that produced the named
Gate, applied here because it hands the model a button that can end a live demo. A bad
opening must give the Trainee a cold conversation, not no conversation. Specifically: the
author's deliberate bad Attempt, opening with "I can offer you a discount", can never
trigger it. If it can, the demo dies thirty seconds in and there is no contrast to show.

The constraint carries its own comment where it lives, in the Scenario file. There is
deliberately no ADR for it — it is a line in a prompt file and trivially reversible.

Rejected, and not to be reintroduced: letting the Persona judge when the call is over (a
described mood, which fails on stage rather than during tuning); a minimum-turn floor (not a
fact about the character, and it stretches a fast correct cancellation); an exit for Trainee
hostility (fuzzy, fires unpredictably, unrehearsable).

Also in this ticket: a hard cap of roughly 12 minutes ends an Attempt that has run
unreasonably long, and triggers judging the same way. This is a cost guard and plumbing, not
a design decision — a session left open must not quietly spend the budget. It is the cost
guard that is actually needed; do not reach for realtime truncation instead. Truncation
removes conversation items, and if it ever ate early turns the Persona would forget what the
Trainee had already uncovered, breaking the Gate mid-Attempt.

Capture an event log from an Attempt where the Persona performed the Hang-up and add it to
the completion endpoint's fixtures.

**Blocked by:** 05 — Attempt completion: reassembly and persistence (the seam).

**Status:** done

- [x] The Persona ends the call via an explicit tool call, never by phrase-matching.
- [x] The tool is available only once cancellation is genuinely underway — account details
      asked for, cancellation confirmed, or stated as done — and the precondition is stated
      in the Scenario file with a comment explaining why it is narrow.
- [x] An Attempt opening with "I can offer you a discount" cannot trigger the hang-up,
      verified by running it.
- [x] A Trainee who processes the cancellation without asking anything gets a flat compliance
      and a hang-up.
- [x] The Hang-up tool call terminates the Attempt and triggers judging.
- [x] Every firing of the tool is logged.
- [x] A hard cap of roughly 12 minutes terminates the Attempt and triggers judging.
- [x] Realtime truncation is not enabled.
- [x] The completion endpoint's fixtures include a real event log where the Persona performed
      the Hang-up.

## Comments

- **The Scenario half of the precondition is already written and is wired into nothing.**
  `persona.hangUpPrecondition` exists in `src/scenario.ts` with the narrow, factual condition
  this ticket asks for and the comment explaining why it is narrow. But
  `buildPersonaInstructions` in `src/server/realtime.ts` assembles `characterBrief`,
  `behaviourRules`, `gate` and `standingInstructions` and never reads it, so the Persona has
  never been told the constraint. Thread the existing field through; do not write a second
  copy of the condition into the instruction builder. Ticket 12 records what a second copy
  costs — it drifts out of step during tuning with nothing to catch it, and ticket 10 is dozens
  of edits to Jordan's behaviour.

- The session config sends no `tools` today, so the Hang-up tool is new plumbing rather than a
  change to existing plumbing. Every firing has to be logged, and the raw event log already
  captures both directions of the data channel unmodified, so a tool call is in the log by
  construction — check that before building a second logging path for it.

- **Both new ways an Attempt can end belong on the Trainee-stop path.** The client has two
  termination routes: `stop()`, which commits the audio buffer, cancels the in-flight response
  and finalizes, and `handleUnexpectedEnd()`, which exists for a dropped line and puts a
  different screen in front of the Trainee. This ticket says judging fires exactly as it does
  for a Trainee-initiated stop, so the Hang-up tool call and the hard cap both route through
  the first. Routing them through the second shows a line-dropped message at the demo's
  sharpest moment.

- **Three of the acceptance criteria cannot be closed with mocked tests, and this is where the
  last ticket went wrong.** The discount opening never triggering the hang-up, the flat
  compliance and hang-up for a Trainee who just processes the cancellation, and the captured
  Hang-up event log all need a live Attempt with a real microphone. Ticket 07 was built with a
  green suite and two acceptance criteria untouched, because everything that mattered was
  behind a mock. Build up to the point of needing the author at the microphone, then stop and
  say what to run. `data/` is gitignored, so a captured log has to be copied deliberately into
  `test/fixtures/raw-event-logs/` — see that directory's README and
  `.scratch/conversation-practice/evidence/README.md` for the distinction between a fixture and
  a kept capture.

- **Implementation checkpoint, 2026-07-29 — ready for live author verification.** Run
  `npm run dev`, open the page URL printed by Vite, and perform these two Attempts with a
  real microphone:

  1. After Jordan's opening, say exactly, "I can offer you a discount." Jordan must become
     colder and continue the Attempt; no Hang-up or judging screen may appear. Stop this
     Attempt manually.
  2. Start again. Ask for the account details, confirm that cancellation is proceeding, then
     state that it is complete without asking why Jordan is leaving. Jordan must comply
     flatly, finish speaking, and perform the Hang-up. The page must leave the live screen
     immediately and produce Feedback.

  The second Attempt writes a raw log under `data/raw-event-logs/`. Locate the newest file
  with
  `Get-ChildItem data/raw-event-logs -File | Sort-Object LastWriteTime -Descending | Select-Object -First 1`,
  copy it to `test/fixtures/raw-event-logs/persona-hangs-up.json`, document it in that
  directory's README, and run it through the completion-endpoint test before marking the
  final fixture criterion complete. The completion seam already covers a role-less Hang-up
  item before, after, and beside the Persona turn it accompanies; the captured fixture is
  still required to establish the Persona's behaviour and to confirm the API produces one of
  those three placements.

- **First live run, 2026-07-29 — two of the three live criteria pass; the Persona hangs up
  mute.** Both Attempts were judged and persisted, so the whole path from tool call to
  Feedback works end to end.

  Passing. The discount opening never made the tool available: 247 envelopes, and not one
  `response.function_call_arguments.done` in the log. The Hang-up terminated the Attempt and
  triggered judging on the Trainee-stop path, with the firing present in the raw log by
  construction. The Hang-up fired after "I've started the cancellation now", which is the
  precondition's second clause — narrow as written, and it held.

  Failing. Jordan hung up **without a closing line**, so the Trainee heard the call end in
  silence. The Hang-up response carried `output: [function_call]` and no audio item, and the
  client's `response.cancel` was answered `response_cancel_not_active` — nothing was cut off,
  because nothing was ever generated. This is a prompt fault, not a plumbing one: the old tool
  description said "hang up after you have finished speaking", which reads as already satisfied
  by the previous turn. Both the behaviour rule and the tool description now require the flat
  sentence and the Hang-up in the same turn. The log is kept as
  `.scratch/conversation-practice/evidence/hang-up-without-a-closing-line.json`.

  Still open: re-run the second Attempt against the revised wording, and promote *that* log as
  the fixture. The mute log would satisfy the fixture criterion literally, but it would install
  a behaviourally wrong Attempt as the reference Hang-up.

- **What the captured Hang-up settles, and what the existing logs already settled.** Three
  orderings the client's Hang-up handling depends on were checked against the three logs in
  `test/fixtures/raw-event-logs/`, across all twelve spoken responses in them:
  `output_audio_buffer.started` always precedes `response.done`, `output_audio_buffer.stopped`
  or `.cleared` always follows it, and both carry `response_id`. Default responses carry
  `conversation_id` on `response.created` and out-of-band ones do not, which is what makes
  `activeDefaultResponses` a usable signal for "the Persona is still mid-turn". A pending
  Hang-up therefore always resolves — on the audio drain for a spoken response, on
  `response.done` for a tool-only one.

  The first live Hang-up answered the first of the two open questions: the `function_call`
  item's `previous_item_id` was the Trainee's last turn, so the item lands at the **tail** of
  the chain — the placement the old code already handled. Reassembly steps over role-less items
  regardless, so a future run that nests it differently is covered too.

  Still unanswered, and still not worth speculative code: whether a response can reach
  `response.done` carrying audio that never reaches playback — the one shape that would leave a
  Hang-up pending until the twelve-minute cap. The re-run is the first capture that could show
  it, because it is the first where the Hang-up shares a turn with spoken audio.

- **Second live run, 2026-07-30 — all three live criteria pass. The ticket is complete.** Both
  Attempts were run against the revised wording and persisted as `0003` and `0004`.

  The Hang-up Attempt (`0003`, 162 envelopes) is now the fixture,
  `test/fixtures/raw-event-logs/persona-hangs-up.json`. Its final `response.done` carries
  **both** output items — a `message` with `output_audio` content, "Okay. Please go ahead and
  complete it.", and the `function_call`. That is the mute failure fixed: the closing line and
  the Hang-up now arrive in the same turn, exactly as the revised behaviour rule and tool
  description ask.

  This capture also answers the question the previous comment left open. The order is
  `output_audio_buffer.started` → `response.done` → `output_audio_buffer.stopped`, with the
  client's `input_audio_buffer.commit`, `response.cancel` and `output_audio_buffer.clear` all
  arriving **after** the buffer stopped. A response carrying audio does reach playback before
  the Hang-up resolves, the pending Hang-up resolved on the drain as designed, nothing was
  clipped, and the closing Persona turn reassembles with `cutOff: false`. No speculative code
  was needed and none should be added.

  The `function_call` item's `previous_item_id` is the Persona turn it accompanies, so this run
  placed it **after** the spoken turn rather than at the tail of the chain as the first capture
  did. Both reassemble identically, which is what the role-less-item handling at the completion
  seam is for. Two live captures now disagree on placement, so the three-placement coverage
  stays.

  The discount opening (`0004`, 221 envelopes) was re-run against the revised wording and still
  never makes the tool available: zero tool calls across three separate commercial offers, with
  Jordan getting colder each time. The Attempt stayed live until **Stop attempt**.

- **Follow-up, not a defect in this ticket: the Hang-up is not legible to the Trainee.** The
  author's reaction to `0003` was that the ending felt abrupt rather than pointed, and the log
  says why. Nothing records *how* an Attempt ended: `personaHangUpToolName` appears in the
  client, which ends the Attempt on it, and in session minting, and nowhere else. Reassembly
  does not look for it and the persisted Attempt has no field for it, so `0003` and `0004` are
  structurally identical on that point. The Feedback for `0003` reads as though the call ended
  normally, and even coaches the Trainee to ask "Is there anything else you'd like me to know
  before I complete the cancellation?" — which the Hang-up denied them. The mechanism is
  correct and stays; making the ending readable is ticket 14.
