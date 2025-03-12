import express from "express";
import incidenciaController from "../controllers/incidenciaController.mjs";
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = express.Router();

router.get("/obtenerIncidencias", verificarRol('administrador'), incidenciaController.obtenerIncidencias);
router.get("/obtenerIncidenciasAsignadasUsuario", verificarRol('estudiante'), incidenciaController.obtenerIncidenciasAsignadasUsuario);
router.get("/obtenerIncidenciasAsignadas",verificarRol('administrador'), incidenciaController.obtenerIncidenciasAsignadas);
router.get("/obtenerIncidenciasSinAsignar",verificarRol('administrador'),incidenciaController.obtenerIncidenciasSinAsignar);
router.post("/asignarmeIncidencia",verificarRol('administrador'), incidenciaController.asignarmeIncidencia);
router.post("/solucionarIncidencia",verificarRol('administrador'), incidenciaController.solucionarIncidencia);
router.post("/crearIncidencia",verificarRol('estudiante'), incidenciaController.crearIncidencia);

export default router;
