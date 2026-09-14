import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import adminPermutasService from '../src/services/adminPermutasService.mjs';
import adminPermutasRoutes from '../src/routes/adminPermutasRoutes.mjs';
import solicitudPermutaService from '../src/services/solicitudPermutaService.mjs';

const originalConnect = database.connectPostgreSQL;
const texto = (consulta) => typeof consulta === 'string' ? consulta : consulta.text;

test.afterEach(() => { database.connectPostgreSQL = originalConnect; });

const usarCliente = (resolver) => {
  const consultas = [];
  const cliente = {
    async query(consulta) {
      consultas.push(consulta);
      const sql = texto(consulta);
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) || /pg_advisory_xact_lock/.test(sql)) {
        return { rows: [], rowCount: 0 };
      }
      if (/INSERT INTO notificacion/.test(sql)) return { rows: [], rowCount: 1 };
      const resultado = await resolver(consulta);
      assert.ok(resultado, `Consulta inesperada: ${sql}`);
      return resultado;
    },
    async end() {},
  };
  database.connectPostgreSQL = async () => cliente;
  return consultas;
};

test('la API administrativa aplica el rol una vez y expone todas las operaciones', () => {
  const rutas = adminPermutasRoutes.stack.filter((capa) => capa.route).map((capa) => capa.route.path);
  assert.deepEqual(rutas, [
    '/panel', '/buscar-parejas', '/generar-propuestas',
    '/solicitudes/:id/cancelar', '/permutas/:id/cancelar', '/retirar-vigencia',
  ]);
  assert.equal(adminPermutasRoutes.stack[0].route, undefined);
});

test('el panel administrativo rechaza sesiones de estudiante', () => {
  const respuesta = {
    status(codigo) { this.codigo = codigo; return this; },
    json(cuerpo) { this.cuerpo = cuerpo; return this; },
  };
  adminPermutasRoutes.stack[0].handle(
    { session: { user: { rol: 'estudiante' } } },
    respuesta,
    () => assert.fail('No debe continuar la cadena de middlewares')
  );
  assert.equal(respuesta.codigo, 403);
});

test('buscar parejas óptimas devuelve una previsualización legible y no escribe datos', async () => {
  const consultas = usarCliente((consulta) => {
    if (/SELECT DISTINCT sp.usuario_id_fk/.test(texto(consulta))) return { rows: [
      { solicitud_id: 1, estudiante_id: 1, estudiante_uvus: 'ana', estudiante_nombre: 'Ana',
        asignatura: 100, asignatura_codigo: 2001, asignatura_nombre: 'Cálculo', curso: 'PRIMERO',
        bloque_id: null, grupo_actual: 10, grupo_deseado: 20 },
      { solicitud_id: 2, estudiante_id: 2, estudiante_uvus: 'luis', estudiante_nombre: 'Luis',
        asignatura: 100, asignatura_codigo: 2001, asignatura_nombre: 'Cálculo', curso: 'PRIMERO',
        bloque_id: null, grupo_actual: 20, grupo_deseado: 10 },
    ] };
  });
  const resultado = await solicitudPermutaService.buscarParejasOptimas();
  assert.equal(resultado.solicitudesAnalizadas, 2);
  assert.equal(resultado.asignaturasResueltas, 1);
  assert.equal(resultado.parejas[0].estudiante1.uvus, 'ana');
  assert.equal(resultado.parejas[0].asignaturas[0].nombre, 'Cálculo');
  assert.equal(consultas.some((consulta) => /INSERT|UPDATE|DELETE/.test(texto(consulta))), false);
});

test('cancelar una permuta amplía su bloque y sincroniza documentos y solicitudes del solicitante', async () => {
  let consultaPermutas = 0;
  const consultas = usarCliente((consulta) => {
    const sql = texto(consulta);
    if (/INNER JOIN usuario u ON u.nombre_usuario/.test(sql)) {
      return { rows: [{ id: 10, bloque_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', usuario_id: 1 }] };
    }
    if (/FROM permuta p/.test(sql) && /asignatura_id AS/.test(sql) === false
      && /asignatura_id_fk AS asignatura_id/.test(sql)) {
      consultaPermutas++;
      return consultaPermutas === 1
        ? { rows: [{ id: 10, bloque_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', asignatura_id: 100 }] }
        : { rows: [
          { id: 10, bloque_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', asignatura_id: 100 },
          { id: 11, bloque_id: 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', asignatura_id: 101 },
        ] };
    }
    if (/SELECT id, bloque_id FROM solicitud_permuta/.test(sql)) {
      assert.deepEqual(consulta.values, [1, [100, 101]]);
      return { rows: [{ id: 20, bloque_id: null }, { id: 21, bloque_id: null }] };
    }
    if (/SELECT ps.id FROM permutas ps/.test(sql)) return { rows: [{ id: 30 }] };
    if (/UPDATE permutas SET vigente/.test(sql)) return { rows: [], rowCount: 1 };
    if (/UPDATE permuta SET estado = 'RECHAZADA'/.test(sql)) return { rows: [], rowCount: 2 };
    if (/UPDATE solicitud_permuta SET estado = 'CANCELADA'/.test(sql)) return { rows: [], rowCount: 2 };
  });

  const resultado = await adminPermutasService.cancelarPermuta(10, 'alumno1', 'Baja solicitada');
  assert.deepEqual(resultado, {
    solicitudesCanceladas: 2,
    permutasCanceladas: 2,
    documentosRetirados: 1,
  });
  assert.ok(consultas.some((consulta) => texto(consulta) === 'COMMIT'));
  assert.deepEqual(
    consultas.find((consulta) => /UPDATE permuta SET estado = 'RECHAZADA'/.test(texto(consulta))).values,
    [[10, 11]]
  );
});

test('la retirada global confirma las tres tablas en una única transacción', async () => {
  const consultas = usarCliente((consulta) => {
    const sql = texto(consulta);
    if (/UPDATE solicitud_permuta SET vigente/.test(sql)) return { rows: [{ id: 1 }, { id: 2 }], rowCount: 2 };
    if (/UPDATE permuta SET vigente/.test(sql)) return { rows: [{ id: 10 }], rowCount: 1 };
    if (/UPDATE permutas SET vigente/.test(sql)) return { rows: [{ id: 20 }], rowCount: 1 };
  });
  const resultado = await adminPermutasService.retirarVigenciaGlobal('Fin de curso');
  assert.deepEqual(resultado, { solicitudesRetiradas: 2, permutasRetiradas: 1, documentosRetirados: 1 });
  assert.equal(consultas[0], 'BEGIN');
  assert.equal(consultas.at(-1), 'COMMIT');
});

test('si falla una tabla al retirar vigencia se revierte el cierre completo', async () => {
  const consultas = usarCliente((consulta) => {
    const sql = texto(consulta);
    if (/UPDATE solicitud_permuta SET vigente/.test(sql)) return { rows: [{ id: 1 }], rowCount: 1 };
    if (/UPDATE permuta SET vigente/.test(sql)) throw new Error('Fallo simulado');
  });
  await assert.rejects(adminPermutasService.retirarVigenciaGlobal('Fin de curso'), /Fallo simulado/);
  assert.equal(consultas.at(-1), 'ROLLBACK');
  assert.equal(consultas.includes('COMMIT'), false);
});
