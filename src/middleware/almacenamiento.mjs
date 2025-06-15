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
    } else if (tipo === "proyectoDocente"){
      uploadPath = process.env.PROYECTO_DOCENTE;
    }else {
      return cb(new Error("Tipo de carpeta no válido"));
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const extension = path.extname(file.originalname);
    cb(null, uuidv4() + extension);
  },
});

const upload = multer({ storage });
export default upload;
