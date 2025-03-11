// import database from "../config/database.mjs";

// class UsuarioGrupoService{ 
// async insertarGrupoAsignatura(uvus, grupo, asignatura) {
//     const conexion = await database.connectPostgreSQL();
//     const query = {
//       text: `select count(*) from usuario_grupo where grupo_id_fk = (select id from grupo g  where g.nombre = $2 and g.asignatura_id_fk = (select id from asignatura where codigo =$3 )) 
//       and usuario_id_fk = (select id from usuario where nombre_usuario =$1)`,
//       values: [`${uvus}`, `${grupo}`, `${asignatura}`],
//     };
//     const res = await conexion.query(query);
//     if (res.rows[0].count > 0) {
//       await conexion.end();
//       return 'El usuario ya está en el grupo';
//     }
//     try {
//     const query = {
//       text: `insert into usuario_grupo values (
//             (select id from usuario where nombre_usuario=$1), 
//             (select id from grupo g  where g.nombre = $2 and g.asignatura_id_fk = (select id from asignatura where codigo =$3 )))`,
//       values: [`${uvus}`, `${grupo}`, `${asignatura}`],
//     };
//     await conexion.query(query);
//     await conexion.end();
//     return 'Usuario insertado en el grupo correctamente';
//     } catch (err) {
//     console.error(err);
//     return 'Se ha producido un error al insertar el usuario en el grupo';
//     }
//   }
// }
// const usuarioGrupoService = new UsuarioGrupoService();
// export default usuarioGrupoService;