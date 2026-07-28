# 04 — Out-of-band Transcript and the raw event log

**What to build:** Every turn of an Attempt gets text, produced by the Persona's own model
rather than by a separate transcription model. After each turn, issue a second
`response.create` on the same realtime session with `conversation: "none"` and text-only
output, scoped to the latest turn. When the Attempt ends, the page forwards the entire raw
realtime event log to the server, which writes it down untouched.

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
identifiers ordering will later be reconstructed from — `item_id` and
`input_audio_buffer.committed.previous_item_id`. Dropping or normalising fields on the way
out of the browser will quietly destroy ticket 05.

Keep at least one raw log from an Attempt where turns arrived out of order, and one from an
Attempt the Trainee stopped mid-conversation. Ticket 05's fixtures are recorded logs from
real Attempts, and this is where they get captured.

**Blocked by:** 03 — A live Attempt over WebRTC.

**Status:** ready-for-agent

- [ ] Each turn is transcribed by a second response on the same session with
      `conversation: "none"`, text-only output, scoped to the latest turn.
- [ ] No in-session ASR / dedicated transcription model is used anywhere.
- [ ] Out-of-band transcription responses do not affect the spoken conversation — the Persona
      does not react to them, and the Trainee hears nothing extra.
- [ ] When an Attempt ends, the page forwards the complete raw event log to the server.
- [ ] The forwarded log is stored untouched and preserves `item_id` and
      `previous_item_id` on every event that carries them.
- [ ] The page performs no reassembly, ordering, or Transcript accumulation.
- [ ] Real event logs are captured and kept for ticket 05's fixtures, including one with
      out-of-order turns and one where the Trainee stopped mid-conversation.
