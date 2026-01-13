import test from 'node:test';
import assert from 'node:assert/strict';
import path from 'node:path';

// Ensure environment for paths used by the module
process.env.PDF_FOLDER = process.env.PDF_FOLDER || path.join(process.cwd(), 'tmp');
process.env.EMAIL_USERNAME = process.env.EMAIL_USERNAME || 'test@example.com';
process.env.EMAIL_PASSWORD = process.env.EMAIL_PASSWORD || 'secret';

// Import after setting env so module picks them up
import email from '../src/utils/email.mjs';

const originalSendMail = email.transporter.sendMail.bind(email.transporter);

function stubSendMail(impl) {
  email.transporter.sendMail = impl;
}

function restoreSendMail() {
  email.transporter.sendMail = originalSendMail;
}

// 1) Should send mail with correct fields
await test('Email.sendEmail sends with to, subject, html, attachments', async () => {
  let captured;
  stubSendMail(async (opts) => { captured = opts; return { response: 'OK' }; });

  const to = 'dest@example.com';
  const subject = 'Asunto';
  const html = '<b>Hola</b>';
  const attachments = [{ filename: 'a.pdf', path: '/tmp/a.pdf' }];

  await email.sendEmail(to, subject, html, attachments);

  assert.equal(typeof captured.from, 'string');
  assert.ok(captured.from.includes('@'));
  assert.equal(captured.to, to);
  assert.equal(captured.subject, subject);
  assert.equal(captured.html, html);
  assert.deepEqual(captured.attachments, attachments);

  restoreSendMail();
});

// 2) Should handle transporter errors without throwing
await test('Email.sendEmail handles transporter error and does not throw', async () => {
  stubSendMail(async () => { throw new Error('smtp down'); });

  await assert.doesNotReject(async () => {
    await email.sendEmail('x@y.z', 's', '<p>h</p>');
  });

  restoreSendMail();
});

// 3) Should build recipients from array of estudiantes
await test('Email.sendEmailToStudentsDocumentoPermuta builds recipient list from array', async () => {
  const estudiantes = [{ correo: 'a@ex.com' }, { correo: 'b@ex.com' }, { correo: 'c@ex.com' }];
  let captured;
  stubSendMail(async (opts) => { captured = opts; return { response: 'OK' }; });

  await email.sendEmailToStudentsDocumentoPermuta(estudiantes, 'Sub', 'plantillaEmailDocumentoPermuta.ejs');

  assert.equal(captured.to, 'a@ex.com,b@ex.com,c@ex.com');
  assert.equal(captured.subject, 'Sub');
  assert.match(captured.html, /<!DOCTYPE|<html|<body|\w/);
  assert.equal(Array.isArray(captured.attachments), true);
  assert.equal(captured.attachments.length, 0);

  restoreSendMail();
});

// 4) Should handle single estudiante object
await test('Email.sendEmailToStudentsDocumentoPermuta handles single estudiante object', async () => {
  const estudiante = { correo: 'solo@ex.com' };
  let captured;
  stubSendMail(async (opts) => { captured = opts; return { response: 'OK' }; });

  await email.sendEmailToStudentsDocumentoPermuta(estudiante, 'S', 'plantillaEmailDocumentoPermuta.ejs');

  assert.equal(captured.to, 'solo@ex.com');

  restoreSendMail();
});

// 5) Should include PDF attachment when pdfUUID is provided
await test('Email.sendEmailToStudentsDocumentoPermuta includes PDF attachment when pdfUUID provided', async () => {
  const estudiante = { correo: 'withpdf@ex.com' };
  let captured;
  stubSendMail(async (opts) => { captured = opts; return { response: 'OK' }; });

  const uuid = 'file-123.pdf';
  await email.sendEmailToStudentsDocumentoPermuta(estudiante, 'S', 'plantillaEmailDocumentoPermuta.ejs', uuid);

  assert.equal(captured.attachments.length, 1);
  assert.equal(captured.attachments[0].filename, 'SolicitudPermuta.pdf');
  assert.equal(captured.attachments[0].contentType, 'application/pdf');
  assert.equal(captured.attachments[0].path, path.join(process.env.PDF_FOLDER, uuid));

  restoreSendMail();
});
