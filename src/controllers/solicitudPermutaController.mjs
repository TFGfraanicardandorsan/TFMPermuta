import solicitudPermutaService from "../services/solicitudPermutaService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const solicitarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { asignatura, grupos_deseados } = req.body;

        const validAsignatura = GenericValidators.isInteger(asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        const validGrupos = GenericValidators.isArrayOfIntegers(grupos_deseados, "Grupos deseados");
        if (!validGrupos.valido) {
            return res.status(400).json({ err: true, message: validGrupos.mensaje });
        }

        res.send({ err: false, result: await solicitudPermutaService.solicitarPermuta(uvus, asignatura, grupos_deseados) });
    } catch (err) {
        console.error('api solicitarPermuta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en solicitarPermuta', details: err.message });
    }
};

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
    // INTEGER
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { solicitud } = req.body;
        const validSolicitud = GenericValidators.isInteger(solicitud, "Solicitud");
        if (!validSolicitud.valido) {
            return res.status(400).json({ err: true, message: validSolicitud.mensaje });
        }
        res.send({ err: false, result: await solicitudPermutaService.aceptarSolicitudPermuta(uvus, solicitud) });
    } catch (err){
        console.error('api aceptarSolicitudPermuta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en aceptarSolicitudPermuta', details: err.message });
    }
}

const validarSolicitudPermuta = async (req,res) => {
    // INTEGER
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { solicitud } = req.body;
        const validSolicitud = GenericValidators.isInteger(solicitud, "Solicitud");
        if (!validSolicitud.valido) {
            return res.status(400).json({ err: true, message: validSolicitud.mensaje });
        }
        res.send({ err: false, result: await solicitudPermutaService.actualizarEstadoPermuta(solicitud, uvus) });
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
    // INTEGER
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const permutaId = parseInt(req.params.id);
        const validPermutaId = GenericValidators.isInteger(permutaId, "PermutaId");
        if (!validPermutaId.valido) {
            return res.status(400).json({ err: true, message: validPermutaId.mensaje });
        }
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
    // INTEGER
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const permutaId = parseInt(req.params.id);
        const validPermutaId = GenericValidators.isInteger(permutaId, "PermutaId");
        if (!validPermutaId.valido) {
            return res.status(400).json({ err: true, message: validPermutaId.mensaje });
        }
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

    const getTodasSolicitudesPermuta = async (req,res) => {
        try{
            if (!req.session.user) {
                return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
            }
            const uvus = req.session.user.nombre_usuario;
            res.send({err:false, result:await solicitudPermutaService.getTodasSolicitudesPermuta()})
            } catch (err){
                console.error('api verListaPermutas ha tenido una excepción:', err);
                res.status(500).json({ err: true, message: 'Error interno en verListaPermutas', details: err.message });
            }
        }

export default {
    solicitarPermuta,
    getSolicitudesPermutaInteresantes,
    getMisSolicitudesPermuta,
    aceptarSolicitudPermuta,
    verListaPermutas,
    proponerPermutas,
    validarSolicitudPermuta,
    aceptarPermutaPropuesta,
    rechazarPermutaPropuesta,
    getTodasSolicitudesPermuta
}