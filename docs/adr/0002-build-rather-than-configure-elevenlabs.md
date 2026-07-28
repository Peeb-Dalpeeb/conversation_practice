# Build this rather than configure ElevenLabs

ElevenLabs was evaluated seriously and rejected. Its success-evaluation feature genuinely
covers most of this domain off the shelf — Scenario, Persona, Gate, Transcript, Rubric, and
Assessment, with criteria evaluated against the Transcript returning pass/fail plus a
rationale. Anyone reading this repository who knows that product will reasonably ask why we
built it ourselves.

The answer is the two things it does not do, which happen to be the two things this project
is for. Its output lands in a developer dashboard as agent-QA, not as **Feedback** written
for a Trainee to read. And its analytics are built for aggregate agent performance and for
A/B testing configurations — not for putting one Trainee's first Attempt beside their
second. The improvement loop is the whole demo, and it is precisely the part we would have
had to build anyway.

## Consequences

We own the realtime session, turn reassembly, storage, and the comparison surface. That is
accepted. If the scope ever shifts from *showing a Trainee they improved* to *measuring
agent quality in aggregate*, this decision should be revisited immediately — that is the
shape ElevenLabs is already good at.
