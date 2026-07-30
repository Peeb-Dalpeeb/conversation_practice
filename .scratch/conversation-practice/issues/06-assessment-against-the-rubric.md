# 06 — Assessment against the Rubric

**What to build:** A completed Attempt is judged against the six fixed Rubric criteria. Each
criterion comes back met or not met — no partial credit, nothing to argue with and nothing
to hide behind — and each carries a quoted line from the Transcript as evidence, so a person
in the room can check the judgment against what they just heard.

The six criteria, all of them judgeable by any layperson watching:

1. Did not try to solve anything before understanding why.
2. Asked an open question that invited the story.
3. Surfaced the real reason.
4. Acknowledged the feeling specifically and without excuses.
5. Did not get defensive or blame a colleague or the system.
6. Checked that the customer felt heard before moving on.

The Transcript and the Rubric go to `gpt-5.6-sol` with structured output, one verdict per
criterion. Roughly $0.04 per call — cost is not a consideration here.

**The model that played the Persona must never assess the Attempt it took part in.**
Isolation is structural: different model, different call, different context. Reusing the
Persona's existing conversation context is the obvious optimisation — cheaper, one fewer
call, context already sitting there — and it must not be done. It fails silently, producing
grades that are wrong in a flattering direction, and a flattering grader is worth nothing to
the person it is meant to convince.

Criterion 3 is the one the whole Scenario is built around and must be judged strictly — it
is not given to the Trainee for free. Tightening that strictness is ticket 12's job; this
ticket has to get the Assessment produced, structured, and persisted.

This replaces the Assessment stub from ticket 05. The seam's existing tests keep running
against the stub; do not move judging out of the completion pipeline to accommodate a real
model call.

**Blocked by:** 05 — Attempt completion: reassembly and persistence (the seam).

**Status:** done

- [x] Every Attempt is judged against the same six criteria, in a fixed order.
- [x] Each criterion returns met or not met, with no partial credit and no middle value.
- [x] Each criterion carries a quoted line from the Transcript as evidence.
- [x] The Assessment runs as its own call to `gpt-5.6-sol` with structured output, in its own
      context — never the Persona's conversation, never the Persona's model.
- [x] The Assessment is persisted as part of the Attempt record.
- [x] The completion endpoint's tests still run against an injected stub.
