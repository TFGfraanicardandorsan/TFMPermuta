import test from 'node:test';
import assert from 'node:assert/strict';
import PermutaMatching from '../src/algorithm/AlgoritmoCruzadoSolicitudes.mjs';
import { emparejarEnSegundoPlano } from '../src/algorithm/emparejamientoEnSegundoPlano.mjs';

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
  assert.deepEqual(resolver(datos, { limiteTrabajo: 0 }), []);
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
  // Sin presupuesto se completa una única rama voraz: válida, pero sin garantía.
  const algoritmo = new PermutaMatching(datos, { limiteTrabajo: 0 });
  const voraz = algoritmo.emparejar();
  const recursosVoraz = voraz.flatMap(p => p.asignaturas.flatMap(a => [p.estudiante1 + '|' + a, p.estudiante2 + '|' + a]));
  assert.equal(new Set(recursosVoraz).size, recursosVoraz.length);
  assert.equal(algoritmo.estadisticas.optimoGarantizado, false);
});

const asignaturas = resultado => resultado.reduce((n, p) => n + p.asignaturas.length, 0);

test('con el mismo número de asignaturas prefiere menos parejas (documentos)', () => {
  // 1 puede cambiar la 10 con 2 o con 3, pero la 11 solo con 3: basta un documento.
  const datos = [
    solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100), solicitud(3, 10, 200, 100),
    solicitud(1, 11, 101, 201), solicitud(3, 11, 201, 101),
  ];
  const algoritmo = new PermutaMatching(datos);
  assert.deepEqual(algoritmo.emparejar(), [{ estudiante1: '1', estudiante2: '3', asignaturas: [10, 11] }]);
  assert.equal(algoritmo.estadisticas.documentos, 1);
  assert.equal(algoritmo.estadisticas.optimoGarantizado, true);
});

test('nunca sacrifica asignaturas para ahorrar documentos', () => {
  // Con 1-3 en ambas (1 documento) quedaría 2 sin cambiar: se prefieren 3 asignaturas en 2 documentos.
  const datos = [
    solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100), solicitud(3, 10, 200, 100),
    solicitud(1, 11, 101, 201), solicitud(3, 11, 201, 101),
    solicitud(4, 12, 300, 400), solicitud(3, 12, 400, 300), solicitud(4, 10, 100, 200),
  ];
  const algoritmo = new PermutaMatching(datos);
  const resultado = algoritmo.emparejar();
  assert.equal(asignaturas(resultado), 4);
  assert.equal(algoritmo.estadisticas.documentos, 3);
});

test('agrupa intercambios masivos entre dos grupos en el mínimo de parejas', () => {
  // 6 alumnos de A→B y 6 de B→A en tres asignaturas: 18 cambios en 6 documentos.
  const datos = [];
  for (let e = 1; e <= 6; e++) for (const a of [10, 11, 12]) {
    datos.push(solicitud(e, a, a * 10, a * 10 + 1), solicitud(e + 100, a, a * 10 + 1, a * 10));
  }
  const algoritmo = new PermutaMatching(datos);
  const resultado = algoritmo.emparejar();
  assert.equal(asignaturas(resultado), 18);
  assert.equal(resultado.length, 6);
  assert.equal(algoritmo.estadisticas.optimoGarantizado, true);
});

test('coincide con la fuerza bruta en instancias aleatorias pequeñas', () => {
  let semilla = 42;
  const azar = n => Math.floor((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648 * n);
  const fuerzaBruta = candidatos => {
    let mejor = [-1, 0];
    const recorrer = (i, usados, elegidos) => {
      if (i === candidatos.length) {
        const total = elegidos.reduce((n, c) => n + c.asignaturas.length, 0);
        const parejas = new Set(elegidos.map(c => c.estudiante1 + '|' + c.estudiante2)).size;
        if (total > mejor[0] || (total === mejor[0] && parejas < mejor[1])) mejor = [total, parejas];
        return;
      }
      recorrer(i + 1, usados, elegidos);
      const c = candidatos[i];
      if ([...c.recursos].every(r => !usados.has(r))) {
        recorrer(i + 1, new Set([...usados, ...c.recursos]), [...elegidos, c]);
      }
    };
    recorrer(0, new Set(), []);
    return mejor;
  };
  let comprobadas = 0;
  for (let caso = 0; caso < 300; caso++) {
    const datos = [];
    const grupos = 2 + azar(2);
    for (let e = 1; e <= 4 + azar(8); e++) {
      const pedidas = [...new Set([10 + azar(3), 10 + azar(3), 10 + azar(3)].slice(0, 1 + azar(3)))];
      const bloque = pedidas.length > 1 && azar(3) === 0 ? pedidas.slice(0, 2) : null;
      for (const a of pedidas) {
        const actual = azar(grupos);
        const deseado = (actual + 1 + azar(grupos - 1)) % grupos;
        datos.push({ ...solicitud(e, a, a * 10 + actual, a * 10 + deseado),
          ...(bloque?.includes(a) ? { bloque_id: 'b' + e, asignaturas_bloque: bloque } : {}) });
      }
    }
    const candidatos = new PermutaMatching(datos).construirGrafo().crearCandidatos();
    if (candidatos.length > 18) continue;
    const algoritmo = new PermutaMatching(datos);
    algoritmo.emparejar();
    const { asignaturasResueltas, documentos, optimoGarantizado } = algoritmo.estadisticas;
    assert.deepEqual([asignaturasResueltas, documentos], fuerzaBruta(candidatos), `caso ${caso}`);
    assert.equal(optimoGarantizado, true);
    comprobadas++;
  }
  assert.ok(comprobadas > 200);
});

test('prefiere completar parejas con permutas pendientes de documento', () => {
  const datos = [solicitud(1, 10, 100, 200), solicitud(2, 10, 200, 100), solicitud(3, 10, 200, 100)];
  const sinPendientes = new PermutaMatching(datos);
  assert.deepEqual(sinPendientes.emparejar().map(p => p.estudiante2), ['2']);
  assert.equal(sinPendientes.estadisticas.documentos, 1);
  const conPendientes = new PermutaMatching(datos, { parejasAbiertas: [['3', '1']] });
  assert.deepEqual(conPendientes.emparejar().map(p => p.estudiante2), ['3']);
  assert.equal(conPendientes.estadisticas.documentos, 0);
  assert.equal(conPendientes.estadisticas.parejas, 1);
});

test('una pareja pendiente rompe la simetría entre alumnos idénticos', () => {
  // 2 y 3 tienen solicitudes idénticas, pero solo 3 comparte ya documento con 1.
  const datos = [10, 11].flatMap(a => [solicitud(1, a, a * 10, a * 10 + 1),
    solicitud(2, a, a * 10 + 1, a * 10), solicitud(3, a, a * 10 + 1, a * 10)]);
  const algoritmo = new PermutaMatching(datos, { parejasAbiertas: ['1|3'] });
  assert.deepEqual(algoritmo.emparejar(), [{ estudiante1: '1', estudiante2: '3', asignaturas: [10, 11] }]);
  assert.equal(algoritmo.estadisticas.documentos, 0);
});

const instanciaDensa = (alumnos, semilla) => {
  const azar = n => Math.floor((semilla = (semilla * 1103515245 + 12345) % 2147483648) / 2147483648 * n);
  const datos = [];
  for (let e = 1; e <= alumnos; e++) {
    const sentido = azar(2);
    for (const a of [10, 11, 12, 13]) {
      if (azar(3) === 0) continue;
      const g = azar(5) ? sentido : 1 - sentido;
      datos.push(solicitud(e, a, a * 10 + g, a * 10 + 1 - g));
    }
  }
  return datos;
};

test('la mejora por vecindarios nunca empeora y respeta los recursos', () => {
  const datos = instanciaDensa(60, 7);
  const base = new PermutaMatching(datos, { limiteTrabajo: 0, limiteMejora: 0 });
  const resultadoBase = base.emparejar();
  const mejorado = new PermutaMatching(datos, { limiteTrabajo: 0, limiteMejora: 5e7 });
  const resultado = mejorado.emparejar();
  assert.equal(base.estadisticas.optimoGarantizado, false);
  assert.ok(asignaturas(resultado) >= asignaturas(resultadoBase));
  assert.ok(asignaturas(resultado) > asignaturas(resultadoBase) || resultado.length <= resultadoBase.length);
  assert.ok(mejorado.estadisticas.mejorasLocales > 0);
  const recursos = resultado.flatMap(p => p.asignaturas.flatMap(a => [p.estudiante1 + '|' + a, p.estudiante2 + '|' + a]));
  assert.equal(new Set(recursos).size, recursos.length);
});

test('el cálculo en segundo plano da el mismo resultado que el síncrono', async () => {
  const datos = instanciaDensa(30, 11);
  const sincrono = new PermutaMatching(datos, { parejasAbiertas: [['1', '2']] });
  const esperado = sincrono.emparejar();
  const { emparejamientos, estadisticas } = await emparejarEnSegundoPlano(datos, { parejasAbiertas: [['1', '2']] });
  assert.deepEqual(emparejamientos, esperado);
  assert.equal(estadisticas.documentos, sincrono.estadisticas.documentos);
});

test('el cálculo en segundo plano respeta el tiempo máximo', async () => {
  await assert.rejects(emparejarEnSegundoPlano(instanciaDensa(300, 3), {}, { tiempoMaximoMs: 1 }), /superó/);
});
