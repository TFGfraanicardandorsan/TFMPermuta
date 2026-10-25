import multer from 'multer';
import path from 'node:path';

export const MAX_UPLOAD_BYTES = 12 * 1024 * 1024;
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1, fields: 4, parts: 5, fieldSize: 1024 },
  fileFilter(req, file, cb) {
    const tipo = req.body.tipo;
    if (!['buzon', 'archivador', 'proyectoDocente', 'plantilla'].includes(tipo)) {
      return cb(Object.assign(new Error('Indica tipo antes del archivo.'), { statusCode: 400 }));
    }
    if (['plantilla', 'proyectoDocente'].includes(tipo) && req.session?.user?.rol !== 'administrador') {
      return cb(Object.assign(new Error('Solo administración puede modificar este archivo.'), { statusCode: 403 }));
    }
    const ext = path.extname(file.originalname).toLowerCase();
    const valid = (ext === '.pdf' && file.mimetype === 'application/pdf')
      || (tipo === 'buzon' && ext === '.png' && file.mimetype === 'image/png');
    return cb(valid ? null : Object.assign(new Error('Tipo de archivo no permitido.'), { statusCode: 400 }), valid);
  },
});
export default upload;
