// Client-only document text extraction.
export async function extractText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const mammoth: any = await import("mammoth/mammoth.browser" as string);
    const buf = await file.arrayBuffer();
    const res = await mammoth.extractRawText({ arrayBuffer: buf });
    return (res?.value as string) ?? "";
  }
  if (name.endsWith(".pdf")) {
    const pdfjs = await import("pdfjs-dist");
    // Use the worker via CDN to avoid Vite worker bundling issues.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (pdfjs as any).GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.mjs`;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out +=
        content.items
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .map((it: any) => ("str" in it ? it.str : ""))
          .join(" ") + "\n\n";
    }
    return out;
  }
  throw new Error(`Unsupported file type: ${file.name}`);
}
