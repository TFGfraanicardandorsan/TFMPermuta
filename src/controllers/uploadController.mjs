import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import GenericValidators from "../utils/genericValidators.mjs";
import { obtenerCursoAcademico } from "../utils/cursoAcademico.mjs";

const DIRECTORIO_PROYECTO = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "../.."
);

const nombrePlantillaCursoActual = () => {
  const [inicio, fin] = obtenerCursoAcademico().split("-");
  return `plantillaPermuta${inicio.slice(-2)}${fin.slice(-2)}.pdf`;
};

const subirArchivo = (req, res) => {
  try {
    if (!req.session.user) {
      return res
        .status(401)
        .json({ err: true, message: "No hay usuario en la sesión" });
    }
    if (!req.file) {
      return res.status(400).send("No se ha subido ningún archivo");
    }
    if (!GenericValidators.isString(req.file.filename, 50)) {
      return res
        .status(400)
        .send("Nombre de archivo no válido (debe ser PDF o PNG)");
    }
    return res.status(200).json({
      message: "Archivo subido correctamente",
      fileId: req.file.filename,
    });
  } catch (error) {
    console.error("Error al subir el archivo:", error);
    return res.status(500).send("Error interno del servidor");
  }
};

const servirArchivo = (req, res) => {
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

    if (!GenericValidators.isString(fileId, 50)) {
      return res
        .status(400)
        .send("Nombre de archivo no válido (debe ser PDF o PNG)");
    }
    const ext = path.extname(fileId).toLowerCase();
    if (ext !== ".pdf" && ext !== ".png") {
      return res.status(400).send("Solo se permiten archivos PDF o PNG");
    }

    const filePath = path.join(baseDir, fileId);
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("No se ha encontrado el archivo:", err);
        res.status(404).send("Archivo no encontrado");
      }
    });
  } catch (error) {
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
