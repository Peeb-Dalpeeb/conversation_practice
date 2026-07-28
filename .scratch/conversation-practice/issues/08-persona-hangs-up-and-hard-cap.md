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

Capture an event log from an Attempt where the Persona fired the end-call tool and add it to
the completion endpoint's fixtures.

**Blocked by:** 05 — Attempt completion: reassembly and persistence (the seam).

**Status:** ready-for-agent

- [ ] The Persona ends the call via an explicit tool call, never by phrase-matching.
- [ ] The tool is available only once cancellation is genuinely underway — account details
      asked for, cancellation confirmed, or stated as done — and the precondition is stated
      in the Scenario file with a comment explaining why it is narrow.
- [ ] An Attempt opening with "I can offer you a discount" cannot trigger the hang-up,
      verified by running it.
- [ ] A Trainee who processes the cancellation without asking anything gets a flat compliance
      and a hang-up.
- [ ] The end-call tool call terminates the Attempt and triggers judging.
- [ ] Every firing of the tool is logged.
- [ ] A hard cap of roughly 12 minutes terminates the Attempt and triggers judging.
- [ ] Realtime truncation is not enabled.
- [ ] The completion endpoint's fixtures include a real event log where the Persona fired the
      end-call tool.
