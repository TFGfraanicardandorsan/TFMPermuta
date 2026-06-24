import { ZipArchive } from 'archiver';

import {
  buildSummaryCsv,
  CSVValidationError,
  parseCsvUpload,
} from './delegadosCsvService.mjs';
import {
  buildCertificateEml,
  DEFAULT_SENDER,
} from './delegadosEmailService.mjs';
import {
  buildCertificatePdf,
  certificateFilename,
} from './delegadosPdfService.mjs';

export class DelegadosValidationError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'DelegadosValidationError';
    this.errors = errors;
  }
}

export function readSubmission({ firmante, fechaSolicitud, csvBuffer }) {
  const signer = String(firmante || '').trim();
  if (!signer) {
    throw new DelegadosValidationError(['Indica el nombre del Delegado de Centro firmante.']);
  }

  const requestDate = parseRequestDate(fechaSolicitud);
  try {
    return {
      signer,
      requestDate,
      rows: parseCsvUpload(csvBuffer, requestDate),
    };
  } catch (error) {
    if (error instanceof CSVValidationError) {
      throw new DelegadosValidationError(error.errors);
    }
    throw error;
  }
}

export async function buildPdfDocuments(rows, signer, requestDate) {
  const filenames = uniqueFilenames(rows.map((row) => certificateFilename(row)));
  const pdfs = await Promise.all(rows.map((row) => buildCertificatePdf(row, signer, requestDate)));
  return rows.map((row, index) => ({
    row,
    filename: filenames[index],
    pdf: pdfs[index],
  }));
}

export async function buildCertificateZip(documents) {
  const rows = documents.map((document) => document.row);
  const filenames = documents.map((document) => document.filename);
  return buildZip([
    ...documents.map((document) => ({
      name: document.filename,
      content: document.pdf,
    })),
    {
      name: 'resumen_certificados.csv',
      content: buildSummaryCsv(rows, filenames),
    },
  ]);
}

export function buildEmlDocuments(documents, sender = DEFAULT_SENDER) {
  const filenames = uniqueFilenames(documents.map((document) => emlFilename(document.filename)));
  return documents.map((document, index) => ({
    filename: filenames[index],
    eml: buildCertificateEml(
      sender,
      document.row.correo,
      document.row.tipo_delegado,
      document.filename,
      document.pdf,
    ),
  }));
}

export async function buildEmlZip(emlDocuments, documents) {
  const rows = documents.map((document) => document.row);
  const filenames = documents.map((document) => document.filename);
  return buildZip([
    ...emlDocuments.map((document) => ({
      name: document.filename,
      content: document.eml,
    })),
    {
      name: 'resumen_certificados.csv',
      content: buildSummaryCsv(rows, filenames),
    },
  ]);
}

export function buildSigningPayload(documents, requestDate, emailEnabled = false, emailTransport = 'smtp', emailSender = DEFAULT_SENDER) {
  const rows = documents.map((document) => document.row);
  const filenames = documents.map((document) => document.filename);
  return {
    downloadName: `certificados_delegados_firmados_${formatISODate(requestDate)}.zip`,
    summaryCsvBase64: buildSummaryCsv(rows, filenames).toString('base64'),
    emailConfig: {
      enabled: Boolean(emailEnabled),
      transport: emailTransport,
      sender: emailSender,
    },
    documents: documents.map((document) => ({
      filename: document.filename,
      uvus: document.row.uvus,
      name: document.row.nombre,
      dni: document.row.dni,
      delegateType: document.row.tipo_delegado,
      course: document.row.curso_corto,
      delegateCourse: document.row.curso_delegado,
      degree: document.row.grado,
      group: document.row.grupo,
      email: document.row.correo,
      pdfBase64: document.pdf.toString('base64'),
    })),
  };
}

export function missingRecipientErrors(rows) {
  return rows
    .filter((row) => !row.correo)
    .map((row) => `Línea ${row.rowNumber}: falta correo para enviar o preparar correos.`);
}

export function missingUvusErrors(rows) {
  return rows
    .filter((row) => !row.uvus)
    .map((row) => `Línea ${row.rowNumber}: falta uvus para enviar por Telegram.`);
}

export function parseRequestDate(value) {
  const text = String(value || '').trim();
  if (!text) return new Date();

  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) {
    throw new DelegadosValidationError(['La fecha de solicitud no es válida.']);
  }

  const [, year, month, day] = match.map(Number);
  const date = new Date(year, month - 1, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new DelegadosValidationError(['La fecha de solicitud no es válida.']);
  }

  return date;
}

export function formatISODate(value) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildZip(entries) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    const archive = new ZipArchive({
      zlib: { level: 9 },
    });

    archive.on('data', (chunk) => chunks.push(chunk));
    archive.on('warning', reject);
    archive.on('error', reject);
    archive.on('end', () => resolve(Buffer.concat(chunks)));

    entries.forEach((entry) => {
      archive.append(entry.content, { name: entry.name });
    });
    archive.finalize();
  });
}

function uniqueFilenames(filenames) {
  const used = new Map();
  return filenames.map((filename) => {
    const count = used.get(filename) || 0;
    used.set(filename, count + 1);
    if (count === 0) return filename;

    const dotIndex = filename.lastIndexOf('.');
    if (dotIndex === -1) return `${filename}_${count + 1}`;
    return `${filename.slice(0, dotIndex)}_${count + 1}${filename.slice(dotIndex)}`;
  });
}

function emlFilename(pdfFilename) {
  return `${pdfFilename.replace(/\.pdf$/i, '')}.eml`;
}
