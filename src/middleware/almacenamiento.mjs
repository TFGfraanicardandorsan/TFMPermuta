import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const UPLOADS_FOLDER = process.env.UPLOADS_FOLDER || "uploads"; 
const storage = multer.diskStorage({
    destination: path.join(__dirname, UPLOADS_FOLDER),
    filename: (req, file, cb) => {
        const extension = path.extname(file.originalname);
        cb(null, uuidv4() + extension);
    }
});
const upload = multer({ storage });
export default upload;