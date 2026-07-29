# Handoff prompt — Conversation Practice, ticket 04

Paste everything below the line into a fresh chat.

---

I'm building the tickets in `.scratch/conversation-practice/issues` in this repo. Your role
is validator and auditor: I tell you what I built, you audit it against the ticket and report
what's wrong. Don't write code unless I explicitly switch you to builder. When you do audit,
verify against the actual code and data — not against my description of it.

## Where things stand

Ticket 04 (out-of-band transcript + raw event log) is implemented and verified against the
live API. `npm test` is green (46 tests), typecheck/lint/prettier clean. Nothing is committed
yet — it's all uncommitted work on `main`.

Six of ticket 04's seven acceptance criteria are met and confirmed against real captured
Attempts. The last one — criterion 7, fixtures for ticket 05 — is partly done.

## What was found and fixed during testing (all verified against real logs)

1. **Runaway transcription loop.** The API emits `conversation.item.done` for an out-of-band
   response's *own* output item despite `conversation: "none"`. Matching spoken turns by role
   and message type alone therefore transcribed the transcript, recursively. One Attempt
   billed 249 responses for 7 spoken turns. Fixed by requiring `input_audio` content in
   `hasSpokenContent()` in `src/client/realtime.ts`.
2. **Persona turns transcribed unreliably.** Out-of-band transcription returned text for
   6 of 12 Persona turns but 9 of 9 Trainee turns, non-deterministically — the same opening
   line succeeded twice and returned nothing once. All 12 Persona turns had a correct
   `response.output_audio_transcript.done`. **Decision taken:** Trainee turns use the
   out-of-band call; Persona turns use their own audio transcript. Ticket 04's criteria and
   ticket 05's Comments were amended to match, with the measurements recorded in ticket 04's
   Comments.
3. **False "log could not be completed" screen.** `output_audio_buffer.clear` is answered
   with neither `output_audio_buffer.cleared` nor an error when no audio is playing, so a
   stop taken in silence waited out the 15s deadline and reported incomplete data even though
   the log was complete. The clear is now fire-and-forget.
4. Earlier audit fixes: `keepalive` removed (64 KiB cap was silently dropping logs), upload
   failures surfaced, outbound client events and binary frames included in the log, stop now
   drains in-flight turns before finalizing.

## Layout

- `src/client/realtime.ts` — session, out-of-band transcription, stop sequence, log forwarding
- `src/client/App.tsx` — attempt states, including the `data-failed` screen
- `src/server/app.ts`, `src/server/raw-event-log.ts` — the receiving endpoint and file store
- `test/realtime.test.ts`, `test/client.test.tsx`, `test/server.test.ts`
- `test/fixtures/raw-event-logs/` — three captures from the current code, all passing, named
  for what they demonstrate; read by ticket 05's tests. See the README there.
- `.scratch/conversation-practice/evidence/` — the three captures that established the Persona
  split and the 249-response runaway-loop capture. Backs the tickets' Comments, read by no
  test; do not delete. See the README there.
- `data/` — gitignored, the live write target only. Nothing that must survive lives here.

The log format is an array of envelopes, each `{"direction":"client"|"server","event":"<JSON
string>"}` or `{"direction":"server","binary":"<base64>"}`. The `event` value is a string —
parse it before reading fields.

## What remains on ticket 04

1. **Confirm the false-failure fix live** — a clean stop in silence should now show "Attempt
   ended", not "The Attempt event log could not be completed." The log alone cannot confirm
   this: both the clean path and the 15 s deadline path forward the log, and nothing records
   what the screen showed.
2. **The 15 s deadline reports failure unconditionally.** `finalizeAttempt(true)` in
   `src/client/realtime.ts` passes `true` without asking whether the log actually settled, and
   the 150 ms quiet timer is reset by every inbound message — so a session still streaming can
   ride to the deadline and show the failure screen with a complete log. Same class as the
   `output_audio_buffer.clear` bug above.
3. **One failed Trainee transcription discards the whole Attempt**, and the screen blames the
   local server, which had nothing to do with it. Unobserved so far (21/21 Trainee turns
   succeeded across all seven captures) but structurally possible.

Resolved: the out-of-order fixture (no such capture exists or is expected — see ticket 04's
Comments; ticket 05 now proves order-independence by shuffling instead) and promoting the
fixtures out of gitignored `data/`.

## Verification tool

`.scratch/conversation-practice/check-log.mjs` scores one log against ticket 04's criteria
and reports its fixture value:

```
node .scratch/conversation-practice/check-log.mjs test/fixtures/raw-event-logs/<file>.json
```

It checks: no transcription of non-spoken items; one request per Trainee turn and none for
the Persona; every spoken turn has text from its correct source; no in-session ASR; the
`conversation.item.*` chain walks end to end and covers every spoken turn; every truncation
names a known turn. It then prints the transcript in chain order, marking any turn that was
cut off, and reports whether the log holds a stop taken mid-sentence or a Trainee barge-in.

## First thing to do

Read ticket 04 and its Comments, then `src/client/realtime.ts`, then run
`npm test && npm run typecheck && npm run lint`. Tell me what you think is still weak before
I ask for anything.
