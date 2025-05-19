import estudiosService from "../services/estudiosService.mjs";


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
        res.send({err:false, result:await estudiosService.insertarEstudio(req.body.estudio, req.body.siglas)})
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
