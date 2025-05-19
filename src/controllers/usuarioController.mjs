import usuarioService from "../services/usuarioService.mjs";


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
    // string
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await usuarioService.actualizarEstudiosUsuario(uvus, req.body.estudio)})
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