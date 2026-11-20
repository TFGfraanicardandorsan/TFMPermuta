import database from "../config/database.mjs";

const crearErrorHttp = (statusCode, message) => Object.assign(new Error(message), { statusCode });

class AsignaturaService{
    async obtenerAsignaturasNoMatriculadas(uvus) {
        const query = {
          text: `select nombre,siglas, curso, codigo  
          from asignatura a 
          where a.id in (select asignatura_id from asignatura_estudios ae 
                where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$1)))`,
          values: [uvus],
        };
        const res = await database.consultar(query);
        return res.rows;
      }
      async personaMatriculadaEnAsignatura(uvus,asignatura){
         const query = {
           text: `select nombre,siglas, curso, codigo from asignatura a 
           where a.id in (select asignatura_id from asignatura_estudios ae 
           where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario =$2)) ) and a.codigo= $1 ;`,
           values: [asignatura,uvus],
         };
         const res = await database.consultar(query);
         if (res.rows.length === 0){
           return false;
         }
         return res.rows;
     }
     async asignaturasPermutables(){
      const query = {
        text: ` SELECT a.nombre, a.siglas, a.curso, a.codigo
                FROM asignatura a
                JOIN grupo g ON a.id = g.asignatura_id_fk AND g.habilitado = true
                GROUP BY a.nombre, a.siglas, a.curso, a.codigo
                HAVING COUNT(g.id) > 1
                ORDER BY a.curso`,
      };
      const res = await database.consultar(query);
      if (res.rows.length === 0){
        return false;
      }
      return res.rows;
  }
async asignaturasPermutablesUsuario(uvus){
  const query = {
    text: `SELECT a.nombre, a.siglas, a.curso, a.codigo
            FROM asignatura a
            JOIN grupo g ON a.id = g.asignatura_id_fk AND g.habilitado = true
            WHERE a.id IN (
              SELECT grupo_usuario.asignatura_id_fk
              FROM usuario_grupo ug
              INNER JOIN grupo grupo_usuario ON grupo_usuario.id = ug.grupo_id_fk
              WHERE grupo_usuario.habilitado = true
                AND ug.usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
            )
            GROUP BY a.nombre, a.siglas, a.curso, a.codigo
            HAVING COUNT(g.id) > 1
            ORDER BY a.curso`,
    values: [uvus],
  };
  const res = await database.consultar(query);
  if (res.rows.length === 0){
    return false;
  }
  return res.rows;
}
async obtenerAsignaturasMiEstudioUsuario(uvus) {
  const query = {
    text: `
      SELECT nombre, siglas, curso, codigo  
      FROM asignatura a 
      WHERE a.id IN (
        SELECT asignatura_id 
        FROM asignatura_estudios ae 
        WHERE ae.estudios_id = (
          SELECT e.id  
          FROM estudios e 
          WHERE id = (
            SELECT u.estudios_id_fk  
            FROM usuario u 
            WHERE u.nombre_usuario = $1
          )
        )
      )
      AND a.id NOT IN (
        SELECT asignatura_id_fk 
        FROM usuario_asignatura 
        WHERE usuario_id_fk = (
          SELECT id 
          FROM usuario 
          WHERE nombre_usuario = $1
        )
      )
    `,
    values: [uvus],
  };
  const res = await database.consultar(query);
  return res.rows;
}
async crearAsignatura({ nombre, siglas, curso, codigo, estudios_id }) {
  const conexion = await database.connectPostgreSQL();
  try {
    await conexion.query("BEGIN");
    // Serializa las altas con el mismo código para que la comprobación de duplicados sea fiable.
    await conexion.query({
      text: "SELECT pg_advisory_xact_lock(hashtext('crear_asignatura'), $1::int)",
      values: [codigo],
    });

    const estudio = await conexion.query({
      text: `SELECT id, nombre FROM estudios WHERE id = $1`,
      values: [estudios_id],
    });
    if (estudio.rows.length === 0) {
      throw crearErrorHttp(404, "El grado seleccionado no existe");
    }

    const duplicada = await conexion.query({
      text: `SELECT id FROM asignatura WHERE codigo = $1`,
      values: [codigo],
    });
    if (duplicada.rows.length > 0) {
      throw crearErrorHttp(409, `Ya existe una asignatura con el código ${codigo}`);
    }

    const resAsignatura = await conexion.query({
      text: `INSERT INTO asignatura (nombre, siglas, curso, codigo) VALUES ($1, $2, $3, $4) RETURNING id, nombre, siglas, curso, codigo`,
      values: [nombre, siglas, curso, codigo],
    });
    const asignatura = resAsignatura.rows[0];

    await conexion.query({
      text: `INSERT INTO asignatura_estudios (asignatura_id, estudios_id) VALUES ($1, $2)`,
      values: [asignatura.id, estudios_id],
    });

    await conexion.query("COMMIT");
    return {
      ...asignatura,
      grados: [{ id: estudio.rows[0].id, nombre: estudio.rows[0].nombre }],
      num_grupos: 0,
      matriculados: 0,
      solicitudes_vigentes: 0,
    };
  } catch (error) {
    await conexion.query("ROLLBACK").catch(() => {});
    throw error;
  } finally {
    await conexion.end();
  }
}

async obtenerPanelAdmin() {
  const conexion = await database.connectPostgreSQL();
  try {
    const res = await conexion.query({
      text: `
        SELECT
          a.id, a.codigo, a.nombre, a.siglas, a.curso,
          COALESCE(gr.grados, '[]'::json) AS grados,
          COALESCE(g.num_grupos, 0)::int AS num_grupos,
          COALESCE(ua.matriculados, 0)::int AS matriculados,
          COALESCE(sp.solicitudes_vigentes, 0)::int AS solicitudes_vigentes
        FROM asignatura a
        LEFT JOIN LATERAL (
          SELECT json_agg(json_build_object('id', e.id, 'nombre', e.nombre) ORDER BY e.nombre) AS grados
          FROM asignatura_estudios ae
          JOIN estudios e ON e.id = ae.estudios_id
          WHERE ae.asignatura_id = a.id
        ) gr ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS num_grupos FROM grupo
          WHERE asignatura_id_fk = a.id AND habilitado = true
        ) g ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS matriculados FROM usuario_asignatura
          WHERE asignatura_id_fk = a.id
        ) ua ON true
        LEFT JOIN LATERAL (
          SELECT COUNT(*) AS solicitudes_vigentes FROM solicitud_permuta
          WHERE id_asignatura_fk = a.id AND vigente = true
        ) sp ON true
        ORDER BY
          CASE a.curso WHEN 'PRIMERO' THEN 1 WHEN 'SEGUNDO' THEN 2
            WHEN 'TERCERO' THEN 3 WHEN 'CUARTO' THEN 4 ELSE 5 END,
          a.nombre`,
    });
    const asignaturas = res.rows;
    const resumen = {
      total: asignaturas.length,
      permutables: asignaturas.filter((a) => a.num_grupos > 1).length,
      sin_grupos: asignaturas.filter((a) => a.num_grupos === 0).length,
      sin_grado: asignaturas.filter((a) => a.grados.length === 0).length,
      total_grupos: asignaturas.reduce((acc, a) => acc + a.num_grupos, 0),
      solicitudes_vigentes: asignaturas.reduce((acc, a) => acc + a.solicitudes_vigentes, 0),
    };
    return { resumen, asignaturas };
  } finally {
    await conexion.end();
  }
}
async verAsignatura(codigo) {
  const conexion = await database.connectPostgreSQL();
  try {
    const query = {
      text: `
        SELECT 
          a.id, a.nombre, a.siglas, a.codigo, a.curso, e.nombre AS grado
        FROM asignatura a
        JOIN asignatura_estudios ae ON a.id = ae.asignatura_id
        JOIN estudios e ON ae.estudios_id = e.id
        WHERE a.codigo = $1
      `,
      values: [codigo],
    };
    const res = await conexion.query(query);
    return res.rows[0] || null;
  } finally {
    await conexion.end();
  }
}
async obtenerTodosGruposMisAsignaturasSinGrupoUsuario(uvus) {
  const conexion = await database.connectPostgreSQL();
  try {
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
          g.habilitado = true
          AND
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
          AND NOT EXISTS (
            SELECT 1
            FROM usuario_grupo ug
            INNER JOIN grupo grupo_usuario ON grupo_usuario.id = ug.grupo_id_fk
            WHERE grupo_usuario.habilitado = true
              AND grupo_usuario.asignatura_id_fk = g.asignatura_id_fk
              AND ug.usuario_id_fk = (
                SELECT id
                FROM usuario u
                WHERE u.nombre_usuario = $1
              )
          );
      `,
      values: [uvus],
    };
    const res = await conexion.query(query);
    return res.rows;
  } finally {
    await conexion.end();
  }
}
}
const asignaturaService = new AsignaturaService();
export default asignaturaService;
