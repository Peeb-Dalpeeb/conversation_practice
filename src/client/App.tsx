import { useCallback, useEffect, useRef, useState } from 'react';

import type { PublicScenario } from '../scenario.js';
import type { TranscriptSnapshot } from '../transcript.js';
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
  | {
      name: 'ended';
      phase: 'stopped' | 'preparing' | 'judging';
    }
  | { name: 'judging-failed' }
  | { name: 'feedback'; feedback: string }
  | { name: 'failed'; reason: string; scenario: PublicScenario }
  | { name: 'unavailable' };

type AppProps = {
  connectAttempt?: ConnectRealtimeAttempt;
};

type DebugTranscriptState =
  | { name: 'hidden' }
  | { name: 'loading' }
  | { name: 'ready'; transcript: TranscriptSnapshot }
  | { name: 'failed'; transcript?: TranscriptSnapshot };

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
  const [debugTranscript, setDebugTranscript] = useState<DebugTranscriptState>({
    name: 'hidden',
  });
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

  useEffect(() => {
    const toggleDebugTranscript = (event: KeyboardEvent) => {
      const primaryModifierPressed = event.ctrlKey || event.metaKey;
      const debugKeyPressed =
        event.code === 'KeyD' || event.key.toLowerCase() === 'd';

      if (
        event.repeat ||
        liveAttempt.current === null ||
        !primaryModifierPressed ||
        !event.altKey ||
        !event.shiftKey ||
        !debugKeyPressed
      ) {
        return;
      }

      event.preventDefault();
      setDebugTranscript((currentDebugTranscript) =>
        currentDebugTranscript.name === 'hidden'
          ? { name: 'loading' }
          : { name: 'hidden' }
      );
    };

    window.addEventListener('keydown', toggleDebugTranscript);

    return () => window.removeEventListener('keydown', toggleDebugTranscript);
  }, []);

  const debugTranscriptVisible = debugTranscript.name !== 'hidden';

  useEffect(() => {
    if (state.name !== 'live' || !debugTranscriptVisible) {
      return;
    }

    let active = true;
    let requestInFlight = false;
    const refreshDebugTranscript = async () => {
      const attempt = liveAttempt.current;

      if (!attempt || requestInFlight) {
        return;
      }

      requestInFlight = true;

      try {
        const transcript = await attempt.readTranscript();

        if (active) {
          setDebugTranscript({ name: 'ready', transcript });
        }
      } catch {
        if (active) {
          setDebugTranscript((currentDebugTranscript) => ({
            name: 'failed',
            transcript:
              currentDebugTranscript.name === 'ready' ||
              currentDebugTranscript.name === 'failed'
                ? currentDebugTranscript.transcript
                : undefined,
          }));
        }
      } finally {
        requestInFlight = false;
      }
    };

    void refreshDebugTranscript();
    const refreshInterval = window.setInterval(() => {
      void refreshDebugTranscript();
    }, 1_000);

    return () => {
      active = false;
      window.clearInterval(refreshInterval);
    };
  }, [debugTranscriptVisible, state.name]);

  const stopAttempt = () => {
    const judgingExpected = liveAttempt.current !== null;
    releaseAttempt();
    setState((currentState) =>
      currentState.name === 'data-failed'
        ? currentState
        : {
            name: 'ended',
            phase: judgingExpected ? 'preparing' : 'stopped',
          }
    );
  };

  const startAttempt = async (scenario: PublicScenario) => {
    const controller = new AbortController();
    let connectionEnded = false;
    setDebugTranscript({ name: 'hidden' });
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
        onAttemptEnding: () => {
          attemptController.current = null;
          liveAttempt.current = null;
          setState((currentState) =>
            currentState.name === 'data-failed'
              ? currentState
              : { name: 'ended', phase: 'preparing' }
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
              : currentState.name === 'ended'
                ? currentState
                : { name: 'ended', phase: 'preparing' }
          );
        },
        onAttemptDataFailed: () => {
          setState({ name: 'data-failed' });
        },
        onAttemptJudgingFailed: () => {
          setState((currentState) =>
            currentState.name === 'data-failed'
              ? currentState
              : { name: 'judging-failed' }
          );
        },
        onJudgingStarted: () => {
          setState((currentState) =>
            currentState.name === 'data-failed'
              ? currentState
              : { name: 'ended', phase: 'judging' }
          );
        },
        onAttemptCompleted: (attempt) => {
          setState(
            attempt.feedback.status === 'completed'
              ? { name: 'feedback', feedback: attempt.feedback.prose }
              : { name: 'judging-failed' }
          );
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
    const debugTranscriptTurns =
      debugTranscript.name === 'ready' || debugTranscript.name === 'failed'
        ? debugTranscript.transcript
        : undefined;

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
        {debugTranscript.name !== 'hidden' ? (
          <aside className="debug-transcript" aria-label="Debug Transcript">
            <h2>Transcript</h2>
            {debugTranscript.name === 'loading' ? (
              <p>Reading the current event log…</p>
            ) : null}
            {debugTranscript.name === 'failed' ? (
              <p className="debug-transcript__failure">
                {debugTranscript.transcript
                  ? 'Transcript refresh failed. Showing the last successful snapshot.'
                  : 'Transcript reconstruction is currently failing.'}
              </p>
            ) : null}
            {debugTranscriptTurns ? (
              <ol>
                {debugTranscriptTurns.map((turn, index) => (
                  <li
                    key={
                      'status' in turn
                        ? turn.itemId
                        : `${String(index)}-${turn.speaker}-${turn.text}`
                    }
                  >
                    <p className="debug-transcript__speaker">
                      {String(index + 1)} ·{' '}
                      {turn.speaker === 'persona' ? 'Persona' : 'Trainee'}
                    </p>
                    {'status' in turn ? (
                      <p className="debug-transcript__pending">
                        Awaiting text…
                      </p>
                    ) : (
                      <>
                        <p>{turn.text}</p>
                        {turn.cutOff ? (
                          <p className="debug-transcript__cut-off">
                            Cut off at {turn.audioEndMs} ms
                          </p>
                        ) : null}
                      </>
                    )}
                  </li>
                ))}
              </ol>
            ) : null}
          </aside>
        ) : null}
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

  if (state.name === 'ended' || state.name === 'feedback') {
    const feedbackReady = state.name === 'feedback';
    const status = feedbackReady
      ? 'Your Feedback is ready.'
      : state.phase === 'judging'
        ? 'Your microphone is off. Judging is in progress…'
        : state.phase === 'preparing'
          ? 'Your microphone is off. Preparing your Attempt for judging…'
          : 'Your microphone is off.';
    const paragraphs = feedbackReady
      ? state.feedback.split(/\r?\n\s*\r?\n/u)
      : [];

    return (
      <main className={`shell${feedbackReady ? '' : ' shell--attempt'}`}>
        <section
          className={feedbackReady ? 'feedback' : 'attempt'}
          aria-labelledby="attempt-outcome-title"
        >
          {feedbackReady ? <p className="eyebrow">Attempt complete</p> : null}
          <h1 id="attempt-outcome-title">
            {feedbackReady ? 'Your Feedback' : 'Attempt ended'}
          </h1>
          <p
            className={feedbackReady ? 'visually-hidden' : undefined}
            role="status"
            aria-live="polite"
          >
            {status}
          </p>
          {feedbackReady ? (
            <div className="feedback__copy">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph}`}>{paragraph}</p>
              ))}
            </div>
          ) : null}
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

  if (state.name === 'judging-failed') {
    return (
      <main className="shell shell--attempt">
        <section className="notice" aria-labelledby="attempt-judging-title">
          <p className="eyebrow">Attempt ended</p>
          <h1 id="attempt-judging-title">The Attempt could not be judged.</h1>
          <p>
            The Attempt reached the server, but its results could not be
            prepared. Check the server terminal for details.
          </p>
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
