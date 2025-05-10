import database from "../config/database.mjs";

class AdministradorService {
  async obtenerEstadisticasPermutas() {
    const conexion = await database.connectPostgreSQL();
    try {
      // Permutas por estado
      const permutasPorEstado = {
        text: `
          SELECT estado, COUNT(*) as cantidad
          FROM permuta
          GROUP BY estado
          ORDER BY cantidad DESC
        `
      };

      // Permutas por asignatura
      const permutasPorAsignatura = {
        text: `
          SELECT a.nombre, a.codigo, COUNT(*) as cantidad
          FROM permuta p
          JOIN asignatura a ON p.asignatura_id_fk = a.id
          GROUP BY a.nombre, a.codigo
          ORDER BY cantidad DESC
        `
      };

    //   // Permutas por mes
    //   const permutasPorMes = {
    //     text: `
    //       SELECT 
    //         EXTRACT(MONTH FROM created_at) as mes,
    //         EXTRACT(YEAR FROM created_at) as anio,
    //         COUNT(*) as cantidad
    //       FROM permuta
    //       GROUP BY mes, anio
    //       ORDER BY anio, mes
    //     `
    //   };

    //   // Tiempo promedio hasta completar permuta
    //   const tiempoPromedioPermuta = {
    //     text: `
    //       SELECT AVG(
    //         EXTRACT(EPOCH FROM (updated_at - created_at))/86400
    //       ) as dias_promedio
    //       FROM permuta
    //       WHERE estado = 'VALIDADA'
    //     `
    //   };

      // Top estudios con más permutas
      const topEstudios = {
        text: `
          SELECT e.nombre, e.siglas, COUNT(*) as cantidad
          FROM permuta p
          JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
          JOIN estudios e ON u1.estudios_id_fk = e.id
          GROUP BY e.nombre, e.siglas
          ORDER BY cantidad DESC
          LIMIT 5
        `
      };

      const [
        estadosRes,
        asignaturasRes,
        // mesesRes,
        // tiempoRes,
        estudiosRes
      ] = await Promise.all([
        conexion.query(permutasPorEstado),
        conexion.query(permutasPorAsignatura),
        // conexion.query(permutasPorMes),
        // conexion.query(tiempoPromedioPermuta),
        conexion.query(topEstudios)
      ]);

      return {
        permutasPorEstado: estadosRes.rows,
        permutasPorAsignatura: asignaturasRes.rows,
        // permutasPorMes: mesesRes.rows,
        // tiempoPromedioPermuta: tiempoRes.rows[0],
        topEstudios: estudiosRes.rows
      };

    } catch (error) {
      console.error("Error al obtener estadísticas:", error);
      throw new Error("Error al obtener estadísticas de permutas");
    } finally {
      await conexion.end();
    }
  }

  async obtenerEstadisticasSolicitudes() {
    const conexion = await database.connectPostgreSQL();
    try {
      // Solicitudes por estado
      const solicitudesPorEstado = {
        text: `
          SELECT estado, COUNT(*) as cantidad
          FROM solicitud_permuta
          GROUP BY estado
          ORDER BY cantidad DESC
        `
      };

      // Ratio de aceptación de solicitudes
      // const ratioAceptacion = {
      //   text: `
      //     SELECT 
      //       COUNT(CASE WHEN estado = 'ACEPTADA' THEN 1 END)::float / 
      //       COUNT(*)::float * 100 as porcentaje_aceptacion
      //     FROM solicitud_permuta
      //     WHERE estado IN ('ACEPTADA', 'RECHAZADA')
      //   `
      // };

      const [estadosRes, ratioRes] = await Promise.all([
        conexion.query(solicitudesPorEstado),
        // conexion.query(ratioAceptacion)
      ]);

      return {
        solicitudesPorEstado: estadosRes.rows,
        // ratioAceptacion: ratioRes.rows[0]
      };

    } catch (error) {
      console.error("Error al obtener estadísticas de solicitudes:", error);
      throw new Error("Error al obtener estadísticas de solicitudes");
    } finally {
      await conexion.end();
    }
  }

  async obtenerEstadisticasIncidencias() {
    const conexion = await database.connectPostgreSQL();
    try {
      // Incidencias por estado
      const incidenciasPorEstado = {
        text: `
          SELECT estado, COUNT(*) as cantidad
          FROM incidencia
          GROUP BY estado
          ORDER BY cantidad DESC
        `
      };

      // Incidencias por tipo
      const incidenciasPorTipo = {
        text: `
          SELECT tipo, COUNT(*) as cantidad
          FROM incidencia
          GROUP BY tipo
          ORDER BY cantidad DESC
        `
      };

      // Incidencias por mes
      const incidenciasPorMes = {
        text: `
          SELECT 
            EXTRACT(MONTH FROM created_at) as mes,
            EXTRACT(YEAR FROM created_at) as anio,
            COUNT(*) as cantidad
          FROM incidencia
          GROUP BY mes, anio
          ORDER BY anio, mes
        `
      };

      const [estadosRes, tiposRes, mesesRes] = await Promise.all([
        conexion.query(incidenciasPorEstado),
        conexion.query(incidenciasPorTipo),
        conexion.query(incidenciasPorMes)
      ]);

      return {
        incidenciasPorEstado: estadosRes.rows,
        incidenciasPorTipo: tiposRes.rows,
        incidenciasPorMes: mesesRes.rows
      };

    } catch (error) {
      console.error("Error al obtener estadísticas de incidencias:", error);
      throw new Error("Error al obtener estadísticas de incidencias");
    } finally {
      await conexion.end();
    }
  }
}

const administradorService = new AdministradorService();
export default administradorService;