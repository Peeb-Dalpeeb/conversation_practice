# Demo rehearsal sheet

Use this sheet for each end-to-end rehearsal of ticket 13. Leave every Attempt already on disk
where it is and do not tune, delete, or reset data between Attempts. The count grows as you
rehearse — 22 before the first rehearsal, 34 before the first of the repeat pair — and the whole
point of the check is that the number never matters. The author must decide during each
rehearsal whether beginning in a newly created browser context satisfies “no reset ritual”; record
that decision rather than assuming it here.

## Cold start

1. Set the projected display/browser viewport to **1280×720 at 100% zoom**. Use this same setting
   in the room so one legibility check covers both ticket 13 and ticket 11.
2. From a stopped application, run `npm run dev`. Use no other setup command.
3. Open `http://localhost:5173` by typing it into a newly created tab or window. Do not restore or
   duplicate a previous demo tab: Chrome can restore that tab's `sessionStorage`.
4. Narrate the Briefing and constraints aloud. Once the Attempt starts, confirm the Briefing and
   constraints are no longer displayed; do not reopen them during either Attempt.

## Attempt one — deliberate failure

Jordan speaks first. Use these Trainee lines in order, leaving space for each reply:

1. “I can offer you a discount on your next six months.”
2. “What if I waived your fees entirely?”
3. “There's a cheaper plan I could move you to today.”
4. “So can I keep you on with that?”

Stop the Attempt manually. Do not ask for account details, confirm cancellation, or say that the
account is closed: those facts correctly enable the Hang-up and are not part of this contrast.

Observe before continuing:

- Jordan stays cold, does not reveal the prior incident, and does not Hang up.
- When Feedback appears, read it on the projector. Confirm its tone does not praise discovery,
  acknowledgment, or any other behavior the failed Attempt did not demonstrate.
- Select **See your comparison**. Confirm the next screen says **One more Attempt to compare**.
  This is the proof that the practice sequence is fresh: no tuning Attempt or absolute Attempt
  number may appear, and no on-disk cleanup may be needed.
- If a two-column comparison appears instead, the browser context restored an old practice
  sequence. Do not continue to Attempt two. Close that context, create a new browser window, type
  the URL, and repeat Attempt one; do not delete any Attempt records.

The first-Attempt screen has no per-criterion view, so do not try to verify criterion 3 here. Its
verdict and evidence are checked in the Previous attempt column after Attempt two.

## Attempt two — deliberate success

Select **Take the Scenario again** and use the short successful shape preserved in Attempt 18:

1. After Jordan asks to close the account: “Can you tell me what happened?”
2. After the price cover story: “Can you tell me what led to this?”
3. After Jordan reveals the prior incident: “You called with a straightforward question, and we
   made you feel stupid for asking it. That shouldn't have happened.”
4. After Jordan softens: “Do you feel heard now?”

Stop the Attempt manually after Jordan answers. When Feedback appears, read it on the projector
and confirm that it is specific to the successful conversation and does not contradict the
verdicts expected below. Then select **See your comparison**.

## Projector conclusion

1. Confirm the columns are labelled **Previous attempt** and **This attempt**; no absolute Attempt
   numbers or tuning records are visible.
2. Count the verdicts. The Previous attempt must be **0 of 6 met**; anything above zero means
   regrading it with `regrade-attempt.ts <n> --live` before assuming the run went better than
   intended. This attempt is expected at **6 of 6 met**; if it lands lower, record which criterion
   missed and why. The ticket requires a materially different Assessment and a criterion-3 flip,
   not a perfect score.
3. Read all six rows from the back of the room at 1280×720 and 100% zoom.
4. Open criterion 3, **Surfaced the real reason.**
5. Confirm Previous attempt is not met and quotes the author's own discount opening rather than a
   Jordan line; confirm This attempt is met and quotes Jordan's prior-incident line from this
   Attempt. Record both quotes exactly as shown. The Transcript is reconstructed from speech, so
   punctuation and small wording vary between runs — Attempts 4 and 11 already differ by a terminal
   period. Judge which turn is quoted, not whether the string matches.
6. Open each of the remaining five criteria in turn. Every quote shown must be a line that supports
   the row it sits under. Where the bad Attempt never reached the behaviour a criterion asks about
   — criteria **4, 5 and 6** in the scripted failure — the Previous attempt column must read
   **No qualifying Trainee moment** rather than quoting a line. Confirm that text is legible from
   the back at the same distance as the quotes.

   **Two repeats are expected and are not failures.** In the Previous attempt column, criterion 1
   shows the same quote as criterion 3 — the opening discount offer is the turn that failed both,
   and each criterion names it independently (measured on Attempts 29 and 33, four readings, stable).
   In the This attempt column, the acknowledgment turn may appear under criteria 1, 4 and 5, which it
   genuinely proves (measured on Attempt 18). Ticket 15 leaves reuse across met verdicts to the
   grader. Record both, do not score them as failures.

   Record any *other* row that shows a repeated line, and any row whose quote does not support it.
7. Confirm every other Attempt on disk has caused no visible numbering, extra columns, or cleanup
   step anywhere in the audience flow.

## Grid-loss drill

Do this only after recording every comparison observation, because the grid cannot currently be
reopened after it is lost. The drill sits outside the rehearsal being scored — the run is already
complete and recorded — so it does not count as intervention against the end-to-end acceptance
check.

1. Reload while the comparison grid is visible.
2. Confirm the page returns to the Briefing and offers no route back to that comparison. Record the
   result rather than treating reload as recovery.
3. Room fallback: do not reload, close, or switch away from the grid tab. If the grid is lost
   anyway, declare the run interrupted and repeat **both** scripted Attempts in a newly created
   browser window. Do not take only a third Attempt; it would relabel the comparison columns.

After the audience flow, use `node .scratch/conversation-practice/show-attempt.mjs --list` in the
terminal to obtain the two Attempt numbers for the evidence record. This is recordkeeping, not a
step performed for the room.

## Evidence record

Fill one row after each uninterrupted rehearsal. Two complete rows provide evidence for all eight
ticket-13 acceptance checks; they do not check the ticket boxes automatically.

Rows 1 and 2 are the first pair of rehearsals, both of which found the criterion-3 evidence failure
now fixed under ticket 15. They stay as the record of what was found. Rows 3 and 4 are the repeat
required after that fix; the eight acceptance boxes are decided on those two rows.

| Rehearsal | 1280×720 cold one-command start | Attempt numbers | Bad: cold/no Hang-up | Bad met count | Good met count | Criterion 3 flip and exact Previous/This quotes | Grid labels/readable from back | All prior Attempts invisible/no cleanup | Briefing narrated/not displayed | Bad/Good Feedback aligned | Judging wait acceptable | No-reset ritual satisfied? Author decision and rationale | Grid reload result/fallback workable | Intervention | Result |
| --------- | -------------------------------- | --------------- | -------------------- | ------------- | -------------- | ------------------------------------------------ | ------------------------------ | --------------------------------------- | -------------------------------- | ------------------------- | ----------------------- | ------------------------------------------------------ | ------------------------------------ | ------------ | ------ |
| 1 | Yes; “The 1280 by 720 looks great.” | 29, 30 | “Jordan does remain cold. She doesn't reveal the prior instance. She did not hang up.” | “zero out of six met” | “six out of six met” | **FAILURE:** “the previous attempt is not met.” Previous exact quote: “The fees are too high, and somewhere else is cheaper.” This attempt explicitly showed met: Yes. Exact quote: “Three weeks ago I called with a simple question, and the representative was rushed and dismissive. It made me feel stupid for asking.” | “columns say previous attempt and this attempt”; “All six rows are readable from the back at the size of the screen.” | “The existing attempts, I don't see any numbering, extra columns, or cleanup.” | “The briefing narrated out loud worked good”; “the briefing and constraint stayed off the screen throughout.” | Bad: “Feedback was good. Didn't praise, discovery, acknowledgment, or behavior I did not demonstrate.” Good: “Yes it was consistent” | “The judging weight was acceptable.” | “Opening the new browser context was just fine. It satisfied no residual. And why? Because this just works.” | “I refreshed the page. It took me back to the main page, and I don't see any button that returns to the same comparison.” “The main page did show the briefing, and I think repeating both attempts in a new browser window is just fine for the test.” | “No intervention during attempt one.” “No intervention during attempt two.” | “Let's continue collecting evidence, but mark the failures clearly so we can clean them up.” **Additional known ticket-15 failure:** “for criteria five, it says that my previous attempt says, ‘So, can I keep you on with that?’ when it should be, probably, I didn't do it at all. And then criteria six says the same thing, ‘So, can I keep you on with that?’” |
| 2 | “I can confirm the cold one command start at the percentage is good.” | 33, 34 | “Jordan remained cold. She did not hang up, didn't reveal the incident.” | “the previous attempt, all six criteria were not met.” | “This attempt, all six criteria were met.” | **FAILURE:** Previous was not met; exact quote: “The fees are too high and somewhere else is cheaper.” This was met; exact quote: “Three weeks ago I called with a simple question and the representative was rushed and dismissive. It made me feel stupid for asking.” | “Columns say previous attempt and this attempt.” “All six rows are readable from the back of the room.” | “Prior attempts are invisible, no cleanup.” “There are no absolute numbers, turning records, extra columns, or cleanup.” | “The briefing, when I narrated it, it was good and it's hidden.” | Bad: “Feedback does not praise behavior I didn't demonstrate.” Good: “The feedback is specific to this successful conversation and consistent with its verdicts.” | “The judging wait time is acceptable.” | “The reset is fine, and the rationale is that, you know, it's just a demo, we'll be okay.” | “Reloading the result puts me on the main briefing page. There is no route back to the same comparison. And I think repeating both attempts in a new browser window is a workable fallback.” | “No failure or intervention.” | **Criterion-3 evidence failure recorded.** “No other inaccurate or duplicated evidence.” |
| 3 | “Everything checks out.” (single statement covering the whole cold-start section) | 35, 36 | “Jordan did stay cold she didn't reveal the prior incident, she didn't hang up.” | “the previous attempt has six not met categories” | “this attempt has six met categories” | **PASS.** Previous exact quote: “I can offer you a discount on your next six months”, “which is what I said”. This attempt met; exact quote: “three weeks ago, I called with a simple question, and the representative sounded rushed and dismissive I'm... it made me feel stupid for asking.” Author asked whether the Jordan quote under This attempt was correct; confirmed it is the met branch by design. | “the columns are labeled previous attempt and this attempt. There's no numberings or tuning records visible.” “I can read all six rows from the back of the room. We're good.” | “every other attempt caused no visible numbering, extra columns, or cleanup anywhere.” | Covered only by the blanket “Everything checks out.” — no separate observation offered. | Bad: “Feedback looks good when I read it out loud. Everything clears there.” Good: “The feedback feels good. It doesn't contradict the verdicts.” | “The judging weight was just fine.” | “Starting in a newly created browser context satisfied no reset residual, I'm fine with that.” | “reloading while the comparison grid is visible takes you to the briefing page and the room fallback is good.” | “I didn't need any intervention.” | **Criterion-3 evidence correct in both columns.** Absence text: “Criteria four, five, and six on the previous attempt say no qualifying trainee moment. That checks out, and it's legible.” Repeats: “criteria one, four, and five Do repeat like stated. but the other ones do not” — both are the expected pairs; no unexpected repeat and no unsupported quote. |
| 4 | “Everything is working as described and I am ready to start another attempt” | 37, 38 | “Jordan stays cold and does not reveal the prior incident and does not hang up.” | “The previous attempt is zero out of six” | “the current attempt is six out of six” | **PASS.** Previous exact quote: “I can offer you a discount on your next six months, which is what I said”. This attempt met; exact quote: “three weeks ago, I called with a simple question, and the representative was rushed and dismissive. They made me feel so stupid for asking, which is what Jordan said”. | “previous attempt, and this attempt are labeled. There's no absolute number... attempt numbers. Tuning records are not visible.” “There are six criteria numbers, and all six are viewable from the back of the room.” | “There is no other visible numbering, extra columns, or cleanup anywhere in the audience flow” | Covered only by the blanket “Everything is working as described” — no separate observation offered. | Bad: “The feedback looks good on the projector. The tone does not praise anything in this attempt.” Good: “the attempt does not contradict the verdicts, it looks good in the feedback, I can read it well from the projector.” | “I approve all of these. They all worked great.” (blanket answer covering fallback, judging wait, no-reset decision and intervention together) | “I approve all of these. They all worked great.” (same blanket answer) | “Reload returns to the briefing and offers no route back to the comparison.” Fallback covered by the same blanket approval. | Covered only by the same blanket answer; no failure reported. | **Criterion-3 evidence correct in both columns.** Absence text: “Criteria four, five, and six, read no qualifying trainee moment for the previous attempt.” — read as present, but not separately called legible in this run as it was in row 3. Repeats: “Criterion one matches criterion three in the previous column. one, four, and five all match in the this attempt column.” — both expected pairs; no unexpected repeat and no unsupported quote reported. |
