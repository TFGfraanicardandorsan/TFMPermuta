import { Router } from 'express';
import permutasController from '../controllers/permutasController.mjs';
import { verificarRol } from '../middleware/rolMiddleware.mjs';

const router = Router()
router
.post('/generarBorradorPermuta', verificarRol('estudiante'), permutasController.generarBorradorPermutas)
.post('/listarPermutas', verificarRol('estudiante'), permutasController.listarPermutas)
.post('/firmarPermuta', verificarRol('estudiante'), permutasController.firmarPermuta)
.post('/aceptarPermuta', verificarRol('estudiante'), permutasController.aceptarPermuta)
.post('/validarPermuta', verificarRol('estudiante'), permutasController.validarPermuta)
.post('/rechazarSolicitudPermuta',verificarRol('estudiante'), permutasController.rechazarSolicitudPermuta)
.post('/misPermutasPropuestas', verificarRol('estudiante'), permutasController.misPermutasPropuestas)
.post('/misPermutasPropuestasPorMi', verificarRol('estudiante'), permutasController.misPermutasPropuestasPorMi)
.post('/obtenerPermutasValidadasPorUsuario', verificarRol('estudiante'), permutasController.obtenerPermutasValidadasPorUsuario)
.post('/obtenerPermutasAgrupadasPorUsuario', verificarRol('estudiante'), permutasController.obtenerPermutasAgrupadasPorUsuario)
.get('/permutasEstado', permutasController.obtenerEstadoPermutaYUsuarios);

export default router;