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

**Status:** ready-for-agent

- [ ] The Gate is written in the Scenario file as an explicit flip condition, not as a
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
