import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ResumeDocumentService {
  async download(content: string, filename = 'pathwise-resume.docx'): Promise<void> {
    const cleaned = content.trim();
    if (!cleaned) throw new Error('Resume content is empty.');

    const JSZip = (await import('jszip')).default;
    const zip = new JSZip();
    const paragraphs = this.toWordParagraphs(cleaned);
    zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/></Types>`);
    zip.file('_rels/.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>`);
    zip.file('word/document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${paragraphs}<w:sectPr><w:pgSz w:w="12240" w:h="15840"/><w:pgMar w:top="900" w:right="900" w:bottom="900" w:left="900" w:header="450" w:footer="450" w:gutter="0"/></w:sectPr></w:body></w:document>`);
    const blob = await zip.generateAsync({ type: 'blob', mimeType: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  private toWordParagraphs(content: string): string {
    const headings = new Set([
      'professional summary', 'summary', 'career summary', 'profile', 'objective',
      'experience', 'work experience', 'professional experience', 'employment history',
      'education', 'skills', 'technical skills', 'core competencies', 'certifications',
      'licenses', 'projects', 'selected projects', 'achievements', 'awards',
      'publications', 'volunteer experience', 'additional information', 'languages'
    ]);
    const lines = content.replace(/\r/g, '').split('\n');
    let firstText = true;
    let secondText = true;
    return lines.map(rawLine => {
      const line = rawLine.trim();
      if (!line) return '<w:p><w:pPr><w:spacing w:after="100"/></w:pPr></w:p>';
      const escaped = this.xmlEscape(line);
      if (firstText) {
        firstText = false;
        return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="80"/><w:keepNext/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="173454"/><w:sz w:val="34"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
      }
      if (secondText) {
        secondText = false;
        if (this.looksLikeContactLine(line)) {
          return `<w:p><w:pPr><w:jc w:val="center"/><w:spacing w:after="180"/><w:keepNext/></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="526174"/><w:sz w:val="19"/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
        }
      }
      if (this.isSectionHeading(line, headings)) {
        return `<w:p><w:pPr><w:spacing w:before="220" w:after="75"/><w:keepNext/><w:pBdr><w:bottom w:val="single" w:sz="5" w:space="3" w:color="9CB5B2"/></w:pBdr></w:pPr><w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:b/><w:color w:val="24556A"/><w:sz w:val="22"/><w:caps/></w:rPr><w:t xml:space="preserve">${escaped}</w:t></w:r></w:p>`;
      }
      const isBullet = /^[•●▪*-]\s+/.test(line);
      const body = isBullet ? line.replace(/^[•●▪*-]\s+/, '') : line;
      const bulletRun = isBullet ? '<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/></w:rPr><w:t>• </w:t></w:r>' : '';
      const indent = isBullet ? '<w:ind w:left="360" w:hanging="180"/>' : '';
      return `<w:p><w:pPr><w:spacing w:after="85" w:line="264" w:lineRule="auto"/><w:widowControl/>${indent}</w:pPr>${bulletRun}<w:r><w:rPr><w:rFonts w:ascii="Arial" w:hAnsi="Arial"/><w:color w:val="263445"/><w:sz w:val="20"/></w:rPr><w:t xml:space="preserve">${this.xmlEscape(body)}</w:t></w:r></w:p>`;
    }).join('');
  }

  private looksLikeContactLine(line: string): boolean {
    return /@|\+?\d[\d\s().-]{6,}|linkedin\.com|github\.com|https?:\/\//i.test(line);
  }

  private isSectionHeading(line: string, headings: Set<string>): boolean {
    const normalized = line.trim().replace(/[:\s]+$/, '').toLowerCase();
    const label = line.trim().replace(/[:\s]+$/, '');
    return headings.has(normalized) || (label.length <= 42 && label === label.toUpperCase() && /[A-Z]/.test(label));
  }

  private xmlEscape(value: string): string {
    return value
      .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\uFFFE\uFFFF]/g, '')
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
}
