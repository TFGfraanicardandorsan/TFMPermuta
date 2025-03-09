import express from "express";
import multer from "multer";
import path from "path";
import incidenciaController from "../controllers/incidenciaController.mjs";

const router = express.Router();

// Configuración de `multer` para subir archivos
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, "uploads/");
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + path.extname(file.originalname));
    },
});

const upload = multer({ storage: storage });

// Rutas de la API
router.get("/incidencias", incidenciaController.obtenerIncidencias);
router.get("/incidencias/asignadasMias", incidenciaController.obtenerIncidenciasAsignadasUsuario);
router.get("/incidencias/asignadas", incidenciaController.obtenerIncidenciasAsignadas);
router.get("/incidencias/sinAsignar", incidenciaController.obtenerIncidenciasSinAsignar);
router.post("/incidencias/asignar", incidenciaController.asignarmeIncidencia);
router.post("/incidencias/solucionar", incidenciaController.solucionarIncidencia);
router.post("/incidencias", upload.single("archivo"), incidenciaController.crearIncidencia);

export default router;
