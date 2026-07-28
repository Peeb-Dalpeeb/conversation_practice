# 05 — Attempt completion: reassembly and persistence (the seam)

**What to build:** The server accepts a completed Attempt's raw realtime event log,
reconstructs the Transcript in correct turn order, and persists the Attempt as JSON on disk,
numbered per Scenario. Meanwhile the Trainee, who has just stopped talking, sees clearly
that the Attempt has ended and that judging is in progress — not a dead screen leaving them
wondering whether the microphone is still live.

Turn order is reconstructed from `item_id` and
`input_audio_buffer.committed.previous_item_id`, because the realtime API does not guarantee
events arrive in order. A Transcript is a reconstruction, not a recording, and must never be
presented as a verbatim record — it can legitimately disagree with what the Trainee
remembers saying.

Speaker attribution is the part that must not be got wrong. A quote credited to the Trainee
has to be one the Trainee actually said; every evidence quote in every later Assessment
inherits this.

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

Fixtures are the real event logs captured in ticket 04, not handwritten ones — including at
least one where turns arrive out of order and one where the Trainee stopped mid-conversation.
The end-call-tool fixture arrives with ticket 08.

The conventions established here — the seam, the fixture style — become the prior art for
the rest of the repository. There is none to inherit; this is the first code with tests.

**Blocked by:** 04 — Out-of-band Transcript and the raw event log.

**Status:** ready-for-agent

- [ ] Posting a completed event log to the server produces a persisted Attempt as JSON on
      disk, numbered per Scenario.
- [ ] Turns are reassembled into correct order from `item_id` and `previous_item_id`,
      including when events arrive out of sequence.
- [ ] Speaker attribution is correct — a line credited to the Trainee is one the Trainee
      said.
- [ ] A Trainee-initiated stop terminates the Attempt and triggers judging.
- [ ] The Assessment and Feedback calls are injected, so tests run against stubs; Assessment
      runs before Feedback, and Feedback receives both the Assessment and the Transcript.
- [ ] The Trainee sees that the Attempt has ended and that judging is in progress.
- [ ] Tests run at the completion endpoint against recorded event logs from real Attempts,
      covering out-of-order turns and a mid-conversation stop.
- [ ] No test asserts on internal function calls, module structure, or intermediate values.
