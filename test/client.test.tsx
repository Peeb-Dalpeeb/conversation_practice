// @vitest-environment jsdom

import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/client/App.js';
import {
  AttemptFailedError,
  type AttemptActivity,
  type CompletedAttempt,
  type ConnectRealtimeAttempt,
  type RealtimeAttempt,
} from '../src/client/realtime.js';

const publicScenario = {
  id: 'scenario-from-server',
  title: 'A server-authored Briefing',
  briefing: {
    role: 'The role supplied by the server.',
    counterpart: 'The counterpart supplied by the server.',
    situation: 'The situation supplied by the server.',
    constraint: 'The limits supplied by the server.',
  },
  persona: {
    name: 'Server Persona',
    publicDescription: 'The public description supplied by the server.',
  },
};

function respondWithScenario() {
  vi.stubGlobal(
    'fetch',
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(publicScenario),
    })
  );
}

function stubRealtimeAttempt(stop = vi.fn()): RealtimeAttempt {
  return {
    readTranscript: () => Promise.resolve([]),
    stop,
  };
}

afterEach(() => {
  vi.useRealTimers();
  cleanup();
  vi.unstubAllGlobals();
});

describe('the Trainee-facing app', () => {
  it('shows the server-provided Briefing and one explicit start control', async () => {
    respondWithScenario();

    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: 'A server-authored Briefing',
      })
    ).toBeTruthy();
    expect(screen.getByText('The role supplied by the server.')).toBeTruthy();
    expect(
      screen.getByText('The counterpart supplied by the server.')
    ).toBeTruthy();
    expect(screen.getByText('The limits supplied by the server.')).toBeTruthy();
    expect(
      screen.getByText(
        'Server Persona will speak first. Begin when you’re ready.'
      )
    ).toBeTruthy();
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Start attempt' })).toBeTruthy();
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('runs a live Attempt with only its indicator and stop control', async () => {
    respondWithScenario();
    const stop = vi.fn();
    let reportActivity: ((activity: AttemptActivity) => void) | undefined;
    let reportJudgingStarted: (() => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(
      ({ onActivity, onJudgingStarted }) => {
        reportActivity = onActivity;
        reportJudgingStarted = onJudgingStarted;
        return Promise.resolve(stubRealtimeAttempt(stop));
      }
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );

    expect((await screen.findByRole('status')).textContent).toContain(
      'Listening'
    );
    expect(screen.getAllByRole('button')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Stop attempt' })).toBeTruthy();
    expect(
      screen.queryByRole('heading', { name: 'A server-authored Briefing' })
    ).toBeNull();
    expect(screen.queryByText('The role supplied by the server.')).toBeNull();
    expect(screen.queryByText(/caption/i)).toBeNull();
    expect(screen.queryByText(/transcript/i)).toBeNull();

    act(() => reportActivity?.('speaking'));

    expect(screen.getByRole('status').textContent).toContain(
      'Server Persona is speaking'
    );

    fireEvent.click(screen.getByRole('button', { name: 'Stop attempt' }));

    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Attempt ended' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Your microphone is off. Preparing your Attempt for judging…'
    );

    act(() => reportJudgingStarted?.());

    expect(screen.getByRole('status').textContent).toBe(
      'Your microphone is off. Judging is in progress…'
    );
    expect(screen.getByRole('status').getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('reveals and hides the server-reconstructed Transcript by shortcut', async () => {
    respondWithScenario();
    const readTranscript = vi.fn(() =>
      Promise.resolve([
        {
          speaker: 'persona' as const,
          text: "I'd like to close my account.",
          cutOff: false as const,
        },
        {
          speaker: 'trainee' as const,
          text: 'Can you tell me what happened?',
          cutOff: false as const,
        },
        {
          speaker: 'persona' as const,
          status: 'awaiting-text' as const,
          itemId: 'next-persona-turn',
        },
      ])
    );
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.resolve({ readTranscript, stop: vi.fn() })
    );

    render(<App connectAttempt={connectAttempt} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    await screen.findByText('Listening');

    expect(
      screen.queryByRole('complementary', { name: 'Debug Transcript' })
    ).toBeNull();

    fireEvent.keyDown(window, {
      key: 'd',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });

    const transcript = await screen.findByRole('complementary', {
      name: 'Debug Transcript',
    });
    expect(readTranscript).toHaveBeenCalledOnce();
    expect(transcript.textContent).toContain('Persona');
    expect(transcript.textContent).toContain("I'd like to close my account.");
    expect(transcript.textContent).toContain('Trainee');
    expect(transcript.textContent).toContain('Can you tell me what happened?');
    expect(screen.getByText('1 · Persona')).toBeTruthy();
    expect(screen.getByText('2 · Trainee')).toBeTruthy();
    expect(screen.getByText('3 · Persona')).toBeTruthy();
    expect(screen.getByText('Awaiting text…')).toBeTruthy();

    fireEvent.keyDown(window, {
      key: 'd',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });

    expect(
      screen.queryByRole('complementary', { name: 'Debug Transcript' })
    ).toBeNull();
  });

  it('recognizes the macOS shortcut when Option changes the key value', async () => {
    respondWithScenario();
    const readTranscript = vi.fn(() => Promise.resolve([]));
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.resolve({ readTranscript, stop: vi.fn() })
    );

    render(<App connectAttempt={connectAttempt} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    await screen.findByText('Listening');

    fireEvent.keyDown(window, {
      key: '∂',
      code: 'KeyD',
      metaKey: true,
      altKey: true,
      shiftKey: true,
    });

    expect(
      await screen.findByRole('complementary', { name: 'Debug Transcript' })
    ).toBeTruthy();
    expect(readTranscript).toHaveBeenCalledOnce();
  });

  it('keeps the debug shortcut inert outside a live Attempt', async () => {
    respondWithScenario();
    const readTranscript = vi.fn(() => Promise.resolve([]));
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.resolve({ readTranscript, stop: vi.fn() })
    );

    render(<App connectAttempt={connectAttempt} />);
    const startButton = await screen.findByRole('button', {
      name: 'Start attempt',
    });

    fireEvent.keyDown(window, {
      key: 'd',
      code: 'KeyD',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });
    expect(
      screen.queryByRole('complementary', { name: 'Debug Transcript' })
    ).toBeNull();

    fireEvent.click(startButton);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Stop attempt' })
    );
    fireEvent.keyDown(window, {
      key: 'd',
      code: 'KeyD',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });

    expect(
      screen.queryByRole('complementary', { name: 'Debug Transcript' })
    ).toBeNull();
    expect(readTranscript).not.toHaveBeenCalled();
  });

  it('shows a reconstruction failure when no snapshot has loaded yet', async () => {
    respondWithScenario();
    const readTranscript = vi.fn(() =>
      Promise.reject(new Error('The Transcript could not be read.'))
    );
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.resolve({ readTranscript, stop: vi.fn() })
    );

    render(<App connectAttempt={connectAttempt} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    await screen.findByText('Listening');

    fireEvent.keyDown(window, {
      key: 'd',
      code: 'KeyD',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });

    expect(
      await screen.findByText('Transcript reconstruction is currently failing.')
    ).toBeTruthy();
    expect(screen.queryByRole('list')).toBeNull();
  });

  it('keeps the last Transcript snapshot visible when a refresh fails', async () => {
    respondWithScenario();
    const readTranscript = vi
      .fn<RealtimeAttempt['readTranscript']>()
      .mockResolvedValueOnce([
        {
          speaker: 'persona',
          text: "I'd like to close my account.",
          cutOff: false,
        },
      ])
      .mockRejectedValueOnce(new Error('The Transcript could not be read.'))
      .mockResolvedValueOnce([
        {
          speaker: 'persona',
          text: 'The latest Transcript snapshot is available.',
          cutOff: false,
        },
      ]);
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.resolve({ readTranscript, stop: vi.fn() })
    );

    render(<App connectAttempt={connectAttempt} />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    await screen.findByText('Listening');
    vi.useFakeTimers();

    fireEvent.keyDown(window, {
      key: 'd',
      code: 'KeyD',
      ctrlKey: true,
      altKey: true,
      shiftKey: true,
    });
    await act(async () => Promise.resolve());

    expect(screen.getByText("I'd like to close my account.")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(
      screen.getByText(
        'Transcript refresh failed. Showing the last successful snapshot.'
      )
    ).toBeTruthy();
    expect(screen.getByText("I'd like to close my account.")).toBeTruthy();

    await act(async () => vi.advanceTimersByTimeAsync(1_000));

    expect(
      screen.queryByText(
        'Transcript refresh failed. Showing the last successful snapshot.'
      )
    ).toBeNull();
    expect(
      screen.getByText('The latest Transcript snapshot is available.')
    ).toBeTruthy();
    expect(screen.queryByText("I'd like to close my account.")).toBeNull();
  });

  it('leaves the live screen as soon as an Attempt ends autonomously', async () => {
    respondWithScenario();
    let reportAttemptEnding: (() => void) | undefined;
    let reportJudgingStarted: (() => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>((options) => {
      reportAttemptEnding = options.onAttemptEnding;
      reportJudgingStarted = options.onJudgingStarted;

      return Promise.resolve(stubRealtimeAttempt());
    });

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Listening'
    );

    act(() => reportAttemptEnding?.());

    expect(screen.getByRole('heading', { name: 'Attempt ended' })).toBeTruthy();
    expect(screen.getByRole('status').textContent).toBe(
      'Your microphone is off. Preparing your Attempt for judging…'
    );
    expect(screen.queryByRole('button')).toBeNull();

    act(() => reportJudgingStarted?.());

    expect(screen.getByRole('status').textContent).toBe(
      'Your microphone is off. Judging is in progress…'
    );
  });

  it('shows the Feedback as soon as judging completes', async () => {
    respondWithScenario();
    let reportJudgingStarted: (() => void) | undefined;
    let reportAttemptCompleted:
      ((attempt: CompletedAttempt) => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(
      ({ onAttemptCompleted, onJudgingStarted }) => {
        reportAttemptCompleted = onAttemptCompleted;
        reportJudgingStarted = onJudgingStarted;
        return Promise.resolve(stubRealtimeAttempt());
      }
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Stop attempt' })
    );

    act(() => reportJudgingStarted?.());
    const outcomeStatus = screen.getByRole('status');
    expect(outcomeStatus.textContent).toContain('Judging is in progress');

    act(() =>
      reportAttemptCompleted?.({
        scenarioId: publicScenario.id,
        number: 1,
        feedback: {
          status: 'completed',
          prose:
            'You opened with a useful question.\n\nNext time, ask what experience sits behind the price concern.',
        },
      })
    );

    expect(screen.getByRole('heading', { name: 'Your Feedback' })).toBeTruthy();
    expect(screen.getByText('You opened with a useful question.')).toBeTruthy();
    expect(
      screen.getByText(
        'Next time, ask what experience sits behind the price concern.'
      )
    ).toBeTruthy();
    expect(screen.getByRole('status')).toBe(outcomeStatus);
    expect(outcomeStatus.textContent).toBe('Your Feedback is ready.');
    expect(outcomeStatus.getAttribute('aria-live')).toBe('polite');
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('distinguishes a judging failure from an incomplete event log', async () => {
    respondWithScenario();
    let reportAttemptJudgingFailed: (() => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(
      ({ onAttemptJudgingFailed }) => {
        reportAttemptJudgingFailed = onAttemptJudgingFailed;
        return Promise.resolve(stubRealtimeAttempt());
      }
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    fireEvent.click(
      await screen.findByRole('button', { name: 'Stop attempt' })
    );
    act(() => reportAttemptJudgingFailed?.());

    expect(
      screen.getByRole('heading', {
        name: 'The Attempt could not be judged.',
      })
    ).toBeTruthy();
    expect(screen.getByText(/server terminal/i)).toBeTruthy();
    expect(screen.queryByText(/event log could not/i)).toBeNull();
  });

  it('lets the Trainee stop while the live line is still connecting', async () => {
    respondWithScenario();
    let connectionSignal: AbortSignal | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(({ signal }) => {
      connectionSignal = signal;
      return new Promise(() => undefined);
    });

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );

    expect(screen.getByRole('status').textContent).toContain('Connecting');
    fireEvent.click(screen.getByRole('button', { name: 'Stop attempt' }));

    expect(connectionSignal?.aborted).toBe(true);
    expect(screen.getByRole('heading', { name: 'Attempt ended' })).toBeTruthy();
    // A line that never opened forwards no log, so nothing will ever judge this
    // Attempt. Saying judging is under way would be a promise nothing keeps.
    expect(screen.getByRole('status').textContent).toBe(
      'Your microphone is off.'
    );
  });

  it('explains a line that never opened and offers the Briefing again', async () => {
    respondWithScenario();
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.reject(new AttemptFailedError('Allow microphone access.'))
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );

    expect(
      await screen.findByRole('heading', {
        name: 'The Attempt could not start.',
      })
    ).toBeTruthy();
    expect(screen.getByText('Allow microphone access.')).toBeTruthy();
    expect(screen.queryByRole('heading', { name: 'Attempt ended' })).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Back to the Briefing' })
    );

    expect(screen.getByRole('button', { name: 'Start attempt' })).toBeTruthy();
  });

  it('does not blame the Trainee for a failure it cannot explain', async () => {
    respondWithScenario();
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(() =>
      Promise.reject(new Error('RTCPeerConnection is not defined'))
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );

    expect(
      (
        await screen.findByRole('heading', {
          name: 'The Attempt could not start.',
        })
      ).textContent
    ).toBeTruthy();
    expect(screen.queryByText(/RTCPeerConnection/)).toBeNull();
  });

  it('shows that an unexpectedly closed live line has ended', async () => {
    respondWithScenario();
    const stop = vi.fn();
    let reportEnded: (() => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(({ onEnded }) => {
      reportEnded = onEnded;
      return Promise.resolve(stubRealtimeAttempt(stop));
    });

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Listening'
    );

    act(() => reportEnded?.());

    expect(stop).toHaveBeenCalledOnce();
    expect(screen.getByRole('heading', { name: 'Attempt ended' })).toBeTruthy();
  });

  it('shows when the completed Attempt event log could not be saved', async () => {
    respondWithScenario();
    let reportAttemptDataFailed: (() => void) | undefined;
    let reportAttemptCompleted:
      ((attempt: CompletedAttempt) => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(
      ({ onAttemptCompleted, onAttemptDataFailed }) => {
        reportAttemptCompleted = onAttemptCompleted;
        reportAttemptDataFailed = onAttemptDataFailed;
        return Promise.resolve(stubRealtimeAttempt());
      }
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Listening'
    );

    act(() => reportAttemptDataFailed?.());

    expect(
      screen.getByRole('heading', {
        name: 'The Attempt event log could not be completed.',
      })
    ).toBeTruthy();

    act(() =>
      reportAttemptCompleted?.({
        scenarioId: publicScenario.id,
        number: 1,
        feedback: {
          status: 'completed',
          prose: 'A completed Attempt is authoritative.',
        },
      })
    );

    expect(screen.getByRole('heading', { name: 'Your Feedback' })).toBeTruthy();
    expect(
      screen.getByText('A completed Attempt is authoritative.')
    ).toBeTruthy();
  });

  it('keeps the incomplete log notice when the line also drops', async () => {
    respondWithScenario();
    let reportEnded: (() => void) | undefined;
    let reportAttemptDataFailed: (() => void) | undefined;
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(
      ({ onEnded, onAttemptDataFailed }) => {
        reportEnded = onEnded;
        reportAttemptDataFailed = onAttemptDataFailed;
        return Promise.resolve(stubRealtimeAttempt());
      }
    );

    render(<App connectAttempt={connectAttempt} />);

    fireEvent.click(
      await screen.findByRole('button', { name: 'Start attempt' })
    );
    expect((await screen.findByRole('status')).textContent).toContain(
      'Listening'
    );

    // A dropped line reports the incomplete log first and the end second.
    act(() => {
      reportAttemptDataFailed?.();
      reportEnded?.();
    });

    expect(
      screen.getByRole('heading', {
        name: 'The Attempt event log could not be completed.',
      })
    ).toBeTruthy();
  });
});
