# 03 — A live Attempt over WebRTC

**What to build:** The Trainee presses start and has a spoken conversation with Jordan
Avery. This is the tracer bullet through the whole realtime path: the server mints an
ephemeral credential, the browser opens a realtime session with it over WebRTC, and the
Persona speaks first with its opening line — *"I'd like to close my account."*

The Trainee then talks out loud and is heard without pressing anything. The Persona replies
in speech, in character. Either can interrupt the other, so the rhythm resembles a real
call. Turn-taking and interruption are handled inside the realtime session; do not build
them.

On screen during the Attempt: whether the line is live, and a way to stop. Nothing else. No
Briefing, no captions, no Transcript. An employee taking this for real would be talking to
a customer, not reading a screen. This is a governing principle of the build and it will
read as unfinished to anyone new — resist the urge to fill the screen.

The stop control is available at all times, so a Trainee who has lost control of an Attempt
can end it without closing the browser. Stopping ends the Attempt. The connection runs
idle → live → ended; the ended state is a dead end for now, and later tickets carry it on
to judged.

The Persona's behaviour comes from the Scenario file: firm and clipped from the first line,
colder if the Trainee opens by trying to save the account with an offer, the cover story
("your fees are too high, I found somewhere cheaper") when pressed on why, the real reason
only in response to an open question, cold if blamed on a colleague or met with a hollow
scripted apology, softening only when the incident is acknowledged without excuses.

Getting that behaviour *right* is not this ticket's job — ticket 10 tunes it. This ticket
has to get it wired to the realtime session and observably in character.

Model: `gpt-realtime-2.1`, speech-to-speech, flagship for both tuning and the demo. No model
split — Gate behaviour must never be tuned against a different model from the one the demo
runs on. Credentials are minted server-side via the realtime client-secrets endpoint; the
API key never reaches the browser.

**Blocked by:** 02 — The Scenario file and the Briefing screen.

**Status:** done

- [x] Pressing start mints an ephemeral credential server-side and opens a realtime session
      from the browser; the API key is not in the browser bundle or in any response the
      browser receives beyond the ephemeral credential itself.
- [x] The Persona speaks first, unprompted, with the Scenario's opening line.
- [ ] The Trainee speaks out loud and is heard with nothing to press; the Persona replies in
      speech and in character.
- [ ] The Trainee can interrupt the Persona, and the Persona can interrupt the Trainee.
- [x] During an Attempt the screen shows only a speaking/listening indicator and a stop
      control — no Briefing, no captions, no Transcript.
- [x] The stop control is present for the entire Attempt and ends it.
- [x] The connection lifecycle runs idle → live → ended and the Trainee can tell which state
      they are in.
- [x] The Persona's instructions come from the Scenario file, not from code.

## Comments

- Ticket 02 audit handoff: when replacing the starting placeholder with the real Attempt
  screen, remove the Scenario title. Decision 19 permits only the speaking/listening
  indicator and stop control during an Attempt.
