import UsuarioGrupoService from "../services/usuarioGrupoService.mjs";

const añadirGrupoAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await UsuarioGrupoService.añadirGrupoAsignatura(uvus, req.body.grupo, req.body.asignatura)});
    } catch (err) {
        console.log('api añadirGrupoAsignatura ha tenido una excepción')
        res.sendStatus(500)
    }
}

export default {
    añadirGrupoAsignatura
}