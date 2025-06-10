import importDatosService from '../services/importDatosService.mjs';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const upload = multer({ dest: 'uploads/' });

class ImportDatosController {
  importarAsignaturasDesdeCSVHandler(req, res) {
    upload.single('file')(req, res, async (err) => {
      if (err) {
        return res.status(400).json({ error: 'Error al subir el archivo' });
      }
      if (!req.file) {
        return res.status(400).json({ error: 'No se ha enviado ningún archivo' });
      }
      const rutaArchivo = path.resolve(req.file.path);
      try {
        await importDatosService.importarAsignaturasDesdeCSV(rutaArchivo);
        fs.unlinkSync(rutaArchivo); // Borra el archivo temporal tras importar
        res.status(200).json({ mensaje: 'Importación completada correctamente' });
      } catch (error) {
        res.status(500).json({ error: 'Error al importar asignaturas', detalle: error.message });
      }
    });
  }
}

const importDatosController = new ImportDatosController();
export default importDatosController;