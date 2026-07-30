# Evidence — captured Realtime event logs

Raw logs from live Attempts, kept because decisions written into tickets 04, 05 and
08 rest on them. They are not fixtures: nothing reads them at test time. Ticket 05's
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

## hang-up-without-a-closing-line.json

128 envelopes · 1 Trainee + 2 Persona turns · the first live Hang-up, captured
2026-07-29 under ticket 08.

Backs the closing-line wording in `hangUpToolDescription`. The Trainee asked for the
account details and said the cancellation had started; Jordan answered the first and
then **hung up without speaking at all**. The Hang-up response carried one output
item and nothing else:

| event | detail |
| --- | --- |
| `response.done` | `status: completed`, `output: [function_call]` — no audio item |
| `response.cancel` (client) | answered `response_cancel_not_active` |

Those two rows together are the point: the page did not cut Jordan off, because
there was nothing to cut. The model treated "hang up after you have finished
speaking" as already satisfied and spent its whole turn on the tool call, so the
instruction now names the closing line and the same turn explicitly.

The `function_call` item's `previous_item_id` is the Trainee's last turn — the
Hang-up item lands at the **tail** of the Conversation chain, the benign placement
of the three the completion seam covers.

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
