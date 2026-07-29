import { useCallback, useEffect, useRef, useState } from 'react';

import type { PublicScenario } from '../scenario.js';
import {
  AttemptFailedError,
  connectRealtimeAttempt,
  type AttemptActivity,
  type ConnectRealtimeAttempt,
  type RealtimeAttempt,
} from './realtime.js';

const unexplainedFailureMessage =
  'The live line could not be opened. Check that the local server is running, then try again.';

type AppState =
  | { name: 'loading' }
  | { name: 'briefing'; scenario: PublicScenario }
  | { name: 'connecting' }
  | {
      name: 'live';
      activity: AttemptActivity;
      personaName: string;
    }
  | { name: 'data-failed' }
  | { name: 'ended' }
  | { name: 'failed'; reason: string; scenario: PublicScenario }
  | { name: 'unavailable' };

type AppProps = {
  connectAttempt?: ConnectRealtimeAttempt;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isPublicScenario(value: unknown): value is PublicScenario {
  if (!isRecord(value)) {
    return false;
  }

  const briefing = value.briefing;
  const persona = value.persona;

  return (
    typeof value.id === 'string' &&
    typeof value.title === 'string' &&
    isRecord(briefing) &&
    typeof briefing.role === 'string' &&
    typeof briefing.counterpart === 'string' &&
    typeof briefing.situation === 'string' &&
    typeof briefing.constraint === 'string' &&
    isRecord(persona) &&
    typeof persona.name === 'string' &&
    typeof persona.publicDescription === 'string'
  );
}

export function App({ connectAttempt = connectRealtimeAttempt }: AppProps) {
  const [state, setState] = useState<AppState>({ name: 'loading' });
  const attemptController = useRef<AbortController | null>(null);
  const liveAttempt = useRef<RealtimeAttempt | null>(null);
  const releaseAttempt = useCallback(() => {
    attemptController.current?.abort();
    liveAttempt.current?.stop();
    attemptController.current = null;
    liveAttempt.current = null;
  }, []);

  useEffect(() => {
    const controller = new AbortController();

    async function loadScenario() {
      try {
        const response = await fetch('/api/scenario', {
          signal: controller.signal,
        });

        if (!response.ok) {
          setState({ name: 'unavailable' });
          return;
        }

        const body: unknown = await response.json();
        setState(
          isPublicScenario(body)
            ? { name: 'briefing', scenario: body }
            : { name: 'unavailable' }
        );
      } catch (error) {
        if (!(error instanceof DOMException && error.name === 'AbortError')) {
          setState({ name: 'unavailable' });
        }
      }
    }

    void loadScenario();

    return () => controller.abort();
  }, []);

  useEffect(
    () => () => {
      releaseAttempt();
    },
    [releaseAttempt]
  );

  const stopAttempt = () => {
    releaseAttempt();
    setState((currentState) =>
      currentState.name === 'data-failed' ? currentState : { name: 'ended' }
    );
  };

  const startAttempt = async (scenario: PublicScenario) => {
    const controller = new AbortController();
    let connectionEnded = false;
    attemptController.current = controller;
    setState({ name: 'connecting' });

    try {
      const attempt = await connectAttempt({
        signal: controller.signal,
        onActivity: (activity) => {
          setState((currentState) =>
            currentState.name === 'live'
              ? { ...currentState, activity }
              : currentState
          );
        },
        onEnded: () => {
          connectionEnded = true;
          releaseAttempt();
          // A dropped line and an incomplete log are reported in that order,
          // and the log is the one the Trainee can still act on.
          setState((currentState) =>
            currentState.name === 'data-failed'
              ? currentState
              : { name: 'ended' }
          );
        },
        onAttemptDataFailed: () => {
          setState({ name: 'data-failed' });
        },
      });

      if (controller.signal.aborted || connectionEnded) {
        attempt.stop();
        return;
      }

      liveAttempt.current = attempt;
      setState({
        name: 'live',
        activity: 'listening',
        personaName: scenario.persona.name,
      });
    } catch (error) {
      const stoppedByTrainee =
        (error instanceof DOMException && error.name === 'AbortError') ||
        controller.signal.aborted;

      if (stoppedByTrainee || connectionEnded) {
        return;
      }

      // A line that never opened is not an Attempt that ended. Say why, and
      // leave a way back — a refused microphone is recoverable in one click.
      releaseAttempt();
      setState({
        name: 'failed',
        reason:
          error instanceof AttemptFailedError
            ? error.message
            : unexplainedFailureMessage,
        scenario,
      });
    }
  };

  if (state.name === 'loading') {
    return (
      <main className="shell">
        <p className="loading">Preparing the Briefing…</p>
      </main>
    );
  }

  if (state.name === 'unavailable') {
    return (
      <main className="shell">
        <section className="notice" aria-labelledby="unavailable-title">
          <p className="eyebrow">Conversation Practice</p>
          <h1 id="unavailable-title">The Briefing could not be loaded.</h1>
          <p>Check that the local server is running, then refresh this page.</p>
        </section>
      </main>
    );
  }

  if (state.name === 'connecting') {
    return (
      <main className="shell shell--attempt">
        <section className="attempt" aria-label="Live Attempt">
          <p className="attempt__indicator" role="status">
            <span className="attempt__pulse" aria-hidden="true" />
            Connecting…
          </p>
          <button className="stop-button" type="button" onClick={stopAttempt}>
            Stop attempt
          </button>
        </section>
      </main>
    );
  }

  if (state.name === 'live') {
    const indicator =
      state.activity === 'speaking'
        ? `${state.personaName} is speaking`
        : 'Listening';

    return (
      <main className="shell shell--attempt">
        <section className="attempt" aria-label="Live Attempt">
          <p className="attempt__indicator" role="status" aria-live="polite">
            <span
              className={`attempt__pulse attempt__pulse--${state.activity}`}
              aria-hidden="true"
            />
            {indicator}
          </p>
          <button className="stop-button" type="button" onClick={stopAttempt}>
            Stop attempt
          </button>
        </section>
      </main>
    );
  }

  if (state.name === 'failed') {
    const { reason, scenario: briefedScenario } = state;

    return (
      <main className="shell">
        <section className="notice" aria-labelledby="attempt-failed-title">
          <p className="eyebrow">Conversation Practice</p>
          <h1 id="attempt-failed-title">The Attempt could not start.</h1>
          <p>{reason}</p>
          <button
            className="start-button"
            type="button"
            onClick={() =>
              setState({ name: 'briefing', scenario: briefedScenario })
            }
          >
            Back to the Briefing
          </button>
        </section>
      </main>
    );
  }

  if (state.name === 'ended') {
    return (
      <main className="shell shell--attempt">
        <section className="attempt" aria-labelledby="attempt-ended-title">
          <h1 id="attempt-ended-title">Attempt ended</h1>
        </section>
      </main>
    );
  }

  if (state.name === 'data-failed') {
    return (
      <main className="shell shell--attempt">
        <section className="notice" aria-labelledby="attempt-data-title">
          <p className="eyebrow">Attempt ended</p>
          <h1 id="attempt-data-title">
            The Attempt event log could not be completed.
          </h1>
          <p>Keep this page open and check that the local server is running.</p>
        </section>
      </main>
    );
  }

  const { scenario } = state;

  return (
    <main className="shell">
      <article className="briefing" aria-labelledby="scenario-title">
        <header className="briefing__header">
          <p className="eyebrow">Briefing</p>
          <h1 id="scenario-title">{scenario.title}</h1>
          <p className="persona-summary">
            {scenario.persona.publicDescription}
          </p>
        </header>

        <div className="briefing__details">
          <section>
            <h2>Your role</h2>
            <p>{scenario.briefing.role}</p>
          </section>
          <section>
            <h2>Who you’re speaking with</h2>
            <p>{scenario.briefing.counterpart}</p>
          </section>
        </div>

        <p className="situation">{scenario.briefing.situation}</p>

        <aside className="constraint" aria-labelledby="limits-title">
          <p className="constraint__label" id="limits-title">
            Your limits
          </p>
          <p>{scenario.briefing.constraint}</p>
        </aside>

        <footer className="briefing__footer">
          <p>
            {scenario.persona.name} will speak first. Begin when you’re ready.
          </p>
          <button
            className="start-button"
            type="button"
            onClick={() => void startAttempt(scenario)}
          >
            Start attempt
            <span aria-hidden="true">→</span>
          </button>
        </footer>
      </article>
    </main>
  );
}
