import database from "../config/database.mjs";

class gestionUsuariosService{
    async actualizarRolUsuario(uvus, nuevoRol) {
        const conexion = await database.connectPostgreSQL();
        try {
            const query = {
                text: `UPDATE usuario SET roles = $1 WHERE nombre_usuario = (select id from usuario where nombre_usuario = $2)`,
                values: [nuevoRol, uvus],
            };
            await conexion.query(query);
            return "Rol actualizado correctamente";
        } catch (error) {
            console.error("Error al actualizar el rol del usuario:", error);
            throw new Error("Error al actualizar el rol del usuario");
        } finally {
            await conexion.end();
        }
    }

    async obtenerTodosUsuarios() {
        const conexion = await database.connectPostgreSQL();
        try {
            const query = {
                text: `SELECT u.nombre_completo, u.nombre_usuario, e.nombre as titulacion, u.correo, r.rol as rol
                FROM usuario u
                LEFT JOIN roles r ON u.id = r.usuario_id_fk,
                LEFT JOIN estudios e ON u.estudios_id_fk = e.id `,
            };
            const result = await conexion.query(query);
            return result.rows;
        } catch (error) {
            console.error("Error al obtener todos los usuarios:", error);
            throw new Error("Error al obtener todos los usuarios");
        } finally {
            await conexion.end();
        }
    }

async desactivarUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `UPDATE usuario SET activo = false WHERE nombre_usuario = $1`,
        values: [uvus],
      };
      await conexion.query(query);
      return 'Usuario desactivado correctamente';
    } catch (error) {
      console.error("Error al desactivar el usuario:", error);
      throw new Error("Error al desactivar el usuario");
    } finally {
      await conexion.end();
    }
  }

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

}
const gestionUsuariosService = new gestionUsuariosService();
export default gestionUsuariosService;
