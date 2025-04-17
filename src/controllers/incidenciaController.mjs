import incidenciaService from "../services/incidenciaService.mjs";

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
        const uvus = req.session.user.nombre_usuario;
        const id_incidencia = req.body.id_incidencia;
        if (!req.session.user) {
        return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        if (!id_incidencia) {
        return res.status(400).json({ error: true, message: "Datos incompletos" });
        }
        res.json({ error: false, result: await incidenciaService.asignarmeIncidencia(uvus, id_incidencia)});
    } catch (err) {
        console.error("Error en asignarmeIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al asignar la incidencia" });
    }
};

const solucionarIncidencia = async (req, res) => {
    try {
        const uvus = req.session.user.nombre_usuario;
        const id_incidencia = req.body.id_incidencia;
        if (!req.session.user) {
        return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        if (!id_incidencia) {
        return res.status(400).json({ error: true, message: "Datos incompletos" });
        }
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
        const { descripcion, tipo_incidencia,fileId } = req.body;
        if (!descripcion || !tipo_incidencia) {
            return res.status(400).json({ error: true, message: "Faltan datos obligatorios" });
        }
        const uvus = req.session.user.nombre_usuario;
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
    solucionarIncidencia,
    crearIncidencia
};
