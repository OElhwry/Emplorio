'use client';

/** Extract plain text from a PDF in the browser. pdfjs is imported lazily so it
 *  never runs during SSR and stays out of the initial bundle. */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjs = await import('pdfjs-dist');
  // Use a CDN worker matching the installed version, avoiding bundler worker setup.
  pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

  const buf = await file.arrayBuffer();
  const pdf = await pdfjs.getDocument({ data: buf }).promise;
  const parts: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    parts.push(
      content.items.map((it) => ('str' in it ? (it as { str: string }).str : '')).join(' '),
    );
  }
  return parts.join('\n').replace(/\s+/g, ' ').trim();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result as string);
    r.onerror = () => reject(r.error);
    r.readAsDataURL(file);
  });
}
