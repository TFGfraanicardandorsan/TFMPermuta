import incidenciaService from "../services/incidenciaService.mjs";

/**
 * Obtiene todas las incidencias.
 */
const obtenerIncidencias = async (req, res) => {
    try {
        const result = await incidenciaService.getIncidencias();
        res.json({ error: false, result: result.rows });
    } catch (err) {
        console.error("Error en obtenerIncidencias:", err);
        res.status(500).json({ error: true, message: "Error al obtener las incidencias" });
    }
};

/**
 * Obtiene las incidencias asignadas a un usuario específico.
 */
const obtenerIncidenciasAsignadasUsuario = async (req, res) => {
    const { uvus } = req.params;

    try {
        const result = await incidenciaService.getIncidenciasAsignadasUsuario(uvus);
        res.json({ error: false, result: result.rows });
    } catch (err) {
        console.error("Error en obtenerIncidenciasAsignadasUsuario:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias asignadas al usuario" });
    }
};

/**
 * Obtiene las incidencias asignadas a cualquier usuario de mantenimiento.
 */
const obtenerIncidenciasAsignadas = async (req, res) => {
    try {
        const result = await incidenciaService.getIncidenciasAsignadas();
        res.json({ error: false, result: result.rows });
    } catch (err) {
        console.error("Error en obtenerIncidenciasAsignadas:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias asignadas" });
    }
};

/**
 * Obtiene las incidencias sin asignar a ningún usuario de mantenimiento.
 */
const obtenerIncidenciasSinAsignar = async (req, res) => {
    try {
        const result = await incidenciaService.getIncidenciasSinAsignar();
        res.json({ error: false, result: result.rows });
    } catch (err) {
        console.error("Error en obtenerIncidenciasSinAsignar:", err);
        res.status(500).json({ error: true, message: "Error al obtener incidencias sin asignar" });
    }
};

/**
 * Permite asignar una incidencia a sí mismo.
 */
const asignarmeIncidencia = async (req, res) => {
    const { uvus, id_incidencia } = req.body;

    if (!uvus || !id_incidencia) {
        return res.status(400).json({ error: true, message: "Datos incompletos" });
    }

    try {
        const result = await incidenciaService.asignarmeIncidencia(uvus, id_incidencia);
        res.json({ error: false, message: "Incidencia asignada con éxito", result: result.rows });
    } catch (err) {
        console.error("Error en asignarmeIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al asignar la incidencia" });
    }
};

/**
 * Permite marcar una incidencia como solucionada.
 */
const solucionarIncidencia = async (req, res) => {
    const { uvus, id_incidencia } = req.body;

    if (!uvus || !id_incidencia) {
        return res.status(400).json({ error: true, message: "Datos incompletos" });
    }

    try {
        const result = await incidenciaService.solucionarIncidencia(uvus, id_incidencia);
        res.json({ error: false, message: "Incidencia solucionada con éxito", result: result.rows });
    } catch (err) {
        console.error("Error en solucionarIncidencia:", err);
        res.status(500).json({ error: true, message: "Error al solucionar la incidencia" });
    }
};

/**
 * Crea una nueva incidencia con o sin archivo adjunto.
 */
const crearIncidencia = async (req, res) => {
    try {
        const { descripcion, tipo_incidencia } = req.body;
        const archivoPath = req.file ? req.file.path : null; // Si se adjunta un archivo, guarda su ruta

        if (!descripcion || !tipo_incidencia) {
            return res.status(400).json({ error: true, message: "Faltan datos obligatorios" });
        }

        const nuevaIncidencia = await incidenciaService.crearIncidencia(descripcion, tipo_incidencia, archivoPath);

        res.status(201).json({ error: false, message: "Incidencia creada con éxito", incidencia: nuevaIncidencia });
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
