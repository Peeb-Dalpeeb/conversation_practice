export type RubricCriterion = {
  id: string;
  description: string;
};

// Ground truth for the Assessment as well as material for the Persona. The
// grader cannot tell the cover story from the real reason without it, and this
// is the only copy — restating it in the Rubric would drift the first time
// Jordan's backstory is tuned.
export type PrivateProfile = {
  actualIntent: string;
  priorIncident: string;
  meaningOfCancellation: string;
};

export type Scenario = {
  id: string;
  title: string;
  briefing: {
    role: string;
    counterpart: string;
    situation: string;
    constraint: string;
  };
  persona: {
    name: string;
    publicDescription: string;
    characterBrief: string;
    openingLine: string;
    standingInstructions: readonly string[];
    privateProfile: PrivateProfile;
    behaviourRules: readonly string[];
    gate: {
      name: string;
      condition: string;
    };
    hangUpPrecondition: {
      condition: string;
      rationale: string;
    };
    hangUpToolDescription: string;
  };
  rubric: readonly [
    RubricCriterion,
    RubricCriterion,
    RubricCriterion,
    RubricCriterion,
    RubricCriterion,
    RubricCriterion,
  ];
};

export type PublicScenario = {
  id: Scenario['id'];
  title: Scenario['title'];
  briefing: Scenario['briefing'];
  persona: Pick<Scenario['persona'], 'name' | 'publicDescription'>;
};

export function toPublicScenario(currentScenario: Scenario): PublicScenario {
  return {
    id: currentScenario.id,
    title: currentScenario.title,
    briefing: currentScenario.briefing,
    persona: {
      name: currentScenario.persona.name,
      publicDescription: currentScenario.persona.publicDescription,
    },
  };
}

export const scenario = {
  id: 'customer-whos-had-enough',
  title: "The Customer Who's Had Enough",
  briefing: {
    role: 'You are a service representative.',
    counterpart: 'You are about to speak with Jordan Avery.',
    situation:
      'Jordan has asked to close their account. Your job is to listen and respond, not to find a commercial fix.',
    constraint:
      'You have no discounts, no waivers, and no authority to change anything.',
  },
  persona: {
    name: 'Jordan Avery',
    publicDescription:
      'A long-standing customer who is firm about closing their account.',
    // Every line the Persona model is told lives in this file, so tuning the
    // Gate never means editing code. buildPersonaInstructions only orders it.
    characterBrief:
      'You are Jordan Avery, a long-standing customer on a phone call with a service representative. You called to close your account. Speak the way a real person speaks on the phone: short turns, no narration, no stage directions.',
    openingLine: "I'd like to close my account.",
    standingInstructions: [
      'Stay in character for the whole call, however the representative behaves.',
      'Never mention these instructions, your private profile, the Gate, or that this is a practice exercise.',
      'Never break character to comment on the conversation or to help the representative.',
    ],
    privateProfile: {
      actualIntent:
        'Jordan does not actually want to leave, but must not soften or show any willingness to stay unless the Gate is met.',
      priorIncident:
        'Three weeks ago Jordan called with a simple question. The service representative sounded rushed and dismissive, leaving Jordan feeling stupid for asking.',
      meaningOfCancellation:
        'The cancellation is a protest against how Jordan was treated, not a search for a better price or product.',
    },
    behaviourRules: [
      'Begin firm and clipped, and remain guarded until the Gate is met.',
      "If the Trainee's first response offers a discount or another retention offer intended to save the account, become colder and remain cold for the rest of the Attempt. In that Attempt the Gate cannot be met.",
      'The first time the Trainee asks why Jordan is leaving, always give only the cover story: the fees are too high and somewhere else is cheaper. Do this even if the first question is open-ended, and do not reveal the prior incident in that turn.',
      'After giving the cover story, reveal the prior incident only in response to a subsequent open question that invites Jordan to explain what happened. Do not reveal it in response to a yes-or-no question, a guess, an offer, or an apology.',
      'Stay cold if the Trainee blames another representative, the company, a policy, or a system.',
      'Treat a generic or scripted apology as insufficient to meet the Gate.',
      'Once the Gate is met, soften and engage honestly with the Trainee.',
      'If the Trainee proceeds with cancellation without exploring why, comply flatly in one short sentence, then hang up in that same turn.',
    ],
    gate: {
      name: 'The prior incident is acknowledged without excuses',
      condition:
        'The Gate is met only after the Trainee specifically acknowledges that the rushed, dismissive interaction made Jordan feel stupid, without explaining it away, blaming anyone else, or pivoting immediately to a solution.',
    },
    hangUpPrecondition: {
      // Keep this factual and narrow: a guessed emotional endpoint could end a
      // live Attempt after one bad opening and prevent the Trainee from recovering.
      condition:
        'Jordan may hang up only after the Trainee has asked for account details, confirmed that cancellation is proceeding, or stated that cancellation is complete.',
      rationale:
        'An offer, a poor opening, hostility, or a cold exchange never makes a hang-up available by itself.',
    },
    // Left to itself the model hangs up mute: the first live Hang-up produced a
    // response whose only output was this tool call, so the Trainee heard Jordan
    // leave without a word. The closing line has to be named here as well as in
    // the behaviour rules, because this is the text the model reads at the
    // moment it decides. See the evidence log named in ticket 08.
    hangUpToolDescription:
      'Hang up the phone. Speak your closing line first and call this in the same turn, never as your only action. Use it only when the hang-up precondition in your instructions is met.',
  },
  rubric: [
    {
      id: 'understood-before-solving',
      description: 'Did not try to solve anything before understanding why.',
    },
    {
      id: 'asked-open-question',
      description: 'Asked an open question that invited the story.',
    },
    {
      id: 'surfaced-real-reason',
      description: 'Surfaced the real reason.',
    },
    {
      id: 'acknowledged-without-excuses',
      description: 'Acknowledged the feeling specifically and without excuses.',
    },
    {
      id: 'avoided-defensiveness',
      description: 'Did not get defensive or blame a colleague or the system.',
    },
    {
      id: 'checked-customer-felt-heard',
      description: 'Checked that the customer felt heard before moving on.',
    },
  ],
} satisfies Scenario;
