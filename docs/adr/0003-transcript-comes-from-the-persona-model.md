# The Transcript is produced by the Persona's own model, out of band

The Trainee's speech is transcribed by issuing a second `response.create` on the same
realtime session with `conversation: "none"` and text-only output, scoped to the latest
turn — so the model that plays the Persona is also the model that writes the Transcript.
This costs roughly double a dedicated transcription model and buys nothing visible, which
is why it needs recording: the natural cleanup is to switch to `gpt-4o-transcribe` and
save the money.

Don't. The Realtime API's in-session transcription is a *separate* model's guess at what
the Trainee said — the docs describe it as guidance rather than what the model actually
heard. Two failures follow from that gap, and both land in front of an audience. The
evidence quote in an Assessment can differ from what the room just heard the Trainee say,
which destroys the grader's credibility exactly when it is being demonstrated. And the
Persona can visibly soften while the Assessment reports the criterion unmet, so the
product contradicts itself on screen. The rubric criterion that anchors everything —
whether the Trainee surfaced the real reason — is binary, and one slipped clause flips it.

## Consequences

Turn ordering is not guaranteed and must be reassembled from `item_id` and
`previous_item_id` on `conversation.item.added` and `conversation.item.done`. Those events
carry the complete chain for both speakers; `input_audio_buffer.committed` covers only
Trainee turns and is corroborating data rather than the ordering source. A Transcript is
therefore a reconstruction, not a recording, and should never be presented as a verbatim
record of what was said.
