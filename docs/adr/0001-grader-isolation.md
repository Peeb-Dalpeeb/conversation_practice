# The Assessment is produced by a different model than the Persona

The model that plays the Persona must never assess the Attempt it just took part in. It was
in the conversation, it will be generous, and a grader that always says "great job" is worse
than no grader at all. So the Persona runs on a realtime audio model and the Assessment comes
from a separate `gpt-5.6-sol` call with its own context — the isolation is structural rather
than a matter of discipline.

Reusing the Persona's existing conversation context is the obvious optimisation here: it is
cheaper, it is one fewer call, and the context is already sitting there. Do not do it. It
fails silently — the Attempts still get graded, the grades are just wrong in a flattering
direction, which is the hardest kind of wrong to notice.
