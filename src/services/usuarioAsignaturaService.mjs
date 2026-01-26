import database from "../config/database.mjs";
class AsignaturaUsuarioService {

  async actualizarAsignaturasUsuario(uvus, asignatura) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select count(*) from usuario_asignatura where asignatura_id_fk = (select id from asignatura where codigo = $2) 
      and usuario_id_fk = (select u.id from usuario u where u.nombre_usuario =$1)`,
      values: [uvus, asignatura],
    };
    const res = await conexion.query(query);
    if (res.rows[0].count > 0) {
      await conexion.end();
      return 'El usuario ya está en la asignatura';
    }
    try {
      const query = {
        text: `insert into usuario_asignatura values (
              (select u.id from usuario u where u.nombre_usuario =$1),  (select id from asignatura where codigo = $2))`,
        values: [uvus, asignatura],
      };
      await conexion.query(query);
      await conexion.end();
      return 'Usuario insertado en la asignatura correctamente';
    } catch (err) {
      console.error(err);
      return 'Se ha producido un error al insertar el usuario en la asignatura';
    }
  }

  async obtenerAsignaturasUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: ` select nombre as asignatura, codigo 
              from asignatura 
              where id in (select asignatura_id_fk from usuario_asignatura where usuario_id_fk = (select u.id from usuario u where u.nombre_usuario = $1))`,
        values: [uvus],
      };
      const res = await conexion.query(query);
      await conexion.end();
      return res.rows;
    } catch (err) {
      console.error(err);
      return 'Se ha producido un error al conseguir las asignaturas del usuario';
    }
  }


  async superarAsignaturasUsuario(uvus, asignatura) {
    const conexion = await database.connectPostgreSQL();
    try {
      // Eliminar de la tabla usuario_grupo
      const deleteUsuarioGrupoQuery = {
        text: `delete from usuario_grupo 
                   where usuario_id_fk = (
                       select u.id from usuario u where u.nombre_usuario = $1) 
                   AND grupo_id_fk IN (
                       select g.id from grupo g 
                       where g.asignatura_id_fk = (select id from asignatura where codigo = $2)
                   );`,
        values: [uvus, asignatura],
      };
      await conexion.query(deleteUsuarioGrupoQuery);

      // Eliminar de la tabla usuario_asignatura
      const deleteUsuarioAsignaturaQuery = {
        text: `delete from usuario_asignatura 
                   where usuario_id_fk = (
                       select u.id from usuario u where u.nombre_usuario = $1) 
                   AND asignatura_id_fk = (select id from asignatura where codigo = $2);`,
        values: [uvus, asignatura],
      };
      await conexion.query(deleteUsuarioAsignaturaQuery);

      await conexion.end();
      return 'Asignatura y grupos asociados superados correctamente';
    } catch (err) {
      console.error(err);
      return 'Se ha producido un error al eliminar la asignatura y los grupos asociados del usuario';
    }
  }

  async asignaturasSinGrupoUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `select nombre as asignatura, codigo 
                   from asignatura 
                   where id not in (select asignatura_id_fk from usuario_asignatura where usuario_id_fk = (select u.id from usuario u where u.nombre_usuario = $1))`,
        values: [uvus],
      };
      const res = await conexion.query(query);
      await conexion.end();
      return res.rows;
    } catch (err) {
      console.error(err);
      return 'Se ha producido un error al conseguir las asignaturas sin grupo del usuario';
    }
  }

  async asignaturasSinGrupoUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `SELECT EXISTS (
                SELECT 1 
                FROM usuario_asignatura ua
                WHERE ua.usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
                AND NOT EXISTS (
                    SELECT 1 
                    FROM usuario_grupo ug
                    JOIN grupo g ON ug.grupo_id_fk = g.id
                    WHERE ug.usuario_id_fk = ua.usuario_id_fk
                    AND g.asignatura_id_fk = ua.asignatura_id_fk
                )
            ) as result`,
        values: [uvus],
      };
      const res = await conexion.query(query);
      await conexion.end();
      return { result: res.rows[0].result };
    } catch (err) {
      console.error(err);
      return { result: false, error: 'Se ha producido un error al comprobar las asignaturas sin grupo del usuario' };
    }
  }
}


const asignaturaUsuarioService = new AsignaturaUsuarioService();
export default asignaturaUsuarioService;