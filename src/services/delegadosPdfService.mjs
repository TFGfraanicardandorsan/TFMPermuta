import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

import PDFDocument from 'pdfkit';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ASSETS_DIR = path.resolve(__dirname, '../assets/delegados');
const DLGA_LOGO = path.join(ASSETS_DIR, 'dlga.png');
const DLGA_GROUP_LOGO = path.join(ASSETS_DIR, 'dlga_grupo.png');
const ETSII_LOGO = path.join(ASSETS_DIR, 'etsii.png');

const SPANISH_MONTHS = [
  'Enero',
  'Febrero',
  'Marzo',
  'Abril',
  'Mayo',
  'Junio',
  'Julio',
  'Agosto',
  'Septiembre',
  'Octubre',
  'Noviembre',
  'Diciembre',
];

export async function buildCertificatePdf(row, signer, requestDate) {
  const doc = new PDFDocument({
    size: 'A4',
    margins: {
    top: row.tipo_delegado === 'Centro' ? 70 : 34,
      right: 84,
      bottom: 70,
      left: 84,
    },
    info: {
      Title: `Certificado ${row.nombre}`,
      Author: 'Delegación de Alumnos',
    },
  });
  const pdfPromise = collectPdf(doc);
  const fonts = registerFonts(doc);

  doc.rect(0, 0, doc.page.width, doc.page.height).fill('#FFFFFF');
  doc.fillColor('#000000');

  if (row.tipo_delegado === 'Centro') {
    drawCenterCertificate(doc, row, signer, requestDate, fonts);
  } else {
    drawAcademicCertificate(doc, row, signer, requestDate, fonts);
  }

  doc.end();
  return pdfPromise;
}

export function certificateFilename(row) {
  const kind = certificateKind(row);
  return `certificado_delegado_de_${kind}_${slug(row.nombre)}_${row.curso_corto.replace('-', '_')}.pdf`;
}

function drawCenterCertificate(doc, row, signer, requestDate, fonts) {
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  drawCenterLogos(doc);

  doc
    .font(fonts.bold)
    .fontSize(20)
    .text('Certificación de Delegados de Centro', doc.page.margins.left, 170, {
      width: contentWidth,
      align: 'center',
    });

  doc
    .font(fonts.regular)
    .fontSize(12)
    .lineGap(4)
    .text(centerParagraph(row), doc.page.margins.left, 260, {
      width: contentWidth,
      align: 'justify',
    });

  doc
    .text(purposeParagraph(signer), doc.page.margins.left, doc.y + 30, {
      width: contentWidth,
      align: 'justify',
    });

  doc
    .font(fonts.bold)
    .fontSize(14)
    .text(formatDate(requestDate), doc.page.margins.left, doc.y + 24, {
      width: contentWidth,
      align: 'center',
    });

  doc
    .font(fonts.bold)
    .fontSize(12)
    .text(`FDO: ${signer.trim().toUpperCase()}`, doc.page.margins.left, 660, {
      width: contentWidth,
      align: 'center',
    });
}

function drawAcademicCertificate(doc, row, signer, requestDate, fonts) {
  const left = doc.page.margins.left;
  const contentWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
  drawGroupHeader(doc, fonts);

  doc
    .font(fonts.regular)
    .fontSize(12.5)
    .lineGap(4)
    .text(academicParagraph(row), left, 190, {
      width: contentWidth,
      align: 'justify',
    });

  drawGroupCourseTable(doc, row, left, doc.y + 36, fonts);

  doc
    .font(fonts.regular)
    .fontSize(12.5)
    .text(purposeParagraph(signer), left, doc.y + 70, {
      width: contentWidth,
      align: 'justify',
    });

  doc
    .font(fonts.bold)
    .fontSize(14)
    .text(formatGroupDate(requestDate), left, doc.y + 34, {
      width: contentWidth,
      align: 'center',
    });

  doc
    .font(fonts.bold)
    .fontSize(12.5)
    .text(`FDO: ${signer.trim().toUpperCase()}`, left, 675, {
      width: contentWidth,
      align: 'center',
    });
}

function drawCenterLogos(doc) {
  const y = 70;
  const totalWidth = 98.6 + 24 + 154.85;
  const x = (doc.page.width - totalWidth) / 2;
  drawImageIfExists(doc, DLGA_LOGO, x, y, { width: 98.6 });
  drawImageIfExists(doc, ETSII_LOGO, x + 98.6 + 24, y + 10, { width: 154.85 });
}

function drawGroupHeader(doc, fonts) {
  const x = doc.page.margins.left;
  const y = 38;
  drawImageIfExists(doc, DLGA_GROUP_LOGO, x, y, { width: 78, height: 78 });
  drawImageIfExists(doc, ETSII_LOGO, x + 96, y + 3, { width: 188 });

  doc
    .font(fonts.bold)
    .fontSize(21)
    .text('Certificación de Delegado', x + 96, y + 43, {
      width: 330,
      align: 'center',
    });
}

function drawGroupCourseTable(doc, row, x, y, fonts) {
  const columns = [150, 62, 62];
  const headers = ['CURSO ACADÉMICO', 'CURSO', 'GRUPO'];
  const [courseNumber, groupNumber] = row.tipo_delegado === 'Curso'
    ? [row.curso_delegado, '']
    : groupCourseAndGroup(row.grupo);
  const values = [row.curso_largo.replace(/\s*[-–]\s*/g, '-'), courseNumber, groupNumber];

  doc.font(fonts.bold).fontSize(13);
  let cursorX = x;
  headers.forEach((header, index) => {
    doc.text(header, cursorX, y, { width: columns[index], align: index === 0 ? 'left' : 'center' });
    cursorX += columns[index];
  });

  cursorX = x;
  values.forEach((value, index) => {
    doc.text(value, cursorX, y + 30, { width: columns[index], align: index === 0 ? 'left' : 'center' });
    cursorX += columns[index];
  });
  doc.y = y + 60;
}

function centerParagraph(row) {
  return `El estudiante, ${row.nombre}, con DNI: ${row.dni}, ha sido DELEGADO DE CENTRO en el curso académico ${row.curso_largo}`;
}

function academicParagraph(row) {
  if (row.tipo_delegado === 'Curso') {
    return `El estudiante, ${row.nombre}, con DNI: ${row.dni} ha sido DELEGADO DE CURSO de ${row.curso_delegado} en el grado de ${groupDegreeLabel(row.grado)}.`;
  }

  return `El estudiante, ${row.nombre}, con DNI: ${row.dni} ha sido DELEGADO DE GRUPO en el grado de ${groupDegreeLabel(row.grado)}.`;
}

function purposeParagraph(signer) {
  return (
    'Y para que conste a tal efecto su ratificación y posterior emisión de los créditos ECTS ' +
    `correspondientes por ello, el Delegado de Centro: ${signer.trim().toUpperCase()}, ` +
    'en nombre de la Delegación de Alumnos, firma el presente documento con fecha,'
  );
}

function formatDate(value) {
  return `En Sevilla a ${value.getDate()} de ${SPANISH_MONTHS[value.getMonth()]} de ${value.getFullYear()}`;
}

function formatGroupDate(value) {
  return `En Sevilla a, ${value.getDate()} de ${SPANISH_MONTHS[value.getMonth()].toLocaleLowerCase('es')} de ${value.getFullYear()}`;
}

function groupCourseAndGroup(value) {
  const raw = String(value || '').trim();
  const groupMatch = raw.match(/\bgrupo\s*([A-Za-z0-9]+)/i);
  if (groupMatch) {
    const beforeGroup = raw.slice(0, groupMatch.index);
    const courseMatch = beforeGroup.match(/\d+/);
    return [courseMatch ? courseMatch[0] : '', groupMatch[1]];
  }

  const numbers = raw.match(/\d+/g) || [];
  if (numbers.length >= 2) return [numbers[0], numbers[numbers.length - 1]];
  if (numbers.length === 1) return [numbers[0], raw];
  return ['', raw];
}

function groupDegreeLabel(value) {
  return String(value || '').toUpperCase().replace(' - ', ' - ');
}

function certificateKind(row) {
  if (row.tipo_delegado === 'Centro') return 'centro';
  if (row.tipo_delegado === 'Curso') return 'curso';
  return 'grupo';
}

function collectPdf(doc) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function registerFonts(doc) {
  const regular = firstExisting([
    '/System/Library/Fonts/Supplemental/Arial.ttf',
    '/Library/Fonts/Arial.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',
  ]);
  const bold = firstExisting([
    '/System/Library/Fonts/Supplemental/Arial Bold.ttf',
    '/Library/Fonts/Arial Bold.ttf',
    '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf',
  ]);

  if (regular && bold) {
    doc.registerFont('CertificateSans', regular);
    doc.registerFont('CertificateSans-Bold', bold);
    return {
      regular: 'CertificateSans',
      bold: 'CertificateSans-Bold',
    };
  }

  return {
    regular: 'Helvetica',
    bold: 'Helvetica-Bold',
  };
}

function drawImageIfExists(doc, imagePath, x, y, options) {
  if (fs.existsSync(imagePath)) {
    doc.image(imagePath, x, y, options);
  }
}

function firstExisting(paths) {
  return paths.find((candidate) => fs.existsSync(candidate));
}

function slug(value) {
  const text = String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toLowerCase();
  return text || 'certificado';
}
