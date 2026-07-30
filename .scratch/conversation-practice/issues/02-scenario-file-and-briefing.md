# 02 — The Scenario file and the Briefing screen

**What to build:** The one Scenario — "The Customer Who's Had Enough" — lives in a single
editable file that the server reads at startup. The Trainee opens the app, reads the
Briefing, and sees a single explicit control to start an Attempt. Nothing starts until they
press it.

The Briefing tells the Trainee who they are (a service representative), who they are about
to talk to (Jordan Avery), and — plainly — that they have no discounts, no waivers and no
authority to change anything. Only the conversation.

The Scenario file holds everything the rest of the build reads from it: the Briefing text,
the Persona's public description, the Private Profile, the behaviour rules, the named Gate,
the hang-up precondition, and the six Rubric criteria. Later tickets consume these; this
ticket only has to make the Briefing reach the screen and prove that editing the file and
restarting changes what the Trainee reads.

Type the Scenario properly. It is the file the author will edit dozens of times while
tuning, and every other module reads from it.

The Private Profile: Jordan does not actually want to leave. Three weeks ago they called
with a simple question and got someone rushed and dismissive who made them feel stupid, and
the cancellation is a protest. Keep the Scenario generic and non-proprietary — no
company-specific detail. Product knowledge must not be able to help, because the author has
to perform this live without domain expertise.

**Blocked by:** 01 — Local dev scaffolding, one command.

**Status:** done

- [x] The Scenario is one file, read by the server, holding the Briefing, the Persona's
      public description, the Private Profile, the behaviour rules, the named Gate, the
      hang-up precondition, and the six Rubric criteria.
- [x] The Trainee sees the Briefing before an Attempt begins, and it states there are no
      discounts, no waivers and no authority to change anything.
- [x] A single explicit start control is on the Briefing screen; no Attempt begins without
      it.
- [x] Editing the Scenario file and restarting changes the Briefing on screen — no rebuild
      ritual, no second place to update.
- [x] The Scenario contains no company-specific or proprietary detail.
