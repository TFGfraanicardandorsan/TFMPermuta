import express from "express";
import feedbackController from "../controllers/feedbackController.mjs";
import { verificarRol } from "../middleware/rolMiddleware.mjs";
import { ADMIN_ROLE, SUPPORTED_ROLES } from "../utils/roles.mjs";

const router = express.Router();

router
  .post("/crear", verificarRol(SUPPORTED_ROLES), feedbackController.crearFeedback)
  .post(
    "/mis-respuestas",
    verificarRol(SUPPORTED_ROLES),
    feedbackController.obtenerMisRespuestas,
  )
  .post("/listar", verificarRol(ADMIN_ROLE), feedbackController.listarFeedback)
  .post(
    "/actualizar-estado",
    verificarRol(ADMIN_ROLE),
    feedbackController.actualizarEstado,
  );

export default router;
