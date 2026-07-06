import usuarioAsignaturaService from '../services/usuarioAsignaturaService.mjs';
import valoracionAsignaturaService from '../services/valoracionAsignaturaService.mjs';
import GenericValidators from '../utils/genericValidators.mjs';

const actualizarAsignaturasUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validAsignatura = GenericValidators.isInteger(req.body.asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        const asignatura = validAsignatura.valor;
        res.send({ err: false, result: await usuarioAsignaturaService.actualizarAsignaturasUsuario(uvus, asignatura) })
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
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validAsignatura = GenericValidators.isInteger(req.body.asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        const asignatura = validAsignatura.valor;
        res.send({ err: false, result: await usuarioAsignaturaService.superarAsignaturasUsuario(uvus, asignatura) })
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ err: true, message: err.message });
        }
        console.log('api superarAsignaturasUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}

const obtenerPreguntasValoracionAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({ err: false, result: await valoracionAsignaturaService.obtenerPreguntasValoracionAsignatura() })
    } catch (err) {
        console.log('api obtenerPreguntasValoracionAsignatura ha tenido una excepción')
        res.sendStatus(500)
    }
}

const guardarValoracionAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validAsignatura = GenericValidators.isInteger(req.body.asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        if (!Array.isArray(req.body.respuestas)) {
            return res.status(400).json({ err: true, message: "Las respuestas deben enviarse como un array" });
        }

        const result = await valoracionAsignaturaService.guardarValoracionAsignatura(
            uvus,
            validAsignatura.valor,
            req.body.respuestas
        );
        res.status(201).json({ err: false, result });
    } catch (err) {
        if (err.statusCode) {
            return res.status(err.statusCode).json({ err: true, message: err.message });
        }
        console.log('api guardarValoracionAsignatura ha tenido una excepción')
        res.sendStatus(500)
    }
}

const asignaturasSinGrupoUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await usuarioAsignaturaService.asignaturasSinGrupoUsuario(uvus) })
    } catch (err) {
        console.log('api asignaturasSinGrupoUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}

export default {
    actualizarAsignaturasUsuario,
    obtenerAsignaturasUsuario,
    superarAsignaturasUsuario,
    obtenerPreguntasValoracionAsignatura,
    guardarValoracionAsignatura,
    asignaturasSinGrupoUsuario
}
