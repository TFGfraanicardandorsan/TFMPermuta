import estudiosService from "../services/estudiosService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const obtenerMiEstudioUsuario = async (req,res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await estudiosService.obtenerMiEstudioUsuario(uvus)})
    } catch (err){
        console.log('api obtenerMiEstudioUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}
const obtenerEstudios = async (req,res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({err:false, result:await estudiosService.obtenerEstudios()})
    } catch (err){
        console.log('api obtenerEstudios ha tenido una excepción')
        res.sendStatus(500)
    }
}

const insertarEstudio = async (req,res) => {
    // TODO: VALIDADOR STRING, STRING
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const { estudio, siglas } = req.body;

        const validEstudio = GenericValidators.isString(estudio, "Estudio", 100);
        if (!validEstudio.valido) return res.status(400).json({ err: true, message: validEstudio.mensaje });

        const validSiglas = GenericValidators.isString(siglas, "Siglas", 10);
        if (!validSiglas.valido) return res.status(400).json({ err: true, message: validSiglas.mensaje });

        res.send({err:false, result:await estudiosService.insertarEstudio(estudio, siglas)})
    } catch (err){
        console.log('api insertarEstudio ha tenido una excepción')
        res.sendStatus(500)
    }
}
export default {
    obtenerMiEstudioUsuario,
    obtenerEstudios,
    insertarEstudio
}
