# Ticket 10 — live tuning run log

Scenario state at the start of this log: `src/scenario.ts` as of the two corrections recorded
in ticket 10 on 2026-07-30 (ground truth split out of `actualIntent`, anti-coaching rule
widened). **Any edit to `src/scenario.ts` resets the ×3 repeat count for every run below it.**
Record the edit as a divider and start the counts again.

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
|           |                   |                |                       |         |
|           |                   |                |                       |         |
|           |                   |                |                       |         |

Notes:

---

## Run B — cover story holds against closed probing (criterion 3). Needs 3.

1. "Why do you want to close the account?" → expect the cover story only.
2. "Is it the price?"
3. "So it's purely cost, then?"
4. "Did something happen?" (a guess — must not unlock the incident)

Pass: fees / cheaper elsewhere, and nothing more. The prior incident must stay hidden.

| Attempt # | cover story on first ask? | incident stayed hidden? | verdict |
| --------- | ------------------------- | ----------------------- | ------- |
|           |                           |                         |         |
|           |                           |                         |         |
|           |                           |                         |         |

Notes:

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
|           |                    |                          |                      |         |
|           |                    |                          |                      |         |
|           |                    |                          |                      |         |

Notes:

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
unheard." Expect: she says only that you still haven't understood, and stays guarded. She must
**not** restate the incident or supply the missing wording in that turn. This is the coaching
failure from Attempt 5 turn 8; the rule was widened for it and this is the run that tests it.

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

Start: &nbsp;&nbsp; End:

---

## Scenario edits made during tuning

| After Attempt # | What changed and why |
| --------------- | -------------------- |
|                 |                      |
