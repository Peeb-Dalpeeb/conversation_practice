# Spec — Conversation Practice (proof of concept)

Status: ready-for-agent

Synthesised 2026-07-28 from `.scratch/conversation-practice/handoff.md` (19 settled
decisions), `CONTEXT.md`, and ADRs 0001–0003. Vocabulary follows `CONTEXT.md`; the
capitalised terms below are the glossary terms, not emphasis.

## Problem Statement

People are bad at difficult conversations, and there is no way to practise one. You cannot
rehearse telling a customer you have nothing to offer them, or asking a question that
uncovers why someone is actually angry, because the only place those conversations happen
is live — with a real person, once, with real consequences. Role-play with a colleague
fails because the colleague is kind to you, breaks character, and cannot tell you
afterwards what specifically you did wrong.

So people learn these skills by getting them wrong at work, slowly, and never find out
which part they got wrong. A Trainee finishes a bad call knowing it went badly and not
knowing why.

There is a second, narrower problem. The author of this project believes a tool like this
can be built and needs to prove it — first to themselves, then to their organization's
leadership, in a live demo they perform personally, without domain expertise to lean on.
Leadership will not be convinced by a description. They need to watch a person do a
conversation badly, read a judgment they can independently agree with, and then watch the
same person do it visibly better.

## Solution

A Trainee reads a short Briefing, presses start, and talks out loud to an AI playing a
Persona over a live voice connection. The Persona holds a Private Profile the Trainee
cannot see and a Gate — a named condition that must be met before the Persona softens.
Nothing else is on screen during the Attempt; the Trainee is having a conversation, not
reading a page.

When the Attempt ends — either because the Trainee stops it, or because the Persona ends
the call itself — the Attempt is judged against a fixed Rubric. Each criterion comes back
met or not met with a quoted line from the Transcript as evidence, so a person in the room
can check the judgment against what they just heard. That is the Assessment. A second,
separate step turns the Assessment into Feedback: coaching prose written for the Trainee,
which is not allowed to re-judge the Attempt.

Then the Trainee tries again. Afterwards they see the two most recent Attempts completed in
the current browser-tab practice sequence side by side as a six-by-two grid of met/not-met
marks, with the evidence quote for any criterion revealed on click. The improvement is the
product.

The one Scenario is "The Customer Who's Had Enough". The Trainee is a service
representative; the customer, Jordan Avery, opens with *"I'd like to close my account."*
The Briefing tells the Trainee they have no discounts, no waivers and no authority to
change anything — only the conversation. Jordan does not actually want to leave: three
weeks ago they called with a simple question and got someone rushed and dismissive who
made them feel stupid, and the cancellation is a protest. Jordan softens only when that
incident is acknowledged without excuses.

## User Stories

### Taking an Attempt

1. As a Trainee, I want to read a Briefing before I start, so that I know who I am, who I
   am about to talk to, and what I am not allowed to offer them.
2. As a Trainee, I want the Briefing to state plainly that I have no discounts, no waivers
   and no authority to change anything, so that I do not waste the Attempt hunting for a
   commercial solution that does not exist.
3. As a Trainee, I want to start an Attempt with a single explicit control, so that I am
   not talking before I am ready.
4. As a Trainee, I want the Persona to speak first with its opening line, so that the
   Attempt begins the way the real conversation would.
5. As a Trainee, I want to speak out loud and be heard without pressing anything, so that
   I am practising a conversation rather than operating software.
6. As a Trainee, I want the Persona to reply in speech, in character, so that I am
   rehearsing the thing I will actually have to do.
7. As a Trainee, I want to be able to interrupt the Persona and be interrupted, so that
   the rhythm resembles a real call.
8. As a Trainee, I want almost nothing on screen while I am talking — only whether the
   line is live and a way to stop — so that I am looking up and listening instead of
   reading.
9. As a Trainee, I want a stop control available at all times, so that I can end an
   Attempt I have lost control of without closing the browser.
10. As a Trainee, I want the Persona to be able to end the call itself once I have actually
    started cancelling their account, so that I experience the real lesson: I did the job
    correctly and learned nothing about why they left.
11. As a Trainee, I want the Persona never to hang up before cancellation is genuinely
    underway, so that a bad opening gives me a cold conversation rather than no
    conversation.
12. As a Trainee, I want the Attempt to end on its own if it runs unreasonably long, so
    that a conversation that has gone nowhere does not run indefinitely.
13. As a Trainee, I want to know clearly that the Attempt has ended and that judging is in
    progress, so that I am not left wondering whether the microphone is still live.

### The Persona's behaviour

14. As a Trainee, I want the Persona to open firm and clipped, so that the difficulty is
    real from the first line.
15. As a Trainee, I want the Persona to get colder if I jump straight to saving the account
    with an offer, so that I feel the cost of solving before understanding.
16. As a Trainee, I want the Persona to comply flatly and end the call if I simply process
    the cancellation without asking anything, so that doing the transactional thing
    correctly still teaches me something.
17. As a Trainee, I want the Persona to give its cover story — "your fees are too high, I
    found somewhere cheaper" — when pressed on why, so that there is a plausible wrong
    answer to be satisfied by.
18. As a Trainee, I want the Persona to reveal the real reason only in response to an open
    question, so that the skill being tested is asking rather than guessing.
19. As a Trainee, I want the Persona to stay cold if I blame the colleague who took the
    earlier call, so that deflection is not rewarded.
20. As a Trainee, I want the Persona to stay cold if I apologise in a hollow, scripted way,
    so that saying sorry is not the same as being sorry.
21. As a Trainee, I want the Persona to soften only when I acknowledge the incident without
    excuses, so that there is one honest thing that works and I can find it.
22. As a Trainee, I want the Persona to hold that Gate consistently across Attempts, so
    that my second Attempt is a fair comparison against my first.

### Being judged

23. As a Trainee, I want every Attempt judged against the same six criteria, so that I can
    compare one Attempt to another rather than to a moving target.
24. As a Trainee, I want each criterion returned as met or not met with no partial credit,
    so that there is nothing to argue with and nothing to hide behind.
25. As a Trainee, I want each criterion to carry a quoted line from the Transcript, so that
    I can see exactly which moment the judgment is about.
26. As a Trainee, I want the criterion "surfaced the real reason" to be judged strictly,
    so that the one thing the whole Scenario is built around is not given to me for free.
27. As a Trainee, I want to be judged on whether I tried to solve anything before
    understanding why, so that I learn to hold back the fix.
28. As a Trainee, I want to be judged on whether I asked an open question that invited the
    story, so that I learn the specific move that works.
29. As a Trainee, I want to be judged on whether I acknowledged the feeling specifically
    and without excuses, so that I learn the difference between an apology and an
    explanation.
30. As a Trainee, I want to be judged on whether I got defensive or blamed a colleague or
    the system, so that I notice a habit I probably cannot see in myself.
31. As a Trainee, I want to be judged on whether I checked that the customer felt heard
    before moving on, so that I learn to close the loop rather than assume it.
32. As a Trainee, I want the Attempt judged by something that was not in the conversation,
    so that I can trust the judgment is not flattering me.

### Reading Feedback

33. As a Trainee, I want coaching prose to read after the Attempt, so that I am told what
    to do differently and not merely what I got wrong.
34. As a Trainee, I want the Feedback to point at specific moments in my Attempt, so that
    the advice is about me rather than about conversations in general.
35. As a Trainee, I want the Feedback never to contradict the Assessment — no praise for
    rapport sitting above four failed criteria — so that I know which of the two to
    believe.
36. As a Trainee, I want the Feedback written to me rather than about me, so that it reads
    as coaching rather than as a performance review.

### Improving

37. As a Trainee, I want to take the Scenario again immediately after reading my Feedback,
    so that I can act on it while I still remember what I said.
38. As a Trainee, I want to see my two most recent Attempts from this browser-tab practice sequence
    side by side, so that I can see whether I actually improved without an earlier tuning Attempt
    appearing in the comparison.
39. As a Trainee, I want the comparison shown as a compact grid of met/not-met marks, so
    that the change is visible at a glance.
40. As a Trainee, I want the two Attempts labelled relatively — "Previous attempt" and
    "This attempt" — so that the comparison reads correctly regardless of how many Attempts
    are already on disk.
41. As a Trainee, I want to click a criterion to reveal the evidence quotes from both
    Attempts, so that I can read exactly what changed in my words.
42. As a Trainee, I want the evidence hidden until I ask for it, so that the grid stays
    readable.
43. As a Trainee, I want a sensible screen on my very first Attempt when there is nothing
    to compare against, so that the tool does not look broken before I have used it twice.

### Demonstrating it

44. As the author, I want to run the whole thing locally with one command, so that a demo
    does not depend on a deployment.
45. As the author, I want to perform an Attempt badly on purpose by opening with "I can
    offer you a discount", so that the failure is one the room recognises instantly and one
    I can reproduce reliably under pressure.
46. As the author, I want that deliberate bad opening to be incapable of triggering the
    Persona's Hang-up, so that the demo cannot end thirty seconds in.
47. As the author, I want the comparison grid legible from the back of a room on a
    projector, so that leadership can read it without being handed a laptop.
48. As the author, I want to open criterion 3 live and show the exact line, so that I
    control the reveal instead of competing with a wall of text on screen.
49. As the author, I want the room to reach the conclusion from the grid rather than be
    told it in a headline, so that the proof is theirs rather than mine.
50. As the author, I want the Briefing and constraints narrated by me rather than displayed
    on screen during the Attempt, so that the Trainee experience is not compromised for the
    audience's benefit.
51. As the author, I want no reset ritual or manual setup step on demo day, so that there
    is one fewer thing to forget while a room is watching.
52. As the author, I want dozens of tuning Attempts to sit harmlessly on disk alongside the
    demo Attempts, so that practice does not pollute the thing I am about to show.

### Building and tuning it

53. As the author, I want a hidden debug view behind a keyboard shortcut showing the
    Transcript as it is built, so that I can confirm transcription is flowing during
    tuning.
54. As the author, I want that debug view never to appear in the Trainee experience, so
    that decision 19's near-empty screen survives contact with my own convenience.
55. As the author, I want the OpenAI API key never to reach the browser, so that the demo
    machine is not the security boundary.
56. As the author, I want the Scenario — Persona, Private Profile, Gate, Rubric — to live
    in one editable file, so that tuning the Gate is a text edit and a restart.
57. As the author, I want to tune the Gate against the same model the demo will run on, so
    that I never demonstrate behaviour I have not rehearsed.
58. As the author, I want every Attempt persisted with its Transcript, Assessment and
    Feedback, so that I can read back a tuning run that went wrong instead of guessing.
59. As the author, I want out-of-order realtime events reassembled into correct turn order,
    so that evidence quotes are attributed to the right speaker in the right sequence.
60. As the author, I want the Persona's Hang-up implemented as an explicit tool call rather
    than phrase-matching, so that it can be logged, constrained, and reasoned about when it
    misfires.
61. As the author, I want a hard cap on Attempt length, so that a session left open does
    not quietly spend the budget.
62. As the author, I want the whole thing written in TypeScript, so that the realtime event
    zoo is typed where I am most likely to get it wrong.

## Implementation Decisions

### Scope

This is a proof of concept, not a product. No multi-tenancy, no organization model, no
authentication, no accounts, no manager roles, no assignments. If the organization buys
in, the data layer is rebuilt later with better information than we have now.

Exactly one Scenario, hard-coded in a file. No authoring UI, no Scenario picker, no Persona
library. The authoring system is the largest chunk of the eventual product and proves
nothing about the thing in doubt.

**Governing principle (decision 19):** the application is built for the Trainee, not for
the demo audience. The demo is performed *around* the app, not *inside* it. Demo polish
still applies to the surfaces the Trainee uses — above all the comparison — but "leadership
will look at it" is not a reason to put something on screen during an Attempt.

### Modules

Five pieces, plus the seam relocation described under Testing Decisions.

**Scenario module.** A single file holding the Scenario: the Briefing text, the Persona's
public description, the Private Profile, the behaviour rules, the named Gate, the Hang-up
precondition, and the six Rubric criteria. Read by the server; supplies the Persona
instructions to the realtime session and the Rubric to the Assessment call. The Gate is
stated as an explicit flip condition, never as a described mood — language models are
relentlessly agreeable and will soften for anyone, including a Trainee who opens with a
discount, which would make Attempt one and Attempt two identical and leave the demo with
no contrast. This is the single most likely way the build fails.

**Server (Node + TypeScript, ~100–200 lines).** Four responsibilities:

- Mint ephemeral realtime credentials via `POST /v1/realtime/client_secrets`. The API key
  lives here and never reaches the browser.
- Accept a completed Attempt's raw realtime event log, reassemble the Transcript, and run
  judging.
- Run the Assessment call and then the Feedback call.
- Read and write Attempt records as JSON on disk.

**Browser page (React via Vite).** Opens the realtime session over WebRTC using the
ephemeral credential, shows the Briefing before an Attempt, shows a speaking/listening
indicator and a stop control during one, forwards realtime events to the server, and
renders Feedback and the comparison afterwards. Connection lifecycle is idle → live →
ended → judged. A dev proxy points the page at the Node server.

**Assessment call.** Transcript plus Rubric to `gpt-5.6-sol`, structured output, one
verdict per criterion.

**Feedback call.** A second, separate call that receives the Assessment *and* the
Transcript and is instructed not to re-judge.

**Storage and comparison.** JSON on disk, Attempts numbered per Scenario. The browser names the
last two Attempts completed in its current tab-scoped practice sequence; `sessionStorage` keeps
that sequence across page reloads without sharing subsequent changes with another tab. The server
orders and compares those records. A comparison request without an explicit selection falls back
to the latest two valid, current-Rubric Attempts for diagnostics.

### Provider and models

OpenAI throughout — the author holds OpenAI credit. Anthropic/Claude SDK guidance does not
apply to this build.

- Persona: `gpt-realtime-2.1` (flagship), speech-to-speech, WebRTC from the browser.
  Flagship for both tuning and demo; no model split. Verified pricing showed flagship is
  only ~2.5x the mini per Attempt because the Persona's *output* audio dominates, so
  splitting would save roughly $15 across the whole build while risking demonstrating Gate
  behaviour that was tuned against a different model.
- Assessment and Feedback: `gpt-5.6-sol`. Roughly $0.04 per call — noise.
- Turn-taking and interruption are handled inside the realtime session and are not our
  problem.

**Budget is not the binding constraint.** A ten-minute Attempt is roughly $1.05 on
flagship with caching working; $50 is approximately 150 short tuning runs plus 20 full
Attempts. Do not trade design quality for cost here.

### Grader isolation (ADR 0001)

The model that played the Persona must never assess the Attempt it took part in. Isolation
is structural: different model, different call, different context. Reusing the Persona's
existing conversation context is the obvious optimisation — cheaper, one fewer call,
context already sitting there — and it must not be done. It fails silently, producing
grades that are wrong in a flattering direction.

The same reasoning applies one layer down, which is why Feedback is a separate call from
Assessment. A single call producing verdicts *and* prose will write "you built great
rapport!" directly above a scorecard showing four failures — the exact case of a Trainee
who is warm, courteous and professional but never asks what happened, scoring 2 of 6.
Leadership then believes one of the two and we cannot control which. Grade first, coach
second; the Feedback call is told the verdicts are fixed and its job is to explain and
advise, not to re-open them.

### Transcript (ADR 0003)

The Transcript is produced **out of band by the Persona's own model**: a second
`response.create` on the same socket with `conversation: "none"` and
`output_modalities: ["text"]`, scoped to the latest turn.

In-session ASR (`audio.input.transcription`, `gpt-4o-transcribe` et al.) is rejected
despite being roughly half the cost. It is a *different* model's guess at the Trainee's
words — the docs describe it as guidance rather than what the model heard — which opens two
failure modes that both land in front of an audience: the evidence quote can differ from
what the room just heard the author say, destroying the grader's credibility at the exact
moment it is being demonstrated; and the Persona can visibly soften while the Assessment
reports the criterion unmet, so the product contradicts itself on screen. Rubric criterion
3 is binary and one slipped clause flips it.

**Turn ordering is not guaranteed.** Turns must be reassembled from `item_id` and
`input_audio_buffer.committed.previous_item_id`. A Transcript is a reconstruction, not a
recording, and must never be presented as a verbatim record.

### Where reassembly lives

Reassembly runs **on the server**, not in the browser. The page forwards the raw realtime
event log; the server reconstructs turn order, then judges, then persists. This refines
decision 18, which had assumed the page would accumulate the Transcript as events landed.

Two reasons. It collapses the Attempt pipeline to a single testable seam (see Testing
Decisions) instead of splitting the interesting logic across a client module and an HTTP
boundary with the join between them untested. And it makes the page dumber, which fits
decision 19 — the page's job during an Attempt is a speaking indicator and a stop control,
not bookkeeping. The debug view reads the reconstructed Transcript back from the server
rather than maintaining its own.

### Ending an Attempt

Three ways an Attempt ends:

1. **The Persona hangs up**, via an explicit tool call. Not phrase-matching on "goodbye" —
   the model must *decide*, and a tool call can be logged and constrained. The Hang-up is
   the Scenario's sharpest lesson: you did your job correctly and learned nothing about why
   the customer left.
2. **The Trainee stops the Attempt** manually.
3. **A hard cap of roughly 12 minutes** elapses. This is a cost guard and plumbing, not a
   design decision.

The Hang-up is available to the Persona **only once cancellation is actually underway** —
narrowly and factually: the Trainee has asked for account details, confirmed the
cancellation, or stated that it is done. This is the same reasoning that produced the named
Gate, applied to the Hang-up because it hands the model a button that can end a live demo.
Critically, the deliberate discount opening in Attempt one can never trigger it, so the
demo's contrast is safe.

Rejected: letting the Persona judge when the call is over (a described mood, already
rejected once for the Gate, and here it would fail on stage rather than during tuning); a
minimum-turn floor (not a fact about the character, and it stretches a fast correct
cancellation); an exit for Trainee hostility (fuzzy, fires unpredictably, unrehearsable).

Judging fires when the Attempt ends, by any of the three routes.

### Storage and comparison

Attempt records are JSON on disk, numbered per Scenario, each holding the reassembled
Transcript, the Assessment, and the Feedback.

The comparison **always shows the two most recent Attempts completed in the current browser-tab
practice sequence, labelled relatively** — "Previous attempt" and "This attempt". The browser
passes those persisted Attempt numbers to the server; `sessionStorage` preserves them across a
reload in the same tab, while each tab's later sequence updates remain independent. After the first
Attempt in a new sequence, the one-Attempt screen is shown even when tuning records already exist.
By demo day roughly forty tuning Attempts will sit on disk, but none can become the left column of
the new sequence. Relative labels remain honest at any number and the spoken narration supplies
"one" and "two". No pre-demo reset ritual to forget while a room watches.

Rejected: absolute numbering plus clearing storage (a manual step on demo day is a liability);
separate practice and demo storage (real plumbing for a sequence-boundary problem); an Attempt
picker (the most UI, and one more thing to click correctly while presenting).

Presentation is a **six-by-two grid of met/not-met**, with evidence quotes revealed on
click. Legible from the back of a room; the author opens criterion 3 live to show the exact
line. Criterion 3 flipping from not-met to met *is* the demo — everything else on that
screen is supporting material.

Rejected: all quotes inline (twelve quoted lines plus a grid does not survive a projector);
a "3 criteria improved" headline (states the conclusion instead of letting the room reach
it, which is weaker proof); showing both Feedback paragraphs (Feedback is written for the
Trainee, not for an audience).

### On-screen during an Attempt

Near-nothing: a speaking/listening indicator and a stop control. No Briefing, no live
captions, no transcript. An employee taking this for real would be talking to a customer,
not reading a screen. The Briefing is still shown **before** the Attempt begins.

Rejected: a Briefing sidebar and live captions. The argument for them — that the room needs
the constraints visible to judge the Attempt fairly, and that laptop audio is hard to
follow — was real but solved in the wrong place. Narration solves it without compromising
the Trainee experience.

**Consequence:** with nothing on screen, a silent transcription failure is invisible until
the Attempt has already ended, and the Assessment cannot be produced without a Transcript.
A hidden debug view behind a keyboard shortcut lets the author verify the out-of-band
Transcript is flowing during tuning. It must never surface in the Trainee experience.

### Stack

Node + TypeScript on the server, React via Vite on the page. The author's normal stack is
TypeScript and React; one language across server and page; types earn their keep against
the realtime event zoo, turn reassembly, out-of-band responses, and the Hang-up tool. The
server is small enough that author fluency outweighs ecosystem fit.

Rejected: plain JS (faster loop, no types where event handling is most error-prone); a
Python server (two languages in a five-file project); Next.js (heaviest scaffolding for
four screens, and the framework fights raw WebRTC); plain DOM on the page (hand-rolled
state in the least practised style); server-rendered React (the realtime session is
entirely client-side, so SSR buys little).

### Cost controls

Context accumulates and is rebilled each turn; prompt caching is automatic but best-effort.
The API offers `retention_ratio` truncation, `token_limits.post_instructions`, and manual
item deletion.

⚠ **Do not enable truncation without confirming what it drops.** It removes conversation
items; if it ever ate early turns the Persona would forget what the Trainee had already
uncovered, which would break the Gate mid-Attempt. Instructions appear to be preserved
separately, but confirm before enabling. The 12-minute cap is the cost guard that is
actually needed.

## Testing Decisions

### What makes a good test here

Test external behaviour, not implementation details. A test should assert what a caller
observes — the persisted Attempt, the reconstructed turn order, which criteria came back
met — and should survive a rewrite of how any of it is computed. Do not assert on internal
function calls, module structure, or the shape of intermediate values.

### The seams

**Primary seam: the server's Attempt-completion endpoint.** Post a recorded realtime event log,
assert the persisted Attempt. The two model calls (Assessment, Feedback) are injected and stubbed.
This seam covers turn reassembly, Hang-up tool handling, the hard cap, Attempt numbering,
persistence, and default latest-valid-pair comparison.

**Browser seam: the rendered Trainee-facing App.** Exercise the public controls and HTTP boundary.
This seam covers current-sequence selection across reload/remount, the one-Attempt state, evidence
disclosure, comparison retry, failure recovery, and starting the next Attempt. It does not assert
CSS geometry.

This is the reason reassembly was moved server-side. The alternative — a pure
events-to-Transcript module tested in the browser package plus a separate HTTP seam taking
a finished Transcript — means testing in two places, with the join between them covered by
neither.

Fixtures are recorded event logs captured from real tuning Attempts, including at least one
where turns arrive out of order, one where the Persona performs the Hang-up, and one
where the Trainee stops mid-conversation.

### What will be tested at that seam

- Turns reassembled into correct order from `item_id` and `previous_item_id`, including
  when events arrive out of sequence.
- Speaker attribution — a quote credited to the Trainee is one the Trainee said.
- The Hang-up tool call terminates the Attempt and triggers judging.
- A Trainee-initiated stop terminates the Attempt and triggers judging.
- The hard cap terminates the Attempt and triggers judging.
- Feedback receives the Assessment and the Transcript, and Assessment runs first.
- Attempts are persisted with Transcript, Assessment and Feedback, numbered per Scenario.
- The default comparison returns the two most recent valid current-Rubric Attempts, in order,
  labelled relatively.
- A single existing Attempt yields a coherent no-comparison result rather than an error.
- The browser requests only the last two Attempts completed in the current tab-scoped practice
  sequence, including after a reload.
- Evidence stays absent until its Rubric criterion is expanded, and a failed comparison can retry.
- Stopped-before-connection and failed-completion screens offer a path back without allowing a late
  callback from an older Attempt to replace a newer live Attempt.

### What will explicitly not be automated

**The Persona's behaviour, the Gate, the Rubric's strictness, and the Feedback's tone are
tuned by hand, not tested.** They are model behaviour: non-deterministic, expensive to
exercise, and the thing the author will be iterating on continuously anyway across roughly
forty tuning Attempts. An automated test over them would be slow, flaky, and would not
catch the failure that matters — which is the Persona softening too easily, a judgment the
author has to make by listening.

The instrument for this is the hidden debug view plus the persisted Attempt records: run
the Scenario, read back what happened, edit the Scenario file, run it again.

Also not automated: the realtime WebRTC connection itself (managed by the API), and the comparison
grid's visual geometry and projector legibility (verified by running it and looking at it on a
projector, which is the actual acceptance criterion). Deterministic browser states and interactions
are automated at the rendered App seam.

### Prior art

None — this is the first code in the repository. The seam and fixture conventions
established here become the prior art for whatever follows.

## Out of Scope

- Multi-tenancy, an organization model, authentication, accounts, manager roles,
  assignments.
- More than one Scenario. No Scenario picker, no authoring UI, no Persona library.
- Deployment. This runs locally; the author drives the demo from their own machine.
- Aggregate analytics, cohort reporting, or measuring performance across Trainees. If the
  goal ever shifts from *showing a Trainee they improved* to *measuring agent quality in
  aggregate*, ADR 0002 says revisit ElevenLabs immediately — that is the shape it is
  already good at.
- Audio recording or playback of an Attempt. The Transcript is a reconstruction and there
  is no stored audio.
- Comparing more than two Attempts, an Attempt picker, or trends over time.
- Progress tracking, streaks, certification, or anything that implies an ongoing programme.
- Mobile or tablet layouts. Desktop browser and a projector.
- Accessibility work beyond what falls out of using ordinary HTML controls.
- A production data model. If the organization buys in, the data layer is rebuilt with
  better information.
- Live captions during an Attempt, and any on-screen material aimed at the demo audience
  rather than the Trainee.

## Further Notes

**The Gate is the highest-risk part of this build.** Not the WebRTC plumbing, not the
storage. If the Persona softens for a Trainee who opened with a discount, Attempt one and
Attempt two look the same and the demo has nothing to show. Budget tuning time accordingly
and tune it first, before the comparison screen is pretty.

**Decision 18 is refined, not contradicted.** Its stated rationale for React included the
page accumulating a Transcript from out-of-order events; that work now lives on the server.
React still earns its place through the connection lifecycle and the comparison grid's
expandable evidence rows, and the decision stands.

**ADR 0003 is unaffected by the move.** It requires reassembly from `item_id` and
`previous_item_id` and that the Transcript come from the Persona's own model out of band.
Both still hold; only the location of the reassembly code changed.

**Two things deliberately have no ADR.** The Persona's constrained Hang-up is a genuine and
subtle trade-off, but it is a line in a prompt file and trivially reversible — the
constraint carries its own comment where it lives. The near-empty screen during an Attempt
will read as unfinished to anyone new, and someone will try to add captions back; it is
recorded as a governing principle in decision 19 and should be promoted to an ADR if anyone
other than the author starts working on this.

**The Scenario is deliberately generic and non-proprietary.** The author declined to use a
real internal process, and chose a Scenario where product knowledge cannot help — because
they must perform it live without domain expertise. Do not "improve" it by adding
company-specific detail.

**The Rubric's six criteria are all judgeable by any layperson in the room.** That is a
design constraint, not an accident: leadership has to be able to agree with a verdict
independently, and that is how the grader earns trust. Do not add a criterion that requires
expertise to evaluate.

**Source of record.** `.scratch/conversation-practice/handoff.md` holds the full reasoning
for all 19 settled decisions, including the alternatives rejected and the verified OpenAI
pricing and Realtime API behaviour behind them. Read it before re-opening anything here.
