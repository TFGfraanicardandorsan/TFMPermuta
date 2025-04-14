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
          text: ` select fecha_creacion, descripcion,tipo_incidencia,estado_incidencia 
                  from incidencia 
                  where id in (select id from incidencia_usuario where usuario_id_fk = (select id from usuario where nombre_usuario = $1))`,
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
          text: ` update incidencia 
                  set estado_incidencia = 'solucionada' 
                  where id = $1 
                    AND EXISTS (
                      SELECT 1
                      FROM incidencia_usuario
                      JOIN usuario ON incidencia_usuario.usuario_id_mantenimiento_fk = usuario.id
                      WHERE usuario.nombre_usuario = $2
                      AND incidencia_usuario.id = incidencia.id)`,
          values: [`${id_incidencia}`,`${uvus}`],
        };
        await conexion.query(query);
        await conexion.end();
        return `Ha sido solucionada la incidencia ${id_incidencia} correctamente`;
      }

      async crearIncidencia(descripcion,tipo_incidencia,fileId,uvus){
        //Crea un id aleatorio para la incidencia
        const id = crypto.randomUUID();
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `insert into incidencia (id,fecha_creacion, descripcion,tipo_incidencia,estado_incidencia,archivo) values ($4,NOW(),$1,$2,'abierta',$3)`,
          values: [`${descripcion}`,`${tipo_incidencia}`, `${fileId}`,`${id}`],
        };
        await conexion.query(query);
        const query2 = {
          text: `insert into incidencia_usuario (id, usuario_id_fk) values ($1,(select id from usuario where nombre_usuario=$2))`,
          values: [`${id}`,`${uvus}`],
        };
        await conexion.query(query2);
        await conexion.end();
        return 'Se ha creado la incidencia correctamente';
      }
}
const incidenciaService = new IncidenciaService();
export default incidenciaService;