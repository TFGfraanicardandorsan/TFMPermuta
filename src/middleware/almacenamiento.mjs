import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const UPLOADS_FOLDER = process.env.UPLOADS_FOLDER 
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("Guardando en:", UPLOADS_FOLDER); 
        cb(null, UPLOADS_FOLDER);
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, uuidv4() + extension);
    }
});

const upload = multer({ storage });
export default upload;