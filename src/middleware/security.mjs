import crypto from 'node:crypto';
import autorizacionService from '../services/autorizacionService.mjs';
import { isSupportedRole } from '../utils/roles.mjs';

export const requireSession = (req, res, next) => {
  if (!req.session?.user?.nombre_usuario) {
    return res.status(401).json({ err: true, message: 'No hay usuario en la sesión.' });
  }
  return next();
};

// Reconsultar el rol impide conservar privilegios tras una baja o degradación.
export const refreshSessionUser = async (req, res, next) => {
  if (!req.session?.user) return next();
  try {
    const user = await autorizacionService.verificarSiExisteUsuario(req.session.user.nombre_usuario);
    if (!user || !isSupportedRole(user.rol)) {
      return req.session.destroy(() => res.status(401).json({ err: true, message: 'Sesión no válida.' }));
    }
    req.session.user = user;
    return next();
  } catch (error) {
    return next(error);
  }
};

export const verifyTelegramWebhook = (req, res, next) => {
  const expected = process.env.TELEGRAM_WEBHOOK_SECRET;
  const received = req.get('X-Telegram-Bot-Api-Secret-Token');
  if (!expected || !/^[A-Za-z0-9_-]{32,256}$/.test(expected)) {
    return res.status(503).json({ err: true, message: 'Webhook no configurado.' });
  }
  if (typeof received !== 'string' || Buffer.byteLength(received) !== Buffer.byteLength(expected)
      || !crypto.timingSafeEqual(Buffer.from(received), Buffer.from(expected))) {
    return res.status(403).json({ err: true, message: 'Webhook no autorizado.' });
  }
  return next();
};

export const securityErrorHandler = (error, req, res, next) => {
  if (res.headersSent) return next(error);
  if (error.type === 'entity.too.large' || error.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ err: true, message: 'La petición supera el tamaño permitido.' });
  }
  if (error.name === 'MulterError' || error.type === 'entity.parse.failed') {
    return res.status(400).json({ err: true, message: 'Formato de petición no válido.' });
  }
  const status = Number(error.statusCode || error.status);
  if (status >= 400 && status < 500) {
    return res.status(status).json({ err: true, message: 'Petición no permitida.' });
  }
  console.error('Error interno de petición:', error.code || error.name || 'Error');
  return res.status(500).json({ err: true, message: 'Error interno del servidor.' });
};
