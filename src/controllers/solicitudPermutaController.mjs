import solicitudPermutaService from "../services/solicitudPermutaService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const MAX_INT_POSTGRES = 2_147_483_647;
const MAX_GRUPOS_DESEADOS = 100;

const validarEnteroPositivo = (valor, nombreCampo) => {
    const numero = typeof valor === 'number'
        ? valor
        : typeof valor === 'string' && /^\d+$/.test(valor.trim())
            ? Number(valor)
            : Number.NaN;

    if (!Number.isSafeInteger(numero) || numero <= 0 || numero > MAX_INT_POSTGRES) {
        return { valido: false, mensaje: `${nombreCampo} debe ser un entero positivo` };
    }
    return { valido: true, valor: numero };
};

const validarArrayEnterosPositivosNoVacio = (valor, nombreCampo) => {
    if (!Array.isArray(valor) || valor.length === 0) {
        return { valido: false, mensaje: `${nombreCampo} debe contener al menos un grupo` };
    }
    if (valor.length > MAX_GRUPOS_DESEADOS) {
        return { valido: false, mensaje: `${nombreCampo} no puede superar ${MAX_GRUPOS_DESEADOS} elementos` };
    }
    if (
        valor.some((item) => (
            !Number.isSafeInteger(item) || item <= 0 || item > MAX_INT_POSTGRES
        ))
    ) {
        return { valido: false, mensaje: `${nombreCampo} debe contener solo enteros positivos` };
    }
    return { valido: true, valor: [...new Set(valor)] };
};

const manejarErrorServicio = (res, error, mensajeGenerico) => {
    if (error.statusCode) {
        return res.status(error.statusCode).json({
            err: true,
            message: error.message,
            ...(error.detalles !== undefined ? { detalles: error.detalles } : {}),
        });
    }
    console.error(mensajeGenerico, error);
    return res.status(500).json({ err: true, message: mensajeGenerico });
};

const solicitarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { grupos_deseados } = req.body;

        const validAsignatura = validarEnteroPositivo(req.body.asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        const asignatura = validAsignatura.valor;
        const validGrupos = validarArrayEnterosPositivosNoVacio(grupos_deseados, "Grupos deseados");
        if (!validGrupos.valido) {
            return res.status(400).json({ err: true, message: validGrupos.mensaje });
        }
        res.send({
            err: false,
            result: await solicitudPermutaService.solicitarPermuta(uvus, asignatura, validGrupos.valor),
        });
    } catch (err) {
        return manejarErrorServicio(res, err, 'Error interno en solicitarPermuta');
    }
};

const editarGruposDeseados = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }

        const validSolicitudId = validarEnteroPositivo(req.params.solicitudId, "Solicitud");
        if (!validSolicitudId.valido) {
            return res.status(400).json({ err: true, message: validSolicitudId.mensaje });
        }
        const validGrupos = validarArrayEnterosPositivosNoVacio(
            req.body.grupos_deseados_ids,
            "Grupos deseados"
        );
        if (!validGrupos.valido) {
            return res.status(400).json({ err: true, message: validGrupos.mensaje });
        }

        const result = await solicitudPermutaService.editarGruposDeseados(
            req.session.user.nombre_usuario,
            validSolicitudId.valor,
            validGrupos.valor
        );
        return res.status(200).json({ err: false, result });
    } catch (error) {
        return manejarErrorServicio(res, error, 'Error interno al editar los grupos deseados');
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
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validSolicitud = validarEnteroPositivo(req.body.solicitud, "Solicitud");
        if (!validSolicitud.valido) {
            return res.status(400).json({ err: true, message: validSolicitud.mensaje });
        }
        const solicitud = validSolicitud.valor;
        res.send({ err: false, result: await solicitudPermutaService.aceptarSolicitudPermuta(uvus, solicitud) });
    } catch (err){
        return manejarErrorServicio(res, err, 'Error interno en aceptarSolicitudPermuta');
    }
}

const validarSolicitudPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validSolicitud = GenericValidators.isInteger(req.body.solicitud, "Solicitud");
        if (!validSolicitud.valido) {
            return res.status(400).json({ err: true, message: validSolicitud.mensaje });
        }
        const solicitud = validSolicitud.valor;
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
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validPermutaId = GenericValidators.isInteger(req.params.id, "PermutaId");
        if (!validPermutaId.valido) {
            return res.status(400).json({ err: true, message: validPermutaId.mensaje });
        }
        const permutaId = validPermutaId.valor;
        res.send({ err: false, result: await solicitudPermutaService.aceptarPermutaPropuesta(uvus, permutaId) });
    } catch (err) {
        console.error('api aceptarPermutaPropuesta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en aceptarPermutaPropuesta', details: err.message });
    }
};

const getPermutasPropuestasSistema = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await solicitudPermutaService.getPermutasPropuestasSistema(uvus) });
    } catch (err) {
        console.error('api getPermutasPropuestasSistema ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en getPermutasPropuestasSistema', details: err.message });
    }
};

const rechazarPermutaPropuesta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validPermutaId = GenericValidators.isInteger(req.params.id, "PermutaId");
        if (!validPermutaId.valido) {
            return res.status(400).json({ err: true, message: validPermutaId.mensaje });
        }
        const permutaId = validPermutaId.valor;
        res.send({ err: false, result: await solicitudPermutaService.rechazarPermutaPropuesta(uvus, permutaId)});
    } catch (err) {
        console.error('api rechazarPermutaPropuesta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en rechazarPermutaPropuesta', details: err.message });
    }
};

const getTodasSolicitudesPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({err:false, result:await solicitudPermutaService.getTodasSolicitudesPermuta()})
        } catch (err){
            console.error('api verListaPermutas ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en verListaPermutas', details: err.message });
        }
    };
const actualizarLaVigenciaSolicitud = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({err:false, result:await solicitudPermutaService.actualizarLaVigenciaSolicitud()})
        } catch (err){
            console.error('api actualizarLaVigenciaSolicitud ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en actualizarLaVigenciaSolicitud', details: err.message });
        }
            
};

const cancelarSolicitudPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { solicitud } = req.body;
        const validSolicitud = validarEnteroPositivo(solicitud, "Solicitud");
        if (!validSolicitud.valido) {
            return res.status(400).json({ err: true, message: validSolicitud.mensaje });
        }
        const esAdmin = req.session.user.rol === "administrador";
        const result = await solicitudPermutaService.cancelarSolicitudPermuta(uvus, validSolicitud.valor, esAdmin);
        res.send({ err: false, result });
    } catch (err) {
        return manejarErrorServicio(res, err, 'Error interno en cancelarSolicitudPermuta');
    }
};

export default {
    solicitarPermuta,
    editarGruposDeseados,
    getSolicitudesPermutaInteresantes,
    getMisSolicitudesPermuta,
    aceptarSolicitudPermuta,
    verListaPermutas,
    proponerPermutas,
    getPermutasPropuestasSistema,
    validarSolicitudPermuta,
    aceptarPermutaPropuesta,
    rechazarPermutaPropuesta,
    getTodasSolicitudesPermuta,
    cancelarSolicitudPermuta,
    actualizarLaVigenciaSolicitud
}
