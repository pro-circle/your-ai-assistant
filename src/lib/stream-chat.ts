export type ChatMessage = { role: "user" | "assistant"; content: string };

export type ChatAttachment =
  | { kind: "image"; name: string; mimeType: string; dataUrl: string }
  | { kind: "text"; name: string; mimeType: string; text: string };

export async function streamChat(
  messages: ChatMessage[],
  contextChunks: string[],
  onDelta: (delta: string) => void,
  signal?: AbortSignal,
  options?: {
    attachment?: ChatAttachment | null;
    outputLanguage?: string | null;
    domain?: string | null;
  },
): Promise<void> {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      contextChunks,
      attachment: options?.attachment ?? null,
      outputLanguage: options?.outputLanguage ?? null,
      domain: options?.domain ?? null,
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

  // Strip reasoning/thinking blocks emitted by some models. We buffer across
  // token boundaries so a partial "<think>" or "</think>" tag is never shown.
  let inThink = false;
  let pending = "";
  const THINK_OPEN = /<think(?:ing)?>/i;
  const THINK_CLOSE = /<\/think(?:ing)?>/i;

  const emit = (chunk: string) => {
    pending += chunk;
    // Loop consuming think blocks and safe prefixes until nothing more can be flushed.
    // eslint-disable-next-line no-constant-condition
    while (true) {
      if (inThink) {
        const close = pending.match(THINK_CLOSE);
        if (!close) return;
        pending = pending.slice((close.index ?? 0) + close[0].length);
        inThink = false;
        continue;
      }
      const open = pending.match(THINK_OPEN);
      if (open) {
        const before = pending.slice(0, open.index ?? 0);
        if (before) onDelta(before);
        pending = pending.slice((open.index ?? 0) + open[0].length);
        inThink = true;
        continue;
      }
      // Hold back a tail that could be the start of a partial tag.
      const tail = pending.slice(-12);
      if (/<\/?t(h(i(n(k(i(n(g)?)?)?)?)?)?)?$/i.test(tail)) {
        const safe = pending.slice(0, pending.length - tail.length);
        if (safe) onDelta(safe);
        pending = tail;
        return;
      }
      if (pending) onDelta(pending);
      pending = "";
      return;
    }
  };

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
      if (data === "[DONE]") {
        if (!inThink && pending) onDelta(pending);
        return;
      }
      try {
        const json = JSON.parse(data);
        const delta = json?.choices?.[0]?.delta?.content;
        if (typeof delta === "string" && delta.length > 0) emit(delta);
      } catch {
        /* skip malformed */
      }
    }
  }
  if (!inThink && pending) onDelta(pending);
}
