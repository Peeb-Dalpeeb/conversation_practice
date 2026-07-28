# Conversation Practice

A local application for rehearsing difficult conversations out loud. This
first scaffold runs a Node + TypeScript server beside a React + TypeScript page
and confirms that the two can communicate through Vite's development proxy.

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

4. Start the whole application:

   ```sh
   npm run dev
   ```

Open [http://localhost:5173](http://localhost:5173). The page reports when it
has successfully reached the local server. Vite forwards `/api` requests to
the server, so local development needs no separate build step or second
terminal.

The API key is loaded only by the Node server. Vite exposes browser variables
only when their names begin with `VITE_`; do not use that prefix for secrets.

## Checks

```sh
npm test
npm run typecheck
npm run build
```
