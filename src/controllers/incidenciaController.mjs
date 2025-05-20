import incidenciaService from "../services/incidenciaService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const obtenerIncidencias = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.json({ error: false, result: await incidenciaService.obtenerIncidencias() });
    } catch (err) {
        console.error("Error en obtenerIncidencias:", err);
        res.status(500).json({ error: true, message: "Error al obtener las incidencias" });
    }
};

const obtenerIncidenciasAsignadasUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ error: false, result: await incidenciaService.obtenerIncidenciasAsignadasUsuario(uvus) });
    } catch (err) {
        console.error("Error en obtenerIncidenciasAsignadasUsuario:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias asignadas al usuario" });
    }
};

const obtenerIncidenciasAsignadas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.json({ error: false, result: await incidenciaService.obtenerIncidenciasAsignadas() });
    } catch (err) {
        console.error("Error en obtenerIncidenciasAsignadas:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias asignadas" });
    }
};

const obtenerIncidenciasAsignadasAdmin = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ error: false, result: await incidenciaService.obtenerIncidenciasAsignadasAdmin(uvus) });
    } catch (err) {
        console.error("Error en obtenerIncidenciasAsignadas:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias asignadas" });
    }
};

const obtenerIncidenciasSinAsignar = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.json({ error: false, result: await incidenciaService.obtenerIncidenciasSinAsignar() });
    } catch (err) {
        console.error("Error en obtenerIncidenciasSinAsignar:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias sin asignar" });
    }
};

const asignarmeIncidencia = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validId = GenericValidators.isInteger(req.body.id_incidencia, "ID Incidencia");
        if (!validId.valido) {
            return res.status(400).json({ error: true, message: validId.mensaje });
        }
        const id_incidencia = validId.valor;
        res.json({ error: false, result: await incidenciaService.asignarmeIncidencia(uvus, id_incidencia)});
    } catch (err) {
        console.error("Error en asignarmeIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al asignar la incidencia" });
    }
};

const obtenerIncidenciaPorId = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const validId = GenericValidators.isInteger(req.body.id_incidencia, "ID Incidencia");
        if (!validId.valido) {
        return res.status(400).json({ error: true, message: validId.mensaje });
    }
        const id_incidencia = validId.valor;
        res.json({ error: false, result: await incidenciaService.obtenerIncidenciaPorId(id_incidencia)});
    } catch (err) {
        console.error("Error en obtenerIncidenciaPorId:", err);
        res.status(500).json({ error: true, message: "Error al obtenerIncidenciaPorId" });
    }
};

const solucionarIncidencia = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validId = GenericValidators.isInteger(req.body.id_incidencia, "ID Incidencia");
        if (!validId.valido) {
            return res.status(400).json({ error: true, message: validId.mensaje });
        }
        const id_incidencia = validId.valor;
        res.json({ error: false, result: await incidenciaService.solucionarIncidencia(uvus, id_incidencia) });
    } catch (err) {
        console.error("Error en solucionarIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al solucionar la incidencia" });
    }
};

const crearIncidencia = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { descripcion, tipo_incidencia, fileId } = req.body;
        const validDesc = GenericValidators.isString(descripcion, "Descripción", 1000);
        if (!validDesc.valido) {
            return res.status(400).json({ error: true, message: validDesc.mensaje });
        }
        const validTipo = GenericValidators.isString(tipo_incidencia, "Tipo de incidencia", 20);
        if (!validTipo.valido) {
            return res.status(400).json({ error: true, message: validTipo.mensaje });
        }
        if (fileId) {
            const validFile = GenericValidators.isFilePdfOrPng(fileId, "Archivo adjunto", 50);
            if (!validFile.valido) {
                return res.status(400).json({ error: true, message: validFile.mensaje });
            }
        }
        res.status(201).json({ error: false, result: await incidenciaService.crearIncidencia(descripcion, tipo_incidencia, fileId, uvus) });
    } catch (err) {
        console.error("Error en crearIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al crear la incidencia" });
    }
};

export default {
    obtenerIncidencias,
    obtenerIncidenciasAsignadasUsuario,
    obtenerIncidenciasAsignadas,
    obtenerIncidenciasSinAsignar,
    asignarmeIncidencia,
    obtenerIncidenciaPorId,
    solucionarIncidencia,
    crearIncidencia,
    obtenerIncidenciasAsignadasAdmin
};
