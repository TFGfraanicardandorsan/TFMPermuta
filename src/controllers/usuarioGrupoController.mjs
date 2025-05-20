import usuarioGrupoService from "../services/usuarioGrupoService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const insertarGrupoAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;

        const validGrupo = GenericValidators.isInteger(req.body.grupo, "Grupo");
        if (!validGrupo.valido) {
            return res.status(400).json({ err: true, message: validGrupo.mensaje });
        }
        const grupo = validGrupo.valor;
        const validAsignatura = GenericValidators.isInteger(req.body.asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        const asignatura = validAsignatura.valor;
        res.send({ err: false, result: await usuarioGrupoService.insertarGrupoAsignatura(uvus, grupo, asignatura)});
    } catch (err) {
        console.log('api insertarGrupoAsignatura ha tenido una excepción')
        res.sendStatus(500)
    }
}

export default {
    insertarGrupoAsignatura
}