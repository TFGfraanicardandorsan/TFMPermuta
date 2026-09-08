import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'fs';
import path from 'path';
import uploadController from '../src/controllers/uploadController.mjs';

const plantillasOriginal = process.env.PLANTILLAS;

test.afterEach(() => {
  if (plantillasOriginal === undefined) {
    delete process.env.PLANTILLAS;
  } else {
    process.env.PLANTILLAS = plantillasOriginal;
  }
});

test('sirve la plantilla incluida cuando falta en PLANTILLAS', () => {
  process.env.PLANTILLAS = path.resolve('tmp', 'directorio-inexistente');
  let rutaEnviada;
  const res = {
    headersSent: false,
    status() {
      assert.fail('No debe responder con error');
    },
    sendFile(ruta, callback) {
      rutaEnviada = ruta;
      callback?.();
    },
  };

  uploadController.obtenerPlantillaPermuta(
    { session: { user: { nombre_usuario: 'alumno' } } },
    res
  );

  assert.match(rutaEnviada, /modelos[/\\]plantillaPermuta2627\.pdf$/);
  assert.equal(fs.existsSync(rutaEnviada), true);
});
