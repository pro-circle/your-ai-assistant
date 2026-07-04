import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };
type Body = { messages: ChatMessage[]; contextChunks?: string[] };

export const Route = createFileRoute("/api/chat")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const apiKey = process.env.GROQ_API_KEY;
        if (!apiKey) {
          return new Response(
            JSON.stringify({ error: "GROQ_API_KEY is not configured on the server." }),
            { status: 500, headers: { "Content-Type": "application/json" } },
          );
        }

        let body: Body;
        try {
          body = (await request.json()) as Body;
        } catch {
          return new Response(JSON.stringify({ error: "Invalid JSON body." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        if (!Array.isArray(body.messages) || body.messages.length === 0) {
          return new Response(JSON.stringify({ error: "messages required." }), {
            status: 400,
            headers: { "Content-Type": "application/json" },
          });
        }

        const contextBlock =
          body.contextChunks && body.contextChunks.length > 0
            ? `\n\nRelevant excerpts from the user's uploaded documents:\n---\n${body.contextChunks
                .map((c, i) => `[Chunk ${i + 1}]\n${c}`)
                .join("\n---\n")}\n---`
            : "";

        const system: ChatMessage = {
          role: "system",
          content:
            "You are Dynamic Customer Agent — a helpful, precise, multilingual customer support assistant. " +
            "For every user query: (1) detect the language of their most recent message and reply in exactly that language; " +
            "(2) carefully search the provided document excerpts for the answer before responding; " +
            "(3) give a clear, direct answer first, then a brief explanation with the relevant details from the documents. " +
            "Use short paragraphs, bullet points, or numbered steps to make the answer easy to scan. " +
            "When you use document excerpts, cite them inline as [Chunk N]. " +
            "If the answer is not in the documents, say so explicitly and then answer from general knowledge. " +
            "Never invent facts about the user's documents." +
            contextBlock,
        };

        const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            messages: [system, ...body.messages],
            stream: true,
            temperature: 0.6,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({ error: `Groq error ${upstream.status}: ${text.slice(0, 400)}` }),
            { status: upstream.status, headers: { "Content-Type": "application/json" } },
          );
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
