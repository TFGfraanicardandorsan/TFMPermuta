import test from "node:test";
import assert from "node:assert/strict";
import database from "../src/config/database.mjs";
import valoracionAsignaturaService from "../src/services/valoracionAsignaturaService.mjs";

const originalConnectPostgreSQL = database.connectPostgreSQL;

test.afterEach(() => {
  database.connectPostgreSQL = originalConnectPostgreSQL;
});

test("guarda el grupo y curso académico actuales en la valoración", async () => {
  const consultas = [];
  const respuestas = [
    { rows: [] },
    {
      rows: [{
        usuario_id: 4,
        asignatura_id: 9,
        asignatura_codigo: 2050001,
        asignatura_nombre: "Matemáticas",
        asignatura_siglas: "MAT",
        grupo_id: 12,
        grupo_numero: "2",
      }],
    },
    {
      rows: [{
        id: 21,
        codigo: "valoracion_global",
        bloque: 1,
        bloque_nombre: "Valoración",
        enunciado: "Valoración global",
        tipo_respuesta: "escala_1_10",
        condicion: null,
        orden: 1,
      }],
    },
    { rows: [] },
    { rows: [] },
  ];
  let cerrada = false;
  database.connectPostgreSQL = async () => ({
    async query(query) {
      consultas.push(query);
      return respuestas.shift() ?? { rows: [] };
    },
    async end() {
      cerrada = true;
    },
  });

  const resultado = await valoracionAsignaturaService.guardarValoracionAsignatura(
    "usuario",
    2050001,
    [{ preguntaId: 21, respuesta: 9 }],
    { cursoAcademico: "2026-2027" }
  );

  const insercion = consultas[3];
  assert.deepEqual(insercion.values, [4, 9, 12, "2026-2027", 21, null, 9, null]);
  assert.match(insercion.text, /ON CONFLICT \(usuario_id_fk, asignatura_id_fk, curso_academico, pregunta_id_fk\)/);
  assert.deepEqual(resultado.grupo, { id: 12, numero: "2" });
  assert.equal(resultado.cursoAcademico, "2026-2027");
  assert.equal(cerrada, true);
});

test("genera la comparativa por grupo y curso sin mezclar repeticiones", () => {
  const base = {
    asignatura_codigo: 2050001,
    asignatura_nombre: "Matemáticas",
    asignatura_siglas: "MAT",
    pregunta_id: 21,
    pregunta_codigo: "valoracion_global",
    bloque: 1,
    bloque_nombre: "Valoración",
    enunciado: "Valoración global",
    tipo_respuesta: "escala_1_10",
    orden: 1,
    respuesta_boolean: null,
    respuesta_texto: null,
    fecha_respuesta: new Date(),
  };

  const resultado = valoracionAsignaturaService.formatearEstadisticas([
    { ...base, usuario_id_fk: 1, grupo_id_fk: 10, grupo_numero: "1", curso_academico: "2025-2026", respuesta_numero: 8 },
    { ...base, usuario_id_fk: 1, grupo_id_fk: 20, grupo_numero: "2", curso_academico: "2026-2027", respuesta_numero: 6 },
    { ...base, usuario_id_fk: 2, grupo_id_fk: 20, grupo_numero: "2", curso_academico: "2026-2027", respuesta_numero: 10 },
  ]);

  assert.equal(resultado[0].totalValoraciones, 3);
  assert.deepEqual(resultado[0].comparativaGrupos, [
    {
      cursoAcademico: "2026-2027",
      grupos: [{ grupoId: 20, grupoNumero: "2", totalValoraciones: 2, mediaGlobal: 8 }],
    },
    {
      cursoAcademico: "2025-2026",
      grupos: [{ grupoId: 10, grupoNumero: "1", totalValoraciones: 1, mediaGlobal: 8 }],
    },
  ]);
});
