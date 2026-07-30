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

**Status:** done

- [x] A keyboard shortcut reveals the Transcript; the same shortcut hides it again.
- [x] The Transcript shown is read back from the server, not reconstructed in the browser.
- [x] Turn order and speaker attribution are visible, so a transcription failure or a
      misattributed turn is obvious at a glance.
- [x] Nothing on screen advertises the view's existence — no button, no hint, no
      discoverable affordance.
- [x] A Trainee who never presses the shortcut sees exactly the screen described in ticket
      03.

## Comments

- **No endpoint can serve this view today, and the two existing ones are both wrong for it.**
  The server sees no events at all until the browser posts the log, which happens once, at the
  end of an Attempt. `GET /api/attempts/latest` returns the latest *persisted* Attempt, so it
  only answers after judging — too late for the failure this ticket exists to catch. `POST
  /api/attempts/raw-event-log` reassembles, but it also persists the Attempt, numbers it, and
  judges it. Reusing it for a debug read would invent Attempts the author never performed.

  What fits: a new read-only endpoint that takes the log, runs the existing reassembly, and
  returns the Transcript, persisting nothing and judging nothing. The browser already holds the
  raw log — it accumulates it in `rawEventLog` (`src/client/realtime.ts:387`) precisely so it
  can post it at the end — so this satisfies "reads the Transcript back from the server"
  without a second reassembly implementation. Read the ticket's "does not maintain its own copy"
  as *no second Transcript in the browser*, not *no events*: the events are already there and
  there is nowhere else for them to be mid-Attempt.

- **`reconstructTranscript` is module-private and must be exported, not copied.**
  `src/server/attempt-completion.ts:253`. A second reassembly path is the one thing this ticket
  is most likely to grow by accident, and it would drift from the real one the first time turn
  ordering is touched — which ticket 08 already touched once, for role-less Hang-up items.

- **Do not route the debug read through the existing submission.** `rawEventLogSubmission`
  (`src/client/realtime.ts:405`) is a once-only memoized promise, deliberately, so the real log
  is posted exactly once per Attempt. A debug read that reuses it either consumes the real
  submission or is silently served a stale one. It needs its own request path.

- **Implemented 2026-07-30.** During a live Attempt,
  `Ctrl+Alt+Shift+D` reveals the debug Transcript and the same
  shortcut hides it. While visible, the page asks the side-effect-free
  `POST /api/attempts/transcript` endpoint for a fresh server reconstruction once per second;
  valid turns whose text has not arrived yet are shown in order as awaiting text, without
  hiding completed turns. Structural reconstruction failures are logged in the server terminal;
  the panel labels a failed refresh and retains its last successful snapshot. Completion
  reconstruction remains strict, and the completion submission remains separate and once-only.
  Turn numbers make order explicit, and the shortcut matches the physical `KeyD` rather than
  the character it types, so it survives layouts that remap the chord.

- **The shortcut is Control-only, and reads the physical key on purpose.** Windows resolves
  Ctrl+Alt as AltGr, so on the US-International layout this chord types `Ð` — an `event.key`
  check alone would stop matching, and a hidden shortcut that quietly does nothing has no
  affordance to debug it with. The `event.code === 'KeyD'` test costs two lines and removes
  that whole class of failure. It was originally added and described as macOS support, which
  was the wrong reason for the right code.

  `event.metaKey` was dropped. It was the genuinely Mac-only part, this organisation is not
  running macOS, and on Windows it silently bound Win+Alt+Shift+D as a second way in that
  nobody asked for. Control is now the only accepted modifier, with a test holding the
  Windows key out.

- **The lenient snapshot is measured against recorded Attempts, not argued for.** The first
  implementation reused the strict completion reassembly, which fails closed on a turn with no
  text yet. Mid-Attempt that is the normal state, not an exception: a turn is registered at
  `conversation.item.added` when it starts and gains its text only when it ends, so replaying
  every prefix of the five captured logs in `.scratch/conversation-practice/evidence/` threw on
  56–67% of them — the panel would have read "reconstruction is currently failing" for most of a
  healthy Attempt, including the whole time anyone was speaking. Against the same 3,094 prefixes
  the snapshot now throws on none. The strict path was checked separately and is byte-identical
  to its pre-split behaviour, thrown error messages included, across 1,117 prefixes.

  `test/attempt-completion.test.ts` holds that down with a sweep over every prefix of the four
  `test/fixtures/raw-event-logs/` fixtures: the snapshot never throws, completion still refuses
  the same partial body, and a *complete* log leaves no turn awaiting text — the last one is
  what keeps "Awaiting text…" meaningful, since a marker that also appears on healthy finished
  Attempts would signal nothing. Restoring the old fail-closed behaviour fails the first two.
  Reassembly costs 0.4–0.7 ms per poll on a normal log and 4.6 ms on the 877 KB runaway capture,
  so the once-per-second read is free next to the live session.

- **Still unverified live.** Everything above is stubs and replayed logs. Nobody has pressed
  `Ctrl+Alt+Shift+D` during a real Attempt, so the listener reaching `window` while WebRTC holds
  focus, the panel over the live screen, and the poll under real audio are all untested — as is
  criterion 3's "obvious at a glance", which is a judgment only the author can make by looking.
  Worth doing on the next tuning run rather than first discovering it during ticket 10.
