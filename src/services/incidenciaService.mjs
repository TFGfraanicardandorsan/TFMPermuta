import database from "../config/database.mjs";

class IncidenciaService{
    async getIncidencias(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async getIncidenciasAsignadasUsuario(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia where id in (select id from incidencia_usuario where usuario_id_fk = (select id from usuario where nombre_usuario = $1))`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async getIncidenciasAsignadas(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia where id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario IS NOT NULL))`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async getIncidenciasSinAsignar(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia where id in (select id from incidencia_usuario where usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario IS NULL))`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async asignarmeIncidencia(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `update incidencia_usuario set usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario = $1) where id = $2`,
          values: [`${uvus}`,`${id_incidencia}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async solucionarIncidencia(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `update incidencia set estado_incidencia = 'solucionada' where id = $1 and incidencia_usuario.usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario = $2)`,
          values: [`${id_incidencia}`,`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }

      async crearIncidencia(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `insert into incidencia (fecha_creacion, descripcion,tipo_incidencia,estado_incidencia,archivo) values (NOW(),$1,$2,'abierta',$3)`,
          values: [`${descripcion}`,`${tipo_incidencia}, ${archivo}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }
}
const incidenciaService = new IncidenciaService();
export default incidenciaService;