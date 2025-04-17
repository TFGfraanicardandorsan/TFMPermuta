import database from "../config/database.mjs";

class IncidenciaService {
  async obtenerIncidencias() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerIncidenciasAsignadasUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: ` select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
                  from incidencia 
                  where id in (select id from incidencia_usuario where usuario_id_fk = (select id from usuario where nombre_usuario = $1))`,
      values: [`${uvus}`],
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
                  where id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk in (select id from usuario where nombre_usuario IS NOT NULL))`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerIncidenciasSinAsignar() {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: ` select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
                  from incidencia 
                  where id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk IS NULL)`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async asignarmeIncidencia(uvus, id_incidencia) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `update incidencia_usuario set usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario = $1) where id = $2`,
      values: [`${uvus}`, `${id_incidencia}`],
    };
    await conexion.query(query);
    await conexion.end();
    return `Ha sido asignada la incidencia ${id_incidencia} correctamente`;
  }

  async solucionarIncidencia(uvus, id_incidencia) {
    const conexion = await database.connectPostgreSQL();
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
      values: [`${id_incidencia}`, `${uvus}`],
    };
    await conexion.query(query);
    await conexion.end();
    return `Ha sido solucionada la incidencia ${id_incidencia} correctamente`;
  }

  async crearIncidencia(descripcion, tipo_incidencia, fileId, uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
      const queryIncidencia = {
        text: ` INSERT INTO incidencia (fecha_creacion, descripcion,tipo_incidencia,estado_incidencia,archivo) 
                VALUES (NOW(),$1,$2,'abierta',$3)
                RETURNING id`,
        values: [descripcion, tipo_incidencia, fileId],
      };
      const resultado = await conexion.query(queryIncidencia);
      const incidenciaId = resultado.rows[0].id;
      const incidenciaUsuario = {
        text: ` INSERT INTO incidencia_usuario (id, usuario_id_fk) 
                VALUES ($1,(select id from usuario where nombre_usuario=$2))`,
        values: [incidenciaId, uvus],
      };
      await conexion.query(incidenciaUsuario);
      await conexion.query('COMMIT');
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
