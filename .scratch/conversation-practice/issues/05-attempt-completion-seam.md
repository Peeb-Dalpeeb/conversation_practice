# 05 — Attempt completion: reassembly and persistence (the seam)

**What to build:** The server accepts a completed Attempt's raw realtime event log,
reconstructs the Transcript in correct turn order, and persists the Attempt as JSON on disk,
numbered per Scenario. Meanwhile the Trainee, who has just stopped talking, sees clearly
that the Attempt has ended and that judging is in progress — not a dead screen leaving them
wondering whether the microphone is still live.

Turn order is reconstructed by walking the conversation chain: `previous_item_id` on
`conversation.item.added` and `conversation.item.done`, which is present for both speakers
and links every turn to its predecessor from a head whose `previous_item_id` is `null`.
Walking the chain makes the result independent of the order events arrived in, which is the
property that matters — not that they were observed to arrive out of order. A Transcript is
a reconstruction, not a recording, and must never be presented as a verbatim record — it can
legitimately disagree with what the Trainee remembers saying.

Speaker attribution is the part that must not be got wrong. A quote credited to the Trainee
has to be one the Trainee actually said; every evidence quote in every later Assessment
inherits this.

**And a quote credited to the Persona has to be one the Trainee actually heard.** When a
Persona turn is cut off — by the Trainee interrupting, or by the stop landing mid-sentence —
`response.output_audio_transcript.done` still carries the whole sentence the model generated,
including words that never reached the speaker. `conversation.item.truncated` records the
`item_id` and the `audio_end_ms` at which the audio stopped. A truncated turn is recorded
with its full generated text, marked as cut off, and carrying that offset.

It is marked rather than trimmed because the log has no alignment between the text and the
audio timeline: `response.output_audio_transcript.done`, its deltas, and
`response.output_audio.done` carry no timestamps, durations, or word offsets. Cutting the
text at `audio_end_ms` would mean inventing a speech rate, and the fixtures show no single
rate works — 1640 ms of a six-word line lost little or nothing, while 1940 ms of a
twenty-eight-word line lost most of it, in the same Attempt. Guessing the boundary is the
same class of error ADR 0003 rejects, so the Transcript records what is known and no more.
Ticket 06 is where the rule bites: a truncated turn must not supply an evidence quote.

**This is the project's one testable seam.** Post a recorded event log, assert the persisted
Attempt. The two model calls — Assessment and Feedback — are injected and stubbed here;
tickets 06 and 07 replace the stubs. This single seam covers turn reassembly, end-call tool
handling, the hard cap, Attempt numbering, persistence, and the pairing of the two most
recent Attempts, so later tickets extend these tests rather than opening new seams
elsewhere.

Test external behaviour, not implementation. Assert what a caller observes — the persisted
Attempt, the reconstructed turn order, which criteria came back met. Do not assert on
internal function calls, module structure, or the shape of intermediate values. The tests
should survive a rewrite of how any of it is computed.

Fixtures are the real event logs captured in ticket 04, not handwritten ones, and live in
`test/fixtures/raw-event-logs/` — one clean Attempt, one the Trainee stopped mid-conversation,
one where the Trainee interrupted the Persona. Order-independence is proved by shuffling a
fixture's envelopes before posting it and asserting the same Transcript comes back: real
content, deliberately scrambled arrival. That is a stronger test than a captured out-of-order
log would have been, and unlike one it can be written today — ticket 04's Comments record why
no such capture exists or is expected to. The end-call-tool fixture arrives with ticket 08.

The conventions established here — the seam, the fixture style — become the prior art for
the rest of the repository. There is none to inherit; this is the first code with tests.

**Blocked by:** 04 — Out-of-band Transcript and the raw event log.

**Status:** ready-for-agent

- [ ] Posting a completed event log to the server produces a persisted Attempt as JSON on
      disk, numbered per Scenario.
- [ ] Turns are reassembled into correct order by walking the `previous_item_id` chain on
      `conversation.item.added` / `conversation.item.done`, and the same Transcript comes
      back when the same log's envelopes are shuffled.
- [ ] Speaker attribution is correct — a line credited to the Trainee is one the Trainee
      said.
- [ ] A Persona turn cut off by an interruption or by the stop is recorded with its
      `audio_end_ms` and marked as cut off, so no later Assessment can quote it as
      something the Trainee heard.
- [ ] A Trainee-initiated stop terminates the Attempt and triggers judging.
- [ ] The Assessment and Feedback calls are injected, so tests run against stubs; Assessment
      runs before Feedback, and Feedback receives both the Assessment and the Transcript.
- [ ] The Trainee sees that the Attempt has ended and that judging is in progress.
- [ ] Tests run at the completion endpoint against recorded event logs from real Attempts,
      covering a mid-conversation stop, an interrupted Persona turn, and a shuffled log.
- [ ] No test asserts on internal function calls, module structure, or intermediate values.

## Comments

- Ticket 04 audit handoff — the stored log is not a flat array of events. It is an array of
  envelopes, each holding one untouched data-channel payload:
  `{"direction":"client"|"server","event":"<the exact JSON string>"}`, or
  `{"direction":"server","binary":"<base64>"}` for a binary frame. Payloads are strings, so
  reassembly parses each envelope's `event` before reading `item_id` or `previous_item_id`.
  The envelope exists because the page's own `response.create` events are part of the log.
- The two speakers' text comes from two different places, by measurement, not preference —
  see ticket 04's comments.
  - **Trainee turns:** `response.done` where `response.metadata.purpose` is
    `turn_transcription`. `metadata.source_item_id` names the turn it belongs to.
    `response.output_text.done` carries only a `response_id`, so the join runs through
    `response.done`.
  - **Persona turns:** `response.output_audio_transcript.done`, keyed by `item_id`.
  A Persona turn has no `turn_transcription` response and never will; treating one as missing
  data would fail every Attempt.
- Corrected after auditing the captures: this ticket previously named
  `input_audio_buffer.committed.previous_item_id` as the ordering source. That event is only
  emitted for Trainee turns, so it cannot place a Persona turn at all — it would have ordered
  half the conversation. The complete chain is `previous_item_id` on `conversation.item.added`
  and `conversation.item.done`, present for both speakers in all seven captures, forming one
  singly-linked list. `input_audio_buffer.committed` still carries the field and is still
  worth keeping, but it is a corroborating source, not the primary one.
- **Chain-walking trap:** out-of-band responses' own output items also carry
  `previous_item_id: null`, so starting from "the item with no predecessor" finds several
  heads, not one. A phantom never receives a `conversation.item.added` and never carries
  audio content; either test excludes it. The runaway-loop log in
  `.scratch/conversation-practice/evidence/` is what happens when phantoms are mistaken for
  turns.
- Truncation is not a stop artifact, and this was nearly missed. `trainee-interrupts-persona.json`
  has three `conversation.item.truncated` events *mid-Attempt* — the Trainee talked over the
  Persona — so the unheard text lands in the middle of the Transcript, and the Trainee's next
  turn is a reply to only the part they heard. Reassembly that ignores truncation would feed
  ticket 06 a conversation that never happened. Both truncation causes look identical in the
  log and are handled the same way; only their position differs.
- The stop's own `output_audio_buffer.clear` is what truncates the final Persona turn, so
  every Attempt stopped while the Persona is speaking produces one. It is not an edge case
  and should not be treated as one.
