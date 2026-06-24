import grupoService from "../services/grupoService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const CURSOS_VALIDOS = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO"];

const validarCodigoAsignatura = (valor) => {
    const validCodigo = GenericValidators.isInteger(valor, "Código de asignatura");
    if (!validCodigo.valido) {
        return validCodigo;
    }
    return { valido: true, valor: validCodigo.valor };
};

const validarCodigosAsignaturas = (body) => {
    const entrada = body.codigos ?? body.asignaturas ?? body.codigo ?? body.asignatura;
    const valores = Array.isArray(entrada) ? entrada : [entrada];
    if (valores.length === 0 || valores.some((valor) => valor === undefined || valor === null)) {
        return { valido: false, mensaje: "Debe indicarse al menos una asignatura" };
    }

    const codigos = [];
    for (const valor of valores) {
        const validCodigo = validarCodigoAsignatura(valor);
        if (!validCodigo.valido) {
            return validCodigo;
        }
        codigos.push(validCodigo.valor);
    }

    return { valido: true, valor: codigos };
};

const validarCursoGrado = (body) => {
    const estudiosId = body.estudios_id ?? body.estudiosId ?? body.grado_id ?? body.grado;
    const validEstudiosId = GenericValidators.isInteger(estudiosId, "Grado");
    if (!validEstudiosId.valido) {
        return validEstudiosId;
    }

    const { curso } = body;
    if (!CURSOS_VALIDOS.includes(curso)) {
        return { valido: false, mensaje: "El curso debe ser PRIMERO, SEGUNDO, TERCERO o CUARTO" };
    }

    return {
        valido: true,
        valor: {
            estudiosId: validEstudiosId.valor,
            curso,
        },
    };
};

const manejarErrorServicioGrupos = (res, err, mensajeGenerico) => {
    if (err.statusCode) {
        return res.status(err.statusCode).json({
            err: true,
            message: err.message,
            detalles: err.detalles,
        });
    }
    console.error(mensajeGenerico, err);
    return res.status(500).json({ err: true, message: mensajeGenerico });
};

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

const crearGrupoAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }

        const codigo = req.body.codigo ?? req.body.asignatura;
        const validCodigo = validarCodigoAsignatura(codigo);
        if (!validCodigo.valido) {
            return res.status(400).json({ err: true, message: validCodigo.mensaje });
        }

        const result = await grupoService.crearGrupoAsignatura(validCodigo.valor);
        return res.status(201).json({ err: false, result });
    } catch (err) {
        return manejarErrorServicioGrupos(res, err, "Error al crear el grupo de la asignatura");
    }
};

const crearGruposCursoGrado = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }

        const validCursoGrado = validarCursoGrado(req.body);
        if (!validCursoGrado.valido) {
            return res.status(400).json({ err: true, message: validCursoGrado.mensaje });
        }

        const { estudiosId, curso } = validCursoGrado.valor;
        const result = await grupoService.crearGruposCursoGrado(estudiosId, curso);
        return res.status(201).json({ err: false, result });
    } catch (err) {
        return manejarErrorServicioGrupos(res, err, "Error al crear los grupos del curso del grado");
    }
};

const eliminarUltimoGrupoAsignatura = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }

        const codigo = req.body.codigo ?? req.body.asignatura;
        const validCodigo = validarCodigoAsignatura(codigo);
        if (!validCodigo.valido) {
            return res.status(400).json({ err: true, message: validCodigo.mensaje });
        }

        const result = await grupoService.eliminarUltimoGrupoAsignatura(validCodigo.valor);
        return res.json({ err: false, result });
    } catch (err) {
        return manejarErrorServicioGrupos(res, err, "Error al eliminar el último grupo de la asignatura");
    }
};

const eliminarUltimosGruposAsignaturas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }

        const validCodigos = validarCodigosAsignaturas(req.body);
        if (!validCodigos.valido) {
            return res.status(400).json({ err: true, message: validCodigos.mensaje });
        }

        const result = await grupoService.eliminarUltimosGruposAsignaturas(validCodigos.valor);
        return res.json({ err: false, result });
    } catch (err) {
        return manejarErrorServicioGrupos(res, err, "Error al eliminar los últimos grupos de las asignaturas");
    }
};

const eliminarUltimosGruposCursoGrado = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }

        const validCursoGrado = validarCursoGrado(req.body);
        if (!validCursoGrado.valido) {
            return res.status(400).json({ err: true, message: validCursoGrado.mensaje });
        }

        const { estudiosId, curso } = validCursoGrado.valor;
        const result = await grupoService.eliminarUltimosGruposCursoGrado(estudiosId, curso);
        return res.json({ err: false, result });
    } catch (err) {
        return manejarErrorServicioGrupos(res, err, "Error al eliminar los últimos grupos del curso del grado");
    }
};

export default {
    obtenerGruposPorAsignatura,
    insertarMisGrupos,
    obtenerMiGrupoAsignatura,
    obtenerTodosGruposMisAsignaturasUsuario,
    obtenerTodosGruposMisAsignaturasSinGrupoUsuario,
    obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario,
    actualizarProyectoDocente,
    crearGrupoAsignatura,
    crearGruposCursoGrado,
    eliminarUltimoGrupoAsignatura,
    eliminarUltimosGruposAsignaturas,
    eliminarUltimosGruposCursoGrado
}
