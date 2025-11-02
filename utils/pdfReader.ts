// Add a declaration for the pdfjsLib global from the CDN script
declare const pdfjsLib: any;

/**
 * Extracts text content from a PDF file.
 * @param file The PDF file object.
 * @returns A promise that resolves with the extracted text content.
 */
export const extractTextFromPdf = async (file: File): Promise<string> => {
  // Set the worker source for pdf.js
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/4.3.136/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const numPages = pdf.numPages;
  let fullText = '';

  for (let i = 1; i <= numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    const pageText = textContent.items.map((item: any) => item.str).join(' ');
    fullText += pageText + '\n\n';
  }

  return fullText;
};
