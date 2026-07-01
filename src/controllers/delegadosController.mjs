import crypto from 'crypto';

import {
  isValidExchangeData,
  isValidExchangeId,
  popExchange,
  putExchange,
} from '../services/delegadosAfirmaService.mjs';
import { isEmail, sampleCsv } from '../services/delegadosCsvService.mjs';
import {
  buildEmailConfig,
  DEFAULT_SENDER,
  EmailDeliveryError,
  sendCertificateEmail,
  sendCertificateEmails,
} from '../services/delegadosEmailService.mjs';
import {
  buildAuthorizationUrl,
  buildPkceChallenge,
  buildPkceVerifier,
  exchangeAuthorizationCode,
  fetchGraphProfile,
  graphOauthConfig,
  GraphAuthError,
  GraphDeliveryError,
  sendGraphCertificateEmail,
  sendGraphCertificateEmails,
} from '../services/delegadosGraphService.mjs';
import {
  buildCertificateZip,
  buildEmlDocuments,
  buildEmlZip,
  buildPdfDocuments,
  buildSigningPayload,
  DelegadosValidationError,
  formatISODate,
  missingRecipientErrors,
  missingUvusErrors,
  readSubmission,
} from '../services/delegadosService.mjs';
import { delegadosStorageBaseDir, saveCertificateDocuments } from '../services/delegadosStorageService.mjs';
import autorizacionService from '../services/autorizacionService.mjs';
import { sendDocument } from '../services/telegramService.mjs';

const OAUTH_STATE_TTL_MS = 10 * 60 * 1000;
const MAX_SIGNED_PDF_BYTES = Number(process.env.DELEGADOS_SIGNED_PDF_MAX_BYTES || 10 * 1024 * 1024);

const descargarPlantillaCSV = async (req, res) => {
  sendDownload(res, sampleCsv(), 'text/csv; charset=utf-8', 'plantilla_certificados.csv');
};

const generarCertificados = async (req, res) => {
  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const documents = await buildPdfDocuments(rows, signer, requestDate);

    if (documents.length === 1) {
      return sendDownload(res, documents[0].pdf, 'application/pdf', documents[0].filename);
    }

    const archive = await buildCertificateZip(documents);
    return sendDownload(
      res,
      archive,
      'application/zip',
      `certificados_delegados_${formatISODate(requestDate)}.zip`,
    );
  } catch (error) {
    return handleControllerError(error, res, 'Error generando certificados de delegados');
  }
};

const prepararCorreos = async (req, res) => {
  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const errors = missingRecipientErrors(rows);
    if (errors.length > 0) return validationError(res, errors);

    const sender = field(req, ['remitente_email', 'remitenteEmail', 'sender']) || DEFAULT_SENDER;
    if (!isEmail(sender)) {
      return validationError(res, ['El remitente de correo no tiene un formato válido.']);
    }

    const documents = await buildPdfDocuments(rows, signer, requestDate);
    const emlDocuments = buildEmlDocuments(documents, sender);

    if (emlDocuments.length === 1) {
      return sendDownload(res, emlDocuments[0].eml, 'message/rfc822', emlDocuments[0].filename);
    }

    const archive = await buildEmlZip(emlDocuments, documents);
    return sendDownload(res, archive, 'application/zip', `correos_certificados_${formatISODate(requestDate)}.zip`);
  } catch (error) {
    return handleControllerError(error, res, 'Error preparando correos de certificados');
  }
};

const guardarCertificados = async (req, res) => {
  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const documents = await buildPdfDocuments(rows, signer, requestDate);
    const savedDocuments = await saveCertificateDocuments(documents);

    return res.json({
      err: false,
      result: {
        guardados: savedDocuments.length,
        fechaSolicitud: formatISODate(requestDate),
        baseDir: delegadosStorageBaseDir(),
        documentos: savedDocuments,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error guardando certificados de delegados');
  }
};

const enviarCertificados = async (req, res) => {
  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const recipientErrors = missingRecipientErrors(rows);
    if (recipientErrors.length > 0) return validationError(res, recipientErrors);

    const { config, errors } = emailConfigFromRequest(req, true);
    if (errors.length > 0) return validationError(res, errors);

    const documents = await buildPdfDocuments(rows, signer, requestDate);
    const failures = await sendCertificateEmails(
      config,
      documents.map((document) => ({
        recipient: document.row.correo,
        delegateType: document.row.tipo_delegado,
        filename: document.filename,
        pdfBytes: document.pdf,
      })),
    );

    if (failures.length > 0) {
      return res.status(502).json({
        err: true,
        message: 'No se pudieron enviar todos los certificados.',
        errores: failures.map((failure) => ({
          destinatario: failure.email.recipient,
          error: failure.error,
        })),
      });
    }

    return res.json({
      err: false,
      result: {
        enviados: documents.length,
        fechaSolicitud: formatISODate(requestDate),
      },
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error enviando certificados');
  }
};

const enviarCertificadosTelegram = async (req, res) => {
  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const uvusErrors = missingUvusErrors(rows);
    if (uvusErrors.length > 0) return validationError(res, uvusErrors);

    const documents = await buildPdfDocuments(rows, signer, requestDate);
    const savedDocuments = await saveCertificateDocuments(documents);
    const telegramResults = await sendDocumentsByTelegram(documents, savedDocuments);
    const enviados = telegramResults.filter((item) => item.enviado);
    const noEnviados = telegramResults.filter((item) => !item.enviado);

    return res.status(noEnviados.length > 0 ? 207 : 200).json({
      err: false,
      result: {
        enviados: enviados.length,
        noEnviados: noEnviados.length,
        guardados: savedDocuments.length,
        fechaSolicitud: formatISODate(requestDate),
        baseDir: delegadosStorageBaseDir(),
        documentos: telegramResults,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error enviando certificados por Telegram');
  }
};

const payloadFirmaLote = async (req, res) => {
  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const emailEnabled = isChecked(field(req, ['enviar_email', 'enviarEmail']));
    const emailTransport = String(field(req, ['email_transport', 'emailTransport']) || 'smtp').trim() || 'smtp';
    const emailSender = field(req, ['remitente_email', 'remitenteEmail', 'sender']) || DEFAULT_SENDER;

    if (emailEnabled) {
      const errors = missingRecipientErrors(rows);
      if (errors.length > 0) return validationError(res, errors);
    }

    const documents = await buildPdfDocuments(rows, signer, requestDate);
    return res.json({
      err: false,
      result: buildSigningPayload(documents, requestDate, emailEnabled, emailTransport, emailSender),
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error generando payload de firma');
  }
};

const enviarCertificadoFirmado = async (req, res) => {
  try {
    const { config, errors } = buildEmailConfig(
      {
        sender: bodyField(req, ['sender', 'remitente_email', 'remitenteEmail']),
        password: bodyField(req, ['password', 'password_email', 'passwordEmail']),
        host: bodyField(req, ['smtpHost', 'smtp_host']),
        port: bodyField(req, ['smtpPort', 'smtp_port']),
      },
      { requirePassword: true },
    );

    const payload = signedCertificatePayload(req);
    errors.push(...payload.errors);
    if (errors.length > 0) return validationError(res, errors);

    await sendCertificateEmail(config, payload.recipient, payload.delegateType, payload.filename, payload.pdfBytes);
    return res.json({ err: false, result: { enviado: true } });
  } catch (error) {
    return handleControllerError(error, res, 'Error enviando certificado firmado');
  }
};

const enviarCertificadoFirmadoTelegram = async (req, res) => {
  try {
    const payload = signedTelegramCertificatePayload(req);
    if (payload.errors.length > 0) return validationError(res, payload.errors);

    const chatId = await autorizacionService.obtenerChatIdUsuario(payload.uvus);
    if (!chatId || typeof chatId === 'object') {
      return res.status(404).json({
        err: true,
        message: `No se ha encontrado un chat de Telegram para ${payload.uvus}.`,
      });
    }

    const [savedDocument] = await saveCertificateDocuments([
      {
        row: {
          rowNumber: 1,
          uvus: payload.uvus,
          tipo_delegado: payload.delegateType,
        },
        filename: payload.filename,
        pdf: payload.pdfBytes,
      },
    ]);
    const telegramResult = await sendDocument(
      chatId,
      payload.pdfBytes,
      payload.filename,
      telegramCertificateCaption({
        nombre: payload.name || payload.uvus,
        tipo_delegado: payload.delegateType,
      }),
    );

    if (!telegramResult.ok) {
      return res.status(502).json({
        err: true,
        message: `Telegram no pudo enviar el certificado a ${payload.uvus}.`,
      });
    }

    return res.json({
      err: false,
      result: {
        enviado: true,
        uvus: payload.uvus,
        guardado: savedDocument,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error enviando certificado firmado por Telegram');
  }
};

const estadoMicrosoft = async (req, res) => {
  const config = graphOauthConfig();
  const session = graphSession(req);
  return res.json({
    err: false,
    result: {
      configured: config.configured,
      authenticated: Boolean(session),
      profile: session
        ? {
            name: session.name,
            mail: session.mail,
            expiresAt: session.expiresAt,
          }
        : null,
      redirectUri: config.redirectUri,
    },
  });
};

const loginMicrosoft = async (req, res) => {
  const config = graphOauthConfig();
  if (!config.configured) {
    return validationError(res, ['Configura MICROSOFT_CLIENT_ID antes de iniciar sesión con Microsoft Graph.']);
  }

  const state = crypto.randomBytes(32).toString('base64url');
  const codeVerifier = config.clientSecret ? '' : buildPkceVerifier();
  req.session.dlgaOAuth = {
    state,
    codeVerifier,
    expiresAt: Date.now() + OAUTH_STATE_TTL_MS,
  };

  return res.redirect(303, buildAuthorizationUrl(config, state, codeVerifier ? buildPkceChallenge(codeVerifier) : ''));
};

const callbackMicrosoft = async (req, res) => {
  const error = String(req.query.error || '');
  if (error) {
    return validationError(res, [`Microsoft no ha completado el login: ${req.query.error_description || error}`]);
  }

  const oauth = req.session.dlgaOAuth;
  const state = String(req.query.state || '');
  const code = String(req.query.code || '');
  delete req.session.dlgaOAuth;

  if (!oauth || oauth.expiresAt < Date.now() || oauth.state !== state || !code) {
    return validationError(res, ['La respuesta de Microsoft no coincide con una sesión OAuth activa.']);
  }

  try {
    const config = graphOauthConfig();
    const tokenData = await exchangeAuthorizationCode(config, code, oauth.codeVerifier || '');
    const accessToken = String(tokenData.access_token || '').trim();
    const expiresIn = Number(tokenData.expires_in || 3600);
    if (!accessToken) {
      throw new GraphAuthError('Microsoft no ha devuelto access_token.');
    }

    const profile = await fetchGraphProfile(accessToken);
    req.session.dlgaGraph = {
      accessToken,
      expiresAt: new Date(Date.now() + Math.max(60, expiresIn - 60) * 1000).toISOString(),
      name: String(profile.displayName || ''),
      mail: String(profile.mail || profile.userPrincipalName || ''),
    };

    return res.json({
      err: false,
      result: {
        authenticated: true,
        name: req.session.dlgaGraph.name,
        mail: req.session.dlgaGraph.mail,
      },
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error completando login con Microsoft');
  }
};

const logoutMicrosoft = async (req, res) => {
  delete req.session.dlgaGraph;
  return res.json({ err: false, result: { authenticated: false } });
};

const enviarCertificadosGraph = async (req, res) => {
  const session = graphSession(req);
  if (!session) {
    return res.status(401).json({
      err: true,
      message: 'Inicia sesión con Microsoft Graph antes de enviar certificados.',
    });
  }

  try {
    const { signer, requestDate, rows } = readSubmissionFromRequest(req);
    const recipientErrors = missingRecipientErrors(rows);
    if (recipientErrors.length > 0) return validationError(res, recipientErrors);

    const sender = field(req, ['remitente_email', 'remitenteEmail', 'sender']) || DEFAULT_SENDER;
    if (!isEmail(sender)) {
      return validationError(res, ['El remitente de correo no tiene un formato válido.']);
    }

    const documents = await buildPdfDocuments(rows, signer, requestDate);
    const failures = await sendGraphCertificateEmails(
      session.accessToken,
      sender,
      documents.map((document) => ({
        recipient: document.row.correo,
        delegateType: document.row.tipo_delegado,
        filename: document.filename,
        pdfBytes: document.pdf,
      })),
    );

    if (failures.length > 0) {
      return res.status(502).json({
        err: true,
        message: 'Microsoft Graph no pudo enviar todos los certificados.',
        errores: failures.map((failure) => ({
          destinatario: failure.email.recipient,
          error: failure.error,
        })),
      });
    }

    return res.json({
      err: false,
      result: {
        enviados: documents.length,
        fechaSolicitud: formatISODate(requestDate),
      },
    });
  } catch (error) {
    return handleControllerError(error, res, 'Error enviando certificados con Microsoft Graph');
  }
};

const enviarCertificadoFirmadoGraph = async (req, res) => {
  const session = graphSession(req);
  if (!session) {
    return res.status(401).json({
      err: true,
      message: 'Inicia sesión con Microsoft Graph antes de enviar certificados.',
    });
  }

  try {
    const sender = bodyField(req, ['sender', 'remitente_email', 'remitenteEmail']) || DEFAULT_SENDER;
    const payload = signedCertificatePayload(req);
    const errors = [...payload.errors];
    if (!isEmail(sender)) errors.push('El remitente de correo no tiene un formato válido.');
    if (errors.length > 0) return validationError(res, errors);

    await sendGraphCertificateEmail(
      session.accessToken,
      sender,
      payload.recipient,
      payload.delegateType,
      payload.filename,
      payload.pdfBytes,
    );
    return res.json({ err: false, result: { enviado: true } });
  } catch (error) {
    return handleControllerError(error, res, 'Error enviando certificado firmado con Microsoft Graph');
  }
};

const afirmaStorage = async (req, res) => {
  const values = requestValues(req);
  if (String(values.op || '').toLocaleLowerCase('es') !== 'put') {
    return res.status(400).type('text/plain').send('ERR-01:=Operacion no soportada');
  }

  const exchangeId = String(values.id || '');
  const data = String(values.dat || '');
  if (!isValidExchangeId(exchangeId)) {
    return res.status(400).type('text/plain').send('ERR-02:=Identificador no valido');
  }
  if (!isValidExchangeData(data)) {
    return res.status(400).type('text/plain').send('ERR-03:=Datos no validos');
  }

  putExchange(exchangeId, data);
  return res.type('text/plain').send('OK');
};

const afirmaRetrieve = async (req, res) => {
  const values = requestValues(req);
  if (String(values.op || '').toLocaleLowerCase('es') !== 'get') {
    return res.status(400).type('text/plain').send('ERR-01:=Operacion no soportada');
  }

  const exchangeId = String(values.id || '');
  if (!isValidExchangeId(exchangeId)) {
    return res.status(400).type('text/plain').send('ERR-02:=Identificador no valido');
  }

  const data = popExchange(exchangeId);
  if (data === null) {
    return res.type('text/plain').send('ERR-06');
  }
  return res.type('text/plain').send(data);
};

function readSubmissionFromRequest(req) {
  const file = uploadedFile(req);
  if (!file) {
    throw new DelegadosValidationError(['Falta el archivo CSV.']);
  }

  return readSubmission({
    firmante: field(req, ['firmante', 'nombreCompleto', 'nombre_completo']),
    fechaSolicitud: field(req, ['fecha_solicitud', 'fechaSolicitud', 'fecha']),
    csvBuffer: file.buffer,
  });
}

function uploadedFile(req) {
  const files = Array.isArray(req.files) ? req.files : req.file ? [req.file] : [];
  return files.find((file) => ['csv', 'archivo', 'file'].includes(file.fieldname)) || files[0] || null;
}

function emailConfigFromRequest(req, requirePassword) {
  return buildEmailConfig(
    {
      sender: field(req, ['remitente_email', 'remitenteEmail', 'sender']),
      password: field(req, ['password_email', 'passwordEmail', 'password']),
      host: field(req, ['smtp_host', 'smtpHost']),
      port: field(req, ['smtp_port', 'smtpPort']),
    },
    { requirePassword },
  );
}

function signedCertificatePayload(req) {
  const errors = [];
  const recipient = bodyField(req, ['recipient', 'destinatario', 'correo']);
  const delegateType = bodyField(req, ['delegateType', 'tipoDelegado', 'tipo_delegado']);
  const filename = safePdfFilename(bodyField(req, ['filename', 'nombreArchivo']) || 'certificado_firmado.pdf');
  const pdfBase64 = String(bodyField(req, ['pdfBase64', 'pdf_base64']) || '').trim();

  if (!isEmail(recipient)) errors.push('El destinatario no tiene un correo válido.');
  if (!['Centro', 'Grupo'].includes(delegateType)) errors.push('El tipo de delegado no es válido.');

  let pdfBytes = Buffer.alloc(0);
  try {
    pdfBytes = Buffer.from(pdfBase64, 'base64');
  } catch {
    errors.push('El PDF firmado no se ha recibido correctamente.');
  }

  if (pdfBytes.length === 0 || !pdfBytes.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    errors.push('El adjunto recibido no parece un PDF.');
  }

  return {
    recipient,
    delegateType,
    filename,
    pdfBytes,
    errors,
  };
}

function signedTelegramCertificatePayload(req) {
  const errors = [];
  const uvus = bodyField(req, ['uvus', 'nombreUsuario', 'nombre_usuario']);
  const name = bodyField(req, ['name', 'nombre']);
  const delegateType = bodyField(req, ['delegateType', 'tipoDelegado', 'tipo_delegado']);
  const filename = safePdfFilename(bodyField(req, ['filename', 'nombreArchivo']) || 'certificado_firmado.pdf');
  const pdfBase64 = String(bodyField(req, ['pdfBase64', 'pdf_base64']) || '').trim();

  if (!uvus) errors.push('Falta el UVUS del destinatario.');
  if (!['Centro', 'Curso', 'Grupo'].includes(delegateType)) {
    errors.push('El tipo de delegado no es válido.');
  }

  const pdfBytes = Buffer.from(pdfBase64, 'base64');
  if (pdfBytes.length === 0 || !pdfBytes.subarray(0, 4).equals(Buffer.from('%PDF'))) {
    errors.push('El adjunto recibido no parece un PDF.');
  } else if (pdfBytes.length > MAX_SIGNED_PDF_BYTES) {
    errors.push('El PDF firmado supera el tamaño máximo permitido.');
  }

  return {
    uvus,
    name,
    delegateType,
    filename,
    pdfBytes,
    errors,
  };
}

async function sendDocumentsByTelegram(documents, savedDocuments) {
  const savedByRow = new Map(savedDocuments.map((document) => [document.rowNumber, document]));
  const results = [];

  for (const document of documents) {
    const row = document.row;
    const savedDocument = savedByRow.get(row.rowNumber);
    const chatId = await autorizacionService.obtenerChatIdUsuario(row.uvus);

    if (!chatId || typeof chatId === 'object') {
      results.push({
        rowNumber: row.rowNumber,
        uvus: row.uvus,
        nombre: row.nombre,
        tipoDelegado: row.tipo_delegado,
        enviado: false,
        motivo: 'No se ha encontrado chatid de Telegram para el uvus indicado',
        guardado: savedDocument,
      });
      continue;
    }

    const result = await sendDocument(
      chatId,
      document.pdf,
      document.filename,
      telegramCertificateCaption(row),
    );

    results.push({
      rowNumber: row.rowNumber,
      uvus: row.uvus,
      nombre: row.nombre,
      tipoDelegado: row.tipo_delegado,
      enviado: result.ok,
      motivo: result.ok ? null : result.error,
      guardado: savedDocument,
    });
  }

  return results;
}

function telegramCertificateCaption(row) {
  const tipo = row.tipo_delegado.toLocaleLowerCase('es');
  return `Certificado de delegado de ${tipo} - ${row.nombre}`;
}

function graphSession(req) {
  const session = req.session.dlgaGraph;
  if (!session) return null;
  if (new Date(session.expiresAt).getTime() <= Date.now()) {
    delete req.session.dlgaGraph;
    return null;
  }
  return session;
}

function field(req, names) {
  for (const name of names) {
    if (req.body?.[name] !== undefined) return String(req.body[name]).trim();
    if (req.query?.[name] !== undefined) return String(req.query[name]).trim();
  }
  return '';
}

function bodyField(req, names) {
  for (const name of names) {
    if (req.body?.[name] !== undefined) return String(req.body[name]).trim();
  }
  return '';
}

function requestValues(req) {
  return {
    ...(req.query || {}),
    ...(typeof req.body === 'object' && req.body !== null ? req.body : {}),
  };
}

function isChecked(value) {
  const normalized = String(value || '').trim().toLocaleLowerCase('es');
  return ['1', 'true', 'on', 'yes', 'si', 'sí'].includes(normalized);
}

function safePdfFilename(value) {
  const filename = String(value || 'certificado_firmado.pdf')
    .replace(/[\\/]/g, '_')
    .replace(/[^A-Za-z0-9._-]+/g, '_')
    .replace(/^_+|_+$/g, '');
  return filename.toLocaleLowerCase('es').endsWith('.pdf') ? filename : `${filename || 'certificado_firmado'}.pdf`;
}

function sendDownload(res, buffer, mediaType, filename) {
  res.setHeader('Content-Type', mediaType);
  res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
  res.setHeader('Content-Length', buffer.length);
  return res.send(buffer);
}

function validationError(res, errors) {
  return res.status(400).json({
    err: true,
    message: errors[0],
    errores: errors,
  });
}

function handleControllerError(error, res, logMessage) {
  if (error instanceof DelegadosValidationError) {
    return validationError(res, error.errors);
  }
  if (error instanceof EmailDeliveryError || error instanceof GraphAuthError || error instanceof GraphDeliveryError) {
    return res.status(502).json({
      err: true,
      message: error.message,
    });
  }

  console.error(logMessage, error);
  return res.status(500).json({
    err: true,
    message: logMessage,
  });
}

export default {
  descargarPlantillaCSV,
  generarCertificados,
  guardarCertificados,
  prepararCorreos,
  enviarCertificados,
  enviarCertificadosTelegram,
  payloadFirmaLote,
  enviarCertificadoFirmado,
  enviarCertificadoFirmadoTelegram,
  estadoMicrosoft,
  loginMicrosoft,
  callbackMicrosoft,
  logoutMicrosoft,
  enviarCertificadosGraph,
  enviarCertificadoFirmadoGraph,
  afirmaStorage,
  afirmaRetrieve,
};
