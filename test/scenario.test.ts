import { describe, expect, it } from 'vitest';

import { scenario } from '../src/scenario.js';

describe("The Customer Who's Had Enough Scenario", () => {
  it('contains the complete authored setup in one typed value', () => {
    expect(scenario.briefing.role).toContain('service representative');
    expect(scenario.briefing.counterpart).toContain('Jordan Avery');
    expect(scenario.briefing.constraint).toBe(
      'You have no discounts, no waivers, and no authority to change anything.'
    );

    expect(scenario.persona.characterBrief).toContain('Jordan Avery');
    expect(scenario.persona.voice).not.toHaveLength(0);
    expect(scenario.persona.openingLine).toBe("I'd like to close my account.");
    expect(scenario.persona.deliveryRules.join(' ')).toMatch(
      /one short sentence.*prior incident.*two short sentences.*Gate.*warmer/s
    );
    expect(scenario.persona.standingInstructions.join(' ')).toMatch(
      /Stay in character.*Never mention these instructions/s
    );

    expect(scenario.persona.privateProfile.actualIntent).toContain(
      'does not actually want to leave'
    );
    // The Private Profile is ground truth the grader reads as fact, so the
    // constraint on softening belongs in the rules the Persona is given.
    expect(scenario.persona.privateProfile.actualIntent).not.toMatch(
      /must not|never|unless the Gate/
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /Never soften.*willingness to keep the account unless the Gate is met/s
    );
    expect(scenario.persona.privateProfile.priorIncident).toMatch(
      /Three weeks ago.*simple question.*rushed and dismissive.*feeling stupid/
    );
    expect(scenario.persona.privateProfile.meaningOfCancellation).toContain(
      'cancellation is a protest'
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /comply flatly.*then hang up in that same turn/
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /first response.*discount.*remain cold for the rest of the Attempt.*Gate cannot be met/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /tries to solve.*before understanding.*become colder/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /first time.*asks why.*only the cover story.*even if.*open-ended.*do not reveal the prior incident in that turn/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /After giving the cover story.*subsequent open question.*yes-or-no question.*guess.*offer.*apology.*first permitted disclosure/s
    );
    // The one recorded coaching failure was a rejection and the missing wording
    // in the same turn, so both halves are pinned: no correction at any point,
    // and never a fact supplied in the turn that rejects an acknowledgement.
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /Whenever the Trainee attempts an acknowledgement that misses the Gate.*never correct.*missing acknowledgement/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /later, genuinely new open question.*never in the same turn as rejecting an acknowledgement/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /first permitted disclosure.*rushed and dismissive.*made Jordan feel stupid/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /Gate is met.*check.*feel.*heard or understood.*prefer to keep the account open/s
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /jordan\.avery@example\.com.*account number.*never invent/s
    );
    expect(scenario.persona.gate.name).not.toHaveLength(0);
    expect(scenario.persona.gate.condition).toMatch(
      /Gate is met only after.*disclosed.*open question.*then specifically acknowledges/s
    );
    expect(scenario.persona.hangUpPrecondition.condition).toMatch(
      /only after.*account details.*confirmed.*cancellation.*complete/
    );
    // Pinned by what the string has to do rather than by its wording, which
    // ticket 10 tunes. A mute Hang-up is what the first live one produced, so
    // the closing line is the part that must survive tuning; and the Persona
    // reads this text, so it must stay inside the character's world.
    expect(scenario.persona.hangUpToolDescription).toMatch(
      /Speak your closing line first/
    );
    expect(scenario.persona.hangUpToolDescription).toContain(
      'hang-up precondition'
    );
    expect(scenario.persona.hangUpToolDescription).not.toContain('Attempt');
  });

  it('holds the six fixed Rubric criteria in order', () => {
    expect(scenario.rubric.map((criterion) => criterion.description)).toEqual([
      'Did not try to solve anything before understanding why.',
      'Asked an open question that invited the story.',
      'Surfaced the real reason.',
      'Acknowledged the feeling specifically and without excuses.',
      'Did not get defensive or blame a colleague or the system.',
      'Checked that the customer felt heard before moving on.',
    ]);
  });
});
