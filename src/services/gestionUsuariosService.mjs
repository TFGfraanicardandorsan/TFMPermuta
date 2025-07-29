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
}

const gestionUsuariosService = new gestionUsuariosService();
export default gestionUsuariosService;
