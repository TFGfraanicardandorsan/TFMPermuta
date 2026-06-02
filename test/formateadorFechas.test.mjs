import test from 'node:test';
import assert from 'node:assert/strict';
import { formatearFecha } from '../src/utils/formateadorFechas.mjs';

// The formatting depends on locale es-ES and strips comma

test('formatearFecha returns dd/mm/yyyy hh:mm format', () => {
  const input = '2024-12-31T23:45:00.000Z';
  const formatted = formatearFecha(input);
  // The exact hour depends on timezone; ensure structure and separators
  assert.match(formatted, /^\d{2}\/\d{2}\/\d{4}\s\d{2}:\d{2}$/);
});
