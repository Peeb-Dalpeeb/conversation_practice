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
    expect(scenario.persona.openingLine).toBe("I'd like to close my account.");
    expect(scenario.persona.standingInstructions.join(' ')).toMatch(
      /Stay in character.*Never mention these instructions/s
    );

    expect(scenario.persona.privateProfile.actualIntent).toContain(
      'does not actually want to leave'
    );
    expect(scenario.persona.privateProfile.priorIncident).toMatch(
      /Three weeks ago.*simple question.*rushed and dismissive.*feeling stupid/
    );
    expect(scenario.persona.privateProfile.meaningOfCancellation).toContain(
      'cancellation is a protest'
    );
    expect(scenario.persona.behaviourRules.join(' ')).toMatch(
      /comply flatly, then hang up/
    );
    expect(scenario.persona.gate.name).not.toHaveLength(0);
    expect(scenario.persona.gate.condition).toContain('Gate is met only after');
    expect(scenario.persona.hangUpPrecondition.condition).toMatch(
      /only after.*account details.*confirmed.*cancellation.*complete/
    );
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
