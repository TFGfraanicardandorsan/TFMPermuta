import test from 'node:test';
import assert from 'node:assert/strict';
import database from '../src/config/database.mjs';
import permutaService from '../src/services/permutaService.mjs';
import permutasController from '../src/controllers/permutasController.mjs';

const conexionOriginal = database.connectPostgreSQL;
const telegramOriginal = permutaService.notificarRecordatorioTelegram;
const recordatorioOriginal = permutaService.recordarCompletarDocumento;
const texto = (consulta) => typeof consulta === 'string' ? consulta : consulta.text;

test.afterEach(() => {
  database.connectPostgreSQL = conexionOriginal;
  permutaService.notificarRecordatorioTelegram = telegramOriginal;
  permutaService.recordarCompletarDocumento = recordatorioOriginal;
});

const crearCliente = ({
  estado = 'BORRADOR',
  primero = 'ana',
  segundo = null,
  reciente = false,
} = {}) => {
  const consultas = [];
  const cliente = {
    async query(consulta) {
      consultas.push(consulta);
      const sql = texto(consulta);
      if (['BEGIN', 'COMMIT', 'ROLLBACK'].includes(sql) || /pg_advisory_xact_lock/.test(sql)) {
        return { rows: [], rowCount: 0 };
      }
      if (/FROM permutas WHERE id/.test(sql)) {
        return { rows: [{ id: 42, estado, estudiante_cumplimentado_1: primero, estudiante_cumplimentado_2: segundo }], rowCount: 1 };
      }
      if (/SELECT DISTINCT u.id/.test(sql)) {
        return { rows: [
          { id: 10, nombre_usuario: 'ana', nombre_completo: 'Ana García', correo: 'ana@alum.us.es' },
          { id: 20, nombre_usuario: 'bruno', nombre_completo: 'Bruno López', correo: 'bruno@alum.us.es' },
        ], rowCount: 2 };
      }
      if (/SELECT 1 FROM notificacion/.test(sql)) {
        return { rows: reciente ? [{ '?column?': 1 }] : [], rowCount: reciente ? 1 : 0 };
      }
      if (/INSERT INTO notificacion/.test(sql)) return { rows: [], rowCount: 1 };
      assert.fail(`Consulta inesperada: ${sql}`);
    },
    async end() {},
  };
  database.connectPostgreSQL = async () => cliente;
  return { consultas };
};

test('un compañero puede recordar al primer estudiante que complete el borrador', async () => {
  const fake = crearCliente();
  const telegram = [];
  permutaService.notificarRecordatorioTelegram = async (...args) => {
    telegram.push(args);
    return true;
  };

  const resultado = await permutaService.recordarCompletarDocumento(42, 'bruno');

  assert.equal(resultado.telegramEnviado, true);
  assert.deepEqual(resultado.destinatario, { uvus: 'ana', nombre_completo: 'Ana García' });
  const insercion = fake.consultas.find((consulta) => /INSERT INTO notificacion/.test(texto(consulta)));
  assert.equal(insercion.values[0], 20);
  assert.equal(insercion.values[2], 10);
  assert.match(insercion.values[1], /^Bruno López quiere que termines el proceso de permuta/);
  assert.deepEqual(telegram, [['ana', insercion.values[1]]]);
});

test('después de la primera firma solo se puede avisar al segundo estudiante', async () => {
  const fake = crearCliente({ estado: 'FIRMADA' });
  permutaService.notificarRecordatorioTelegram = async () => false;

  const resultado = await permutaService.recordarCompletarDocumento(42, 'ana');

  assert.equal(resultado.telegramEnviado, false);
  assert.equal(resultado.destinatario.uvus, 'bruno');
  const insercion = fake.consultas.find((consulta) => /INSERT INTO notificacion/.test(texto(consulta)));
  assert.equal(insercion.values[2], 20);
});

test('no permite avisar cuando la parte del solicitante es la pendiente ni cuando el documento terminó', async () => {
  crearCliente();
  await assert.rejects(
    permutaService.recordarCompletarDocumento(42, 'ana'),
    (error) => error.statusCode === 409 && /Tu parte/.test(error.message)
  );

  crearCliente({ estado: 'ACEPTADA', segundo: 'bruno' });
  await assert.rejects(
    permutaService.recordarCompletarDocumento(42, 'ana'),
    (error) => error.statusCode === 409 && /ninguna parte pendiente/.test(error.message)
  );
});

test('el bloqueo y el límite temporal impiden recordatorios repetidos', async () => {
  const fake = crearCliente({ reciente: true });
  await assert.rejects(
    permutaService.recordarCompletarDocumento(42, 'bruno'),
    (error) => error.statusCode === 429
  );
  assert.ok(fake.consultas.some((consulta) => /pg_advisory_xact_lock/.test(texto(consulta))));
  assert.equal(fake.consultas.some((consulta) => /INSERT INTO notificacion/.test(texto(consulta))), false);
});

test('el controlador valida el documento y usa siempre el usuario de sesión', async () => {
  const respuesta = () => ({
    status(codigo) { this.statusCode = codigo; return this; },
    json(cuerpo) { this.body = cuerpo; return this; },
  });
  const invalida = respuesta();
  await permutasController.recordarCompletarDocumento({ session: { user: { nombre_usuario: 'ana' } }, params: { id: '0' } }, invalida);
  assert.equal(invalida.statusCode, 400);

  const llamadas = [];
  permutaService.recordarCompletarDocumento = async (...args) => { llamadas.push(args); return { notificacionSistema: true }; };
  const correcta = respuesta();
  await permutasController.recordarCompletarDocumento({
    session: { user: { nombre_usuario: 'bruno' } },
    params: { id: '42' },
    body: { uvus: 'tercero' },
  }, correcta);
  assert.equal(correcta.statusCode, 200);
  assert.deepEqual(llamadas, [[42, 'bruno']]);
});

test('el seguimiento devuelve nombre, correo y permiso de aviso de cada participante', async () => {
  const fila = {
    permuta_id: 7,
    curso: 'PRIMERO',
    bloque_id: null,
    en_bloque: false,
    nombre_asignatura: 'Álgebra',
    codigo_asignatura: 1001,
    grupo_1: '1',
    grupo_2: '2',
    estado: 'FINALIZADA',
    usuario_1_uvus: 'ana',
    usuario_1_nombre: 'Ana García',
    usuario_1_correo: 'ana@alum.us.es',
    usuario_2_uvus: 'bruno',
    usuario_2_nombre: 'Bruno López',
    usuario_2_correo: 'bruno@alum.us.es',
    usuario_primario: 'ana',
    usuario_secundario: 'bruno',
    documento_permuta_id: 42,
    estado_permuta_asociada: 'BORRADOR',
    estudiante_cumplimentado_1: 'ana',
    estudiante_cumplimentado_2: null,
  };
  database.connectPostgreSQL = async () => ({
    async query() { return { rows: [fila], rowCount: 1 }; },
    async end() {},
  });

  const [grupo] = await permutaService.obtenerPermutasAgrupadasPorUsuario('bruno');

  assert.deepEqual(grupo.participantes, [
    { uvus: 'ana', nombre_completo: 'Ana García', correo: 'ana@alum.us.es' },
    { uvus: 'bruno', nombre_completo: 'Bruno López', correo: 'bruno@alum.us.es' },
  ]);
  assert.equal(grupo.documento_permuta_id, 42);
  assert.equal(grupo.usuario_pendiente, 'ana');
  assert.equal(grupo.puede_notificar_companero, true);
  assert.equal('participantes_por_uvus' in grupo, false);
});
