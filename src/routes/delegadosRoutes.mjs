import { Router } from 'express';
import multer from 'multer';

import delegadosController from '../controllers/delegadosController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router();
const rolesDelegacion = ['administrador', 'delegacion'];
const uploadCsv = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1,
    fields: 20,
    parts: 21,
    fieldSize: 4096,
  },
});

router
  .get('/plantillaCSV', verificarRol(rolesDelegacion), delegadosController.descargarPlantillaCSV)
  .post('/generarCertificados', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.generarCertificados)
  .post('/generarAcreditacionesDelegados', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.generarCertificados)
  .post('/guardarCertificados', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.guardarCertificados)
  .post('/prepararCorreos', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.prepararCorreos)
  .post('/enviarCertificados', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.enviarCertificados)
  .post('/enviarCertificadosTelegram', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.enviarCertificadosTelegram)
  .post('/payloadFirmaLote', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.payloadFirmaLote)
  .post('/firmar-lote', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.payloadFirmaLote)
  .post('/enviarCertificadoFirmado', verificarRol(rolesDelegacion), delegadosController.enviarCertificadoFirmado)
  .post('/enviarCertificadoFirmadoTelegram', verificarRol(rolesDelegacion), delegadosController.enviarCertificadoFirmadoTelegram)
  .get('/microsoft/status', verificarRol(rolesDelegacion), delegadosController.estadoMicrosoft)
  .get('/microsoft/login', verificarRol(rolesDelegacion), delegadosController.loginMicrosoft)
  .get('/microsoft/callback', verificarRol(rolesDelegacion), delegadosController.callbackMicrosoft)
  .post('/microsoft/logout', verificarRol(rolesDelegacion), delegadosController.logoutMicrosoft)
  .post('/enviarCertificadosGraph', verificarRol(rolesDelegacion), uploadCsv.any(), delegadosController.enviarCertificadosGraph)
  .post('/enviarCertificadoFirmadoGraph', verificarRol(rolesDelegacion), delegadosController.enviarCertificadoFirmadoGraph)
  .post('/afirma-signature-storage/StorageService', verificarRol(rolesDelegacion), delegadosController.afirmaStorage)
  .post('/afirma-signature-retriever/RetrieveService', verificarRol(rolesDelegacion), delegadosController.afirmaRetrieve);

export default router;
