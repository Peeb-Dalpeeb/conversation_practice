# 01 — Local dev scaffolding, one command

**What to build:** The author can clone the repository, install once, run one command, and
have the whole thing running locally — a Node + TypeScript server and a React page served
by Vite, with a dev proxy so the page reaches the server without CORS ceremony. The page
loads and demonstrably reaches the server.

The OpenAI API key is read from the environment by the server only. Nothing in the browser
bundle ever sees it. A committed example environment file names the key so a fresh clone
knows what to supply; the real one stays out of version control.

Nothing about the Scenario, the Persona, or judging exists yet. This ticket is the ground
the other twelve stand on, and its acceptance criterion is that a demo never depends on a
deployment.

**Blocked by:** None — can start immediately.

**Status:** done

- [x] One documented command starts both the server and the page; no second terminal, no
      manual build step.
- [x] The page loads in a desktop browser and successfully calls a server endpoint through
      the dev proxy.
- [x] Both server and page are TypeScript, sharing one language across the project.
- [x] The server reads the OpenAI API key from the environment; the key appears nowhere in
      the browser bundle.
- [x] An example environment file is committed naming the required variables; the real
      environment file is ignored by version control.
- [x] A fresh clone can be brought up from the README with no undocumented steps.
