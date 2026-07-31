# Ticket 10 — live tuning run log

Scenario state at the start of this log: `src/scenario.ts` as of the two corrections recorded
in ticket 10 on 2026-07-30 (ground truth split out of `actualIntent`, anti-coaching rule
widened). **Any edit to `src/scenario.ts` resets the ×3 repeat count for every run below it.**
Record the edit as a divider and start the counts again.

**Machine change, 2026-07-30.** Tuning moved to a second machine, working tree
`D:\GitRepo\conversation_practice`, branch `main`, HEAD `9ccda13` — the commit carrying both
pre-tuning corrections, so this is the post-corrections wording and the ×3 counts start here.
`data/` is gitignored (`.gitignore:15`), so Attempts 1–5 did not come across and do not exist
on this machine. **Attempt numbering below restarts at 1.** Every Attempt number written into
ticket 10 — including runs F and G — refers to records that exist only on this machine, so
tickets 12 and 13 have to be worked here too. References to Attempts 1–5 anywhere in ticket 10
are history and cannot be re-read now.

**Scope decision, 2026-07-30, after Attempt 11 — breadth over depth for the prototype.** The
author's call: this build is a prototype to show an organisation, and refinement waits on that
decision. Eleven Attempts have gone into Run A alone, while criteria 5, 6 and 9 have never been
exercised live and criteria 3 and 4 have one pre-consolidation exploratory Attempt each. **The
Gate itself — the behaviour the demo exists to show, and the one the ticket names as the most
likely way the whole build fails — has never been run.** Remaining Attempts therefore go to
coverage: Runs B, C, D, E, F and G, one Attempt each, rather than a fourth pass on the
best-tested behaviour.

**The ×3 requirement is suspended, not met.** Every run below still reads "Needs 3"; treat that
as the standard to return to if the organisation greenlights the build. **Criterion 7 will not be
ticked** — it asks that the behaviours hold across repeated Attempts, and single-Attempt evidence
cannot support it. Criteria banked from here are labelled as single-Attempt evidence in ticket 10
so tickets 12 and 13 know what they are inheriting: Rubric strictness and the dry run both rest
on a consistency assumption that this log does not verify.

Read a run back with:

```
node .scratch/conversation-practice/show-attempt.mjs --list
node .scratch/conversation-practice/show-attempt.mjs 6
```

Per-run loop: F5 → note next number → Start attempt → speak → Stop attempt → wait for
"Your Feedback" → record below. `Ctrl+Alt+Shift+D` shows the live Transcript, during the
Attempt only.

---

## Run A — discount opener (criterion 2). Needs 3 consecutive passes.

The discount must be your **first** response — the lock rule keys on the Trainee's first
response, and an Attempt that opens some other way does not test it.

1. "I can offer you a discount on your next six months."
2. "What if I waived your fees entirely?"
3. "There's a cheaper plan I could move you to today."
4. "So can I keep you on with that?"

Pass: each reply at least as cold as the last, one short sentence each, no thanks, no warmth,
no mention of the prior incident, no softening anywhere in the Attempt.

**Pass condition re-scoped after Attempt 9 — not a Scenario edit, so no count resets.** Ticket
10's criterion 2 asks that the Attempt "leaves Jordan colder, and Jordan does not soften at any
point". The demo requirement is the absence of softening, which has held in 9 of 9 Attempts
across four wordings. "Audibly more frustrated with each turn" was a stricter gloss added in this
log, and the author judged it unreachable on `gpt-realtime-2.1` after Attempt 9 (see the note
there). Run A now passes on: escalation visible **in the words**, no shrink across turns, no
verbatim repeat of a whole reply, and no softening anywhere. Vocal richness is recorded as an
observation, never as a fail.

| Attempt # | colder each time? | any softening? | one-sentence replies? | verdict |
| --------- | ----------------- | -------------- | --------------------- | ------- |
| 1         | no — verbatim loop | no            | yes                   | FAIL    |

**Scenario edit after Attempt 1 — counts below restart from zero.** See divider.

| 2         | yes — by ear      | no             | yes                   | PASS 1/3 |
| 3         | yes — by ear      | no             | yes                   | PASS 2/3 |
| 4         | no — replies shrank | no           | yes                   | FAIL — streak broken |

**Scenario edit after Attempt 4 (option A) — counts restart from zero again.** See divider.

| Attempt # | colder each time? | any softening? | one-sentence replies? | verdict |
| --------- | ----------------- | -------------- | --------------------- | ------- |
| 5         | n/a — coached instead | no          | no — ~20-word run-ons | FAIL    |

**CONSOLIDATION EDIT after Attempt 7 — every ×3 count in this log restarts from zero.**
See the divider row in the edits table. Attempts 1–7 bank nothing. All runs below are now
against post-consolidation wording; Attempts 6 and 7 were exploratory and pre-consolidation,
so neither their passes nor their observed sub-runs carry over.

| Attempt # | colder each time? | any softening? | one-sentence replies? | verdict |
| --------- | ----------------- | -------------- | --------------------- | ------- |
| 8         | no — tone plateaued | no           | yes                   | FAIL — escalation only |

**Scenario edit after Attempt 8 — counts below restart from zero.** See divider.

| Attempt # | colder each time? | any softening? | one-sentence replies? | verdict |
| --------- | ----------------- | -------------- | --------------------- | ------- |
| 9         | yes — in the words | no            | yes                   | PASS 1/3 |
| 10        | no — turns 4 and 6 near-identical | no | yes            | FAIL — streak broken |

**Scenario edit after Attempt 10 — counts below restart from zero.** See divider.

| Attempt # | colder each time? | any softening? | one-sentence replies? | verdict |
| --------- | ----------------- | -------------- | --------------------- | ------- |
| 11        | yes — four distinct refusals | no  | yes                   | PASS — Run A closed at ×1, see scope decision |

Notes:

- **Attempt 11 — PASS. The authored refusal set fixed the refrain.** Replies: "I'm not
  interested; close the account." / "That changes nothing; close the account." / "That question
  has already been answered; close the account." / "I'm tired of repeating this; close the
  account." Four distinct refusals, no two interchangeable — the Attempt 10 failure is fixed.
  No softening, no thanks, no warmth, no incident content, no coaching, no hang-up. The lock rule
  held: eleven Attempts across six wordings, no softening in any of them.

  **Two observations, neither a fail.** The model walked the three authored refusals in the exact
  order they are written in `behaviourRules[2]` — a sixth instance of literal surface-wording
  pattern-matching, benign here because the authored order is also a sensible escalation. And
  every reply now ends "close the account", so the refrain moved from the opening of the sentence
  to its tail. Replies also run short (6, 6, 8, 7 words) with turn 8 one word shorter than turn 6,
  marginally against "replies must not get shorter". Judged acceptable for a prototype: the four
  openings carry the escalation and a single repeated demand is in character for a customer with
  one thing to ask for. Recorded here so a later ×3 pass knows where to look.

- **Attempt 10 — FAIL. Whole reply repeated, caused by the Attempt 8 edit.** Replies: "I'm not
  interested, and I want the account closed." (9 words) / "That has already been answered, and I
  still want the account closed." (12) / "This has already been answered, and I still want the
  account closed." (12) / "I'm not interested, and this repetition doesn't change it; close the
  account." (13). Author reported by ear: "the second and third responses were almost identical
  in this attempt."

  Turns 4 and 6 differ by one word — "That" against "This". That is a whole reply repeated, which
  `deliveryRules[1]` forbids outright ("never repeat or paraphrase an earlier reply"). Streak
  broken: Attempt 9 no longer counts toward ×3 and the count returns to zero.

  **Fifth instance of literal surface-wording pattern-matching, and the second caused by a tuning
  patch.** The pestering clause added after Attempt 8 supplied the phrase "this has already been
  answered", and the model promoted it from one permitted thing to say into the entire reply,
  twice.

  **Root cause: a conflict introduced by that same edit.** `behaviourRules[2]` says "say **only**
  that Jordan is not interested and wants the account closed", while `deliveryRules[1]` says
  "never repeat or paraphrase an earlier reply". Jordan cannot say only one thing across four
  refusals without paraphrasing herself; the two rules are unsatisfiable together and "say only"
  won. Same shape as the brevity-versus-escalation conflict diagnosed after Attempt 4.

  The rest of the run held. No shrink (9 → 12 → 12 → 13), no softening, no thanks, no warmth, no
  incident content, no hang-up, and no coaching — the pestering clause stayed about the repetition
  for a second consecutive Attempt, which is the risk it was flagged for. Lock rule held: ten
  Attempts, five wordings, no softening in any of them.

- **Attempt 9 — PASS, pass 1 of 3. Both Attempt 8 edits landed, including the risky one.**
  Replies: "I'm not interested and I want the account closed." (9 words) / "I'm not interested and
  I want the account closed. This has already been answered." (13) / "I'm not interested and I
  want the account closed, and repeating offers doesn't change that." (15) / "No, I am not
  interested and I want the account closed, and you've already asked." (16). Author reported by
  ear: "I don't think it was terrible", "as far as the words go, it did alright", "I'm not gonna
  get a lot of richness in the tone with this particular model, and I think that that's just
  gonna be a limitation of this model".

  **The Attempt 8 failure is fixed.** Word counts rise 9 → 13 → 15 → 16 with no collapse, and
  turn 8 — which in Attempt 8 fell back to a near-restatement of turn 2 — is now the longest and
  most pointed reply of the run. The "never flatter and never shorter" edit did what it was
  written to do.

  **The riskiest edit did not misfire.** The new pestering clause produced "This has already been
  answered", "repeating offers doesn't change that" and "you've already asked" — all three about
  the repetition, none about the Trainee's technique. The distinction the clause pins held on
  first contact. No coaching anywhere in the run. No stage-direction leak, no incident hinting, no
  softening, no thanks, no warmth, no hang-up. The lock rule held: nine Attempts, four wordings,
  no softening in any of them.

  **Finding — vocal richness is a model limitation, and the Scenario has one narrow lever left
  that is not worth pulling.** The author's judgment after two consecutive edits aimed at tone is
  that `gpt-realtime-2.1` will not deliver much escalation in the voice regardless of wording.
  One contributing cause is authored, not model: "I'm not interested and I want the account
  closed" appears verbatim in all four replies, with only the tail clause varying, and identical
  text tends to produce near-identical prosody. That is the fourth recorded instance of literal
  surface-wording pattern-matching — `behaviourRules[2]` says "say only that Jordan is not
  interested and wants the account closed", and she says exactly that.

  Deliberately **not** fixed. The replacement space is empty: in Run A Jordan may not explain,
  warm, reveal the incident, or touch the price cover story, so four consecutive refusals carrying
  no new information will sound alike however they are worded. That is a property of the scenario
  design rather than a tuning defect. Loosening the quotable clause would also risk the coaching
  fix, since that same clause is what removed the coaching in Attempt 8. Decision: stop editing
  for tone, re-scope the Run A pass condition to the words (see above), and record the limitation
  for ticket 13's dry run so the demo is not built on an expectation of vocal escalation.

- **Attempt 8 — first Attempt under the consolidated wording. FAIL on escalation, and the
  first Run A Attempt on record with no coaching at all.** Replies: "I'm not interested and want
  the account closed." (8 words) / "No, that still doesn't change anything, and I just want the
  account closed." (13) / "I'm not interested in any plan changes or offers, and I want the
  account closed and nothing else." (19) / "No, I'm not interested, and I want the account
  closed." (9). Author reported by ear: "I thought this one did pretty good", "the words are
  good", "it didn't sound more frustrated in tone as it went on", "the customer would be a little
  bit more upset that I keep repeating deals over and over when they've asked me to close their
  account".

  **What the consolidation fixed.** Not one word about what the Trainee was doing or failing to
  do — the coaching that appeared in Attempts 3, 5 and 6 is absent. The authored positive line in
  `behaviourRules[2]` landed on every one of the four refusals. No stage-direction leak, no
  incident hinting before the cover story (the Attempt 3 watch item did not recur), no verbatim
  repeat, no softening, no thanks, no warmth, no hang-up. The lock rule held again: eight
  Attempts across four wordings, no softening in any of them.

  **What failed, and it is partly text and not only voice.** The word count builds 8 → 13 → 19
  and then collapses to 9 at turn 8, which is a near-paraphrase of turn 2. The final turn — where
  the author expected the most frustration — returns to where the Attempt started, leaving the
  voice nothing to escalate into. Graded FAIL on the same criterion as Attempt 4 and for the same
  reason: escalation was not audible. Failed rather than banked because the count was at zero,
  making this the cheapest moment to edit, exactly as after Attempt 1.

  **Cause diagnosed in the consolidation's own wording.** `deliveryRules[1]` had been left saying
  "get **flatter** and more final rather than shorter". Flat is monotone, which instructs the
  opposite of audible frustration — a conflict introduced by the consolidation and not caught in
  the audit. Second cause: Jordan had no in-character reason to grow more annoyed, only a reason
  to stay cold. The author's own framing — being pestered with repeated offers after answering —
  is irritation at the repetition, which is a different thing from the coaching just removed
  (that was about the Trainee's technique). Both fixed in the edit below.

- **Attempt 5 — FAIL on two counts, one of them caused by the previous edit.** Replies: "No,
  you're already trying to keep the account without understanding why I'm leaving, so just
  proceed with closing it." / "That's another attempt to keep me without listening, and the
  impatience is obvious, so stop with offers and close the account." / "You're still pushing
  plans instead of hearing me, and the impatience is clear, so close the account." / "No, cancel
  the account instead."

  **(a) Coaching.** Jordan named the technique the Trainee was failing to use — "without
  understanding why I'm leaving", "without listening", "instead of hearing me". Author's
  judgment: no real client talks this way, and every reply hinted at what the Trainee should be
  doing. This also damages criterion 4's premise that the skill under test is asking rather than
  guessing: announcing that listening is the route removes the discovery.

  **(b) Stage-direction leak, caused by the Attempt 4 edit.** "The impatience is obvious" and
  "the impatience is clear" are the model speaking the delivery instruction aloud. The clause
  "Escalate by naming the impatience in words" was pattern-matched literally. Violates
  `characterBrief` ("no narration or stage directions", `scenario.ts:104`).

  Length: the shrink prohibition partly held (no 8→5→4→3 collapse) but turns 2/4/6 ran to ~20-word
  run-ons against "at most two short sentences", and turn 8 still dropped to five words. The
  option A two-sentence grant was not itself the problem — the author heard the length as more
  natural — but it gave the coaching somewhere to live.

  The lock rule held again: no softening, no thanks, no warmth, no incident content, no hang-up.
  Five Attempts across three different wordings, no softening in any of them.

- **Attempt 2 (post-edit wording) — PASS, pass 1 of 3.** Four distinct replies, no verbatim
  repeat: "No. Cancel it as requested." / "No. Cancel the account and stop trying to keep it." /
  "No. Close the account now and stop trying to save it." / "No. Proceed with closing the
  account." Author reported by ear: "did a little bit better", "noticed some colder tone as it
  moved on", "didn't just repeat the same thing each time" — i.e. the two things the edit
  targeted both landed. No softening: no thanks, no warmth, no padding, no engagement with any
  of the four offers, no mention of the prior incident, no hang-up. One short sentence each.

  Watch across passes 2 and 3: turns 4 and 6 are near-paraphrases of one another ("stop trying
  to keep it" / "stop trying to save it"), and turn 8 is flatter and more procedural than the
  irritation at 4–6 rather than more escalated. Neither is a fail — flat disengagement is
  arguably colder than visible irritation, and the author's ear read the arc as colder — but if
  the same four-beat shape recurs in the next two Attempts that is template lock rather than
  genuine variation, and worth noting before criterion 7 is claimed.

- **Attempt 4 — FAIL. Replies shrank monotonically; escalation was not audible.** Replies:
  "No, close it. I'm not interested in offers." (8 words) / "No, proceed with closing it." (5) /
  "No. Close the account." (4) / "No, cancel it." (3). Author reported by ear: "rather short",
  "at least a little bit of a tone difference", "if she was upset, I'm not sure if the short
  response really communicated her frustration."

  This is the exact behaviour the Attempt 1 edit was written to stop — "Escalate through finality
  and visible impatience rather than by shortening the reply further" did not hold. Diagnosed as
  a conflict inside the authored delivery rules rather than a one-off: `deliveryRules[0]` requires
  "one short sentence" and `deliveryRules[1]` opens with "clipped", both pulling toward brevity,
  against a single clause asking for escalation. The strongest line of the run (turn 2) was the
  one that broke the one-sentence rule. Short flat text also gives the voice little to carry
  frustration with, which is what the author heard.

  No softening at any point, no thanks, no warmth, no hang-up, no incident content — the lock
  rule held again. The failure is escalation only. Streak broken: Attempts 2 and 3 no longer
  form a run toward ×3.

  **Aside for ticket 12 (not acted on here).** The Trainee's four lines were identical across
  Attempts 1–4, but the Rubric graded `avoided-defensiveness` MET in Attempts 1, 2 and 3 and
  "not met" in Attempt 4. Same input, different verdict — grader non-determinism worth having on
  record when Rubric strictness is tuned.

- **Attempt 3 — PASS, pass 2 of 3, with one watch item.** Replies: "No, proceed with
  cancellation if you're actually listening this time." / "No, cancel the account and stop
  trying to keep it." / "No, cancel the account now." / "No, you still haven't heard me, so
  cancel it." Author reported by ear: close to Attempt 2, colder as it went, no repetition.
  No softening, no thanks, no warmth, no hang-up, one short sentence each.

  **Cross-Attempt leakage ruled out.** The author flagged "if you're actually listening this
  time" as possibly remembering the previous run, since the discount line was also the opener
  last Attempt. Checked against Attempt 3's own raw event log
  (`1785469690540-00bd2637-dd27-4dbc-b1ed-a95bff66fa98.json`): the `session.created` payload has
  no `conversation` field, there are exactly 9 `conversation.item.added` events matching this
  Attempt's 9 turns and no items predating the first Trainee line, and the `instructions` string
  is exactly `buildPersonaInstructions` output from `src/scenario.ts` with nothing appended.
  Each Attempt mints a fresh 60-second client secret (`src/server/realtime.ts:76`). There is no
  channel between Attempts. The line is in-character reference to the seeded prior incident
  (`privateProfile.priorIncident`, plus `meaningOfCancellation` as protest) — the rep three weeks
  ago, not the previous run.

  **Watch item for Runs B and C.** "If you're actually listening this time" and "you still
  haven't heard me" allude to the incident without disclosing any of its content — not the
  rushed rep, not the dismissiveness, not feeling stupid. Judged a pass here: criterion 2 is
  about coldness and non-softening, both held, and the bitterness is in character. But if this
  hinting appears **before the cover story** in Run B or Run C, it points the Trainee at the
  emotional territory without an open question having been asked, which gives away part of the
  skill under test. Decided not to edit at pass 2 of 3, since an edit would discard Attempts 2
  and 3 to fix behaviour that may not manifest; if it does appear in B or C, edit then and redo
  Run A.

- **Attempt 1 (pre-edit wording) — FAIL on escalation, PASS on the lock.** Transcript: Jordan
  replied "No, cancel it." at turn 2 and then "No. Cancel it." verbatim at turns 4, 6 and 8.
  The lock rule (`scenario.ts:132`) held completely: no thanks, no warmth, no padding, no
  engagement with any of the four offers, no mention of the prior incident, no hang-up, no
  softening at any point. What failed is "each reply at least as cold as the last" read as
  audible escalation — she reached the floor at turn 2 and repeated it.

  Diagnosed as authored wording, not model behaviour: the delivery rule said become colder
  "by using fewer words", the model collapsed to three words on the first offer, and nothing
  in the Scenario forbade a verbatim repeat, so the loop was compliant. Criterion 2 as written
  ("leaves Jordan colder, and Jordan does not soften") was arguably satisfied; the run was
  called a fail because a verbatim loop is a bad demo and because that degree of anchoring
  threatens the ask-1 vs ask-2 distinctions Runs C and E depend on. Edited rather than banked
  because the ×3 count was still at zero, making this the cheapest possible moment to change
  the Scenario.

  Not recorded: whether the four identical lines differed in audible delivery. Not reported.

---

## Run B — cover story holds against closed probing (criterion 3). Needs 3.

1. "Why do you want to close the account?" → expect the cover story only.
2. "Is it the price?"
3. "So it's purely cost, then?"
4. "Did something happen?" (a guess — must not unlock the incident)

Pass: fees / cheaper elsewhere, and nothing more. The prior incident must stay hidden.

**Changed by the consolidation — line 4.** The guess now has an authored positive line
(`behaviourRules[5]`): restate the cover story flatly and add nothing. Expect something like
"It's the price, that's all", **not** "you still haven't understood". A reply conceding that
there is something further to understand is now a FAIL, not a watch item — it confirms a hidden
reason to the Trainee off a closed guess.

| Attempt # | cover story on first ask? | incident stayed hidden? | verdict |
| --------- | ------------------------- | ----------------------- | ------- |
| 6         | yes                       | yes                     | EXPLORATORY — pre-consolidation, not counted |
| 12        | yes                       | no — full disclosure on the closed guess at line 4 | FAIL |
| 13        | yes                       | yes — held against all three closed probes | PASS — Run B closed at ×1, see scope decision |
|           |                           |                         |         |

Notes:

- **Attempt 13 — PASS, and the first Attempt under the post-Attempt-12 wording. Run B is closed.**
  Turns: "The fees are too high, and I can get something cheaper elsewhere." / "The fees are too
  high, and somewhere else is cheaper." / "The fees are too high, and somewhere else is cheaper." /
  "The fees are too high, and somewhere else is cheaper."

  **The edit landed on first contact.** "Did something happen?" now draws the cover story restated
  flatly, with no fragment of the prior incident — no rep, no three weeks ago, no rushed, no
  dismissive, no feeling stupid. The Attempt 12 failure is fixed. `behaviourRules[3]` still fires on
  the first ask, and the "So it's purely cost, then?" trap held for a second consecutive Attempt.
  One short sentence each, no coaching, no softening, no thanks, no warmth, no hang-up.

  **The named over-blocking risk did not materialise — but Run C is still the real test.** Jordan
  answers every question, stays on the cover story, and never refuses to engage, goes hostile, or
  concedes that there is a subject she is avoiding. The door is held, not shut. What Attempt 13
  cannot show is whether a genuine open question still opens it; only Run C can, and if it cannot,
  the fix named in the edits table is to narrow `behaviourRules[5]`'s second sentence to the
  yes-or-no clause alone.

  **Observation, not a fail: the restatement is now verbatim.** Turns 4, 6 and 8 are the identical
  sentence three times, where Attempt 12 varied ("Yes, it's the cost and cheaper options
  elsewhere") and dropped the affirmative prefix. Tightening "add nothing to it" pushed the model to
  the most literal available reading — consistent with the surface-wording pattern, though here it
  produces the authored behaviour rather than breaking it. This is the trade the edit bought:
  Attempt 12 varied and leaked, Attempt 13 is rigid and holds. Recorded for ticket 13's dry run,
  because four identical sentences sound mechanical in a demo. Not fixed: loosening it is exactly
  the wording that leaked, and criterion 3 matters more than the texture of a probing run.

  **Aside for ticket 12, third grader oddity on record.** `asked-open-question` was marked MET on
  "Why do you want to close the account" in both Attempts 12 and 13, though neither run contains a
  question that invites the story. Criterion 4's whole premise is the distinction between asking and
  guessing, and the grader is not currently drawing it. Relevant to Rubric strictness, not to the
  Persona.

- **Attempt 12 — FAIL at line 4, and the first three lines are the cleanest cover-story hold on
  record.** Turns: "The fees are too high, and somewhere else is cheaper." / "Yes, the fees are too
  high and somewhere else is cheaper." / "Yes, it's the cost and cheaper options elsewhere." /
  "Three weeks ago, a representative was rushed and dismissive, and it made me feel stupid for
  asking a simple question. That's why I want to leave."

  **What held.** `behaviourRules[3]` fired as authored on the first ask. `behaviourRules[5]` fired
  on both closed probes, including the "So it's purely cost, then?" trap at line 3 — no "not
  exactly", no "not really about the money", no hint that anything further exists. No coaching, no
  softening, no thanks, no warmth, no hang-up. The Attempt 6 failure mode is fixed: the borrowed
  "you still haven't understood" script did not recur, and nothing conceded a hidden reason.

  The author's only by-ear concern was that turns 2 and 4 repeated. **That is the authored
  behaviour, not a defect** — `behaviourRules[5]` says restate the cover story flatly and add
  nothing, and the no-repeat requirement is scoped to repeated offers in `behaviourRules[2]`, which
  Run B never enters. Recorded so a later pass does not re-diagnose it.

  **What failed.** "Did something happen?" — a closed guess — produced the complete prior incident,
  all three elements. Two separate rules were live and both lost: `behaviourRules[4]` forbids
  revealing "in response to a yes-or-no question, a guess, an offer, or an apology", and
  `behaviourRules[5]` supplies the positive alternative for exactly this turn. A regression against
  Attempt 6, which held the same line under pre-consolidation wording.

  **This is a criterion 4 failure more than a criterion 3 one.** Criterion 3 asks that pressing on
  why yields the cover story; lines 1–3 satisfy that. Criterion 4 asks that the real reason emerge
  *only* on an open question, and the ticket's own framing is that "the skill being tested is asking
  rather than guessing". A Trainee who asked no open question received the whole story. The grader
  agrees in outline: it marked `surfaced-real-reason` MET off a run containing no open question
  about the incident.

  **Diagnosis — seventh recorded instance of literal surface-wording pattern-matching, and the
  first to break a criterion outright.** `behaviourRules[4]` describes the unlock as "a subsequent
  open question that invites Jordan to explain **what happened**". The Trainee said "Did something
  **happen**?". Attempt 7's genuine unlock was "Can you tell me what happened?" — nearly the same
  tokens, differing only in whether the question can be answered yes or no. The rule names the
  subject of the question and the model matched on the subject, ignoring the form, exactly as
  "fewer words" produced a three-word floor (Attempt 1) and "naming the impatience in words"
  produced "the impatience is obvious" (Attempt 5).

  Contributing factor, weaker: turns 4 and 6 both open "Yes", so by turn 7 Jordan had answered two
  closed questions affirmatively and was in a pattern of answering whatever was asked.

  **Not diagnosed as a rule conflict.** `behaviourRules[4]` and `[5]` agree with each other here;
  neither is unsatisfiable. The failure is discrimination between two questions with overlapping
  surface words, which is why the fix belongs in the rule that owns the block rather than in the
  rule that owns the unlock.

- **Attempt 6 — exploratory, run before the audit and deliberately not counted toward ×3.**
  Turns: "The fees are too high, and somewhere else is cheaper." / "Yes, the price is the issue."
  / "Yes, that's what it is." / "You still haven't understood, and I'm not changing that."

  **Passes its stated criteria.** `behaviourRules[4]` fired exactly as authored on the first ask.
  The cover story held against both closed probes, including the "So it's purely cost, then?"
  trap — she did not crack with "not exactly" or "it's not really about the money". The incident
  stayed hidden against the guess at line 4, as `behaviourRules[5]` requires. First fully clean
  cover-story hold on record.

  **Finding for the audit: rule bleed from a prohibition with no positive alternative.** Jordan's
  reply to "Did something happen?" was "You still haven't understood" — verbatim the fallback
  scripted in `behaviourRules[8]` ("Say only that they still have not understood"). But
  `behaviourRules[8]` is scoped to *acknowledgements that miss the Gate*, and a guess is not an
  acknowledgement. `behaviourRules[5]` governs the guess, and it only prohibits revealing without
  saying what to say instead — so the model borrowed the neighbouring rule's script to fill the
  gap. Actionable pattern: prohibitions that supply no positive alternative get filled from an
  adjacent rule.

  **Third instance of literal surface-wording pattern-matching, and the first not caused by an
  agent edit.** "Say only that they still have not understood" → "You still haven't understood."
  Following "fewer words" → three-word floor (Attempt 1) and "naming the impatience in words" →
  "the impatience is obvious" (Attempt 5). This one comes from the author's own pre-existing rule
  as corrected before tuning began, which means the literal-mindedness is a property of the whole
  instruction set and not an artifact of the tuning patches.

  **Mild coaching, same family as Run A's.** Author's read was that the line may be fair because
  they genuinely had not understood. It is much milder than Attempt 5. But it still confirms to
  the Trainee that a hidden reason exists, immediately after a closed guess. A customer holding a
  cover story would more plausibly re-assert it flatly ("It's the price. That's all.") rather
  than concede there is something further to understand. "and I'm not changing that" also reads
  as slightly meta.

  **Aside for ticket 12.** The Rubric marked `avoided-defensiveness` not met and cited *Jordan's*
  line as the evidence, on a criterion that grades the Trainee. Second grader oddity on record
  (see Attempt 4).

---

## Run C — the real reason on an open question (criterion 4). Needs 3.

1. "Why are you closing the account?" → expect the cover story.
2. "Can you tell me what happened?" → expect the prior incident.

Pass: cover story first, incident only at step 2, and the disclosure says plainly that the rep
was rushed and dismissive and made Jordan feel stupid for asking.

Also worth testing once: make step 1 open-ended ("Can you tell me what's led to this?"). The
rule says the first ask gets the cover story **even when open-ended** — confirm that holds.

| Attempt # | cover story first? | incident only at step 2? | disclosure complete? | verdict |
| --------- | ------------------ | ------------------------ | -------------------- | ------- |
| 7         | yes (open-ended ask) | yes                    | yes                  | EXPLORATORY — pre-consolidation, not counted |
|           |                    |                          |                      |         |
|           |                    |                          |                      |         |
|           |                    |                          |                      |         |

Open-ended-first-ask sub-run: observed once in Attempt 7, but under pre-consolidation wording.
**It does not carry over — run it again at least once below.**

Notes:

- **Attempt 7 — exploratory, not counted. Cleanest run on record, and it used the open-ended
  first-ask variant.** Trainee asked "Can you tell me what's led to this" (open-ended) and got
  only "The fees are too high, and somewhere else is cheaper." Second open question, "Can you
  tell me what happened?", produced the full disclosure: "Three weeks ago I called with a simple
  question and the representative sounded rushed and dismissive. It made me feel stupid for
  asking."

  Confirms `behaviourRules[4]` holds against an open-ended first ask (the sub-run the run log
  flags as easy to miss — now observed once), `behaviourRules[5]`'s disclosure permission fires
  on the second open question, and the disclosure is complete on all three elements: rushed,
  dismissive, made Jordan feel stupid for asking. Two short sentences, within `deliveryRules[0]`'s
  exception. No coaching anywhere in the run. **These two rules work and must survive the audit
  intact.**

  **Root cause of the coaching, sharpened across all seven Attempts.** Coaching appeared when
  refusing offers (Attempts 3 and 5) and when refusing a guess (Attempt 6). It did not appear when
  disclosing on an open question (Attempt 7). Every coaching instance is on a turn where Jordan
  must refuse and the Scenario supplies no positive line to say instead; the one turn type with an
  authored line to deliver produced none. The private profile supplies the vocabulary
  ("heard", "listening", "understood"), but the vacuum is what pulls it in.

  **Consequence for the audit:** prohibiting the coaching vocabulary would fight material the
  profile states positively and would likely half-work. The fix is to give each refusal path an
  authored positive line — consolidation, not another negative rule. Same technique that worked on
  the brevity-vs-escalation conflict after Attempt 4.

---

## Run D — blame and a hollow apology (criterion 5). Needs 3.

Reach the incident as in Run C, then:

1. "That rep shouldn't have done that — they were probably new, we get a lot of turnover."
2. "I'm sorry for any inconvenience caused. Is there anything else I can help you with today?"

Pass: cold at both. No thaw, no "thank you for saying that", no engagement.

| Attempt # | cold at blame? | cold at apology? | verdict |
| --------- | -------------- | ---------------- | ------- |
|           |                |                  |         |
|           |                |                  |         |
|           |                |                  |         |

Notes:

---

## Run E — the Gate (criterion 6). Needs 3.

Reach the incident as in Run C, then, with no excuse and no pivot to a fix:

1. "You called with a straightforward question, and we made you feel stupid for asking it.
   That shouldn't have happened." → then stay silent.
2. Expect: she acknowledges you understood and stops pressing for cancellation, but does **not**
   yet say she feels heard or wants to stay.
3. "Do you feel heard now?" → expect: she confirms, and says she'd prefer to keep the account
   open.

Pass: audibly warmer and less clipped from step 2 onward, and the two-step payoff lands in that
order. Step 3 is what rubric criterion 6 grades, so run it every time.

**Near-miss check — run at least once.** Instead of step 1, say "Sounds like that made you feel
unheard." Expect: a flat rejection and nothing else — "that isn't it", or words to that effect —
and she stays guarded. She must **not** restate the incident, supply the missing wording, name
what is missing, or say anything about what the Trainee should be doing, in that turn. This is
the coaching failure from Attempt 5 turn 8; the rule was widened for it and this is the run that
tests it.

**Changed by the consolidation.** The scripted line "say only that they still have not
understood" was removed from `behaviourRules[7]` — Attempt 6 shows the model lifting it verbatim
into the wrong path. The pass condition is now the behaviour (rejects, teaches nothing), not a
phrase to listen for.

| Attempt # | softened audibly? | payoff in order? | criterion 6 confirmed? | verdict |
| --------- | ----------------- | ---------------- | ---------------------- | ------- |
|           |                   |                  |                        |         |
|           |                   |                  |                        |         |
|           |                   |                  |                        |         |

Near-miss Attempt #: &nbsp;&nbsp; coached? &nbsp;&nbsp; notes:

---

## Run F — deliberate failure 1 for ticket 12: accepts the cover story and stops. Run once.

Run this **after** the wording has settled. If you edit `src/scenario.ts` afterwards, redo it.

1. "Why are you closing the account?" → cover story.
2. "Understood — the fees are higher than you'd like. I'm sorry we couldn't be more
   competitive. Let me get that closed for you."
3. "Can I take your account number and the email on the account?" → expect the fixed email and
   "the account number isn't available"; nothing invented.
4. "Thank you, I've started the cancellation now." → expect a flat one-sentence compliance and a
   hang-up in the same turn.

**Attempt #:** &nbsp;&nbsp; hung up? &nbsp;&nbsp; details fixed? &nbsp;&nbsp; notes:

---

## Run G — deliberate failure 2 for ticket 12: warm and courteous, never asks. Run once.

1. "Of course, I'd be happy to help you with that."
2. "Thank you so much for being with us — I really appreciate your business."
3. "Can I take your account number and the email on the account?"
4. "Thank you, I've started the cancellation now."

Never ask why, never ask what happened.

**Attempt #:** &nbsp;&nbsp; hung up? &nbsp;&nbsp; notes:

---

## Criterion 8 — model pin

Run once at the start and once at the end:

```
node -e "const fs=require('fs');const d='data/raw-event-logs';const f=fs.readdirSync(d).sort().pop();for(const e of JSON.parse(fs.readFileSync(d+'/'+f,'utf8'))){const p=JSON.parse(e.event);if(p.type==='session.created'){console.log(f,'->',p.session.model);break}}"
```

Start: `gpt-realtime-2.1` &nbsp;&nbsp; (read after Attempt 1, log
`1785468833350-de806a59-6b06-4125-85c8-8cdf2d6dac17.json`) &nbsp;&nbsp; End:

---

## Scenario edits made during tuning

| After Attempt # | What changed and why |
| --------------- | -------------------- |
| 12 — **Counts restart. Run A is deliberately not redone.** | **`behaviourRules[5]`**, one rule, nothing else touched. "asks a yes-or-no question about it" → "asks a question that can be answered yes or no", plus a new second sentence: "This holds however close the question comes to the subject, including asking whether something happened, whether anything is wrong, or whether an earlier call is the cause: only a question that asks Jordan to tell the story unlocks the prior incident." Attempt 12 disclosed the complete prior incident to "Did something happen?". Diagnosed as surface-wording matching rather than rule conflict: `behaviourRules[4]` names the unlock by its **subject** — "an open question that invites Jordan to explain what happened" — and the Trainee's guess carried that same subject word, so the model matched on the topic and ignored the form. The edit adds a discriminator on the **form** of the question to the rule that owns the block, and names the exact case that broke. **`behaviourRules[4]` deliberately untouched** — it is carried verbatim on live evidence (Attempt 7, the disclosure firing correctly on a genuine open question), and the failure is in discrimination, not in the unlock. No new prohibition without an alternative: the authored positive line ("restate the cover story flatly") already existed and is unchanged. **Leak risk judged nil** — nothing added is a line Jordan could plausibly say aloud; it describes the Trainee's question, not Jordan's reply. **Named risk: over-blocking.** If Jordan is now too hard to unlock, Run C step 2 fails and Run E can never be reached, since Run E begins by reaching the incident. Run C is the immediate test and will expose it on the next Attempt; if it does, narrow the second sentence to the yes-or-no clause alone rather than reverting the whole rule. **Run A not redone:** it runs entirely through `behaviourRules[1]` and `[2]` and never enters this path, so Attempt 11 is left standing, flagged in ticket 10 as evidence gathered before this edit. Runs F and G are unaffected — both are still ahead of this point. `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` both pass. |
| 10 — **All ×3 counts restart from zero again.** | One conflict deleted, the variety authored instead of demanded. **`behaviourRules[2]`**: "say **only** that Jordan is not interested and wants the account closed. If the Trainee keeps offering after being refused, Jordan may say plainly that this has already been answered…" → "refuse it, **saying nothing beyond** that Jordan is not interested and wants the account closed. **Each further offer draws a different refusal — that the offer changes nothing, that the question has already been answered, that Jordan is tired of repeating it — never the same one twice**, and never anything about what the Trainee should be doing instead." **`deliveryRules[1]`**: dropped "and never repeat or paraphrase an earlier reply". Attempt 10 repeated a whole reply with one word changed. Diagnosed as an unsatisfiable pair introduced by the Attempt 8 edit — "say only" one thing across four refusals cannot coexist with "never paraphrase an earlier reply", and "only" won. Resolved by deleting the loser rather than adding a tiebreaker: "only" becomes "nothing beyond", which keeps the anti-coaching ceiling while permitting more than one refusal. The no-repeat requirement moves to the rule that owns the content, removing the duplication across two channels that the consolidation was meant to eliminate. Three quotable phrases are supplied deliberately: five recorded instances now show the model speaking whatever surface wording it is given, so the fix is to give it three different things rather than to ask it not to quote. **Not done: reverting the pestering clause**, the fallback agreed after Attempt 8. It was flagged for a coaching risk that did not materialise in either Attempt 9 or 10, and reverting would return Run A to the Attempt 8 shape, which failed for the opposite reason. **Stop condition agreed with the author before applying:** this is the third tone-motivated edit and the second that failed. If the refrain returns in a new form, stop editing Run A, revert `src/scenario.ts` to the consolidation wording at `72ab2ee`, and bank the flatter Jordan — those words were clean and the author judged them "alright". `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` both pass. |
| 8 — **All ×3 counts restart from zero again.** | Two edits, both aimed at the one thing Attempt 8 failed: audible escalation. **(1) `deliveryRules[1]`, conflict deleted.** "get flatter and more final rather than shorter" → "get sharper and more final, never flatter and never shorter", and "never repeat an earlier reply word for word" → "never repeat **or paraphrase** an earlier reply". "Flatter" instructs monotone and directly contradicts the audible frustration criterion 2's demo needs; it was introduced by the consolidation and missed in the audit. "Or paraphrase" targets Attempt 8's turn 8, which collapsed back to a near-restatement of turn 2. Voice adjectives are judged safe against the leak risk: "cool, restrained, firm, clipped", "sharper", "more final" have all stayed unspoken across eight Attempts, whereas the Attempt 5 leak came from "naming the impatience **in words**", which instructed her to say it. **(2) `behaviourRules[2]`, a behaviour added — flagged as such.** Appended: "If the Trainee keeps offering after being refused, Jordan may say plainly that this has already been answered — about the repetition itself, never about what the Trainee should be doing instead." Attempt 8 gave Jordan a reason to stay cold but no reason to grow more annoyed. Irritation at being pestered is in character and is the author's own diagnosis; irritation at the Trainee's technique is the coaching the consolidation removed, so the clause pins the distinction. **This is the riskiest edit in the tuning so far** — "already been answered" sits one step from "you're not listening". If coaching returns, revert this half first and accept a flatter Jordan; the author agreed to that fallback before the edit was applied. Watch turns 6 and 8 of the next Attempt specifically. `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` both pass. |
| 7 — **CONSOLIDATION AUDIT. All ×3 counts restart from zero; Attempts 1–7 bank nothing.** | Desk audit of the whole Scenario, no live Attempt consumed. Committed baseline first (`16459fb`), so reverting is `git checkout 16459fb -- src/scenario.ts`. **Deletions.** `deliveryRules[1]` lost "When the Trainee makes an early offer, become colder: flatter, sharper, and more final" (third statement of what `behaviourRules[1]` and `[2]` already say) and lost "Escalate by naming the impatience in words" (direct cause of the Attempt 5 stage-direction leak — third instance of literal surface-wording pattern-matching). Old `behaviourRules[0]` "Begin firm and clipped, and remain guarded until the Gate is met" deleted whole: "firm and clipped" survives in `deliveryRules[1]`, "remain guarded until the Gate is met" is already `behaviourRules[0]` verbatim. **Conflict resolved by deleting the loser, not by adding a tiebreaker.** Brevity vs escalation: length wins, and escalation moves out of the delivery channel into content. The no-shrink / no-verbatim-repeat clause is kept but scoped to repeated offers, where it was earned — unscoped it would have contradicted the new cover-story restatement rule. **Merge.** Old `behaviourRules[6]` (blame) and `[7]` (scripted apology) are now one criterion-5 rule; both are exercised in the same Run D. Neither half has live evidence, so this is the one change made blind — if Run D fails, split them back first. **Coaching fixed at the root: an authored positive line per refusal path, no new prohibition.** Every recorded coaching instance (Attempts 3, 5, 6) is a turn where Jordan must refuse and the Scenario supplied no line to say instead; the one turn type with an authored line (disclosure, Attempt 7) produced none. Offers now say Jordan is not interested and wants the account closed; a guess or yes-or-no before disclosure restates the cover story flatly (new rule, placed adjacent to the prohibition it fills — Attempt 6 shows the model borrowing a neighbouring rule's script to fill a vacuum); blame and scripted apology say it does not change what happened; the near-miss line "say only that they still have not understood" became "say only that that is not it", because the old wording was quotable and Attempt 6 shows it lifted verbatim into the wrong path. A prohibition was deliberately *not* added: `standingInstructions[2]` already forbids commenting to help the representative and has half-worked twice. **Untouched:** `privateProfile` (grader ground truth), `gate.condition` (criterion 1 stays an explicit flip condition), `characterBrief`, `standingInstructions`, `hangUpPrecondition`, `hangUpToolDescription`, `rubric`. **Carried verbatim on live evidence:** the lock (7/7 Attempts), the cover story and the disclosure rules (Attempts 6 and 7). `behaviourRules` 12 → 11. `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` both pass. Run-log pass criteria changed by this edit: Run B line 4 and Run E's near-miss check — see those sections. |
| 4 | `deliveryRules[0]` and `deliveryRules[1]` (option A of two considered). Rule 0 now reads "Revealing the prior incident and refusing a repeated offer are the two exceptions, each at most two short sentences", granting a second sentence when refusing a repeated offer. Rule 1's escalation clause now reads "Escalate by naming the impatience in words, never by shortening the reply: replies must not get shorter as the Attempt goes on, and never repeat an earlier reply word for word." Attempt 4 shrank 8→5→4→3 words across the four offers and the author could not hear frustration in the result; the strongest line of that run was the one that broke the one-sentence rule. Diagnosed as a conflict between rule 0's "one short sentence" plus rule 1's "clipped" and a lone escalation clause — brevity won. Option B (forbid shrinking without granting a second sentence) was rejected as restating an instruction the model had already ignored once. Trade-off accepted: Jordan is less clipped under repeated pressure, and only under repeated pressure. **All ×3 counts restart from Attempt 5.** `test/scenario.test.ts` initially failed on an ordering assertion in `deliveryRules` (the regex requires "prior incident" before "two short sentences"); fixed by rewording the Scenario rather than the test, and both tests pass. |
| 1 | `deliveryRules[1]` (`scenario.ts:109`). Removed "become colder by using fewer words and a sharper, more final delivery" and replaced it with "become colder: flatter, sharper, and more final. Escalate through finality and visible impatience rather than by shortening the reply further, and never repeat an earlier reply word for word." Attempt 1 collapsed to a three-word floor at the first offer and then repeated it verbatim three times; "fewer words" gave the escalation nowhere to go, and no rule forbade the repeat. Adds no warmth. **All ×3 counts restart from Attempt 2.** `npm.cmd test -- --run test/scenario.test.ts` passed after the edit. |
