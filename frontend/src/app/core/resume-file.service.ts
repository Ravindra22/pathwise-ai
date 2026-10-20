import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ResumeFileService {
  async extract(file: File): Promise<string> {
    if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.');
    const extension = file.name.split('.').pop()?.toLowerCase();
    let text: string;
    if (extension === 'pdf') {
      const pdfjs = await import('pdfjs-dist');
      pdfjs.GlobalWorkerOptions.workerSrc = new URL('assets/pdfjs/pdf.worker.min.mjs', document.baseURI).toString();
      const pdf = await pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) }).promise;
      const pages: string[] = [];
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        const page = await pdf.getPage(pageNumber);
        const content = await page.getTextContent();
        pages.push(content.items.map(item => 'str' in item ? item.str : '').join(' '));
      }
      text = pages.join('\n\n');
    } else if (extension === 'docx') {
      const JSZip = (await import('jszip')).default;
      const archive = await JSZip.loadAsync(await file.arrayBuffer(), { checkCRC32: true });
      const documentFile = archive.file('word/document.xml');
      if (!documentFile) throw new Error('This Word file does not contain a readable document.');
      const xml = await documentFile.async('string');
      const parsed = new DOMParser().parseFromString(xml, 'application/xml');
      if (parsed.querySelector('parsererror')) throw new Error('This Word file could not be read.');
      const namespace = 'http://schemas.openxmlformats.org/wordprocessingml/2006/main';
      text = Array.from(parsed.getElementsByTagNameNS(namespace, 'p'))
        .map(paragraph => Array.from(paragraph.getElementsByTagNameNS(namespace, 't')).map(node => node.textContent ?? '').join(''))
        .join('\n');
    } else if (extension === 'txt' || extension === 'md') {
      text = await file.text();
    } else {
      throw new Error('Choose a PDF, DOCX, TXT, or MD file.');
    }

    const normalized = text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
    if (!normalized) throw new Error('No selectable text found. For a scanned PDF, paste the text instead.');
    if (normalized.length > 24000) throw new Error('This file contains more than 24,000 characters. Shorten it and upload again.');
    return normalized;
  }
}
