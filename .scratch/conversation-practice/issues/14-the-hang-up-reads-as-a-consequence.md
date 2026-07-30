# 14 — The Hang-up reads as a consequence

**What to build:** A Trainee who gets hung up on can tell that they got hung up on. Ticket 08
built the mechanism and proved it works; this ticket makes it legible. Right now "Jordan ended
the call" and "the app dropped the line" are indistinguishable from the Trainee's seat, and
that ambiguity converts the Scenario's sharpest lesson into a suspected bug.

This is the whole reason the Persona can end the call. The Feedback tells a Trainee afterwards
that they never asked why; the Hang-up shows them, in the moment, that the person stopped
wanting to talk to them. If they read it as a malfunction, that lesson is not delivered — and
the author's first reaction to the captured Attempt `0003` was exactly that, that the ending
felt abrupt rather than pointed.

**The abruptness itself is not the defect and must not be softened.** A customer who has been
processed rather than heard does not do pleasantries, and a warm "no thank you, that's all I
need — have a nice day" from someone the Trainee steamrolled would teach the opposite of the
lesson. Do not add a closing exchange, do not have Jordan soften on the way out, and do not
synthesise a farewell in code when the model does not produce one. Three things change: the
line Jordan speaks, whether the system records how the Attempt ended, and whether the Trainee
is told.

**Three changes, one live verification.** Each is small and none can be proved by the suite, so
they are deliberately held in one ticket and confirmed in a single microphone run rather than
three.

1. **The closing line has to be terminal.** In the captured Hang-up, Jordan said "Okay. Please
   go ahead and complete it." and the call dropped. That satisfies the tool description's
   "speak your closing line first" literally, while handing the turn back — which is precisely
   what reads as a dropped connection. `hangUpToolDescription` and the eighth behaviour rule in
   `src/scenario.ts` should require a sign-off, not merely speech. Prompt only; no code.

2. **Record how the Attempt ended.** Nothing does today. `personaHangUpToolName` appears in
   `src/client/realtime.ts`, which ends the Attempt on it, and in session minting, and nowhere
   else; reassembly never looks for it, and the persisted Attempt has no field for it. Attempts
   `0003` (Hang-up) and `0004` (Trainee stop) are structurally identical on that point. The
   fact has to travel client → completion → persisted Attempt. This is the foundation the third
   change stands on, and the only part of the ticket that is real plumbing.

3. **Tell the Trainee.** The end-of-Attempt screen and the Feedback. Feedback matters more,
   because it is what the Trainee actually reads: the Feedback for `0003` reads as though the
   call ended normally, and coaches them to ask "Is there anything else you'd like me to know
   before I complete the cancellation?" — a question the Hang-up denied them.

**Tone is the risk in the third change, and it belongs to ticket 12, not here.** A Feedback
model told "the customer hung up on you" will reach for drama. This ticket makes the fact
available and states it plainly once; if the prose overreaches, that is strictness-and-tone
tuning, not a change to this plumbing.

**The precondition stays where it is.** Its earliest clause is "asked for account details",
which fires early and mid-transaction by design. Moving the floor to "stated that cancellation
is complete" would make every Hang-up land at a natural seam, and would also mean a Trainee who
bulldozes but never announces completion never feels the consequence at all. Considered and
rejected: once the ending is legible, early firing reads as the consequence it is. Reopen this
only with a live Attempt showing otherwise.

Not in scope: a Rubric criterion for closing the call cleanly. The six criteria are all
discovery and acknowledgement, and none assesses the close, so nothing here is assessed today.
Adding one changes what the Assessment measures and is ticket 12's decision.

**Blocked by:** 08 — The Persona hangs up, and the hard cap.

**Status:** ready-for-agent

- [ ] Jordan's Hang-up turn ends on a sign-off rather than a sentence that hands the turn
      back, verified in a live Attempt.
- [ ] The persisted Attempt records how it ended, distinguishing a Hang-up from a Trainee stop
      and from the hard cap.
- [ ] The end-of-Attempt screen tells the Trainee that the Persona ended the call.
- [ ] The Feedback for an Attempt that ended in a Hang-up refers to it, and never coaches the
      Trainee toward something the Hang-up denied them.
- [ ] An Attempt the Trainee stopped is unchanged — no hang-up wording anywhere in its screen
      or its Feedback.
- [ ] The closing exchange is not restored: no added farewell, no softening on the way out, no
      code that synthesises a closing line the model did not produce.
- [ ] One live Attempt confirms the whole path, and its log is added to the fixtures if it
      shows anything the captured Hang-up does not.
