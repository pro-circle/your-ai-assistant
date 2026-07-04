import type { ChatAttachment } from "./stream-chat";
import { extractText } from "./document-parser";

const CODE_EXT = new Set([
  "js","jsx","ts","tsx","py","java","c","cc","cpp","cs","go","rs","rb","php",
  "html","htm","css","scss","json","yml","yaml","xml","sh","bash","zsh","sql",
  "swift","kt","kts","dart","lua","pl","r","m","mm","toml","ini","env","log",
  "vue","svelte","astro","gradle","dockerfile",
]);

const MAX_ATTACH_BYTES = 15 * 1024 * 1024;

export async function readChatAttachment(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_ATTACH_BYTES) {
    throw new Error(`${file.name} exceeds 15MB limit`);
  }
  const mimeType = file.type || "application/octet-stream";
  const name = file.name;
  const lower = name.toLowerCase();
  const ext = lower.includes(".") ? lower.split(".").pop()! : "";

  // Images → send as base64 data URL for the vision model.
  if (mimeType.startsWith("image/") || ["png","jpg","jpeg","gif","webp","bmp"].includes(ext)) {
    const dataUrl = await fileToDataUrl(file);
    return { kind: "image", name, mimeType: mimeType || `image/${ext}`, dataUrl };
  }

  // Documents parseable by our shared extractor.
  if (["pdf","docx","txt","md"].includes(ext)) {
    const text = await extractText(file);
    return { kind: "text", name, mimeType, text };
  }

  // Code / plain-text files.
  if (CODE_EXT.has(ext) || mimeType.startsWith("text/")) {
    const text = await file.text();
    return { kind: "text", name, mimeType, text };
  }

  // PPT / PPTX — best-effort: we cannot parse binary Office presentations client-side.
  if (ext === "ppt" || ext === "pptx") {
    throw new Error(
      `${name}: PowerPoint parsing isn't supported in the browser. Please export the slides as PDF and upload again.`,
    );
  }

  throw new Error(`Unsupported file type: ${name}`);
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = () => reject(r.error ?? new Error("read failed"));
    r.readAsDataURL(file);
  });
}
