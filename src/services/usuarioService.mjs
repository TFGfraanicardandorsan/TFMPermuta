import database from "../config/database.mjs";
import { mensajeGradoSeleccionado } from "../utils/mensajesTelegram.mjs";
import { sendMessage } from "./telegramService.mjs";
import { toCanonicalRole } from "../utils/roles.mjs";
import autorizacionService from "./autorizacionService.mjs";
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
    let esPrimeraSeleccion = false;
    try {
      await conexion.query("BEGIN");
      const usuarioRes = await conexion.query({
        text: `SELECT u.id, u.estudios_id_fk
               FROM usuario u
               WHERE u.nombre_usuario = $1
               FOR UPDATE`,
        values: [uvus],
      });
      if (usuarioRes.rows.length === 0) {
        const error = new Error(`No existe el usuario ${uvus}`);
        error.statusCode = 404;
        throw error;
      }

      const estudioRes = await conexion.query({
        text: `SELECT id FROM estudios WHERE nombre = $1`,
        values: [estudio],
      });
      if (estudioRes.rows.length === 0) {
        const error = new Error("El grado seleccionado no existe");
        error.statusCode = 400;
        throw error;
      }

      const usuario = usuarioRes.rows[0];
      const estudioId = estudioRes.rows[0].id;
      esPrimeraSeleccion = usuario.estudios_id_fk === null;

      if (usuario.estudios_id_fk === estudioId) {
        await conexion.query("COMMIT");
        return "El grado seleccionado ya es el actual";
      }

      if (!esPrimeraSeleccion) {
        const asignaturasRes = await conexion.query({
          text: `SELECT (
                   EXISTS (SELECT 1 FROM usuario_asignatura WHERE usuario_id_fk = $1)
                   OR EXISTS (SELECT 1 FROM usuario_grupo WHERE usuario_id_fk = $1)
                 ) AS tiene_datos_academicos`,
          values: [usuario.id],
        });
        if (asignaturasRes.rows[0].tiene_datos_academicos) {
          const error = new Error("Debes retirar tus asignaturas y grupos actuales antes de cambiar de grado");
          error.statusCode = 409;
          throw error;
        }
      }

      await conexion.query({
        text: `UPDATE usuario SET estudios_id_fk = $1 WHERE id = $2`,
        values: [estudioId, usuario.id],
      });
      await conexion.query("COMMIT");

      // Enviar mensaje por Telegram
      try {
        const chatIdUsuario = await autorizacionService.obtenerChatIdUsuario(uvus);
        if (chatIdUsuario) {
          await sendMessage(chatIdUsuario, mensajeGradoSeleccionado(estudio));
        }
      } catch (error) {
        console.error("Error al enviar el mensaje de selección de estudio:", error);
      }
      return esPrimeraSeleccion ? "Estudios seleccionados" : "Estudios actualizados";
    } catch (error) {
      await conexion.query("ROLLBACK").catch(() => {});
      throw error;
    } finally {
      await conexion.end();
    }
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
        text: `SELECT u.nombre_usuario as uvus, u.nombre_completo, u.correo, r.rol
               FROM usuario u
               LEFT JOIN roles r ON r.usuario_id_fk = u.id`,
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

  async actualizarUsuario(uvus, { nuevo_uvus, nombre_completo, correo, rol }) {
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

      const usuarioActualizado = await conexion.query({
        text: `UPDATE usuario
               SET nombre_usuario = $1, nombre_completo = $2, correo = $3
               WHERE nombre_usuario = $4
               RETURNING id`,
        values: [nuevo_uvus, nombre_completo, correo, uvus],
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
