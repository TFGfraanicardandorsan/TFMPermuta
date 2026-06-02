import { Router } from 'express';
import multer from 'multer';

import delegadosController from '../controllers/delegadosController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: Number(process.env.DELEGADOS_CSV_MAX_BYTES || 2 * 1024 * 1024),
  },
});

router
  .get('/plantillaCSV', verificarRol('delegacion'), delegadosController.descargarPlantillaCSV)
  .post('/generarCertificados', verificarRol('delegacion'), uploadCsv.any(), delegadosController.generarCertificados)
  .post('/generarAcreditacionesDelegados', verificarRol('delegacion'), uploadCsv.any(), delegadosController.generarCertificados)
  .post('/guardarCertificados', verificarRol('delegacion'), uploadCsv.any(), delegadosController.guardarCertificados)
  .post('/prepararCorreos', verificarRol('delegacion'), uploadCsv.any(), delegadosController.prepararCorreos)
  .post('/enviarCertificados', verificarRol('delegacion'), uploadCsv.any(), delegadosController.enviarCertificados)
  .post('/enviarCertificadosTelegram', verificarRol('delegacion'), uploadCsv.any(), delegadosController.enviarCertificadosTelegram)
  .post('/payloadFirmaLote', verificarRol('delegacion'), uploadCsv.any(), delegadosController.payloadFirmaLote)
  .post('/enviarCertificadoFirmado', verificarRol('delegacion'), delegadosController.enviarCertificadoFirmado)
  .get('/microsoft/status', verificarRol('delegacion'), delegadosController.estadoMicrosoft)
  .get('/microsoft/login', verificarRol('delegacion'), delegadosController.loginMicrosoft)
  .get('/microsoft/callback', verificarRol('delegacion'), delegadosController.callbackMicrosoft)
  .post('/microsoft/logout', verificarRol('delegacion'), delegadosController.logoutMicrosoft)
  .post('/enviarCertificadosGraph', verificarRol('delegacion'), uploadCsv.any(), delegadosController.enviarCertificadosGraph)
  .post('/enviarCertificadoFirmadoGraph', verificarRol('delegacion'), delegadosController.enviarCertificadoFirmadoGraph)
  .all('/afirma-signature-storage/StorageService', verificarRol('delegacion'), delegadosController.afirmaStorage)
  .all('/afirma-signature-retriever/RetrieveService', verificarRol('delegacion'), delegadosController.afirmaRetrieve);

export default router;
