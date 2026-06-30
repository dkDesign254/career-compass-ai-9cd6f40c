// Client-only resume text extraction. Dynamic imports keep heavy deps out of the
// initial bundle and avoid pulling them into SSR.

export async function extractResumeText(file: File): Promise<string> {
  const name = file.name.toLowerCase();
  if (name.endsWith(".txt") || name.endsWith(".md")) {
    return await file.text();
  }
  if (name.endsWith(".docx")) {
    // @ts-expect-error - no types for browser bundle
    const mammoth = await import("mammoth/mammoth.browser.js");
    const buf = await file.arrayBuffer();
    const { value } = await (mammoth as any).extractRawText({ arrayBuffer: buf });
    return value as string;
  }
  if (name.endsWith(".pdf")) {
    // @ts-expect-error - subpath types
    const pdfjs: any = await import("pdfjs-dist/legacy/build/pdf.mjs");
    // Worker: use the bundled module worker URL via Vite.
    // @ts-expect-error - vite url import
    const workerUrl = (await import("pdfjs-dist/build/pdf.worker.mjs?url")).default;
    pdfjs.GlobalWorkerOptions.workerSrc = workerUrl;
    const buf = await file.arrayBuffer();
    const doc = await pdfjs.getDocument({ data: buf }).promise;
    let out = "";
    for (let p = 1; p <= doc.numPages; p++) {
      const page = await doc.getPage(p);
      const content = await page.getTextContent();
      out += content.items.map((i: any) => i.str).join(" ") + "\n";
    }
    return out;
  }
  throw new Error("Unsupported file type. Upload a PDF, DOCX, or TXT file.");
}