import crypto from 'node:crypto';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
export const CSRF_HEADER_NAME = 'x-csrf-token';
export const CSRF_ERROR_CODE = 'EBADCSRFTOKEN';

export const issueCsrfToken = (req, res) => {
  if (!req.session.csrfToken) {
    req.session.csrfToken = crypto.randomBytes(32).toString('base64url');
  }

  res.setHeader('Cache-Control', 'no-store');
  return res.json({
    err: false,
    csrfToken: req.session.csrfToken,
  });
};

export const createCsrfProtection = ({ ignoredPaths = [], allowedOrigins = [] } = {}) => {
  const ignored = new Set(ignoredPaths);
  const trustedOrigins = new Set(allowedOrigins);

  return (req, res, next) => {
    if (SAFE_METHODS.has(req.method) || ignored.has(req.path)) {
      return next();
    }

    if (
      req.get('Sec-Fetch-Site') === 'cross-site'
      && !trustedOrigins.has(req.get('Origin'))
    ) {
      return rejectCsrf(res);
    }

    const sessionToken = req.session?.csrfToken;
    const requestToken = req.get(CSRF_HEADER_NAME);
    if (!tokensMatch(sessionToken, requestToken)) {
      return rejectCsrf(res);
    }

    return next();
  };
};

const tokensMatch = (expected, received) => {
  if (typeof expected !== 'string' || typeof received !== 'string') {
    return false;
  }

  const expectedBuffer = Buffer.from(expected);
  const receivedBuffer = Buffer.from(received);
  return expectedBuffer.length === receivedBuffer.length
    && crypto.timingSafeEqual(expectedBuffer, receivedBuffer);
};

const rejectCsrf = (res) => {
  res.setHeader('X-CSRF-Error', '1');
  return res.status(403).json({
    err: true,
    code: CSRF_ERROR_CODE,
    message: 'Token CSRF ausente o no válido.',
  });
};
