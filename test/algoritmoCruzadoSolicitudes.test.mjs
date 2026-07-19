import test from 'node:test';
import assert from 'node:assert/strict';
import PermutaMatching from '../src/algorithm/AlgoritmoCruzadoSolicitudes.mjs';

const solicitud = (estudianteId, asignatura, grupoActual, grupoDeseado) =>
  ({ estudianteId, asignatura, grupoActual, grupoDeseado });

test('solo empareja solicitudes recíprocas de la misma asignatura', () => {
  const resultado = new PermutaMatching([
    solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100),
    solicitud(3, 11, 200, 100)
  ]).construirGrafo().emparejar();
  assert.deepEqual(resultado, [{ estudiante1: '1', estudiante2: '2', asignaturas: [10] }]);
});

test('agrupa varias asignaturas compatibles en una sola pareja', () => {
  const resultado = new PermutaMatching([
    solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100),
    solicitud(1, 11, 101, 201), solicitud(2, 11, 201, 101)
  ]).construirGrafo().emparejar();
  assert.deepEqual(resultado[0].asignaturas, [10, 11]);
});

test('elige el óptimo global y no el primer vecino disponible', () => {
  const datos = [
    solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100),
    solicitud(1, 11, 101, 301), solicitud(3, 11, 301, 101),
    solicitud(1, 12, 102, 302), solicitud(3, 12, 302, 102),
    solicitud(2, 13, 202, 402), solicitud(4, 13, 402, 202),
    solicitud(2, 14, 203, 403), solicitud(4, 14, 403, 203)
  ];
  const resultado = new PermutaMatching(datos).construirGrafo().emparejar();
  assert.deepEqual(resultado.map(p => [String(p.estudiante1), String(p.estudiante2)]), [['1', '3'], ['2', '4']]);
  assert.equal(resultado.reduce((n, p) => n + p.asignaturas.length, 0), 4);
});
