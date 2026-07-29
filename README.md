# Conversation Practice

A local application for rehearsing difficult conversations out loud. A
Trainee reads a server-provided Briefing, then presses one explicit control to
start an Attempt. A Node + TypeScript server runs beside the React + TypeScript
page through Vite's development proxy.

## Run locally

You need Node.js 20.19 or newer (or Node.js 22.12 or newer).

1. Install the dependencies:

   ```sh
   npm install
   ```

2. Create your local environment file:

   macOS or Linux:

   ```sh
   cp .env.example .env
   ```

   Windows PowerShell:

   ```powershell
   Copy-Item .env.example .env
   ```

3. Replace the placeholder in `.env` with your OpenAI API key.

   `SERVER_PORT` controls the local API port and defaults to `3001`. Vite reads
   the same value from `.env`, so the development proxy follows the server if
   you change it.

4. Start the whole application:

   ```sh
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173). The Trainee reads the
Briefing supplied by the local server and presses **Start attempt** when ready.
Vite forwards `/api` requests to the server, so local development needs no
separate build step or second terminal.

The complete Scenario lives in `src/scenario.ts`. Edit that one file to tune
the Briefing, Persona, Private Profile, behaviour rules, Gate, hang-up
precondition, or Rubric. The development server restarts when it changes;
refresh the page to read the revised Briefing. No build step is required.

Because this proof of concept has one fixed Briefing layout, its four-field
shape and labels stay in `src/client/App.tsx`; `src/scenario.ts` remains the
single place to edit the authored Scenario text.

The API key is loaded only by the Node server. Vite exposes browser variables
only when their names begin with `VITE_`; do not use that prefix for secrets.

When an Attempt ends, its Realtime event log is written under
`data/raw-event-logs/`. Each entry records its direction and the exact
data-channel payload string; binary frames are retained as base64. These local
logs can contain spoken content and are ignored by Git.

Both speakers' text is in that log, from one model and no transcription
service. The Trainee's turns are transcribed by a second, out-of-band response
on the same session; the Persona's turns are already carried by
`response.output_audio_transcript.done`, the text its audio was generated from.

## Checks

```sh
npm test
npm run typecheck
npm run lint
npm run build
```

`npm run build` runs the typecheck and the lint before building, so it is the
single command that covers everything except the tests.

Formatting is handled by Prettier and applies to code only — Markdown is left
alone so the decision records are not rewritten by a formatter.

```sh
npm run format
npm run format:check
```

`npm run lint:fix` applies the lint fixes that can be applied automatically.
