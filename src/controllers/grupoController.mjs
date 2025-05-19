import grupoService from "../services/grupoService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const obtenerGruposPorAsignatura = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const { asignatura } = req.body;
        const validAsignatura = GenericValidators.isInteger(asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        res.send({ err: false, result: await grupoService.obtenerGruposPorAsignatura(asignatura) });
    } catch (err) {
        console.log('api obtenerGruposPorAsignatura ha tenido una excepción');
        res.sendStatus(500);
    }
};

const insertarMisGrupos = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { num_grupo, codigo } = req.body;
        const validNumGrupo = GenericValidators.isInteger(num_grupo, "Número de grupo");
        if (!validNumGrupo.valido) {
            return res.status(400).json({ err: true, message: validNumGrupo.mensaje });
        }
        const validCodigo = GenericValidators.isInteger(codigo, "Código");
        if (!validCodigo.valido) {
            return res.status(400).json({ err: true, message: validCodigo.mensaje });
        }
        res.send({ err: false, result: await grupoService.insertarMisGrupos(uvus, num_grupo, codigo) });
    } catch (err) {
        console.log('api insertarMisGrupos ha tenido una excepción');
        res.sendStatus(500);
    }
};

const obtenerMiGrupoAsignatura = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await grupoService.obtenerMiGrupoAsignatura(uvus)})
        } catch (err){
            console.log('api obtenerMiGrupoAsignatura ha tenido una excepción')
            res.sendStatus(500)
        }
}

const obtenerTodosGruposMisAsignaturasSinGrupoUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await grupoService.obtenerTodosGruposMisAsignaturasSinGrupoUsuario(uvus)})
        } catch (err){
            console.log('api obtenerTodosGruposMisAsignaturasSinGrupoUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
}

const obtenerTodosGruposMisAsignaturasUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await grupoService.obtenerTodosGruposMisAsignaturasUsuario(uvus)})
        } catch (err){
            console.log('api obtenerTodosGruposMisAsignaturasUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
}

const obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await grupoService.obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario(uvus) });
    } catch (err) {
        console.log('API obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario ha tenido una excepción:', err);
        res.sendStatus(500);
    }
};

export default {
    obtenerGruposPorAsignatura,
    insertarMisGrupos,
    obtenerMiGrupoAsignatura,
    obtenerTodosGruposMisAsignaturasUsuario,
    obtenerTodosGruposMisAsignaturasSinGrupoUsuario,
    obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario
}
