import usuarioGrupoService from "../services/usuarioGrupoService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const insertarGrupoAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { grupo, asignatura } = req.body;

        const validGrupo = GenericValidators.isInteger(grupo, "Grupo");
        if (!validGrupo.valido) {
            return res.status(400).json({ err: true, message: validGrupo.mensaje });
        }
        const validAsignatura = GenericValidators.isInteger(asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }

        res.send({ err: false, result: await usuarioGrupoService.insertarGrupoAsignatura(uvus, grupo, asignatura)});
    } catch (err) {
        console.log('api insertarGrupoAsignatura ha tenido una excepción')
        res.sendStatus(500)
    }
}

export default {
    insertarGrupoAsignatura
}