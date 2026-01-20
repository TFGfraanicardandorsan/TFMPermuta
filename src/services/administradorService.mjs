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
          SELECT a.siglas, a.codigo, COUNT(*) as cantidad
          FROM permuta p
          JOIN asignatura a ON p.asignatura_id_fk = a.id
          GROUP BY a.siglas, a.codigo
          ORDER BY cantidad DESC
        `
      };

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

      // Permutas de cada asignatura agrupadas por grado
      const permutasPorGrado = {
        text: `
          SELECT e.nombre as grado_nombre, e.siglas as grado_siglas, a.siglas as asignatura_siglas, a.codigo as asignatura_codigo, COUNT(*) as cantidad
          FROM permuta p
          JOIN usuario u ON p.usuario_id_1_fk = u.id
          JOIN estudios e ON u.estudios_id_fk = e.id
          JOIN asignatura a ON p.asignatura_id_fk = a.id
          GROUP BY e.nombre, e.siglas, a.siglas, a.codigo
          ORDER BY e.nombre, cantidad DESC
        `
      };

      const [
        estadosRes,
        asignaturasRes,
        estudiosRes,
        gradosRes
      ] = await Promise.all([
        conexion.query(permutasPorEstado),
        conexion.query(permutasPorAsignatura),
        conexion.query(topEstudios),
        conexion.query(permutasPorGrado)
      ]);

      return {
        permutasPorEstado: estadosRes.rows,
        permutasPorAsignatura: asignaturasRes.rows,
        topEstudios: estudiosRes.rows,
        permutasPorGrado: gradosRes.rows
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
      const solicitudesPorEstado = {
        text: `
          SELECT estado, COUNT(*) as cantidad
          FROM solicitud_permuta
          GROUP BY estado
          ORDER BY cantidad DESC
        `
      };

      // Nueva estadística: solicitudes por grado
      const solicitudesPorGrado = {
        text: `
          SELECT e.nombre AS grado, e.siglas, COUNT(*) AS cantidad
          FROM solicitud_permuta sp
          JOIN usuario u ON sp.usuario_id_fk = u.id
          JOIN estudios e ON u.estudios_id_fk = e.id
          GROUP BY e.nombre, e.siglas
          ORDER BY cantidad DESC
        `
      };

      const [estadosRes, gradosRes] = await Promise.all([
        conexion.query(solicitudesPorEstado),
        conexion.query(solicitudesPorGrado)
      ]);

      return {
        solicitudesPorEstado: estadosRes.rows,
        solicitudesPorGrado: gradosRes.rows
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
      const incidenciasPorEstado = {
        text: `
          SELECT estado_incidencia, COUNT(*) as cantidad
          FROM incidencia
          GROUP BY estado_incidencia
          ORDER BY cantidad desc;
        `
      };

      const incidenciasPorTipo = {
        text: `
          SELECT tipo_incidencia, COUNT(*) as cantidad
          FROM incidencia
          GROUP BY tipo_incidencia
          ORDER BY cantidad desc;
        `
      };

      const incidenciasPorMes = {
        text: `
                SELECT 
            EXTRACT(MONTH from fecha_creacion ) as mes,
            EXTRACT(YEAR FROM fecha_creacion) as anio,
            COUNT(*) as cantidad
          FROM incidencia
          GROUP BY mes, anio
          ORDER BY anio, mes;
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
  async obtenerEstadisticasUsuarios() {
    const conexion = await database.connectPostgreSQL();
    try {
      const usuariosPorRol = {
        text: `
          SELECT rol, COUNT(*) as cantidad
          FROM usuario
          GROUP BY rol
          ORDER BY cantidad DESC;
        `
      };

      const usuariosPorEstudio = {
        text: `
          SELECT e.nombre, e.siglas, COUNT(*) as cantidad
          FROM usuario u
          JOIN estudios e ON u.estudios_id_fk = e.id
          GROUP BY e.nombre, e.siglas
          ORDER BY cantidad DESC;
        `
      };

      const [rolesRes, estudiosRes] = await Promise.all([
        conexion.query(usuariosPorRol),
        conexion.query(usuariosPorEstudio)
      ]);

      return {
        usuariosPorRol: rolesRes.rows,
        usuariosPorEstudio: estudiosRes.rows
      };

    } catch (error) {
      console.error("Error al obtener estadísticas de usuarios:", error);
      throw new Error("Error al obtener estadísticas de usuarios");
    } finally {
      await conexion.end();
    }
  }
}

const administradorService = new AdministradorService();
export default administradorService;