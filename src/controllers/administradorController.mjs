import administradorService from '../services/administradorService.mjs';

const obtenerEstadisticasPermutas = async (req, res)=> {
    try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
      const estadisticas = await administradorService.obtenerEstadisticasPermutas();
      res.status(200).json({ success: true, data: estadisticas });
    } catch (error) {
      res.status(500).json({ success: false, message: 'Error al obtener estadísticas de permutas', error: error.message });
    }
  }

const obtenerEstadisticasSolicitudes = async (req, res)=> {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const estadisticas = await administradorService.obtenerEstadisticasSolicitudes();
    res.status(200).json({ success: true, data: estadisticas });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error al obtener estadísticas de solicitudes', error: error.message });
  }
}

const obtenerEstadisticasIncidencias = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const estadisticas = await administradorService.obtenerEstadisticasIncidencias();
    res.json({ err: false, result: estadisticas });
  } catch (err) {
    console.error("Error en obtenerEstadisticasIncidencias:", err);
    res.status(500).json({ err: true, message: "Error al obtener estadísticas de incidencias" });
  }
};

const obtenerEstadisticasUsuarios = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const estadisticas = await administradorService.obtenerEstadisticasUsuarios();
    res.json({ err: false, result: estadisticas });
  } catch (err) {
    console.error("Error en obtenerEstadisticasUsuarios:", err);
    res.status(500).json({ err: true, message: "Error al obtener estadísticas de usuarios" });
  }
};

const obtenerEstadisticasValoracionAsignaturas = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }

    const asignatura = req.body.asignatura ?? req.body.codigo ?? null;
    const estadisticas = await administradorService.obtenerEstadisticasValoracionAsignaturas(asignatura);
    res.json({ err: false, result: estadisticas });
  } catch (err) {
    if (err.statusCode) {
      return res.status(err.statusCode).json({ err: true, message: err.message });
    }
    console.error("Error en obtenerEstadisticasValoracionAsignaturas:", err);
    res.status(500).json({ err: true, message: "Error al obtener estadísticas de valoraciones de asignaturas" });
  }
};

export default {
  obtenerEstadisticasIncidencias,
  obtenerEstadisticasPermutas,
  obtenerEstadisticasSolicitudes,
  obtenerEstadisticasUsuarios,
  obtenerEstadisticasValoracionAsignaturas
};
