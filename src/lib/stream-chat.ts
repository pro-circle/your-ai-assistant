export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatAttachment =
  | { kind: "image"; name: string; mimeType: string; dataUrl: string }
  | { kind: "text"; name: string; mimeType: string; text: string };

export async function streamChat(
  messages: ChatMessage[],
  contextChunks: string[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
  options?: { attachment?: ChatAttachment | null; outputLanguage?: string | null },
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      contextChunks,
      attachment: options?.attachment ?? null,
      outputLanguage: options?.outputLanguage ?? null,
    }),
    signal,
  });

  if (!res.ok) {
    let msg = `Request failed (${res.status})`;
    try {
      const j = await res.json();
      if (j?.error) msg = j.error;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  if (!res.body) throw new Error("No response body");

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";
    for (const raw of lines) {
      const line = raw.trim();
      if (!line.startsWith("data:")) continue;
      const data = line.slice(5).trim();
      if (data === "[DONE]") return;
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) onDelta(delta);
      } catch {
        /* skip malformed */
      }
    }
  }
}
