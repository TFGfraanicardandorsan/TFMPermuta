import database from "../config/database.mjs";
import { mensajeGradoSeleccionado } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
import { toCanonicalRole } from "../utils/roles.mjs";
class UsuarioService{

async obtenerDatosUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT u.nombre_completo, u.correo, e.nombre as titulacion, e.siglas  
             FROM Usuario u  
             LEFT JOIN estudios e ON u.estudios_id_fk = e.id  
             WHERE u.nombre_usuario = ($1)`,
             values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }

  async obtenerDatosUsuarioAdmin(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `SELECT u.nombre_completo, u.correo
             FROM Usuario u 
             WHERE u.nombre_usuario = ($1)`,
             values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }

  async actualizarEstudiosUsuario(uvus, estudio) {
    const conexion = await database.connectPostgreSQL();
    const queryUsuario = {
      text: `select estudios_id_fk from usuario u where u.nombre_usuario =$1`,
      values: [uvus],
    };
    const resQueryUsuario = await conexion.query(queryUsuario);
    if (resQueryUsuario.rows[0].estudios_id_fk === null) {
      const query = {
        text: `Update usuario u set estudios_id_fk =(select id from estudios where nombre = $1) where u.nombre_usuario =$2`,
        values: [estudio, uvus],
      };
      await conexion.query(query);
      await conexion.end();
      // Enviar mensaje por Telegram
      try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        await sendMessage(chatIdUsuario, mensajeGradoSeleccionado(estudio));
      } catch (error) {
        console.error("Error al enviar el mensaje de selección de estudio:", error);
      }
      return 'Estudios seleccionados';
    }
    await conexion.end();
    return 'Ya tienes estudios seleccionados. Ponte en contacto con el administrador si deseas cambiarlos';
  }

  async actualizarCorreoUsuario(uvus, nuevoCorreo) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `UPDATE usuario SET correo = $1 WHERE nombre_usuario = $2`,
        values: [nuevoCorreo, uvus],
      };
      await conexion.query(query);
      return 'Correo actualizado correctamente';
    } finally {
      await conexion.end();
    }
  }

  async obtenerTodosUsuarios() {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `SELECT u.nombre_usuario as uvus, u.nombre_completo, u.correo, r.rol,
                      e.nombre AS estudio
               FROM usuario u
               LEFT JOIN roles r ON r.usuario_id_fk = u.id
               LEFT JOIN estudios e ON e.id = u.estudios_id_fk`,
      };
      const res = await conexion.query(query);
      return res.rows.map((usuario) => ({
        ...usuario,
        rol: toCanonicalRole(usuario.rol),
      }));
    } finally {
      await conexion.end();
    }
  }

  async actualizarUsuario(uvus, { nuevo_uvus, nombre_completo, correo, rol, estudio }) {
    const conexion = await database.connectPostgreSQL();
    try {
      const rolCanonico = toCanonicalRole(rol);
      await conexion.query("BEGIN");

      const usuarioConNuevoUvus = await conexion.query({
        text: `SELECT id
               FROM usuario
               WHERE nombre_usuario = $1
                 AND nombre_usuario <> $2
               LIMIT 1`,
        values: [nuevo_uvus, uvus],
      });

      if (usuarioConNuevoUvus.rowCount > 0) {
        const error = new Error(`Ya existe un usuario con el UVUS ${nuevo_uvus}`);
        error.code = "UVUS_DUPLICADO";
        throw error;
      }

      const actualizarEstudio = estudio !== undefined;
      let estudioId = null;
      if (actualizarEstudio && estudio !== null) {
        const estudioEncontrado = await conexion.query({
          text: `SELECT id FROM estudios WHERE nombre = $1`,
          values: [estudio],
        });
        if (estudioEncontrado.rows.length === 0) {
          const error = new Error(`No existe el grado ${estudio}`);
          error.code = "ESTUDIO_NO_ENCONTRADO";
          throw error;
        }
        estudioId = estudioEncontrado.rows[0].id;
      }

      const usuarioActualizado = await conexion.query({
        text: `UPDATE usuario
               SET nombre_usuario = $1,
                   nombre_completo = $2,
                   correo = $3,
                   estudios_id_fk = CASE WHEN $4 THEN $5 ELSE estudios_id_fk END
               WHERE nombre_usuario = $6
               RETURNING id`,
        values: [nuevo_uvus, nombre_completo, correo, actualizarEstudio, estudioId, uvus],
      });

      if (usuarioActualizado.rowCount === 0) {
        const error = new Error(`No existe el usuario ${uvus}`);
        error.code = "USUARIO_NO_ENCONTRADO";
        throw error;
      }

      await conexion.query({
        text: `UPDATE roles SET rol = $1 WHERE usuario_id_fk = $2`,
        values: [rolCanonico, usuarioActualizado.rows[0].id],
      });

      // Estos campos conservan el UVUS como texto en lugar de referenciar usuario.id.
      await conexion.query({
        text: `UPDATE permutas
               SET estudiante_cumplimentado_1 = CASE
                     WHEN estudiante_cumplimentado_1 = $1 THEN $2
                     ELSE estudiante_cumplimentado_1
                   END,
                   estudiante_cumplimentado_2 = CASE
                     WHEN estudiante_cumplimentado_2 = $1 THEN $2
                     ELSE estudiante_cumplimentado_2
                   END
               WHERE estudiante_cumplimentado_1 = $1
                  OR estudiante_cumplimentado_2 = $1`,
        values: [uvus, nuevo_uvus],
      });
      await conexion.query("COMMIT");
      return "Usuario actualizado correctamente";
    } catch (error) {
      try {
        await conexion.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("No se pudo revertir la actualización del usuario", rollbackError);
      }
      throw error;
    } finally {
      await conexion.end();
    }
  }
}
const usuarioService = new UsuarioService();
export default usuarioService;
