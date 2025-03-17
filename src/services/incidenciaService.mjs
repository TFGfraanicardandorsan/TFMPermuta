import database from "../config/database.mjs";

class IncidenciaService{
    async obtenerIncidencias(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }

      async obtenerIncidenciasAsignadasUsuario(uvus){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia from incidencia where id in (select id from incidencia_usuario where usuario_id_fk = (select id from usuario where nombre_usuario = $1))`,
          values: [`${uvus}`],
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res.rows;
      }

      async obtenerIncidenciasAsignadas(){
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

      async obtenerIncidenciasSinAsignar(){
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

      async asignarmeIncidencia(uvus,id_incidencia){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `update incidencia_usuario set usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario = $1) where id = $2`,
          values: [`${uvus}`,`${id_incidencia}`],
        };
        await conexion.query(query);
        await conexion.end();
        return `Ha sido asignada la incidencia ${id_incidencia} correctamente`;
      }

      async solucionarIncidencia(uvus,id_incidencia){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `update incidencia set estado_incidencia = 'solucionada' where id = $1 and incidencia_usuario.usuario_id_mantenimiento_fk = (select id from usuario where nombre_usuario = $2)`,
          values: [`${id_incidencia}`,`${uvus}`],
        };
        await conexion.query(query);
        await conexion.end();
        return `Ha sido solucionada la incidencia ${id_incidencia} correctamente`;
      }

      async crearIncidencia(descripcion,tipo_incidencia,archivo){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `insert into incidencia (fecha_creacion, descripcion,tipo_incidencia,estado_incidencia,archivo) values (NOW(),$1,$2,'abierta',$3)`,
          values: [`${descripcion}`,`${tipo_incidencia}, ${archivo}`],
        };
        await conexion.query(query);
        await conexion.end();
        return 'Se ha creado la incidencia correctamente';
      }
}
const incidenciaService = new IncidenciaService();
export default incidenciaService;