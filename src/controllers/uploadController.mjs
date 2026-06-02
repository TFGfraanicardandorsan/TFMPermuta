import path from "path";
import GenericValidators from "../utils/genericValidators.mjs";

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
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth(); // 0-11

    let startYear, endYear;
    if (month >= 8) { // September or later
      startYear = year;
      endYear = year + 1;
    } else {
      startYear = year - 1;
      endYear = year;
    }

    const startYY = startYear.toString().slice(-2);
    const endYY = endYear.toString().slice(-2);

    const pdfPath = path.join(
      process.env.PLANTILLAS,
      `plantillaPermuta${startYY}${endYY}.pdf`
    );
    res.sendFile(pdfPath, (err) => {
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

export default {
  subirArchivo,
  servirArchivo,
  obtenerPlantillaPermuta,
};
