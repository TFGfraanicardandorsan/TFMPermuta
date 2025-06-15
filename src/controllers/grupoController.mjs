import grupoService from "../services/grupoService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const obtenerGruposPorAsignatura = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const validAsignatura = GenericValidators.isInteger(req.body.asignatura, "Asignatura");
        if (!validAsignatura.valido) {
            return res.status(400).json({ err: true, message: validAsignatura.mensaje });
        }
        const asignatura = validAsignatura.valor;
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
        const validNumGrupo = GenericValidators.isInteger(req.body.num_grupo, "Número de grupo");
        if (!validNumGrupo.valido) {
            return res.status(400).json({ err: true, message: validNumGrupo.mensaje });
        }
        const num_grupo = validNumGrupo.valor;
        const validCodigo = GenericValidators.isInteger(req.body.codigo, "Código");
        if (!validCodigo.valido) {
            return res.status(400).json({ err: true, message: validCodigo.mensaje });
        }
        const codigo = validCodigo.valor;
        res.send({ err: false, result: await grupoService.insertarMisGrupos(uvus, num_grupo, codigo) });
    } catch (err) {
        console.log('api insertarMisGrupos ha tenido una excepción');
        res.sendStatus(500);
    }
};

const obtenerMiGrupoAsignatura = async (req,res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err:false, result: await grupoService.obtenerMiGrupoAsignatura(uvus) })
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

const actualizarProyectoDocente = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ error: true, message: "No hay usuario en la sesión" });
        }
            const { grupoId,fileId } = req.body;

        if (fileId) {
            const validFile = GenericValidators.isFilePdfOrPng(fileId, "Archivo adjunto", 50);
            if (!validFile.valido) {
                return res.status(400).json({ error: true, message: validFile.mensaje });
            }
        }
        res.status(201).json({ error: false, result: await grupoService.actualizarProyectoDocente(grupoId, fileId) });
    } catch (err) {
        console.error("Error en crearIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al crear la incidencia" });
    }
};

export default {
    obtenerGruposPorAsignatura,
    insertarMisGrupos,
    obtenerMiGrupoAsignatura,
    obtenerTodosGruposMisAsignaturasUsuario,
    obtenerTodosGruposMisAsignaturasSinGrupoUsuario,
    obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario,
    actualizarProyectoDocente
}
