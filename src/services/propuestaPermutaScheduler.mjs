import solicitudPermutaService from './solicitudPermutaService.mjs';

const QUINCE_MINUTOS = 15 * 60 * 1000;

export function iniciarPropuestasPermutaPeriodicas({
  intervaloMs = Number(process.env.PROPUESTAS_PERMUTA_INTERVALO_MS) || QUINCE_MINUTOS,
  ejecutarAlInicio = process.env.PROPUESTAS_PERMUTA_AL_INICIO !== 'false',
  habilitado = process.env.PROPUESTAS_PERMUTA_HABILITADAS !== 'false',
  proponer = () => solicitudPermutaService.proponerPermutas(),
  logger = console,
} = {}) {
  if (!habilitado) return null;
  if (!Number.isFinite(intervaloMs) || intervaloMs < 1000) {
    throw new Error('PROPUESTAS_PERMUTA_INTERVALO_MS debe ser igual o superior a 1000');
  }

  let ejecutando = false;
  const ejecutar = async () => {
    if (ejecutando) return;
    ejecutando = true;
    try {
      const resultado = await proponer();
      logger.info(`Propuestas de permuta óptima generadas: ${resultado.propuestasCreadas}`);
    } catch (error) {
      logger.error('Error al generar propuestas de permuta óptima:', error);
    } finally {
      ejecutando = false;
    }
  };

  const temporizador = setInterval(ejecutar, intervaloMs);
  temporizador.unref?.();
  if (ejecutarAlInicio) void ejecutar();
  return temporizador;
}
