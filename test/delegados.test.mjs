import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';

import {
  CSVValidationError,
  parseCsvUpload,
  sampleCsv,
} from '../src/services/delegadosCsvService.mjs';
import delegadosController from '../src/controllers/delegadosController.mjs';
import delegadosRouter from '../src/routes/delegadosRoutes.mjs';
import { buildCertificateZip, buildPdfDocuments, readSubmission } from '../src/services/delegadosService.mjs';
import { saveCertificateDocuments } from '../src/services/delegadosStorageService.mjs';

test('delegados expone POST /firmar-lote mediante el controlador de firma por lotes', () => {
  const route = delegadosRouter.stack.find((layer) => layer.route?.path === '/firmar-lote')?.route;

  assert.ok(route);
  assert.equal(route.methods.post, true);
  assert.equal(route.stack.at(-1).handle, delegadosController.payloadFirmaLote);
});

test('parseCsvUpload accepts DLGA sample CSV and normalizes rows', () => {
  const rows = parseCsvUpload(sampleCsv(), new Date(2026, 4, 29));

  assert.equal(rows.length, 3);
  assert.equal(rows[0].uvus, 'pabmedmej');
  assert.equal(rows[0].tipo_delegado, 'Centro');
  assert.equal(rows[0].curso_corto, '25-26');
  assert.equal(rows[1].tipo_delegado, 'Grupo');
  assert.equal(rows[1].grado, 'Ingeniería Informática - Ingeniería del Software');
  assert.equal(rows[2].tipo_delegado, 'Curso');
  assert.equal(rows[2].curso_delegado, '2º');
});

test('parseCsvUpload reports missing required headers', () => {
  assert.throws(
    () => parseCsvUpload(Buffer.from('Nombre;DNI\nAda;1234', 'utf8')),
    (error) => error instanceof CSVValidationError && error.errors[0].includes('tipoDeDelegado'),
  );
});

test('buildPdfDocuments generates PDFs and ZIP archive', async () => {
  const submission = readSubmission({
    firmante: 'Delegado de Centro',
    fechaSolicitud: '2026-05-29',
    csvBuffer: sampleCsv(),
  });

  const documents = await buildPdfDocuments(submission.rows, submission.signer, submission.requestDate);
  assert.equal(documents.length, 3);
  assert.ok(documents[0].pdf.subarray(0, 4).equals(Buffer.from('%PDF')));

  const archive = await buildCertificateZip(documents);
  assert.ok(archive.subarray(0, 2).equals(Buffer.from('PK')));
});

test('saveCertificateDocuments stores PDFs by delegate type folder', async () => {
  const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'delegados-'));
  const submission = readSubmission({
    firmante: 'Delegado de Centro',
    fechaSolicitud: '2026-05-29',
    csvBuffer: sampleCsv(),
  });
  const documents = await buildPdfDocuments(submission.rows, submission.signer, submission.requestDate);

  const saved = await saveCertificateDocuments(documents, tempDir);

  assert.equal(saved.length, 3);
  assert.deepEqual(new Set(saved.map((item) => item.folder)), new Set(['centro', 'grupo', 'curso']));

  for (const item of saved) {
    const content = await fs.readFile(item.path);
    assert.ok(content.subarray(0, 4).equals(Buffer.from('%PDF')));
  }
});
