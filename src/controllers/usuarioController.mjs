import usuarioService from "../services/usuarioService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";


const obtenerDatosUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ err: false, result: await usuarioService.obtenerDatosUsuario(uvus) });
    } catch (err) {
        console.error("API obtenerDatosUsuario ha tenido una excepción", err);
        res.sendStatus(500);
    }
};


const actualizarEstudiosUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { estudio } = req.body;
        const validEstudio = GenericValidators.isString(estudio, "Estudio", 100);
        if (!validEstudio.valido) {
            return res.status(400).json({ err: true, message: validEstudio.mensaje });
        }
        res.send({err:false, result:await usuarioService.actualizarEstudiosUsuario(uvus, estudio)})
        } catch (err){
            console.log('api actualizarEstudiosUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
    }

    const obtenerDatosUsuarioAdmin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ err: false, result: await usuarioService.obtenerDatosUsuarioAdmin(uvus) });
    } catch (err) {
        console.error("API obtenerDatosUsuario ha tenido una excepción", err);
        res.sendStatus(500);
    }
};
export default {
    obtenerDatosUsuario,
    actualizarEstudiosUsuario,
    obtenerDatosUsuarioAdmin
}