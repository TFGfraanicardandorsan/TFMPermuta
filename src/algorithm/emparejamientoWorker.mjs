import { parentPort, workerData } from 'node:worker_threads';
import PermutaMatching from './AlgoritmoCruzadoSolicitudes.mjs';

// Hilo aislado: el cálculo es CPU intensivo y no debe bloquear el servidor.
const { solicitudes, opciones } = workerData;
const algoritmo = new PermutaMatching(solicitudes, opciones).construirGrafo();
const emparejamientos = algoritmo.emparejar();
parentPort.postMessage({ emparejamientos, estadisticas: algoritmo.estadisticas });
