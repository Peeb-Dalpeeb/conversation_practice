import { useEffect, useState } from "react";

type ConnectionState = "checking" | "connected" | "unavailable";

export function App() {
  const [connectionState, setConnectionState] =
    useState<ConnectionState>("checking");

  useEffect(() => {
    const controller = new AbortController();

    async function checkServer() {
      try {
        const response = await fetch("/api/health", {
          signal: controller.signal,
        });
        const body: unknown = await response.json();

        if (
          response.ok &&
          typeof body === "object" &&
          body !== null &&
          "status" in body &&
          body.status === "ok"
        ) {
          setConnectionState("connected");
          return;
        }

        setConnectionState("unavailable");
      } catch (error) {
        if (!(error instanceof DOMException && error.name === "AbortError")) {
          setConnectionState("unavailable");
        }
      }
    }

    void checkServer();

    return () => controller.abort();
  }, []);

  return (
    <main className="shell">
      <section className="hero" aria-labelledby="page-title">
        <p className="eyebrow">Conversation Practice</p>
        <h1 id="page-title">Rehearse the conversation before it matters.</h1>
        <p className="lede">
          A quiet place to practise difficult conversations out loud, learn
          from each attempt, and try again.
        </p>

        <div className={`connection connection--${connectionState}`}>
          <span className="connection__indicator" aria-hidden="true" />
          <span>
            {connectionState === "checking" && "Connecting to the local server…"}
            {connectionState === "connected" &&
              "Page and local server are connected."}
            {connectionState === "unavailable" &&
              "The local server is unavailable."}
          </span>
        </div>
      </section>
    </main>
  );
}
