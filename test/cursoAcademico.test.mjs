import test from "node:test";
import assert from "node:assert/strict";
import { obtenerCursoAcademico } from "../src/utils/cursoAcademico.mjs";

test("el curso académico cambia al comenzar septiembre", () => {
  assert.equal(obtenerCursoAcademico(new Date("2026-08-31T12:00:00Z")), "2025-2026");
  assert.equal(obtenerCursoAcademico(new Date("2026-09-01T12:00:00Z")), "2026-2027");
});

test("rechaza fechas no válidas", () => {
  assert.throws(() => obtenerCursoAcademico("fecha-invalida"), /no es válida/);
});
