import administradorService from '../services/administradorService.mjs';

class AdministradorController {
  async obtenerEstadisticasPermutas(req, res) {
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

  async obtenerEstadisticasSolicitudes(req, res) {
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
}

const administradorController = new AdministradorController();
export default administradorController;