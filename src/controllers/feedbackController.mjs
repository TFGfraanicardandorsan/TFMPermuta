import feedbackService, { FeedbackNotFoundError } from "../services/feedbackService.mjs";
import { toCanonicalRole } from "../utils/roles.mjs";

export const FEEDBACK_CATEGORIES = [
  "mejora",
  "problema",
  "nueva_funcionalidad",
  "otro",
];

export const FEEDBACK_STATUSES = [
  "recibida",
  "en_revision",
  "planificada",
  "implementada",
  "descartada",
];

const errorResponse = (res, status, message) =>
  res.status(status).json({ err: true, error: true, errmsg: message, message });

const integerInRange = (value, min, max) => {
  const number = Number(value);
  return Number.isInteger(number) && number >= min && number <= max
    ? number
    : null;
};

const optionalText = (value, fieldName) => {
  if (value === undefined || value === null || value === "") return null;
  if (typeof value !== "string") {
    return { error: `${fieldName} debe ser texto` };
  }
  const normalized = value.trim();
  if (normalized.length > 1500) {
    return { error: `${fieldName} no puede superar 1500 caracteres` };
  }
  return normalized || null;
};

const authenticatedUser = (req, res) => {
  if (!req.session?.user?.nombre_usuario) {
    errorResponse(res, 401, "No hay usuario autenticado en la sesión");
    return null;
  }
  return req.session.user;
};

const crearFeedback = async (req, res) => {
  const user = authenticatedUser(req, res);
  if (!user) return;

  const satisfaccion = integerInRange(req.body?.satisfaccion_general, 1, 5);
  const facilidad = integerInRange(req.body?.facilidad_uso, 1, 5);
  const recomendacion = integerInRange(req.body?.recomendacion, 0, 10);

  if (satisfaccion === null || facilidad === null || recomendacion === null) {
    return errorResponse(
      res,
      400,
      "Las puntuaciones deben estar en los rangos 1-5, 1-5 y 0-10",
    );
  }

  const tipoAporte = req.body?.tipo_aporte || null;
  if (tipoAporte !== null && !FEEDBACK_CATEGORIES.includes(tipoAporte)) {
    return errorResponse(res, 400, "El tipo de aporte no es válido");
  }

  const comentario = optionalText(req.body?.comentario, "El comentario");
  if (comentario?.error) {
    return errorResponse(res, 400, comentario.error);
  }

  const seguimiento = req.body?.solicita_seguimiento ?? true;
  if (typeof seguimiento !== "boolean") {
    return errorResponse(res, 400, "solicita_seguimiento debe ser un booleano");
  }

  try {
    const result = await feedbackService.crearFeedback(
      user.nombre_usuario,
      toCanonicalRole(user.rol),
      {
        satisfaccion_general: satisfaccion,
        facilidad_uso: facilidad,
        recomendacion,
        tipo_aporte: tipoAporte,
        comentario,
        solicita_seguimiento: seguimiento,
      },
    );
    return res.status(201).json({ err: false, error: false, result });
  } catch (error) {
    console.error("Error al crear feedback:", error);
    return errorResponse(res, 500, "No se ha podido registrar la aportación");
  }
};

const obtenerMisRespuestas = async (req, res) => {
  const user = authenticatedUser(req, res);
  if (!user) return;

  try {
    const result = await feedbackService.obtenerFeedbackUsuario(user.nombre_usuario);
    return res.json({ err: false, error: false, result });
  } catch (error) {
    console.error("Error al obtener el feedback del usuario:", error);
    return errorResponse(res, 500, "No se han podido obtener las aportaciones");
  }
};

const listarFeedback = async (req, res) => {
  const user = authenticatedUser(req, res);
  if (!user) return;

  try {
    const result = await feedbackService.obtenerTodosFeedback();
    return res.json({ err: false, error: false, result });
  } catch (error) {
    console.error("Error al listar feedback:", error);
    return errorResponse(res, 500, "No se han podido obtener las aportaciones");
  }
};

const actualizarEstado = async (req, res) => {
  const user = authenticatedUser(req, res);
  if (!user) return;

  const idFeedback = integerInRange(req.body?.id_feedback, 1, Number.MAX_SAFE_INTEGER);
  if (idFeedback === null) {
    return errorResponse(res, 400, "id_feedback debe ser un entero positivo");
  }

  const estado = req.body?.estado;
  if (!FEEDBACK_STATUSES.includes(estado)) {
    return errorResponse(res, 400, "El estado indicado no es válido");
  }

  const respuesta = optionalText(
    req.body?.respuesta_administracion,
    "La respuesta administrativa",
  );
  if (respuesta?.error) {
    return errorResponse(res, 400, respuesta.error);
  }

  try {
    const result = await feedbackService.actualizarEstado(
      idFeedback,
      estado,
      respuesta,
      user.nombre_usuario,
    );
    return res.json({ err: false, error: false, result });
  } catch (error) {
    if (error instanceof FeedbackNotFoundError) {
      return errorResponse(res, 404, error.message);
    }
    console.error("Error al actualizar el estado del feedback:", error);
    return errorResponse(res, 500, "No se ha podido actualizar la aportación");
  }
};

export default {
  crearFeedback,
  obtenerMisRespuestas,
  listarFeedback,
  actualizarEstado,
};
