import { createFileRoute } from "@tanstack/react-router";

/**
 * Thin pass-through proxy to the Flask backend (backend/app.py).
 *
 * ALL backend logic (system prompt, model choice, Groq call) now lives in
 * Python — edit `backend/app.py`, not this file.
 *
 * Set CHAT_BACKEND_URL to the deployed Flask service, e.g.
 *   CHAT_BACKEND_URL=https://dynamic-agent-api-xxxx.a.run.app
 * Locally it falls back to http://127.0.0.1:5001 (`python backend/app.py`).
 */
export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const base = (process.env.CHAT_BACKEND_URL || "http://127.0.0.1:5001").replace(
          /\/+$/,
          "",
        );

        let upstream: Response;
        try {
          upstream = await fetch(`${base}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: await request.text(),
          });
        } catch (e) {
          return new Response(
            JSON.stringify({
              error:
                "Agent backend unreachable. Start the Flask server (python backend/app.py) " +
                "or set CHAT_BACKEND_URL to the deployed service. " +
                (e instanceof Error ? e.message : ""),
            }),
            { status: 502, headers: { "Content-Type": "application/json" } },
          );
        }

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(text || JSON.stringify({ error: "Backend error." }), {
            status: upstream.status,
            headers: { "Content-Type": "application/json" },
          });
        }

        return new Response(upstream.body, {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        });
      },
    },
  },
});
