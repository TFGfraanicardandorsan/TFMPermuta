import { Worker } from 'node:worker_threads';

const TIEMPO_MAXIMO_MS = Number(process.env.EMPAREJAMIENTO_TIEMPO_MAXIMO_MS) || 60_000;

// Solo viajan al hilo los campos que usa el algoritmo.
const CAMPOS = ['estudianteId', 'estudiante_id', 'asignatura', 'grupoActual', 'grupo_actual',
  'grupoDeseado', 'grupo_deseado', 'bloque_id', 'asignaturas_bloque'];

/**
 * Ejecuta PermutaMatching en un worker_thread. El presupuesto del algoritmo es
 * determinista; el tiempo máximo es solo una red de seguridad.
 * @returns {Promise<{ emparejamientos: Array, estadisticas: object }>}
 */
export function emparejarEnSegundoPlano(solicitudes, opciones = {}, { tiempoMaximoMs = TIEMPO_MAXIMO_MS } = {}) {
  const filas = solicitudes.map(fila => Object.fromEntries(CAMPOS.filter(c => fila[c] !== undefined).map(c => [c, fila[c]])));
  const datos = { ...opciones, parejasAbiertas: [...(opciones.parejasAbiertas ?? [])] };
  return new Promise((resolve, reject) => {
    const worker = new Worker(new URL('./emparejamientoWorker.mjs', import.meta.url), {
      workerData: { solicitudes: filas, opciones: datos },
    });
    let terminado = false;
    const terminar = (accion, valor) => {
      if (terminado) return;
      terminado = true;
      clearTimeout(temporizador);
      accion(valor);
    };
    const temporizador = setTimeout(() => {
      worker.terminate();
      terminar(reject, new Error(`El emparejamiento superó ${tiempoMaximoMs} ms`));
    }, tiempoMaximoMs);
    worker.once('message', mensaje => terminar(resolve, mensaje));
    worker.once('error', error => terminar(reject, error));
    worker.once('exit', codigo => terminar(reject, new Error(`El hilo de emparejamiento terminó con código ${codigo}`)));
  });
}
