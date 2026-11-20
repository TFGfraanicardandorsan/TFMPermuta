import database from "../config/database.mjs";
import { mensajeGruposSeleccionados } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
import autorizacionService from "./autorizacionService.mjs";

class UsuarioGrupoService{ 
  async insertarGrupoAsignatura(uvus, grupo, asignatura) {
    const conexion = await database.connectPostgreSQL();
    let gruposRes;
    try {
      await conexion.query("BEGIN");
      // Serializa las altas del mismo usuario para que dos peticiones simultáneas no dupliquen la fila.
      await conexion.query({
        text: "SELECT pg_advisory_xact_lock(hashtext('usuario_grupo'), hashtext($1))",
        values: [uvus],
      });
      const query = {
        text: `select count(*) from usuario_grupo where grupo_id_fk = (select id from grupo g  where g.nombre = $2 and g.habilitado = true and g.asignatura_id_fk = (select id from asignatura where codigo =$3 ))
        and usuario_id_fk = (select id from usuario where nombre_usuario =$1)`,
        values: [uvus, grupo, asignatura],
      };
      const res = await conexion.query(query);
      if (res.rows[0].count > 0) {
        await conexion.query("COMMIT");
        return 'El usuario ya está en el grupo';
      }
      try {
        const insertQuery = {
          text: `insert into usuario_grupo values (
                (select id from usuario where nombre_usuario=$1),
                (select id from grupo g  where g.nombre = $2 and g.habilitado = true and g.asignatura_id_fk = (select id from asignatura where codigo =$3 )))`,
          values: [uvus, grupo, asignatura],
        };
        await conexion.query(insertQuery);

        // Obtener todos los grupos actuales del usuario tras la inserción
        const gruposQuery = {
          text: `select a.nombre as nombreAsignatura, g.nombre as numGrupo
                 from usuario_grupo ug
                 join grupo g on ug.grupo_id_fk = g.id
                 join asignatura a on g.asignatura_id_fk = a.id
                 where g.habilitado = true and ug.usuario_id_fk = (select id from usuario where nombre_usuario = $1)`,
          values: [uvus],
        };
        gruposRes = await conexion.query(gruposQuery);
        await conexion.query("COMMIT");
      } catch (err) {
        await conexion.query("ROLLBACK").catch(() => {});
        console.error(err);
        return 'Se ha producido un error al insertar el usuario en el grupo';
      }
    } catch (err) {
      await conexion.query("ROLLBACK").catch(() => {});
      throw err;
    } finally {
      await conexion.end();
    }

    // Enviar mensaje por Telegram fuera de la transacción para no retener el bloqueo.
    try {
      const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
      await sendMessage(chatIdUsuario, mensajeGruposSeleccionados(gruposRes.rows));
    } catch (error) {
      console.error("Error al enviar el mensaje de grupos seleccionados:", error);
    }
    return 'Usuario insertado en el grupo correctamente';
  }
}
const usuarioGrupoService = new UsuarioGrupoService();
export default usuarioGrupoService;
