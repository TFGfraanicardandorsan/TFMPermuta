import adminPermutasService from '../services/adminPermutasService.mjs';
import solicitudPermutaService from '../services/solicitudPermutaService.mjs';

const MAX_INT_POSTGRES = 2_147_483_647;

const enteroPositivo = (valor) => {
  const numero = typeof valor === 'number' ? valor
    : typeof valor === 'string' && /^\d+$/.test(valor) ? Number(valor) : Number.NaN;
  return Number.isSafeInteger(numero) && numero > 0 && numero <= MAX_INT_POSTGRES ? numero : null;
};

const validarMotivo = (valor) => {
  if (valor == null || valor === '') return '';
  if (typeof valor !== 'string' || valor.trim().length > 500) return null;
  return valor.trim();
};

const responderError = (res, error) => {
  const status = error.statusCode || 500;
  if (status === 500) console.error('Error en la gestión administrativa de permutas:', error);
  return res.status(status).json({ err: true, message: status === 500
    ? 'Error interno en la gestión de permutas.' : error.message });
};

const obtenerPanel = async (_req, res) => {
  try {
    return res.json({ err: false, result: await adminPermutasService.obtenerPanel() });
  } catch (error) { return responderError(res, error); }
};

const buscarParejasOptimas = async (_req, res) => {
  try {
    return res.json({ err: false, result: await solicitudPermutaService.buscarParejasOptimas() });
  } catch (error) { return responderError(res, error); }
};

const generarPropuestas = async (_req, res) => {
  try {
    return res.json({ err: false, result: await solicitudPermutaService.proponerPermutas() });
  } catch (error) { return responderError(res, error); }
};

const cancelarSolicitud = async (req, res) => {
  const solicitudId = enteroPositivo(req.params.id);
  const motivo = validarMotivo(req.body?.motivo);
  if (!solicitudId || motivo === null) {
    return res.status(400).json({ err: true, message: 'Identificador o motivo no válido.' });
  }
  try {
    return res.json({ err: false, result: await adminPermutasService.cancelarSolicitud(solicitudId, motivo) });
  } catch (error) { return responderError(res, error); }
};

const cancelarPermuta = async (req, res) => {
  const permutaId = enteroPositivo(req.params.id);
  const usuario = typeof req.body?.usuario === 'string' ? req.body.usuario.trim() : '';
  const motivo = validarMotivo(req.body?.motivo);
  if (!permutaId || !usuario || usuario.length > 100 || motivo === null) {
    return res.status(400).json({ err: true, message: 'Permuta, participante o motivo no válido.' });
  }
  try {
    return res.json({ err: false, result: await adminPermutasService.cancelarPermuta(
      permutaId, usuario, motivo
    ) });
  } catch (error) { return responderError(res, error); }
};

const retirarVigencia = async (req, res) => {
  const motivo = validarMotivo(req.body?.motivo);
  if (motivo === null) return res.status(400).json({ err: true, message: 'El motivo no es válido.' });
  try {
    return res.json({ err: false, result: await adminPermutasService.retirarVigenciaGlobal(motivo) });
  } catch (error) { return responderError(res, error); }
};

export default {
  obtenerPanel,
  buscarParejasOptimas,
  generarPropuestas,
  cancelarSolicitud,
  cancelarPermuta,
  retirarVigencia,
};
