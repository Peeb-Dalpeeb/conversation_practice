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
import type {
  AttemptActivity,
  ConnectRealtimeAttempt,
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

afterEach(() => {
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
    const connectAttempt = vi.fn<ConnectRealtimeAttempt>(({ onActivity }) => {
      reportActivity = onActivity;
      return Promise.resolve({ stop });
    });

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
    expect(screen.queryByRole('button')).toBeNull();
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
  });
});
