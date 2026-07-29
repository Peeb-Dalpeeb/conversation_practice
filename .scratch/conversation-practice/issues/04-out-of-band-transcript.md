# 04 — Out-of-band Transcript and the raw event log

**What to build:** Every turn of an Attempt gets text, produced by the Persona's own model
rather than by a separate transcription model. After each Trainee turn, issue a second
`response.create` on the same realtime session with `conversation: "none"` and text-only
output, scoped to the latest turn. The Persona's own turns need no second call: the session
already emits `response.output_audio_transcript.done`, which is the text that same model
generated its audio from. When the Attempt ends, the page forwards the entire raw realtime
event log to the server, which writes it down untouched.

Verifiable on its own: take an Attempt, stop it, and find text for every turn — the
Trainee's and the Persona's — in what the server received.

This costs roughly double a dedicated transcription model and buys nothing visible, which
is exactly why ADR 0003 exists. Do not switch to in-session ASR to save the money. In-session
transcription is a *different* model's guess at what the Trainee said — the docs describe it
as guidance rather than what the model heard. Two failures follow and both land in front of
an audience: the evidence quote in an Assessment can differ from what the room just heard
the author say, destroying the grader's credibility at the moment it is being demonstrated;
and the Persona can visibly soften while the Assessment reports the criterion unmet, so the
product contradicts itself on screen. The criterion the whole Scenario is built around is
binary, and one slipped clause flips it.

The page forwards raw events and does no bookkeeping. It does not accumulate a Transcript,
does not order turns, does not interpret anything. Reassembly is ticket 05's job and it
happens on the server. The page's job during an Attempt is a speaking indicator and a stop
control.

Turn ordering is not guaranteed by the API, so the forwarded log must preserve whatever
identifiers ordering will later be reconstructed from — `item_id`, and `previous_item_id`
wherever it appears: on `conversation.item.added` and `conversation.item.done` for both
speakers, and on `input_audio_buffer.committed` for the Trainee. Dropping or normalising
fields on the way out of the browser will quietly destroy ticket 05.

The log must also preserve `conversation.item.truncated`, which is the only record of how
much of a Persona turn the Trainee actually heard.

Keep at least one raw log from an Attempt the Trainee stopped mid-conversation, and one
where the Trainee interrupted the Persona mid-sentence. Ticket 05's fixtures are recorded
logs from real Attempts, and this is where they get captured.

**Blocked by:** 03 — A live Attempt over WebRTC.

**Status:** ready-for-agent

- [ ] Each Trainee turn is transcribed by a second response on the same session with
      `conversation: "none"`, text-only output, scoped to the latest turn.
- [ ] Each Persona turn's text is its own `response.output_audio_transcript.done`, present in
      the forwarded log; no second response is issued for it.
- [ ] No in-session ASR / dedicated transcription model is used anywhere.
- [ ] Out-of-band transcription responses do not affect the spoken conversation — the Persona
      does not react to them, and the Trainee hears nothing extra.
- [ ] When an Attempt ends, the page forwards the complete raw event log to the server.
- [ ] The forwarded log is stored untouched and preserves `item_id`,
      `previous_item_id`, and `conversation.item.truncated` on every event that carries them.
- [ ] The page performs no reassembly, ordering, or Transcript accumulation.
- [ ] Real event logs are captured and kept for ticket 05's fixtures, including one where
      the Trainee stopped mid-conversation and one where the Trainee interrupted the
      Persona mid-sentence.

## Comments

- Amended after measuring against live Attempts. Out-of-band transcription of the *Persona's*
  turns is unreliable: across three Attempts it returned text for 6 of 12 Persona turns and
  9 of 9 Trainee turns. The failures are non-deterministic — the opening line transcribed
  correctly in two Attempts and returned nothing in a third — and share a signature: status
  `completed`, an output item with `content: []`, and exactly four non-reasoning output
  tokens. All 12 Persona turns had a correct `response.output_audio_transcript.done`.
  That event is the same model's own text, generated before the audio rather than guessed
  from it, so it satisfies ADR 0003's objection to a *different* model's guess more strongly
  than a second call would. Trainee turns have no such event and keep the out-of-band call.
- The out-of-band response's own output item is reported as a completed `conversation.item.done`
  despite `conversation: "none"`. Transcribing spoken turns by role and message type alone
  therefore transcribes the transcript, forever: one Attempt billed 249 responses for 7 spoken
  turns before this was caught. A turn must be required to carry `input_audio` content.
- Those phantom items are outside the conversation in every other respect, which is how the
  fourth criterion is verified: the response comes back with `conversation_id: null`, and the
  item gets a `conversation.item.done` but never a `conversation.item.added`, with
  `previous_item_id: null`. The stray `done` is the anomaly, not membership.
- No capture has ever shown two *spoken* turns arriving out of order, and none is expected to.
  The data channel is ordered and reliable, and a spoken turn cannot begin until the previous
  one committed. Six live Attempts produced none, including two run specifically to provoke it
  by interrupting constantly — interrupting closes the very window it was meant to open. The
  reordering the API does perform is an out-of-band response overtaking a Persona turn, which
  is not a turn-order problem. Ticket 05 proves order-independence by shuffling a fixture
  instead; the requirement for a naturally captured out-of-order log is dropped from both
  tickets.
- Fixtures are promoted out of `data/`, which is gitignored, into `test/fixtures/raw-event-logs/`
  (read by ticket 05's tests) and `.scratch/conversation-practice/evidence/` (backs these
  Comments, read by nothing). Both have READMEs recording provenance. `data/` stays as the
  live write target.

### Open, found by audit, not yet fixed

- **The 15 s deadline reports failure unconditionally.** `forcedFinalization` calls
  `finalizeAttempt(true)` in `src/client/realtime.ts` without asking whether the log actually
  settled, and the 150 ms quiet timer that would otherwise finalize cleanly is reset by *every*
  inbound message. A session still streaming after the stop can therefore ride to the deadline
  and show "The Attempt event log could not be completed" over a complete log — the same false
  failure as the `output_audio_buffer.clear` bug, by a different route.
  `finalizeAttempt(!canFinalizeStoppedAttempt())` is the honest form. The test at
  `test/realtime.test.ts` currently asserts the failure fires, so it locks in the wrong
  behaviour and has to change with it.
- **One failed Trainee transcription discards the whole Attempt.** A single out-of-band
  response that returns no text sets `attemptDataFailed`, and the screen tells the Trainee to
  check the local server — which had nothing to do with it, and the log was complete and
  forwarded regardless. Unobserved so far (21 of 21 Trainee turns returned text across all
  seven captures) but the empty-`content` signature that hits the Persona half the time has no
  structural reason to be impossible on a user item. The request is idempotent, so one retry
  before declaring failure is cheap; at minimum the wording should not blame the server.
- **The false-failure fix is not yet confirmed live.** A clean stop taken in silence should
  show "Attempt ended". The log cannot settle this on its own — both the clean path and the
  deadline path forward the log, and nothing records what the screen displayed.
