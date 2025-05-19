import usuarioAsignaturaService from '../services/usuarioAsignaturaService.mjs';

const actualizarAsignaturasUsuario = async (req, res) => {
    // Integer
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await usuarioAsignaturaService.actualizarAsignaturasUsuario(uvus, req.body.asignatura) })
    } catch (err) {
        console.log('api actualizarAsignaturasUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}
const obtenerAsignaturasUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await usuarioAsignaturaService.obtenerAsignaturasUsuario(uvus) })
    } catch (err) {
        console.log('api obtenerAsignaturasUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}

const superarAsignaturasUsuario = async (req, res) => {
        // Integer
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await usuarioAsignaturaService.superarAsignaturasUsuario(uvus, req.body.asignatura) })
    } catch (err) {
        console.log('api superarAsignaturasUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}


export default { 
    actualizarAsignaturasUsuario,
    obtenerAsignaturasUsuario,
    superarAsignaturasUsuario
}