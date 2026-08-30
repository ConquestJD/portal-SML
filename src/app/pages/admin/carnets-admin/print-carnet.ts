import { code128Svg } from '../../../shared/utils/code128';

export interface CarnetPrintData {
  fullName: string;
  code: string;
  grade: string;
  level: string;
  photoUrl?: string | null;
}

function cardHtml(s: CarnetPrintData): string {
  const grade = [s.grade, s.level].filter(Boolean).join(' · ');
  const photo = s.photoUrl
    ? `<img src="${escapeHtml(s.photoUrl)}" alt="" />`
    : '';
  let barcode = '';
  try {
    barcode = code128Svg(s.code, 36, 1.5);
  } catch {
    barcode = '';
  }
  return `
    <article class="card">
      <header class="card__head">
        <img class="crest" src="/only-logo.png" alt="" />
        <div>
          <p class="brand">Santa María Laura</p>
          <p class="kind">Carnet de estudiante</p>
        </div>
      </header>
      <div class="card__body">
        <div class="who">
          <p class="name">${escapeHtml(s.fullName)}</p>
          ${grade ? `<p class="grade">${escapeHtml(grade)}</p>` : ''}
        </div>
        <div class="photo">${photo}</div>
      </div>
      <footer class="card__code">
        ${barcode}
        <p class="code">${escapeHtml(s.code)}</p>
      </footer>
    </article>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

const PRINT_CSS = `
  @page { size: 85.6mm 54mm; margin: 0; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: #fff; }
  body { font-family: Georgia, 'Times New Roman', serif; color: #142033; }
  .sheet { display: flex; flex-direction: column; align-items: center; }
  .card {
    width: 85.6mm;
    height: 54mm;
    padding: 3.6mm 4.6mm 2.8mm;
    display: grid;
    grid-template-rows: auto minmax(0, 1fr) auto;
    gap: 2mm;
    overflow: hidden;
    background: #fff;
    color: #142033;
    border: 0.3mm solid #003366;
    page-break-after: always;
    break-after: page;
  }
  .card:last-child { page-break-after: auto; break-after: auto; }
  .card__head {
    display: flex;
    align-items: center;
    gap: 3mm;
    padding-bottom: 2mm;
    border-bottom: 0.45mm solid #c41e3a;
  }
  .crest { width: 8.5mm; height: 8.5mm; object-fit: contain; }
  .brand {
    margin: 0;
    font-size: 8.5pt;
    font-weight: 700;
    letter-spacing: .12em;
    text-transform: uppercase;
    color: #003366;
  }
  .kind { margin: .4mm 0 0; font-size: 7pt; letter-spacing: .08em; text-transform: uppercase; color: #5c6b7e; }
  .card__body {
    display: grid;
    grid-template-columns: minmax(0, 1fr) auto;
    align-items: center;
    gap: 3.2mm;
    min-height: 0;
    overflow: hidden;
  }
  .who { min-width: 0; }
  .photo {
    width: 18mm;
    height: 22mm;
    max-height: 100%;
    background: #eef1f5;
    overflow: hidden;
  }
  .photo img { width: 100%; height: 100%; object-fit: cover; object-position: center top; display: block; }
  .name {
    margin: 0;
    font-size: 12pt;
    font-weight: 600;
    line-height: 1.15;
    color: #003366;
  }
  .grade { margin: 1.2mm 0 0; font-size: 8pt; color: #5c6b7e; }
  .card__code {
    min-width: 0;
    padding-top: 1.6mm;
    border-top: 0.25mm solid rgba(0 51 102 / .16);
    text-align: center;
  }
  .card__code svg { display: block; width: 100%; height: 9mm; }
  .code {
    margin: 1mm 0 0;
    font-family: 'Segoe UI', sans-serif;
    font-size: 8pt;
    font-weight: 700;
    letter-spacing: .14em;
    color: #003366;
  }
`;

export function printStudentCarnets(students: CarnetPrintData[]): void {
  const cards = students.filter((s) => !!s.code).map(cardHtml).join('');
  if (!cards) return;
  const w = window.open('', '_blank', 'noopener,noreferrer,width=520,height=420');
  if (!w) return;
  w.document.open();
  w.document.write(`<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <title>Carnets · Santa María Laura</title>
  <style>${PRINT_CSS}</style>
</head>
<body>
  <div class="sheet">${cards}</div>
</body>
</html>`);
  w.document.close();
  const printWhenReady = () => {
    w.focus();
    w.print();
  };
  const imgs = Array.from(w.document.images);
  if (!imgs.length) {
    w.setTimeout(printWhenReady, 200);
    return;
  }
  let left = imgs.length;
  imgs.forEach((img) => {
    img.addEventListener('load', () => {
      left -= 1;
      if (left <= 0) printWhenReady();
    });
    img.addEventListener('error', () => {
      left -= 1;
      if (left <= 0) printWhenReady();
    });
  });
  w.setTimeout(printWhenReady, 1500);
}
