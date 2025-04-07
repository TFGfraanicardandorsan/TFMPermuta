const subirArchivo = (req, res) => {
    if (!req.file) {
        return res.status(400).send('No se ha subido ningún archivo');
    }

    return res.status(200).json({
        message: "Archivo subido correctamente",
        fileId: req.file.filename   
    });
};

export default {
   subirArchivo
};
