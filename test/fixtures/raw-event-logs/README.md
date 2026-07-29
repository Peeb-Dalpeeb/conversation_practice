# Fixtures — recorded Realtime event logs

Raw logs from real Attempts, captured under ticket 04 against the current code and
promoted here so ticket 05's tests can read them from a tracked path. `data/` is
gitignored and holds only fresh output from live runs.

Each file is an array of envelopes, each `{"direction":…,"event":"<JSON string>"}`
or `{"direction":"server","binary":"<base64>"}`. The `event` value is a string —
parse it before reading fields.

Logs that back decisions but are not read by tests live in
`.scratch/conversation-practice/evidence/`.

## The conversation chain

Every real turn carries `previous_item_id` on `conversation.item.added` and
`conversation.item.done`, for both speakers, forming one singly-linked list from a
head whose `previous_item_id` is `null`. This is the only field that can order a
Persona turn — `input_audio_buffer.committed` exists only for Trainee turns.

**Out-of-band responses' own output items also carry `previous_item_id: null`**, so
a walk that starts from "the item with no predecessor" finds several heads. They
are distinguishable: a phantom item never gets a `conversation.item.added`, and
never carries audio content.

## clean-stop-in-silence.json

339 envelopes · 4 Trainee + 5 Persona turns · 9 responses billed.

A complete Attempt, stopped after the Persona had finished speaking. No
truncations. The stop drew `input_audio_buffer_commit_empty` and
`response_cancel_not_active` errors, and **no reply at all** to
`output_audio_buffer.clear` — the case that used to wait out the 15 s deadline and
report the log incomplete when it was not.

## stop-while-persona-speaking.json

153 envelopes · 2 Trainee + 3 Persona turns · 5 responses billed.

Ticket 05's mid-conversation-stop fixture. The Trainee stopped while the Persona
was mid-sentence, so the final Persona turn is truncated **by the stop itself**:

| item | generated | heard |
| --- | --- | --- |
| `item_E6q4Q3vEnQ7Dl7angIZE5` | 33 words | `audio_end_ms: 2180` |

Unlike the clean stop, this one *did* draw `output_audio_buffer.cleared`, because
audio was actually playing.

## trainee-interrupts-persona.json

215 envelopes · 3 Trainee + 4 Persona turns · 7 responses billed.

Three Persona turns truncated **mid-Attempt** by the Trainee talking over them.
This is the fixture that proves truncation is not a stop artifact — it lands in the
middle of the Transcript, and the Trainee's next turn is a reply to only the part
they heard.

| item | generated | heard |
| --- | --- | --- |
| `item_E6q5inN08E5Bdd0bgD4rO` | 6 words | `audio_end_ms: 1640` |
| `item_E6q5nGMjZtMVgVIXZckJp` | 12 words | `audio_end_ms: 1080` |
| `item_E6q5sn2F4XpoGaKwSWCzH` | 28 words | `audio_end_ms: 1940` |

Note the first and third rows together: 1640 ms of a six-word line lost little or
nothing, while 1940 ms of a twenty-eight-word line lost most of it. No single
speech-rate estimate is right for both, which is why a truncated turn is marked
rather than trimmed.

## Turn ordering

No fixture here has spoken turns arriving out of order, and none is expected to —
see ticket 05. Order-independence is proved by shuffling a fixture's envelopes
before feeding it in, not by a captured log.
