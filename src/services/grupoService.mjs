import database from "../config/database.mjs";

class GrupoService {
  async obtenerGruposPorAsignatura(asignatura) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select id,nombre as numGrupo from grupo where asignatura_id_fk = (Select id from asignatura where codigo = $1)`,
      values: [asignatura],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }
  async insertarMisGrupos(uvus, num_grupo, codigo) {
    const conexion = await database.connectPostgreSQL();
    const insert = {
      text: `insert into usuario_grupo (usuario_id_fk, grupo_id_fk ) values (
          (select id from usuario where nombre_usuario=$3), 
          (select id from grupo g  where g.nombre = $1 and g.asignatura_id_fk = (select id from asignatura where codigo =$2 )))`,
      values: [num_grupo, codigo, uvus],
    };
    await conexion.query(insert);
    await conexion.end();
  }

  async obtenerMiGrupoAsignatura(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select g.id, g.nombre as numGrupo , a.nombre as asignatura, a.codigo as codigo from grupo g left join asignatura a on a.id = g.asignatura_id_fk 
          where g.id in (select ug.grupo_id_fk  from usuario_grupo ug where ug.usuario_id_fk = (select id from usuario u where u.nombre_usuario = $1));`,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerTodosGruposMisAsignaturasUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `select g.nombre as numGrupo , a.nombre as nombreAsignatura, a.codigo as codAsignatura from grupo g left join asignatura a on a.id = g.asignatura_id_fk
          where g.asignatura_id_fk in (select ua.asignatura_id_fk from usuario_asignatura ua where ua.usuario_id_fk = (select id from usuario u where u.nombre_usuario = $1));`,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

 async obtenerTodosGruposMisAsignaturasSinGrupoUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `
select g.id, g.nombre as numGrupo , a.nombre as nombreAsignatura, a.codigo as codAsignatura from grupo g left join asignatura a on a.id = g.asignatura_id_fk
          where g.asignatura_id_fk in (select ua.asignatura_id_fk from usuario_asignatura ua where ua.usuario_id_fk = (select id from usuario u where u.nombre_usuario = $1)
and g.id not in(select g.id from grupo g left join asignatura a on a.id = g.asignatura_id_fk 
          where g.id in (select ug.grupo_id_fk  from usuario_grupo ug where ug.usuario_id_fk = (select id from usuario u where u.nombre_usuario = $1))));
      `,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `
      SELECT 
        g.id, 
        g.nombre AS numGrupo, 
        a.nombre AS nombreAsignatura, 
        a.codigo AS codAsignatura 
      FROM 
        grupo g 
      LEFT JOIN 
        asignatura a 
      ON 
        a.id = g.asignatura_id_fk
      WHERE 
        g.asignatura_id_fk IN (
          SELECT 
            ua.asignatura_id_fk 
          FROM 
            usuario_asignatura ua 
          WHERE 
            ua.usuario_id_fk = (
              SELECT 
                id 
              FROM 
                usuario u 
              WHERE 
                u.nombre_usuario = $1
            )
        )
        AND g.asignatura_id_fk NOT IN (
          SELECT 
            g.asignatura_id_fk 
          FROM 
            grupo g 
          INNER JOIN 
            usuario_grupo ug 
          ON 
            g.id = ug.grupo_id_fk 
          WHERE 
            ug.usuario_id_fk = (
              SELECT 
                id 
              FROM 
                usuario u 
              WHERE 
                u.nombre_usuario = $1
            )
        );
    `,
      values: [uvus],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }
}
const grupoService = new GrupoService();
export default grupoService;