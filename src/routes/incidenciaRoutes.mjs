import express from "express";
import incidenciaController from "../controllers/incidenciaController.mjs";
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = express.Router();

router.post("/obtenerIncidencias", verificarRol('administrador'), incidenciaController.obtenerIncidencias);
router.post("/obtenerIncidenciasAsignadasUsuario", verificarRol('estudiante'), incidenciaController.obtenerIncidenciasAsignadasUsuario);
router.post("/obtenerIncidenciasAsignadas",verificarRol('administrador'), incidenciaController.obtenerIncidenciasAsignadas);
router.post("/obtenerIncidenciasSinAsignar",verificarRol('administrador'),incidenciaController.obtenerIncidenciasSinAsignar);
router.post("/asignarmeIncidencia",verificarRol('administrador'), incidenciaController.asignarmeIncidencia);
router.post("/solucionarIncidencia",verificarRol('administrador'), incidenciaController.solucionarIncidencia);
router.post("/crearIncidencia",verificarRol('estudiante'), incidenciaController.crearIncidencia);
router.post("/obtenerIncidenciasAsignadasAdmin",verificarRol('administrador'), incidenciaController.obtenerIncidenciasAsignadasAdmin);
router.post("/obtenerIncidenciaPorId",verificarRol('administrador'), incidenciaController.obtenerIncidenciaPorId);
export default router;
