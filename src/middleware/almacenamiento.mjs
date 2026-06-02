import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const tipo = req.body.tipo;
    let uploadPath;
    if (tipo === "buzon") {
      uploadPath = process.env.BUZON;
    } else if (tipo === "archivador") {
      uploadPath = process.env.ARCHIVADOR;
    } else if (tipo === "proyectoDocente") {
      uploadPath = process.env.PROYECTO_DOCENTE;
    } else if (tipo === "plantilla") {
      uploadPath = process.env.PLANTILLAS;
    } else {
      return cb(new Error("Tipo de carpeta no válido"));
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    if (req.body.tipo === "plantilla") {
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

      cb(null, `plantillaPermuta${startYY}${endYY}.pdf`);
    } else {
      const extension = path.extname(file.originalname);
      cb(null, uuidv4() + extension);
    }
  },
});

const upload = multer({ storage });
export default upload;
