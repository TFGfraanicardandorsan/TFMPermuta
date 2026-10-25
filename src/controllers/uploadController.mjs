import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { randomUUID } from 'node:crypto';
import { FILE_ID_RE, registrarArchivo, puedeLeerArchivo } from '../services/archivoService.mjs';
import { obtenerCursoAcademico } from "../utils/cursoAcademico.mjs";

const DIRECTORIO_PROYECTO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const nombrePlantillaCursoActual = () => {
  const [inicio, fin] = obtenerCursoAcademico().split("-");
  return `plantillaPermuta${inicio.slice(-2)}${fin.slice(-2)}.pdf`;
};

const subirArchivo = async (req, res) => {
  let createdPath;
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ err: true, message: "No hay usuario en la sesión" });
    }
    if (!req.file) {
      return res.status(400).send("No se ha subido ningún archivo");
    }
    const { tipo } = req.body;
    const directories = { buzon: process.env.BUZON, archivador: process.env.ARCHIVADOR,
      proyectoDocente: process.env.PROYECTO_DOCENTE, plantilla: process.env.PLANTILLAS };
    if (!Object.hasOwn(directories, tipo)) return res.status(400).json({ err: true, message: 'Tipo no válido.' });
    if (['plantilla', 'proyectoDocente'].includes(tipo) && req.session.user.rol !== 'administrador') {
      return res.status(403).json({ err: true, message: 'Acceso denegado.' });
    }
    const ext = path.extname(req.file.originalname).toLowerCase();
    const buffer = req.file.buffer;
    const isPdf = ext === '.pdf' && buffer.subarray(0, 5).equals(Buffer.from('%PDF-'));
    const isPng = tipo === 'buzon' && ext === '.png'
      && buffer.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]));
    if (!isPdf && !isPng) return res.status(400).json({ err: true, message: 'Contenido de archivo no válido.' });
    if (!directories[tipo]) throw new Error('Directorio de almacenamiento no configurado.');
    const baseDir = await fs.promises.realpath(directories[tipo]);
    const filename = tipo === 'plantilla' ? nombrePlantillaCursoActual() : `${randomUUID()}${ext}`;
    createdPath = path.join(baseDir, tipo === 'plantilla' ? `${randomUUID()}.tmp` : filename);
    await fs.promises.writeFile(createdPath, buffer, { flag: 'wx', mode: 0o600 });
    if (tipo === 'plantilla') {
      await fs.promises.rename(createdPath, path.join(baseDir, filename));
    } else {
      await registrarArchivo(tipo, filename, req.session.user.nombre_usuario);
    }
    createdPath = undefined;
    return res.status(200).json({
      message: "Archivo subido correctamente",
      fileId: filename,
    });
  } catch (error) {
    if (createdPath) await fs.promises.unlink(createdPath).catch(() => {});
    console.error("Error al subir el archivo:", error);
    return res.status(500).send("Error interno del servidor");
  }
};

const servirArchivo = async (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ err: true, message: "No hay usuario en la sesión" });
    }
    const { tipo, fileId } = req.params;
    if (tipo !== "archivador" && tipo !== "buzon") {
      return res
        .status(400)
        .send("Tipo de carpeta no válido (debe ser 'archivador' o 'buzon')");
    }
    let baseDir =
      tipo === "archivador" ? process.env.ARCHIVADOR : process.env.BUZON;

    if (!FILE_ID_RE.test(fileId)) {
      return res
        .status(400)
        .send("Nombre de archivo no válido (debe ser PDF o PNG)");
    }
    const ext = path.extname(fileId).toLowerCase();
    if (ext !== ".pdf" && ext !== ".png") {
      return res.status(400).send("Solo se permiten archivos PDF o PNG");
    }

    if (!await puedeLeerArchivo(tipo, fileId, req.session.user)) {
      return res.status(404).send('Archivo no encontrado');
    }
    baseDir = await fs.promises.realpath(baseDir);
    const filePath = await fs.promises.realpath(path.join(baseDir, fileId));
    if (path.dirname(filePath) !== baseDir) return res.status(404).send('Archivo no encontrado');
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Content-Disposition', `attachment; filename="${fileId}"`);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("No se ha encontrado el archivo:", err);
        if (!res.headersSent) res.status(404).send("Archivo no encontrado");
      }
    });
  } catch (error) {
    if (error.code === 'ENOENT') return res.status(404).send('Archivo no encontrado');
    console.error("Error al servir el archivo:", error);
    return res.status(500).send("Error interno del servidor");
  }
};
const obtenerPlantillaPermuta = (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ err: true, message: "No hay usuario en la sesión" });
    }
    const nombrePlantilla = nombrePlantillaCursoActual();
    const rutaConfigurada = process.env.PLANTILLAS
      ? path.resolve(process.env.PLANTILLAS, nombrePlantilla)
      : null;
    const rutaRespaldo = path.resolve(
      DIRECTORIO_PROYECTO,
      "modelos",
      nombrePlantilla
    );
    const pdfPath = rutaConfigurada && fs.existsSync(rutaConfigurada)
      ? rutaConfigurada
      : rutaRespaldo;

    if (!fs.existsSync(pdfPath)) {
      console.error(`No se ha encontrado la plantilla ${nombrePlantilla}`);
      return res.status(404).json({
        err: true,
        message: `No se ha instalado la plantilla ${nombrePlantilla}`,
      });
    }

    res.sendFile(pdfPath, (err) => {
      if (err) {
        console.error("No se ha encontrado el archivo:", err);
        if (!res.headersSent) {
          res.status(404).send("Archivo no encontrado");
        }
      }
    });
  } catch (error) {
    console.error("Error al servir el archivo:", error);
    return res.status(500).send("Error interno del servidor");
  }
};

export default {
  subirArchivo,
  servirArchivo,
  obtenerPlantillaPermuta,
};
