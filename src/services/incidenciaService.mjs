import database from "../config/database.mjs";
import { formatearNuevaIncidencia } from "../utils/formateadorIncidenciasBot.mjs";
import autorizacionService from "./autorizacionService.mjs";
import { sendMessage } from "./telegramService.mjs";
import { formatearFecha } from "../utils/formateadorFechas.mjs";

class IncidenciaService {
  async obtenerIncidencias() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia order by fecha_creacion asc`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerIncidenciasAsignadasUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: ` SELECT id,fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
              FROM incidencia 
              WHERE id in (select id from incidencia_usuario where usuario_id_fk = (select id from usuario where nombre_usuario = $1))
              ORDER BY fecha_creacion DESC`,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerIncidenciasAsignadas() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: ` select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
                  from incidencia 
                  where id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk in (select id from usuario where nombre_usuario IS NOT NULL))
                  order by fecha_creacion asc`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerIncidenciasAsignadasAdmin(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: ` select id,fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
                  from incidencia 
                  where estado_incidencia ='abierta' and id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk in (select id from usuario where nombre_usuario =( $1)))
                  order by fecha_creacion asc`,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }
  async obtenerIncidenciasSinAsignar() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: ` select id, fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
                  from incidencia 
                  where id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk IS NULL)
                  order by fecha_creacion asc`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerIncidenciaPorId(id_incidencia) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `SELECT fecha_creacion, descripcion, tipo_incidencia, estado_incidencia, archivo
               FROM incidencia 
               WHERE id = $1
               ORDER BY fecha_creacion ASC`,
        values: [id_incidencia],
      };
      const res = await conexion.query(query);
      return res.rows[0]; 
    } catch (error) {
      console.error("Error al obtener la incidencia por ID:", error);
      throw new Error("Error al obtener la incidencia por ID");
    } finally {
      await conexion.end();
    }
}

  async asignarmeIncidencia(uvus, id_incidencia) {
    const conexion = await database.connectPostgreSQL();
    try {
    const query = {
      text: `update incidencia_usuario set usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario = $1) where id = $2`,
      values: [uvus, id_incidencia],
    };
    await conexion.query(query);
     try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdUsuario,`Se te ha asignado la incidencia ${id_incidencia} para su gestión.`);
      } catch (error) {
        console.error("Error al enviar el mensaje de asignación de incidencia:", error);
      }
    return `Ha sido asignada la incidencia ${id_incidencia} correctamente`;
  } catch (error) {
    console.error("Error al asignar la incidencia:", error);
    throw new Error("Error al asignar la incidencia");
  } finally {
    await conexion.end();
  }
}

  async solucionarIncidencia(uvus, id_incidencia) {
    const conexion = await database.connectPostgreSQL();
    try {
    const query = {
      text: ` update incidencia 
                  set estado_incidencia = 'solucionada' 
                  where id = $1 
                    AND EXISTS (
                      SELECT 1
                      FROM incidencia_usuario
                      JOIN usuario ON incidencia_usuario.usuario_id_mantenimiento_fk = usuario.id
                      WHERE usuario.nombre_usuario = $2
                      AND incidencia_usuario.id = incidencia.id)`,
      values: [id_incidencia, uvus],
    };
    await conexion.query(query);
    const queryIncidenciaUsuario = {
      text: `select nombre_usuario from usuario where id = (select usuario_id_fk from incidencia_usuario where id = $1)`,
      values: [id_incidencia],
    };
    const resQueryIncidencia = await conexion.query(queryIncidenciaUsuario)
    const uvusUsuario = resQueryIncidencia.rows[0].nombre_usuario;

    const queryFechaCreacion = {
      text: `SELECT fecha_creacion FROM incidencia WHERE id = $1`,
      values: [id_incidencia],
    };
    const resFechaCreacion = await conexion.query(queryFechaCreacion);
    const fechaCreacionIncidencia = resFechaCreacion.rows[0].fecha_creacion;
    try {
      const chatIdAdmin = await autorizacionService.obtenerChatIdUsuario(uvus);
      const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvusUsuario);
      await sendMessage(chatIdAdmin,`🎉 La incidencia ${id_incidencia} ha sido solucionada correctamente.`);
      await sendMessage(chatIdUsuario,`🎉 La incidencia que fue creada <i>${formatearFecha(fechaCreacionIncidencia)}</i> ha sido solucionada.`,"HTML");    } catch (error) {
      console.error("Error al enviar el mensaje de solucionar incidencia:", error);
    }
    return `La incidencia ${id_incidencia} ha sido solucionada correctamente.`;
  } catch (error) {
    console.error("Error al solucionar la incidencia:", error);
    throw new Error("Error al solucionar la incidencia");
  } finally {
    await conexion.end();
  }
}

  async crearIncidencia(descripcion, tipo_incidencia, fileId, uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      const queryIncidencia = {
        text: ` INSERT INTO incidencia (fecha_creacion, descripcion,tipo_incidencia,estado_incidencia,archivo) 
                VALUES (NOW(),$1,$2,'abierta',$3)
                RETURNING id, fecha_creacion`,
        values: [descripcion, tipo_incidencia, fileId],
      };
      const resultado = await conexion.query(queryIncidencia);
      const incidenciaId = resultado.rows[0].id;
      const fecha_creacion = resultado.rows[0].fecha_creacion;
      const incidenciaUsuario = {
        text: ` INSERT INTO incidencia_usuario (id, usuario_id_fk) 
                VALUES ($1,(select id from usuario where nombre_usuario=$2))`,
        values: [incidenciaId, uvus],
      };
      await conexion.query(incidenciaUsuario);
      await conexion.query('COMMIT');
      try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdUsuario, formatearNuevaIncidencia(descripcion,tipo_incidencia,fecha_creacion), "HTML");
      } catch(error){
        console.error("Error al enviar el mensaje de incidencia creada:", error);
      }
      return "Se ha creado la incidencia correctamente";
    } catch (error) {
      await conexion.query('ROLLBACK');
      console.error("Error al crear la incidencia:", error);
      throw new Error("Error al crear la incidencia");
    } finally {
      await conexion.end();
    }
  }
}
const incidenciaService = new IncidenciaService();
export default incidenciaService;
