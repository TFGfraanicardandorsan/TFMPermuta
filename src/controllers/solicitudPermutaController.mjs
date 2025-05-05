import solicitudPermutaService from "../services/solicitudPermutaService.mjs";


const solicitarPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.solicitarPermuta(uvus, req.body.asignatura, req.body.grupos_deseados)})
        } catch (err){
            console.error('api solicitarPermuta ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en solicitarPermuta', details: err.message });
        }
}

const getSolicitudesPermutaInteresantes = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.getSolicitudesPermutaInteresantes(uvus)})
        } catch (err){
            console.error('api getSolicitudesPermutaInteresantes ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en getSolicitudesPermutaInteresantes', details: err.message });
        }
    }

const getMisSolicitudesPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.getMisSolicitudesPermuta(uvus)})
        } catch (err){
            console.error('api getMisSolicitudesPermuta ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en getMisSolicitudesPermuta', details: err.message });
        }
    }

const aceptarSolicitudPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.aceptarSolicitudPermuta(uvus, req.body.solicitud)})
        } catch (err){
            console.error('api aceptarSolicitudPermuta ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en aceptarSolicitudPermuta', details: err.message });
        }
    }


    const validarSolicitudPermuta = async (req,res) => {
        try{
            if (!req.session.user) {
                return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
            }
            const uvus = req.session.user.nombre_usuario;
            res.send({err:false, result:await solicitudPermutaService.validarSolicitudPermuta(uvus, req.body.solicitud)})
            } catch (err){
                console.error('api validarSolicitudPermuta ha tenido una excepción:', err);
                res.status(500).json({ err: true, message: 'Error interno en validarSolicitudPermuta', details: err.message });
            }
        }

    const verListaPermutas = async (req,res) => {
        try{
            if (!req.session.user) {
                return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
            }
            const uvus = req.session.user.nombre_usuario;
            res.send({err:false, result:await solicitudPermutaService.verListaPermutas(uvus)})
            } catch (err){
                console.error('api verListaPermutas ha tenido una excepción:', err);
                res.status(500).json({ err: true, message: 'Error interno en verListaPermutas', details: err.message });
            }
        }

    const proponerPermutas = async (req, res) => {
        try {
            if (!req.session.user) {
                return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
            }
            res.send({err: false, result: await solicitudPermutaService.proponerPermutas()});
        } catch (err) {
            console.error('api proponerPermutas ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en proponerPermutas', details: err.message });
        }
    }

const aceptarPermutaPropuesta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const permutaId = req.params.id;
        
        res.send({
            err: false, 
            result: await solicitudPermutaService.aceptarPermutaPropuesta(uvus, permutaId)
        });
    } catch (err) {
        console.error('api aceptarPermutaPropuesta ha tenido una excepción:', err);
        res.status(500).json({ 
            err: true, 
            message: 'Error interno en aceptarPermutaPropuesta', 
            details: err.message 
        });
    }
};

const rechazarPermutaPropuesta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const permutaId = req.params.id;
        
        res.send({
            err: false, 
            result: await solicitudPermutaService.rechazarPermutaPropuesta(uvus, permutaId)
        });
    } catch (err) {
        console.error('api rechazarPermutaPropuesta ha tenido una excepción:', err);
        res.status(500).json({ 
            err: true, 
            message: 'Error interno en rechazarPermutaPropuesta', 
            details: err.message 
        });
    }
};

export default {
    solicitarPermuta,
    getSolicitudesPermutaInteresantes,
    getMisSolicitudesPermuta,
    aceptarSolicitudPermuta,
    verListaPermutas,
    proponerPermutas,
    validarSolicitudPermuta,
    aceptarPermutaPropuesta,
    rechazarPermutaPropuesta
}