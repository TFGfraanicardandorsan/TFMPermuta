import database from "../config/database.mjs";

const crearErrorServicio = (statusCode, message, detalles = undefined) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  if (detalles) {
    error.detalles = detalles;
  }
  return error;
};

class GrupoService {
  async ejecutarEnTransaccion(operacion) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query("BEGIN");
      const resultado = await operacion(conexion);
      await conexion.query("COMMIT");
      return resultado;
    } catch (error) {
      try {
        await conexion.query("ROLLBACK");
      } catch (rollbackError) {
        console.error("Error al deshacer la transacción de grupos:", rollbackError);
      }
      throw error;
    } finally {
      await conexion.end();
    }
  }

  async obtenerAsignaturaBloqueadaPorCodigo(conexion, codigo) {
    const asignaturaRes = await conexion.query({
      text: `
        SELECT id, codigo, nombre, curso
        FROM asignatura
        WHERE codigo = $1
        FOR UPDATE
      `,
      values: [codigo],
    });

    if (asignaturaRes.rows.length === 0) {
      throw crearErrorServicio(404, `No existe la asignatura con código ${codigo}`);
    }

    return asignaturaRes.rows[0];
  }

  async obtenerAsignaturasBloqueadasPorCursoGrado(conexion, estudiosId, curso) {
    const asignaturasRes = await conexion.query({
      text: `
        SELECT a.id, a.codigo, a.nombre, a.curso
        FROM asignatura a
        JOIN asignatura_estudios ae ON a.id = ae.asignatura_id
        WHERE ae.estudios_id = $1
          AND a.curso = $2
        ORDER BY a.id
        FOR UPDATE OF a
      `,
      values: [estudiosId, curso],
    });

    if (asignaturasRes.rows.length === 0) {
      throw crearErrorServicio(404, `No existen asignaturas para el grado ${estudiosId} y curso ${curso}`);
    }

    return asignaturasRes.rows;
  }

  async crearSiguienteGrupo(conexion, asignatura) {
    const maxGrupoRes = await conexion.query({
      text: `
        SELECT COALESCE(MAX(CAST(nombre AS INTEGER)), 0) AS max_grupo
        FROM grupo
        WHERE asignatura_id_fk = $1
      `,
      values: [asignatura.id],
    });

    const siguienteNumero = Number(maxGrupoRes.rows[0].max_grupo) + 1;
    const grupoRes = await conexion.query({
      text: `
        INSERT INTO grupo (nombre, asignatura_id_fk)
        VALUES ($1, $2)
        RETURNING id, nombre AS "numGrupo", asignatura_id_fk AS "asignaturaId"
      `,
      values: [String(siguienteNumero), asignatura.id],
    });

    return {
      ...grupoRes.rows[0],
      codigoAsignatura: asignatura.codigo,
      nombreAsignatura: asignatura.nombre,
      curso: asignatura.curso,
    };
  }

  async obtenerUltimoGrupo(conexion, asignatura) {
    const grupoRes = await conexion.query({
      text: `
        SELECT id, nombre AS "numGrupo"
        FROM grupo
        WHERE asignatura_id_fk = $1
        ORDER BY CAST(nombre AS INTEGER) DESC
        LIMIT 1
        FOR UPDATE
      `,
      values: [asignatura.id],
    });

    if (grupoRes.rows.length === 0) {
      throw crearErrorServicio(409, `La asignatura ${asignatura.codigo} no tiene grupos para eliminar`);
    }

    return grupoRes.rows[0];
  }

  async asegurarGrupoSinReferencias(conexion, grupo, asignatura) {
    const referenciasRes = await conexion.query({
      text: `
        SELECT
          (SELECT COUNT(*)::int FROM usuario_grupo WHERE grupo_id_fk = $1) AS usuarios,
          (SELECT COUNT(*)::int FROM grupo_deseado WHERE grupo_id_fk = $1) AS grupos_deseados,
          (SELECT COUNT(*)::int FROM solicitud_permuta WHERE grupo_solicitante_id_fk = $1) AS solicitudes,
          (SELECT COUNT(*)::int FROM permuta WHERE grupo_id_1_fk = $1 OR grupo_id_2_fk = $1) AS permutas
      `,
      values: [grupo.id],
    });

    const referencias = referenciasRes.rows[0];
    const totalReferencias = Object.values(referencias)
      .reduce((total, valor) => total + Number(valor), 0);

    if (totalReferencias > 0) {
      throw crearErrorServicio(
        409,
        `No se puede eliminar el grupo ${grupo.numGrupo} de la asignatura ${asignatura.codigo} porque tiene relaciones asociadas`,
        referencias,
      );
    }
  }

  async eliminarUltimoGrupo(conexion, asignatura) {
    const grupo = await this.obtenerUltimoGrupo(conexion, asignatura);
    await this.asegurarGrupoSinReferencias(conexion, grupo, asignatura);

    await conexion.query({
      text: "DELETE FROM grupo WHERE id = $1",
      values: [grupo.id],
    });

    return {
      ...grupo,
      codigoAsignatura: asignatura.codigo,
      nombreAsignatura: asignatura.nombre,
      curso: asignatura.curso,
    };
  }

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

  async obtenerGruposAsignaturasSinAsignaturaConGrupoUsuario(uvus) {
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
  
  async obtenerTodosGruposMisAsignaturasUsuario(uvus) {
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
  
  async actualizarProyectoDocente(grupoId, pdfPath) {
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `UPDATE grupo SET proyecto_docente = $1 WHERE id = $2`,
      values: [pdfPath, grupoId],
    };
    await conexion.query(query);
    await conexion.end();
  }

  async crearGrupoAsignatura(codigo) {
    return this.ejecutarEnTransaccion(async (conexion) => {
      const asignatura = await this.obtenerAsignaturaBloqueadaPorCodigo(conexion, codigo);
      const grupoCreado = await this.crearSiguienteGrupo(conexion, asignatura);

      return {
        asignaturasProcesadas: 1,
        gruposCreados: [grupoCreado],
      };
    });
  }

  async crearGruposCursoGrado(estudiosId, curso) {
    return this.ejecutarEnTransaccion(async (conexion) => {
      const asignaturas = await this.obtenerAsignaturasBloqueadasPorCursoGrado(conexion, estudiosId, curso);
      const gruposCreados = [];

      for (const asignatura of asignaturas) {
        gruposCreados.push(await this.crearSiguienteGrupo(conexion, asignatura));
      }

      return {
        asignaturasProcesadas: asignaturas.length,
        gruposCreados,
      };
    });
  }

  async eliminarUltimoGrupoAsignatura(codigo) {
    return this.eliminarUltimosGruposAsignaturas([codigo]);
  }

  async eliminarUltimosGruposAsignaturas(codigos) {
    return this.ejecutarEnTransaccion(async (conexion) => {
      const codigosUnicos = [...new Set(codigos)].sort((a, b) => a - b);
      const gruposEliminados = [];

      for (const codigo of codigosUnicos) {
        const asignatura = await this.obtenerAsignaturaBloqueadaPorCodigo(conexion, codigo);
        gruposEliminados.push(await this.eliminarUltimoGrupo(conexion, asignatura));
      }

      return {
        asignaturasProcesadas: codigosUnicos.length,
        gruposEliminados,
      };
    });
  }

  async eliminarUltimosGruposCursoGrado(estudiosId, curso) {
    return this.ejecutarEnTransaccion(async (conexion) => {
      const asignaturas = await this.obtenerAsignaturasBloqueadasPorCursoGrado(conexion, estudiosId, curso);
      const gruposEliminados = [];

      for (const asignatura of asignaturas) {
        gruposEliminados.push(await this.eliminarUltimoGrupo(conexion, asignatura));
      }

      return {
        asignaturasProcesadas: asignaturas.length,
        gruposEliminados,
      };
    });
  }
}
const grupoService = new GrupoService();
export default grupoService;
