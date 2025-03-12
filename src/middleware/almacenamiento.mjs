import multer from "multer";
import path from "path";
import { v4 as uuidv4 } from "uuid";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_FOLDER = process.env.UPLOADS_FOLDER;
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        console.log("Guardando en:", UPLOADS_FOLDER); 
        cb(null, path.join(__dirname, UPLOADS_FOLDER));
    },
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, uuidv4() + extension);
    }
});

const upload = multer({ storage });
export default upload;