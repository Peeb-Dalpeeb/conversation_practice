# Evidence — captured Realtime event logs

Raw logs from live Attempts, kept because decisions written into tickets 04 and 05
rest on them. They are not fixtures: nothing reads them at test time. Ticket 05's
fixtures live in `test/fixtures/raw-event-logs/`.

These were captured while ticket 04 was being built, so **they do not all come from
the current code** — that is the point of keeping them. `data/` is gitignored and
holds only fresh output from live runs; anything that has to survive lives here.

Each file is an array of envelopes, each `{"direction":…,"event":"<JSON string>"}`
or `{"direction":"server","binary":"<base64>"}`. The `event` value is a string —
parse it before reading fields.

## runaway-transcription-loop.json

The Attempt that billed **249 responses for 7 spoken turns**, before out-of-band
transcription was restricted to turns carrying `input_audio` content.

Backs ticket 04's Comment on the recursion. Of 238 transcription requests, 225
were fired at items with `content: []` and 13 at items whose only content was
`output_text` — the out-of-band responses' own output items, reported as completed
`conversation.item.done` despite `conversation: "none"`. Only 3 were real Trainee
turns.

Every looped-on item is role `assistant`, so the current code is guarded twice
over: `traineeTurnId()` requires role `user`, and `hasSpokenContent()` requires
audio content. The second guard is the one that still holds if Persona
transcription is ever re-enabled.

## persona-out-of-band-1.json, -2.json, -3.json

The three Attempts that established the Trainee/Persona split, captured while
*both* speakers' turns were transcribed out of band.

Backs ticket 04's Comment on Persona unreliability. Across the three:

| source turn | requests | returned text |
| --- | --- | --- |
| Persona (`assistant` / `output_audio`) | 12 | 6 |
| Trainee (`user` / `input_audio`) | 9 | 9 |

Every one of the six Persona failures has the same signature: status `completed`,
an output item with `content: []`, and exactly four non-reasoning output tokens
(76/72, 129/125, 136/132, 73/69, 93/89, 97/93 text/reasoning). The failures are
non-deterministic — the opening line transcribed correctly in two of these and
returned nothing in the third.

All 12 Persona turns carry a correct `response.output_audio_transcript.done`,
which is why the Persona now uses that instead.
