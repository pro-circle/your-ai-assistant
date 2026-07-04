import { createFileRoute } from "@tanstack/react-router";

type ChatMessage = { role: "user" | "assistant" | "system"; content: string };

type Attachment =
  | { kind: "image"; name: string; mimeType: string; dataUrl: string }
  | { kind: "text"; name: string; mimeType: string; text: string };

type Body = {
  messages: ChatMessage[];
  contextChunks?: string[];
  attachment?: Attachment | null;
  outputLanguage?: string | null;
};

// Default text model; vision model used automatically when a file is attached in chat.
const TEXT_MODEL = "llama-3.3-70b-versatile";
const VISION_MODEL = "qwen/qwen3.6-27b";

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

        const languageDirective = body.outputLanguage
          ? `Always reply in ${body.outputLanguage}, regardless of the language the user writes in.`
          : "Detect the language of the user's most recent message and reply in exactly that language.";

        const system: ChatMessage = {
          role: "system",
          content:
            "You are Dynamic Customer Agent — a helpful, precise, multilingual support assistant. " +
            languageDirective +
            " Carefully search the provided document excerpts and any attached file before responding. " +
            "Give a clear, direct answer first, then a brief explanation with the relevant details. " +
            "Use short paragraphs, bullet points, or numbered steps to make the answer easy to scan. " +
            "When you use document excerpts, cite them inline as [Chunk N]. " +
            "If a user attaches a file that is not related to the loaded documents, still help them fully — analyze it, explain what you see, and answer their question. " +
            "Never begin a response with an apology like 'Sorry' — always help pleasantly. " +
            "If information is genuinely missing, ask a short clarifying question or answer from general knowledge, but do not refuse." +
            contextBlock,
        };

        // Build the outgoing messages. If an attachment is present on the LAST user
        // message, we upgrade it to multimodal content and switch to the vision model.
        const outMessages: unknown[] = [system];
        const historyLen = body.messages.length;
        for (let i = 0; i < historyLen; i++) {
          const m = body.messages[i];
          const isLastUser = i === historyLen - 1 && m.role === "user" && !!body.attachment;
          if (!isLastUser) {
            outMessages.push(m);
            continue;
          }
          const att = body.attachment!;
          if (att.kind === "image") {
            outMessages.push({
              role: "user",
              content: [
                { type: "text", text: `${m.content}\n\n(Attached file: ${att.name})` },
                { type: "image_url", image_url: { url: att.dataUrl } },
              ],
            });
          } else {
            const trimmed = att.text.slice(0, 60_000);
            outMessages.push({
              role: "user",
              content: `${m.content}\n\n[Attached file: ${att.name}]\n---\n${trimmed}\n---`,
            });
          }
        }

        const model = body.attachment ? VISION_MODEL : TEXT_MODEL;

        const upstream = await fetch("https://api.groq.com/openai/v1/chat/completions", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model,
            messages: outMessages,
            stream: true,
            temperature: 0.6,
          }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => "");
          return new Response(
            JSON.stringify({
              error: `Groq error ${upstream.status} (model: ${model}): ${text.slice(0, 400)}`,
            }),
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
