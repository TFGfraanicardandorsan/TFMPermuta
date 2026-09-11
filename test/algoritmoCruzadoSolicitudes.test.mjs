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

test('sin bloque permite distintas personas para distintas asignaturas', () => {
  const datos = [
    solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100),
    solicitud(1, 11, 101, 301), solicitud(3, 11, 301, 101),
    solicitud(1, 12, 102, 302), solicitud(3, 12, 302, 102),
    solicitud(2, 13, 202, 402), solicitud(4, 13, 402, 202),
    solicitud(2, 14, 203, 403), solicitud(4, 14, 403, 203)
  ];
  const resultado = new PermutaMatching(datos).construirGrafo().emparejar();
  assert.deepEqual(resultado.map(p => [String(p.estudiante1), String(p.estudiante2)]), [['1', '2'], ['1', '3'], ['2', '4']]);
  assert.equal(resultado.reduce((n, p) => n + p.asignaturas.length, 0), 5);
});

const enBloque = (s, bloque_id, asignaturas_bloque) => ({ ...s, bloque_id, asignaturas_bloque });
const resolver = (datos, opciones) => new PermutaMatching(datos, opciones).construirGrafo().emparejar();

test('un bloque no se reparte entre dos personas ni produce coincidencias parciales', () => {
  const datos = [
    enBloque(solicitud(1, 10, 100, 200), 'a', [10, 11]),
    enBloque(solicitud(1, 11, 101, 201), 'a', [10, 11]),
    solicitud(2, 10, 200, 100), solicitud(3, 11, 201, 101),
  ];
  assert.deepEqual(resolver(datos), []);
  assert.deepEqual(resolver(datos, { limiteComponenteExacto: 0 }), []);
});

test('un único usuario puede exigir el bloque y el otro tener solicitudes individuales', () => {
  const datos = [
    enBloque(solicitud(1, 10, 100, 200), 'a', [10, 11]),
    enBloque(solicitud(1, 11, 101, 201), 'a', [10, 11]),
    solicitud(2, 10, 200, 100), solicitud(2, 11, 201, 101),
  ];
  assert.deepEqual(resolver(datos), [{ estudiante1: '1', estudiante2: '2', asignaturas: [10, 11] }]);
});

test('si la otra persona exige un bloque mayor tampoco se permite resolverlo parcialmente', () => {
  assert.deepEqual(resolver([
    enBloque(solicitud(1, 10, 100, 200), 'a', [10, 11]),
    enBloque(solicitud(1, 11, 101, 201), 'a', [10, 11]),
    enBloque(solicitud(2, 10, 200, 100), 'b', [10, 11, 12]),
    enBloque(solicitud(2, 11, 201, 101), 'b', [10, 11, 12]),
  ]), []);
});

test('dos cursos en bloque del mismo alumno se resuelven con personas independientes', () => {
  const datos = [
    ...[10, 11].flatMap(id => [enBloque(solicitud(1, id, id, id + 100), 'a', [10, 11]), solicitud(2, id, id + 100, id)]),
    ...[20, 21].flatMap(id => [enBloque(solicitud(1, id, id, id + 100), 'b', [20, 21]), solicitud(3, id, id + 100, id)]),
  ];
  assert.deepEqual(resolver(datos), [
    { estudiante1: '1', estudiante2: '2', asignaturas: [10, 11] },
    { estudiante1: '1', estudiante2: '3', asignaturas: [20, 21] },
  ]);
});

test('una asignatura filtrada de BD no reduce el tamaño obligatorio del bloque', () => {
  assert.deepEqual(resolver([
    enBloque(solicitud(1, 10, 100, 200), 'a', [10, 11]), solicitud(2, 10, 200, 100),
  ]), []);
});

test('elige el óptimo entre bloques rivales sin reutilizar asignaturas', () => {
  const datos = [
    ...[10, 11, 12].flatMap(id => [enBloque(solicitud(1, id, id, id + 100), 'a', [10, 11, 12]), solicitud(2, id, id + 100, id)]),
    ...[10, 13].flatMap(id => [enBloque(solicitud(3, id, id, id + 100), 'b', [10, 13]), solicitud(2, id, id + 100, id)]),
    ...[11, 14].flatMap(id => [enBloque(solicitud(4, id, id, id + 100), 'c', [11, 14]), solicitud(2, id, id + 100, id)]),
  ];
  const resultado = resolver(datos);
  assert.equal(resultado.reduce((n,p) => n + p.asignaturas.length, 0), 4);
  const recursos = resultado.flatMap(p => p.asignaturas.flatMap(a => [p.estudiante1 + '|' + a, p.estudiante2 + '|' + a]));
  assert.equal(new Set(recursos).size, recursos.length);
  const voraz = resolver(datos, { limiteComponenteExacto: 0 });
  assert.deepEqual(voraz, [{ estudiante1: '1', estudiante2: '2', asignaturas: [10, 11, 12] }]);
});
