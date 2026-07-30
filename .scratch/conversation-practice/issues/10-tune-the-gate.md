# 10 — Tune the Gate

**What to build:** Jordan Avery behaves the way the Scenario says, reliably, Attempt after
Attempt. This is hand-tuning work: run the Scenario, read back what happened, edit the
Scenario file, run it again — dozens of times.

**This is the highest-risk part of the build.** Not the WebRTC plumbing, not the storage. If
the Persona softens for a Trainee who opened with a discount, Attempt one and Attempt two
look the same and the demo has nothing to show. Budget tuning time accordingly, and do this
before the comparison screen is pretty.

The failure mode is specific: language models are relentlessly agreeable and will soften for
anyone. So the Gate is stated as an **explicit flip condition, never as a described mood**.
"Jordan is guarded and warms up as the conversation goes well" is exactly the phrasing that
fails. This is the single most likely way the whole build fails.

The behaviour to land:

- Opens firm and clipped, so the difficulty is real from the first line.
- Gets *colder* if the Trainee jumps straight to saving the account with an offer.
- Complies flatly if the Trainee simply processes the cancellation without asking anything.
- Gives the cover story — "your fees are too high, I found somewhere cheaper" — when pressed
  on why, so there is a plausible wrong answer to be satisfied by.
- Reveals the real reason only in response to an open question, so the skill being tested is
  asking rather than guessing.
- Stays cold if the Trainee blames the colleague who took the earlier call.
- Stays cold at a hollow, scripted apology — saying sorry is not the same as being sorry.
- Softens only when the incident is acknowledged without excuses. One honest thing works,
  and the Trainee can find it.
- Holds all of the above consistently across Attempts, so a second Attempt is a fair
  comparison against a first.

Tune against `gpt-realtime-2.1` — the same model the demo runs on. Never demonstrate
behaviour that was tuned against a different model.

The instruments are the hidden debug view and the persisted Attempt records: read back a run
that went wrong instead of guessing at it. This behaviour is deliberately **not** automated
— it is non-deterministic, expensive to exercise, and an automated test would not catch the
failure that matters, which is the Persona softening too easily. That is a judgment the
author makes by listening.

Expect dozens of Attempts to accumulate on disk. That is fine and expected; ticket 11's
relative labelling is what makes it harmless.

**Two Attempts ticket 12 needs are not produced by tuning the Persona.** Every Attempt
captured so far is a good one — a Trainee who asks an open question and reaches the prior
incident. Ticket 12 tunes the Rubric against the opposite, and cannot: strictness checked
only against Attempts that succeeded cannot show whether criterion 3 is being given away.
So while the Scenario is already running here, perform two failures deliberately and note
their Attempt numbers: one Trainee who accepts the cover story and stops there, and one who
is warm, courteous and professional throughout but never asks what happened. They cost
nothing extra — the Scenario is already up and the runs are already happening.

**Blocked by:** 09 — Hidden debug view.

**Status:** ready-for-human

- [x] The Gate is written in the Scenario file as an explicit flip condition, not as a
      described mood or a warmth gradient.
- [ ] An Attempt opening with "I can offer you a discount" leaves Jordan colder, and Jordan
      does not soften at any point in that Attempt.
- [ ] Pressing on why yields the cover story, not the real reason.
- [ ] The real reason emerges only in response to an open question.
- [ ] Blaming the colleague and offering a hollow apology both leave Jordan cold.
- [ ] Acknowledging the incident without excuses softens Jordan.
- [ ] The above hold across repeated Attempts, not once — verified by running the Scenario
      enough times to trust it under pressure.
- [ ] All tuning was done against `gpt-realtime-2.1`.
- [ ] Two deliberate Trainee failures are performed and their Attempt numbers noted for
      ticket 12: one that accepts the cover story and stops there, and one that is warm and
      courteous throughout but never asks what happened.

## Comments

- **The Gate is already a flip condition. This ticket verifies it under pressure rather than
  authoring it.** `src/scenario.ts:115` holds `gate.condition` as an explicit trigger — the
  Trainee acknowledging that the rushed, dismissive call left Jordan feeling stupid, without
  explaining it away, blaming anyone else, or pivoting straight to a solution. That is the
  shape this ticket asks for and not a described mood, so criterion 1 is largely met on paper
  already. Every behaviour in the list above also has a home in `behaviourRules`
  (`src/scenario.ts:105`): firm opening, colder at an early offer, flat compliance when the
  cancellation is simply processed, the cover story when first pressed, the real reason only
  on an open question, cold at blame, cold at a scripted apology, and softening once the Gate
  is met.

  Read that as a starting point to be broken by live runs, not as a finished job. None of that
  wording has been held against a model whose default is to be relentlessly agreeable, which is
  the failure this ticket exists to catch. Tuning means editing those strings and re-running:
  `buildPersonaInstructions`
  (`src/server/realtime.ts:31`) only orders what the Scenario file already says, so a run that
  goes wrong is fixed in `behaviourRules` or `gate.condition` and never in code.

- **Only criterion 1 is desk work. Criteria 2–9 cannot be delegated to an agent.** They need
  live Attempts against `gpt-realtime-2.1` with the author speaking as the Trainee and judging
  by ear whether Jordan actually went colder at the discount opener, held the cover story, or
  softened too easily. An agent cannot speak, listen, or make that judgment. Do not check those
  boxes and do not write evidence for Attempts that were not performed: a confident "verified
  across repeated Attempts" for runs that never happened is worse than an unchecked box,
  because ticket 12's Rubric strictness and ticket 13's dry run both rest on this being real.

- **The instrument is working; read runs back instead of guessing at them.** Ticket 09's debug
  view was verified live on 2026-07-30. During an Attempt, `Ctrl+Alt+Shift+D` reveals the
  server-reconstructed Transcript — numbered, speaker-attributed, refreshed once a second, with
  a turn still in progress reading "Awaiting text…" and a cut-off Persona turn showing her full
  text plus the truncation point. Control only; the Windows key is deliberately not a modifier.
  The other half of the instrument is on disk: judged Attempts in `data/attempts`, and the raw
  event log of every run in `data/raw-event-logs` for when the Transcript alone does not explain
  what happened.

- **Do not lose the two deliberate failures.** Every Attempt captured so far is a good one — a
  Trainee who asks an open question and reaches the prior incident. Ticket 12 cannot check
  whether criterion 3 is being given away using only Attempts that succeeded, so the two runs
  named in the last checkbox have to happen while the Scenario is already up, with their
  Attempt numbers written back into this ticket. They are easy to forget across dozens of
  tuning runs and expensive to recreate once the Scenario has moved on.

- **Agent handoff on 2026-07-30:** the authored Gate logic is now internally explicit before
  live tuning. The Private Profile no longer offers "feeling heard" as an alternate softening
  condition. A discount or retention offer in the Trainee's first response locks Jordan cold
  for that Attempt and makes the Gate unavailable. The first request for a reason now always
  receives only the price cover story, even when that request is open-ended; the prior incident
  is available only after that cover story and only to a subsequent open question.

  The repository already has useful but incomplete text evidence. The saved Transcripts for
  Attempts 1 and 4 record Jordan rejecting repeated early offers. Attempts 2 and 3 record
  Jordan cooperating when the Trainee proceeds directly to cancellation. Attempt 5 records the
  cover story first, reveals the prior incident only after a further open question, and does
  not treat "made you feel not heard" as a specific acknowledgement of being made to feel
  stupid. These text observations do not establish whether the Persona sounded cold, flat, or
  softened.

  No saved Attempt exercises blaming the colleague, a hollow scripted apology, or a specific
  acknowledgement without excuses that should meet the Gate. The records also do not contain
  the two exact deliberate failures required for ticket 12: accepting the cover story and
  stopping there, and remaining warm and courteous without asking what happened.

  `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` pass, and the
  isolated app served its Briefing successfully. These are regression and plumbing checks,
  not evidence of Persona behaviour. No live Attempt was performed in this agent pass, so
  criteria 2–9 remain unchecked and neither deliberate failure has an Attempt number.
  Continue in a microphone-enabled browser against the existing `gpt-realtime-2.1` pin,
  judge every behaviour by ear, use the hidden Transcript and persisted records to diagnose
  misses, and write the two deliberate failure Attempt numbers here before resolving the
  ticket.
