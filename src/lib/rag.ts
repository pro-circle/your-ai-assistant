export type Chunk = { id: string; source: string; text: string; tokens: Set<string> };

const STOP = new Set(
  "a an the and or but if then of to in on at for by with from as is are was were be been being this that these those it its i you he she we they them my your our their".split(
    " ",
  ),
);

export function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w));
}

export function chunkText(source: string, text: string, size = 800, overlap = 120): Chunk[] {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return [];
  const chunks: Chunk[] = [];
  let i = 0;
  let idx = 0;
  while (i < clean.length) {
    const slice = clean.slice(i, i + size);
    chunks.push({
      id: `${source}#${idx++}`,
      source,
      text: slice,
      tokens: new Set(tokenize(slice)),
    });
    if (i + size >= clean.length) break;
    i += size - overlap;
  }
  return chunks;
}

export function retrieve(query: string, chunks: Chunk[], k = 4): Chunk[] {
  if (chunks.length === 0) return [];
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return [];
  const scored = chunks.map((c) => {
    let score = 0;
    for (const t of qTokens) if (c.tokens.has(t)) score += 1;
    return { c, score };
  });
  return scored
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, k)
    .map((s) => s.c);
}
