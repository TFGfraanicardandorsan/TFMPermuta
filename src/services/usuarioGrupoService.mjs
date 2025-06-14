import database from "../config/database.mjs";
import { mensajeGruposSeleccionados } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
import autorizacionService from "./autorizacionService.mjs";

class UsuarioGrupoService{ 
  async insertarGrupoAsignatura(uvus, grupo, asignatura) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select count(*) from usuario_grupo where grupo_id_fk = (select id from grupo g  where g.nombre = $2 and g.asignatura_id_fk = (select id from asignatura where codigo =$3 )) 
      and usuario_id_fk = (select id from usuario where nombre_usuario =$1)`,
      values: [uvus, grupo, asignatura],
    };
    const res = await conexion.query(query);
    if (res.rows[0].count > 0) {
      await conexion.end();
      return 'El usuario ya está en el grupo';
    }
    try {
      const insertQuery = {
        text: `insert into usuario_grupo values (
              (select id from usuario where nombre_usuario=$1), 
              (select id from grupo g  where g.nombre = $2 and g.asignatura_id_fk = (select id from asignatura where codigo =$3 )))`,
        values: [uvus, grupo, asignatura],
      };
      await conexion.query(insertQuery);

      // Obtener todos los grupos actuales del usuario tras la inserción
      const gruposQuery = {
        text: `select a.nombre as nombreAsignatura, g.nombre as numGrupo
               from usuario_grupo ug
               join grupo g on ug.grupo_id_fk = g.id
               join asignatura a on g.asignatura_id_fk = a.id
               where ug.usuario_id_fk = (select id from usuario where nombre_usuario = $1)`,
        values: [uvus],
      };
      const gruposRes = await conexion.query(gruposQuery);

      // Enviar mensaje por Telegram
      try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdUsuario, mensajeGruposSeleccionados(gruposRes.rows));
      } catch (error) {
        console.error("Error al enviar el mensaje de grupos seleccionados:", error);
      }

      await conexion.end();
      return 'Usuario insertado en el grupo correctamente';
    } catch (err) {
      console.error(err);
      await conexion.end();
      return 'Se ha producido un error al insertar el usuario en el grupo';
    }
  }
}
const usuarioGrupoService = new UsuarioGrupoService();
export default usuarioGrupoService;