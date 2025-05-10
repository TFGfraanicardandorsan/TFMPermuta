import administradorService from '../services/administradorService.mjs';

const obtenerEstadisticasPermutas = async (req, res)=> {
    try {
      const estadisticas = await administradorService.obtenerEstadisticasPermutas();
      res.status(200).json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de permutas',
        error: error.message
      });
    }
  }

  const obtenerEstadisticasSolicitudes = async (req, res)=> {
    try {
      const estadisticas = await administradorService.obtenerEstadisticasSolicitudes();
      res.status(200).json({
        success: true,
        data: estadisticas
      });
    } catch (error) {
      res.status(500).json({
        success: false,
        message: 'Error al obtener estadísticas de solicitudes',
        error: error.message
      });
    }
  }

const administradorController = new AdministradorController();

const obtenerEstadisticasIncidencias = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const estadisticas = await administradorService.obtenerEstadisticasIncidencias();
    res.json({ error: false, result: estadisticas });
  } catch (err) {
    console.error("Error en obtenerEstadisticasIncidencias:", err);
    res.status(500).json({ error: true, message: "Error al obtener estadísticas de incidencias" });
  }
};

export default {
  obtenerEstadisticasIncidencias,
  obtenerEstadisticasPermutas,
  obtenerEstadisticasSolicitudes
};