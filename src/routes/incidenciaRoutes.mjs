import express from "express";
import incidenciaController from "../controllers/incidenciaController.mjs";
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = express.Router();

router
.post("/obtenerIncidencias", verificarRol('administrador'), incidenciaController.obtenerIncidencias)
.post("/obtenerIncidenciasAsignadasUsuario", verificarRol('estudiante'), incidenciaController.obtenerIncidenciasAsignadasUsuario)
.post("/obtenerIncidenciasAsignadas",verificarRol('administrador'), incidenciaController.obtenerIncidenciasAsignadas)
.post("/obtenerIncidenciasSinAsignar",verificarRol('administrador'),incidenciaController.obtenerIncidenciasSinAsignar)
.post("/asignarmeIncidencia",verificarRol('administrador'), incidenciaController.asignarmeIncidencia)
.post("/solucionarIncidencia",verificarRol('administrador'), incidenciaController.solucionarIncidencia)
.post("/crearIncidencia",verificarRol('estudiante'), incidenciaController.crearIncidencia)
.post("/obtenerIncidenciasAsignadasAdmin",verificarRol('administrador'), incidenciaController.obtenerIncidenciasAsignadasAdmin)
.post("/obtenerIncidenciaPorId",verificarRol('administrador'), incidenciaController.obtenerIncidenciaPorId)
export default router;
