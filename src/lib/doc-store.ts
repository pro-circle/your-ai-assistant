import { chunkText, type Chunk } from "./rag";
import { extractText } from "./document-parser";

export type DocFile = { name: string; chunks: Chunk[] };

let docs: DocFile[] = [];
const listeners = new Set<() => void>();

export function getDocs() {
  return docs;
}

export function subscribeDocs(fn: () => void) {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function emit() {
  for (const l of listeners) l();
}

export function addDoc(doc: DocFile) {
  docs = [...docs, doc];
  emit();
}

export function removeDocAt(i: number) {
  docs = docs.filter((_, j) => j !== i);
  emit();
}

export const MAX_UPLOAD_BYTES = 15 * 1024 * 1024;

export async function ingestFile(file: File): Promise<DocFile> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(`${file.name} exceeds 15MB limit`);
  }
  const text = await extractText(file);
  const chunks = chunkText(file.name, text);
  const doc: DocFile = { name: file.name, chunks };
  addDoc(doc);
  return doc;
}
