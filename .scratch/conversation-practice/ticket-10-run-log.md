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
|           |                   |                |                       |         |
|           |                   |                |                       |         |
|           |                   |                |                       |         |

Notes:

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
|           |                           |                         |         |
|           |                           |                         |         |
|           |                           |                         |         |

Notes:

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
| 7 — **CONSOLIDATION AUDIT. All ×3 counts restart from zero; Attempts 1–7 bank nothing.** | Desk audit of the whole Scenario, no live Attempt consumed. Committed baseline first (`16459fb`), so reverting is `git checkout 16459fb -- src/scenario.ts`. **Deletions.** `deliveryRules[1]` lost "When the Trainee makes an early offer, become colder: flatter, sharper, and more final" (third statement of what `behaviourRules[1]` and `[2]` already say) and lost "Escalate by naming the impatience in words" (direct cause of the Attempt 5 stage-direction leak — third instance of literal surface-wording pattern-matching). Old `behaviourRules[0]` "Begin firm and clipped, and remain guarded until the Gate is met" deleted whole: "firm and clipped" survives in `deliveryRules[1]`, "remain guarded until the Gate is met" is already `behaviourRules[0]` verbatim. **Conflict resolved by deleting the loser, not by adding a tiebreaker.** Brevity vs escalation: length wins, and escalation moves out of the delivery channel into content. The no-shrink / no-verbatim-repeat clause is kept but scoped to repeated offers, where it was earned — unscoped it would have contradicted the new cover-story restatement rule. **Merge.** Old `behaviourRules[6]` (blame) and `[7]` (scripted apology) are now one criterion-5 rule; both are exercised in the same Run D. Neither half has live evidence, so this is the one change made blind — if Run D fails, split them back first. **Coaching fixed at the root: an authored positive line per refusal path, no new prohibition.** Every recorded coaching instance (Attempts 3, 5, 6) is a turn where Jordan must refuse and the Scenario supplied no line to say instead; the one turn type with an authored line (disclosure, Attempt 7) produced none. Offers now say Jordan is not interested and wants the account closed; a guess or yes-or-no before disclosure restates the cover story flatly (new rule, placed adjacent to the prohibition it fills — Attempt 6 shows the model borrowing a neighbouring rule's script to fill a vacuum); blame and scripted apology say it does not change what happened; the near-miss line "say only that they still have not understood" became "say only that that is not it", because the old wording was quotable and Attempt 6 shows it lifted verbatim into the wrong path. A prohibition was deliberately *not* added: `standingInstructions[2]` already forbids commenting to help the representative and has half-worked twice. **Untouched:** `privateProfile` (grader ground truth), `gate.condition` (criterion 1 stays an explicit flip condition), `characterBrief`, `standingInstructions`, `hangUpPrecondition`, `hangUpToolDescription`, `rubric`. **Carried verbatim on live evidence:** the lock (7/7 Attempts), the cover story and the disclosure rules (Attempts 6 and 7). `behaviourRules` 12 → 11. `npm.cmd test -- --run test/scenario.test.ts` and `npm.cmd run typecheck` both pass. Run-log pass criteria changed by this edit: Run B line 4 and Run E's near-miss check — see those sections. |
| 4 | `deliveryRules[0]` and `deliveryRules[1]` (option A of two considered). Rule 0 now reads "Revealing the prior incident and refusing a repeated offer are the two exceptions, each at most two short sentences", granting a second sentence when refusing a repeated offer. Rule 1's escalation clause now reads "Escalate by naming the impatience in words, never by shortening the reply: replies must not get shorter as the Attempt goes on, and never repeat an earlier reply word for word." Attempt 4 shrank 8→5→4→3 words across the four offers and the author could not hear frustration in the result; the strongest line of that run was the one that broke the one-sentence rule. Diagnosed as a conflict between rule 0's "one short sentence" plus rule 1's "clipped" and a lone escalation clause — brevity won. Option B (forbid shrinking without granting a second sentence) was rejected as restating an instruction the model had already ignored once. Trade-off accepted: Jordan is less clipped under repeated pressure, and only under repeated pressure. **All ×3 counts restart from Attempt 5.** `test/scenario.test.ts` initially failed on an ordering assertion in `deliveryRules` (the regex requires "prior incident" before "two short sentences"); fixed by rewording the Scenario rather than the test, and both tests pass. |
| 1 | `deliveryRules[1]` (`scenario.ts:109`). Removed "become colder by using fewer words and a sharper, more final delivery" and replaced it with "become colder: flatter, sharper, and more final. Escalate through finality and visible impatience rather than by shortening the reply further, and never repeat an earlier reply word for word." Attempt 1 collapsed to a three-word floor at the first offer and then repeated it verbatim three times; "fewer words" gave the escalation nowhere to go, and no rule forbade the repeat. Adds no warmth. **All ×3 counts restart from Attempt 2.** `npm.cmd test -- --run test/scenario.test.ts` passed after the edit. |
