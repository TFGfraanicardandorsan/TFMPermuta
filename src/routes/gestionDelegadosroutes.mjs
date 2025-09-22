import { Router } from "express";
import multer from "multer";
import delegadosPdfController from "../controllers/delegadosPdfController.mjs";
import { verificarRol } from "../middleware/rolMiddleware.mjs";

const upload = multer();

const router = Router();
router.post(
  "/generarAcreditacionesDelegados",
  verificarRol("administrador"),
  upload.single("csv"),
  delegadosPdfController.generarAcreditacionesDelegados
);

export default router;