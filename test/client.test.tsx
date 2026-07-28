// @vitest-environment jsdom

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { App } from '../src/client/App.js';

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
    expect(
      screen.queryByRole('heading', { name: 'Starting attempt…' })
    ).toBeNull();
  });

  it('does not start the Attempt until the Trainee uses the control', async () => {
    respondWithScenario();

    render(<App />);

    const startButton = await screen.findByRole('button', {
      name: 'Start attempt',
    });

    expect(
      screen.queryByRole('heading', { name: 'Starting attempt…' })
    ).toBeNull();

    fireEvent.click(startButton);

    expect(
      screen.getByRole('heading', { name: 'Starting attempt…' })
    ).toBeTruthy();
    expect(screen.queryByText('The role supplied by the server.')).toBeNull();
  });
});
