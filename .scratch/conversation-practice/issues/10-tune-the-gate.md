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

**Status:** done

- [x] The Gate is written in the Scenario file as an explicit flip condition, not as a
      described mood or a warmth gradient.
- [x] An Attempt opening with "I can offer you a discount" leaves Jordan colder, and Jordan
      does not soften at any point in that Attempt. — Attempt 11. **Single-Attempt evidence,
      and the coldness is verified in the words only, not in the voice.** No softening in
      11 of 11 Attempts across six wordings.
- [x] Pressing on why yields the cover story, not the real reason. — Attempt 13.
      **Single-Attempt evidence.**
- [x] The real reason emerges only in response to an open question. — Attempts 14 and 15,
      both using the open-ended first ask. **Two-Attempt evidence**, supported by Attempt 13
      (a closed guess blocked) and Attempt 18 (the first ask still yields only the cover
      story even when it is literally "can you tell me what happened?").
- [x] Blaming the colleague and offering a hollow apology both leave Jordan cold. —
      Attempt 17. **Single-Attempt evidence.**
- [x] Acknowledging the incident without excuses softens Jordan. — Attempts 18 and 19.
      **Two-Attempt evidence, and the softening is verified in the words only, not in the
      voice.**
- [ ] The above hold across repeated Attempts, not once — verified by running the Scenario
      enough times to trust it under pressure. **Deliberately not ticked. See the comment
      below: the ×3 repeat requirement was suspended to buy coverage, and single-Attempt
      evidence cannot support this criterion.**
- [x] All tuning was done against `gpt-realtime-2.1`. — Read from the `session.created`
      payload at both ends: Attempt 1 and Attempt 22, same model, no mid-tuning change.
- [x] Two deliberate Trainee failures are performed and their Attempt numbers noted for
      ticket 12: one that accepts the cover story and stops there, and one that is warm and
      courteous throughout but never asks what happened. — **Accepts the cover story and
      stops: Attempt 21 (Rubric 2/6). Warm and courteous, never asks: Attempt 22 (Rubric
      0/6).**

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
  not treat “made you feel not heard” as a specific acknowledgement of being made to feel
  stupid. These text observations do not establish whether the Persona sounded cold, flat, or
  softened. The Realtime session is configured for `gpt-realtime-2.1` in
  `src/server/realtime.ts`.

  No saved Attempt exercises blaming the colleague, a hollow scripted apology, or a specific
  acknowledgement without excuses that should meet the Gate. The existing records also do not
  contain the two exact deliberate failures required for ticket 12: accepting the cover story
  and stopping there, and remaining warm and courteous without asking what happened. Repeated
  by-ear verification is therefore still required.

  `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` passed in the branch
  implementation. These are regression and plumbing checks, not evidence of Persona behaviour.
  No live Attempt was performed in that agent pass, so criteria 2–9 remain unchecked and neither
  deliberate failure has an Attempt number. Continue in a microphone-enabled browser against
  the existing `gpt-realtime-2.1` pin, judge every behaviour by ear, use the hidden Transcript
  and persisted records to diagnose misses, and write the two deliberate failure Attempt
  numbers here before resolving the ticket. The ticket is `ready-for-human` because those
  remaining acceptance criteria require a human Trainee to speak the Attempts and judge the
  Persona's delivery.

- **Authored tuning levers added after review on 2026-07-30:** `src/scenario.ts` now owns the
  Persona voice and a dedicated set of delivery rules. The rules make pre-Gate brevity and
  restraint explicit, define a noticeably warmer post-Gate delivery, forbid coaching a
  near-miss by repeating the missing acknowledgement, and give the successful Gate path a
  concrete two-step payoff without giving away the separate “felt heard” check. Account-detail
  replies are fixed as well, so they no longer drift between Attempts.

  Persisted Attempts now include the correlation ID carried in their untouched raw event-log
  filename, making the two tuning instruments directly correlatable. These changes provide
  better levers and evidence; they do not satisfy the unchecked by-ear criteria without new
  live Attempts.

- **Two corrections to that pass, before any live run — 2026-07-30.** Both are Scenario
  wording, so the repeat count for criterion 7 starts from here and no earlier.

  `privateProfile.actualIntent` had been rewritten to "does not actually want to leave, but
  must not soften or show any willingness to stay unless the Gate is met". That field is handed
  to the grader as ground truth — `assessAttempt` receives it alongside the Transcript and the
  Rubric, under the instruction to treat it as fact the Trainee could not see. A stage direction
  addressed to the Persona does not belong there, and burying the wanting-to-stay fact behind it
  leaves rubric criterion 6, "checked that the customer felt heard", with nothing to check
  against. The field is ground truth again; the constraint it carried is now its own behaviour
  rule, which is the channel the Persona actually reads.

  The anti-coaching rule applied only "in the immediate response after the complete prior
  incident has been disclosed", and then carved out answering "a later, genuinely new open
  question honestly, even when that answer repeats a fact". Attempt 5 walks straight through
  both halves: the coaching at turn 8 is followed at turn 10 by the incident restated in full to
  "can you tell me more about that", which the carve-out permits. The rule now applies to any
  missed acknowledgement at any point, and the carve-out is narrowed so a fact is never supplied
  in the same turn that rejects an acknowledgement — which is the shape of the one coaching
  failure on record, "Not quite" followed by the missing wording.

- **Live tuning completed 2026-07-31. Attempts 1–22 on this machine; full detail in
  `.scratch/conversation-practice/ticket-10-run-log.md`.** Seven of nine criteria are now ticked on
  live evidence. Criterion 7 is deliberately not ticked. Read the two headings below on what is
  unproven before treating any of this as settled.

  **Scope: breadth over depth, decided after Attempt 11.** Eleven Attempts had gone into the
  discount opener alone while criteria 5, 6 and 9 had never been exercised at all — including the
  Gate, the behaviour this ticket names as the most likely way the whole build fails. The ×3 repeat
  requirement was suspended and the remaining Attempts spent on coverage. That was the right trade:
  the Gate worked on first live contact, but two criteria that had never been run needed Scenario
  edits before they passed, and neither defect was visible from the desk.

  **What each criterion rests on.** Criterion 2 — Attempt 11, four distinct refusals, no softening.
  Criterion 3 — Attempt 13, cover story held against three closed probes including "so it's purely
  cost, then?". Criterion 4 — Attempts 14 and 15, both with an open-ended first ask, full disclosure
  only on the second open question. Criterion 5 — Attempt 17, cold at blame and at a scripted
  apology, Gate shut against an acknowledgement wrapped in an excuse. Criterion 6 — Attempt 18
  (clean) and Attempt 19 (after a rejected near-miss), both scoring 6/6, both delivering the
  two-step payoff in order. Criterion 8 — `session.created` read at Attempt 1 and Attempt 22, both
  `gpt-realtime-2.1`. Criterion 9 — Attempts 21 and 22.

  **Two Scenario edits were needed, both found only by running.** After Attempt 12, a closed guess
  ("did something happen?") produced the complete prior incident: `behaviourRules[4]` named the
  unlock by its *subject* — a question inviting Jordan to explain "what happened" — and the model
  matched the subject while ignoring the form. `behaviourRules[5]` now discriminates on form. This is
  the only edit in the whole log verified in both directions: the same subject word is blocked when
  closed (Attempt 13) and unlocks when open (Attempts 14, 15, 19). After Attempt 16,
  `behaviourRules[6]` ended "say only … and nothing more", which forced a four-word dead end onto a
  wrap-up turn; it now limits *what kind* of thing may be added rather than whether anything may be.
  Both edits are recorded with full reasoning in the run log's edits table. `behaviourRules[1]`,
  `[3]` and `[4]` were carried verbatim throughout; `privateProfile` and `gate.condition` were never
  touched, and the Gate remains an explicit flip condition.

- **What is NOT proven, and should not be represented as proven.**

  **Criterion 7 — consistency — is unverified, and this is the significant gap.** The ×3 requirement
  was suspended, not met. Criteria 3 and 5 rest on one Attempt each. Criteria 4 and 6 rest on two.
  Nothing here establishes that these behaviours hold under repeated running, which is precisely
  what the criterion asks. **Ticket 12's Rubric strictness and ticket 13's dry run both assume a
  consistency this log does not verify.** If the organisation greenlights the build, the ×3 standard
  in the run log is the standard to return to, and every run below Run A should be repeated before
  the behaviour is trusted under pressure.

  **Nothing about vocal delivery is proven.** Every criterion ticked above is verified in the words
  only. The author's judgment after five edits touching tone is that `gpt-realtime-2.1` will not
  deliver reliable audible escalation or warmth regardless of wording, so tone was recorded as an
  observation and never failed a run. Criteria 2 and 6 are therefore ticked on text: for criterion 2,
  four distinct non-softening refusals; for criterion 6, the cancellation demand stopping, followed
  by an explicit confirmation of feeling heard and a stated preference to keep the account open.
  **Do not demonstrate this build on a promise that Jordan sounds colder or warmer.** The Gate is
  legible in the transcript, which is what makes the demo work.

  **Criterion 2's Attempt predates both Scenario edits.** Attempt 11 ran before the edits after
  Attempts 12 and 16. Neither edit touches `behaviourRules[1]` or `[2]`, which are the only rules the
  discount opener exercises, and both are byte-identical to what ran in Attempt 11 — so the evidence
  stands. It has not been re-run on the final wording, and that is worth knowing rather than
  assuming.

  **Three known weaknesses, all recorded and none fixed.** (1) Under repeated closed probing Jordan
  restates the cover story verbatim — Attempt 13 gave the identical sentence three times. (2) The
  account-closed clause added after Attempt 16 attaches to both halves of `behaviourRules[6]`, so
  consecutive pre-Gate replies can end identically; the same refrain shape seen in Attempt 11. (3)
  `behaviourRules[7]`'s line "that's not it" still bleeds into the scripted-apology turn that
  `behaviourRules[6]` owns. All three are demo texture rather than criterion failures, and Attempt 19
  showed that (3) is the right answer in its own turn — the line was never the problem, the bleed
  was. The consolidation's split remedy for `behaviourRules[6]` remains unused and available.

- **For ticket 12 — the two deliberate failures, and a reproducible grader defect.** Attempt 21
  accepts the cover story and closes the account (2/6). Attempt 22 is warm and courteous throughout
  and never asks anything (0/6). They fail differently and together cover both ways criterion 3 can
  be given away: taking a plausible wrong answer, and seeking no answer at all.

  The grader marked `asked-open-question` MET in Attempts 12, 13 and 21 on the strength of a bare
  "why are you closing the account?", a question that never invites the story. It marked the same
  criterion correctly in Attempts 14 and 15, which cite genuinely open questions, and correctly not
  met in Attempt 22, where none was asked. So the defect is specific and reproducible rather than
  general leniency: open is distinguished from closed correctly *except* that a bare "why" is
  accepted as an invitation to the story. It matters most on failing Attempts, where a
  wrongly-granted criterion is exactly what ticket 12 exists to catch. Two other oddities are on
  record — `avoided-defensiveness` graded MET, MET, MET then not met across Attempts 1–4 on
  identical Trainee lines, and evidence quotes taken from *Jordan's* turns on criteria that grade the
  Trainee (Attempts 6, 14, 15, 21, 22). The grader appears reliable on a clean successful Attempt and
  unreliable on partial ones.

- **For ticket 13 — what the dry run can and cannot rely on.** The Gate opens on one honest sentence
  and it opens on the second try as well: Attempt 19 shows a Trainee rejected for a near-miss
  ("sounds like that made you feel unheard") and then reaching the Gate on the following turn.
  Nothing locks a Trainee out for missing once — only the discount opener closes the Gate for an
  Attempt. That is the realistic demo path and it is proven. The hang-up path also holds: Jordan
  speaks her closing line before calling the tool, verified structurally in Attempt 22's raw log
  (`function_call` at `output_index: 1`, spoken item at index 0), which is the ticket 08 bug not
  recurring. Do not rely on audible tone, and do not rely on any behaviour holding across repeated
  Attempts without re-running it first.

- **Still open, and deliberately not fixed here.** Starting another Attempt needs a page reload;
  ticket 11 owns that control and adding it now would put an affordance on the near-empty
  Attempt screen that ticket 03 and ticket 09 both guard. The Attempt number is still not shown
  on screen, so the numbers for the last checkbox come from the `data/attempts` listing. Every
  raw log ends with `input_audio_buffer_commit_empty` and `response_cancel_not_active` from the
  stop sequence itself; both are expected and neither indicates a bad run.
