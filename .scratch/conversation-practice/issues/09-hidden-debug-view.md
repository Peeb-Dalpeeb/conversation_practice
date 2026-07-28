# 09 — Hidden debug view

**What to build:** A keyboard shortcut reveals the reconstructed Transcript, so the author
can confirm during tuning that transcription is actually flowing.

This exists because of the near-empty screen during an Attempt. With nothing displayed, a
silent transcription failure is invisible until the Attempt has already ended — and without
a Transcript there is no Assessment. That is a bad way to lose a tuning run, and a worse way
to lose a demo.

The view reads the reconstructed Transcript back from the server. It does not maintain its
own copy, does not accumulate events, and does not reimplement reassembly in the browser.

**It must never surface in the Trainee experience.** No visible affordance, no hint, nothing
discoverable by clicking around. The near-empty screen is a governing principle of this
build and it does not get quietly walked back for the author's own convenience.

**Blocked by:** 05 — Attempt completion: reassembly and persistence (the seam).

**Status:** ready-for-agent

- [ ] A keyboard shortcut reveals the Transcript; the same shortcut hides it again.
- [ ] The Transcript shown is read back from the server, not reconstructed in the browser.
- [ ] Turn order and speaker attribution are visible, so a transcription failure or a
      misattributed turn is obvious at a glance.
- [ ] Nothing on screen advertises the view's existence — no button, no hint, no
      discoverable affordance.
- [ ] A Trainee who never presses the shortcut sees exactly the screen described in ticket
      03.
