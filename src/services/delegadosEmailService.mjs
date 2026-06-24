import crypto from 'crypto';

import nodemailer from 'nodemailer';

import { isEmail } from './delegadosCsvService.mjs';

export const DEFAULT_SMTP_HOST = process.env.SMTP_HOST || 'smtp.office365.com';
export const DEFAULT_SMTP_PORT = Number(process.env.SMTP_PORT || 587);
export const DEFAULT_SENDER = process.env.SMTP_USER || 'delegacion_etsii@us.es';
const MAX_ATTACHMENT_BYTES = 12 * 1024 * 1024;

export class EmailDeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'EmailDeliveryError';
  }
}

export function delegateTypeLabel(delegateType) {
  return delegateType === 'Centro' ? 'delegado de centro' : 'delegado de grupo';
}

export function buildEmailBody(delegateType) {
  return (
    'Buenas,\n\n' +
    'Desde la Delegación de Estudiantes de la Escuela Técnica Superior de Ingeniería Informática ' +
    `te hacemos llegar tu certificado de ${delegateTypeLabel(delegateType)}.\n\n` +
    'Muchas gracias por tu trabajo durante este curso.\n\n' +
    'Un cordial saludo.'
  );
}

export function buildEmailConfig({ sender, password, host, port }, { requirePassword = true } = {}) {
  const cleanSender = String(sender || DEFAULT_SENDER).trim();
  const cleanPassword = String(password || '');
  const cleanHost = String(host || DEFAULT_SMTP_HOST).trim();
  const cleanPort = Number(port || DEFAULT_SMTP_PORT);
  const errors = [];

  if (!isEmail(cleanSender)) {
    errors.push('El remitente de correo no tiene un formato válido.');
  }
  if (requirePassword && !cleanPassword) {
    errors.push('Indica la contraseña SMTP del remitente.');
  }
  if (!cleanHost) {
    errors.push('Indica el servidor SMTP.');
  }
  if (!Number.isInteger(cleanPort) || cleanPort <= 0 || cleanPort > 65535) {
    errors.push('El puerto SMTP no es válido.');
  }

  return {
    config: errors.length === 0
      ? {
          sender: cleanSender,
          password: cleanPassword,
          host: cleanHost,
          port: cleanPort,
        }
      : null,
    errors,
  };
}

export function buildCertificateEml(sender, recipient, delegateType, filename, pdfBytes) {
  validateAttachment(pdfBytes);
  const boundary = `----=_DLGA_${crypto.randomBytes(16).toString('hex')}`;
  const messageId = `<${crypto.randomBytes(16).toString('hex')}@${emailDomain(sender)}>`;
  const subject = `Certificado de ${delegateTypeLabel(delegateType)}`;
  const body = buildEmailBody(delegateType);

  const lines = [
    `From: ${formatAddress('Delegación de Estudiantes ETSII', sender)}`,
    `To: ${recipient}`,
    `Subject: ${encodeHeader(subject)}`,
    `Date: ${new Date().toUTCString()}`,
    `Message-ID: ${messageId}`,
    'MIME-Version: 1.0',
    'X-Unsent: 1',
    `Content-Type: multipart/mixed; boundary="${boundary}"`,
    '',
    `--${boundary}`,
    'Content-Type: text/plain; charset=utf-8',
    'Content-Transfer-Encoding: base64',
    '',
    chunkBase64(Buffer.from(body, 'utf8')),
    '',
    `--${boundary}`,
    `Content-Type: application/pdf; name="${filename}"`,
    'Content-Transfer-Encoding: base64',
    `Content-Disposition: attachment; filename="${filename}"`,
    '',
    chunkBase64(pdfBytes),
    '',
    `--${boundary}--`,
    '',
  ];

  return Buffer.from(lines.join('\r\n'), 'utf8');
}

export async function sendCertificateEmail(config, recipient, delegateType, filename, pdfBytes) {
  const failures = await sendCertificateEmails(config, [
    {
      recipient,
      delegateType,
      filename,
      pdfBytes,
    },
  ]);
  if (failures.length > 0) {
    throw new EmailDeliveryError(failures[0].error);
  }
}

export async function sendCertificateEmails(config, emails) {
  emails.forEach((email) => validateAttachment(email.pdfBytes));

  const transporter = nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    requireTLS: config.port !== 465,
    auth: {
      user: config.sender,
      pass: config.password,
    },
    tls: {
      rejectUnauthorized: true,
    },
  });

  const failures = [];
  for (const email of emails) {
    try {
      await transporter.sendMail({
        from: {
          name: 'Delegación de Estudiantes ETSII',
          address: config.sender,
        },
        to: email.recipient,
        subject: `Certificado de ${delegateTypeLabel(email.delegateType)}`,
        text: buildEmailBody(email.delegateType),
        attachments: [
          {
            filename: email.filename,
            content: email.pdfBytes,
            contentType: 'application/pdf',
          },
        ],
      });
    } catch (error) {
      failures.push({
        email,
        error: friendlySmtpError(error),
      });
    }
  }

  await transporter.close();
  return failures;
}

export function validateAttachment(pdfBytes) {
  if (!Buffer.isBuffer(pdfBytes) || pdfBytes.length === 0) {
    throw new EmailDeliveryError('El PDF adjunto está vacío.');
  }
  if (pdfBytes.length > MAX_ATTACHMENT_BYTES) {
    throw new EmailDeliveryError('El PDF supera el tamaño máximo permitido para adjuntarlo.');
  }
}

function friendlySmtpError(error) {
  const text = String(error?.message || error || '').trim();
  const response = String(error?.response || '').trim();
  const details = response || text;
  const lower = details.toLocaleLowerCase('es');

  if (error?.code === 'EAUTH' || lower.includes('authentication') || lower.includes('autentic')) {
    if (lower.includes('5.7.139') || lower.includes('basic authentication is disabled')) {
      return (
        'Microsoft 365 tiene deshabilitada la autenticación básica para SMTP en este buzón. ' +
        'Usa Microsoft Graph/OAuth o solicita que se habilite SMTP AUTH para la cuenta.'
      );
    }
    return `Microsoft 365 ha rechazado la autenticación SMTP del remitente.${details ? ` Detalle: ${details}` : ''}`;
  }

  if (error?.code === 'EENVELOPE') {
    return 'Microsoft 365 ha rechazado el remitente o el destinatario.';
  }

  return details ? `No se pudo enviar el correo: ${details}` : 'No se pudo enviar el correo.';
}

function formatAddress(name, address) {
  return `${encodeHeader(name)} <${address}>`;
}

function encodeHeader(value) {
  const text = String(value || '');
  if (/^[\x20-\x7E]*$/.test(text)) return text;
  return `=?UTF-8?B?${Buffer.from(text, 'utf8').toString('base64')}?=`;
}

function chunkBase64(buffer) {
  return buffer.toString('base64').replace(/.{1,76}/g, '$&\r\n').trimEnd();
}

function emailDomain(sender) {
  const parts = String(sender || '').split('@');
  return parts.length === 2 && parts[1] ? parts[1] : 'localhost';
}
