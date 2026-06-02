import crypto from 'crypto';

import fetch from 'node-fetch';

import { buildEmailBody, delegateTypeLabel, validateAttachment } from './delegadosEmailService.mjs';

export const DEFAULT_TENANT_ID = 'ef4a684e-81b5-491c-a98e-c7b31be6c469';
export const DEFAULT_SCOPES = ['openid', 'profile', 'email', 'User.Read', 'Mail.Send'];
const GRAPH_API_ROOT = 'https://graph.microsoft.com/v1.0';

export class GraphAuthError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GraphAuthError';
  }
}

export class GraphDeliveryError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GraphDeliveryError';
  }
}

export function graphOauthConfig() {
  const tenantId = (process.env.MICROSOFT_TENANT_ID || DEFAULT_TENANT_ID).trim() || DEFAULT_TENANT_ID;
  const clientId = String(process.env.MICROSOFT_CLIENT_ID || '').trim();
  const clientSecret = String(process.env.MICROSOFT_CLIENT_SECRET || '').trim();
  const redirectUri = String(
    process.env.MICROSOFT_REDIRECT_URI ||
      `${process.env.PUBLIC_BASE_URL || 'https://localhost:3000'}/api/v1/delegados/microsoft/callback`,
  ).trim();
  const scopes = String(process.env.MICROSOFT_SCOPES || DEFAULT_SCOPES.join(' '))
    .split(/\s+/)
    .filter(Boolean);

  return {
    tenantId,
    clientId,
    clientSecret,
    redirectUri,
    scopes,
    configured: Boolean(clientId),
    authorizationEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/authorize`,
    tokenEndpoint: `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`,
  };
}

export function buildAuthorizationUrl(config, state, codeChallenge = '') {
  const params = new URLSearchParams({
    client_id: config.clientId,
    response_type: 'code',
    redirect_uri: config.redirectUri,
    response_mode: 'query',
    scope: config.scopes.join(' '),
    state,
    prompt: 'select_account',
  });

  if (codeChallenge) {
    params.set('code_challenge', codeChallenge);
    params.set('code_challenge_method', 'S256');
  }

  return `${config.authorizationEndpoint}?${params.toString()}`;
}

export async function exchangeAuthorizationCode(config, code, codeVerifier = '') {
  const body = new URLSearchParams({
    client_id: config.clientId,
    grant_type: 'authorization_code',
    code,
    redirect_uri: config.redirectUri,
    scope: config.scopes.join(' '),
  });

  if (config.clientSecret) body.set('client_secret', config.clientSecret);
  if (codeVerifier) body.set('code_verifier', codeVerifier);

  const response = await fetch(config.tokenEndpoint, {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body,
  });

  const data = await readJsonOrText(response);
  if (!response.ok) {
    throw new GraphAuthError(friendlyGraphError(response.status, data));
  }

  return data;
}

export async function fetchGraphProfile(accessToken) {
  const response = await fetch(`${GRAPH_API_ROOT}/me?$select=displayName,mail,userPrincipalName`, {
    headers: {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/json',
    },
  });
  const data = await readJsonOrText(response);
  if (!response.ok) {
    throw new GraphAuthError(friendlyGraphError(response.status, data));
  }
  return data;
}

export async function sendGraphCertificateEmail(accessToken, sender, recipient, delegateType, filename, pdfBytes) {
  const failures = await sendGraphCertificateEmails(accessToken, sender, [
    {
      recipient,
      delegateType,
      filename,
      pdfBytes,
    },
  ]);
  if (failures.length > 0) {
    throw new GraphDeliveryError(failures[0].error);
  }
}

export async function sendGraphCertificateEmails(accessToken, sender, emails) {
  const failures = [];
  const endpoint = sendMailEndpoint(sender);

  for (const email of emails) {
    try {
      validateAttachment(email.pdfBytes);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${accessToken}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(buildSendMailPayload(email)),
      });
      if (!response.ok && response.status !== 202) {
        const data = await readJsonOrText(response);
        throw new GraphDeliveryError(friendlyGraphError(response.status, data));
      }
    } catch (error) {
      failures.push({
        email,
        error: error.message,
      });
    }
  }

  return failures;
}

export function buildPkceVerifier() {
  return crypto.randomBytes(48).toString('base64url');
}

export function buildPkceChallenge(verifier) {
  return crypto.createHash('sha256').update(verifier).digest('base64url');
}

function buildSendMailPayload(email) {
  return {
    message: {
      subject: `Certificado de ${delegateTypeLabel(email.delegateType)}`,
      body: {
        contentType: 'Text',
        content: buildEmailBody(email.delegateType),
      },
      toRecipients: [
        {
          emailAddress: {
            address: email.recipient,
          },
        },
      ],
      attachments: [
        {
          '@odata.type': '#microsoft.graph.fileAttachment',
          name: email.filename,
          contentType: 'application/pdf',
          contentBytes: email.pdfBytes.toString('base64'),
        },
      ],
    },
    saveToSentItems: true,
  };
}

function sendMailEndpoint(sender) {
  const cleanSender = String(sender || '').trim();
  if (!cleanSender) return `${GRAPH_API_ROOT}/me/sendMail`;
  return `${GRAPH_API_ROOT}/users/${encodeURIComponent(cleanSender)}/sendMail`;
}

async function readJsonOrText(response) {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function friendlyGraphError(statusCode, body) {
  const message = graphErrorMessage(body);
  const detail = message ? ` Detalle de Microsoft: ${message}` : '';
  const lower = `${JSON.stringify(body)} ${message}`.toLocaleLowerCase('es');

  if (statusCode === 401 || statusCode === 403) {
    if (lower.includes('mailsend') || lower.includes('mail.send') || lower.includes('privileges') || lower.includes('accessdenied')) {
      return (
        'Microsoft Graph ha rechazado el permiso de envío. Revisa que la app tenga Mail.Send delegado ' +
        `y que el consentimiento esté aprobado para la US.${detail}`
      );
    }
    return `Microsoft Graph ha rechazado la sesión OAuth. Vuelve a iniciar sesión.${detail}`;
  }

  if (statusCode === 400 && (lower.includes('redirect') || lower.includes('client'))) {
    return `Microsoft no ha aceptado la configuración OAuth. Revisa client_id, redirect_uri y client_secret/PKCE.${detail}`;
  }

  return `Microsoft Graph ha respondido con estado ${statusCode}.${detail}`;
}

function graphErrorMessage(body) {
  if (typeof body === 'string') return body;
  return String(body?.error?.message || body?.error_description || body?.message || '').trim();
}
