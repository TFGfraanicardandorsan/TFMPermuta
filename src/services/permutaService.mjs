import database from "../config/database.mjs";
import { sendMessage } from "./telegramService.mjs"
import autorizacionService from "./autorizacionService.mjs";

class PermutaService {
  async crearListaPermutas(archivo, IdsPermuta) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query("BEGIN");
      const queryPermutas = {
        text: ` INSERT INTO permutas (estado, archivo ) VALUES ('FIRMADA',$1) 
                RETURNING id`,
        values: [archivo],
      };
      const resultado = await conexion.query(queryPermutas);
      const permutasId = resultado.rows[0].id;
      for (const id of IdsPermuta) {
        const queryPermutas_permuta = {
          text: ` INSERT INTO permutas_permuta (permuta_id_fk, permutas_id_fk) 
                  VALUES ($1, $2)`,
          values: [id, permutasId],
        };
        await conexion.query(queryPermutas_permuta);
      }
      await conexion.query("COMMIT");
      return "Se ha creado la lista de permutas correctamente";
    } catch (error) {
      await conexion.query("ROLLBACK");
      console.error("Error al listar permutas:", error);
      throw new Error("Error al listar permutas");
    } finally {
      await conexion.end();
    }
  }

  async generarBorradorPermutas(IdsPermuta, uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query("BEGIN");
      const queryPermutas = {
        text: ` INSERT INTO permutas (estado, estudiante_cumplimentado_1 ) VALUES ('BORRADOR', $1) 
                RETURNING id`,
        values: [uvus],
      };
      const resultado = await conexion.query(queryPermutas);
      const permutasId = resultado.rows[0].id;
      for (const id of IdsPermuta) {
        const queryPermutas_permuta = {
          text: ` INSERT INTO permutas_permuta (permuta_id_fk, permutas_id_fk) 
                  VALUES ($1, $2);`,
          values: [id, permutasId],
        };
        const queryPermutas_permuta_update = {
          text: `Update permuta set estado = 'FINALIZADA' where id = $1;`,
          values: [id],
        };
        await conexion.query(queryPermutas_permuta_update);
        await conexion.query(queryPermutas_permuta);
      }
      await conexion.query("COMMIT");
      return "Se ha creado la lista de permutas correctamente";
    } catch (error) {
      await conexion.query("ROLLBACK");
      console.error("Error al listar permutas:", error);
      throw new Error("Error al listar permutas");
    } finally {
      await conexion.end();
    }
  }

  async listarPermutas(IdsPermuta) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: ` SELECT id, estado, archivo
              FROM permutas 
              WHERE id in (SELECT permutas_id_fk  FROM permutas_permuta WHERE permuta_id_fk = ANY($1))`,
        values: [IdsPermuta],
      };
      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error("Error al listar permutas:", error);
      throw new Error("Error al listar permutas");
    }
  }

  async firmarPermuta(permutaId, archivo) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `UPDATE permutas 
               SET estado = 'FIRMADA', archivo = $2
               WHERE id = $1`,
        values: [permutaId, archivo],
      };

      await conexion.query(query);
      await conexion.end();
      return "La permuta ha sido firmada correctamente";
    } catch (error) {
      console.error("Error al firmar la permuta:", error);
      throw new Error("Error al firmar la permuta");
    } finally {
      await conexion.end();
    }
  }

  async aceptarPermuta(permutaId, archivo, uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `UPDATE permutas 
               SET estado = 'ACEPTADA', archivo = $2, estudiante_cumplimentado_2 = $3
               WHERE id = $1`,
        values: [permutaId, archivo, uvus],
      };

      await conexion.query(query);
      await conexion.end();
      return "La permuta ha sido aceptada correctamente";
    } catch (error) {
      console.error("Error al aceptar la permuta:", error);
      throw new Error("Error al aceptar la permuta");
    } finally {
      await conexion.end();
    }
  }

async validarPermuta(permutaId) {
    const conexion = await database.connectPostgreSQL();
    try {
      const queryUpdate = {
        text: `UPDATE permutas 
               SET estado = 'VALIDADA'
               WHERE id = $1`,
        values: [permutaId],
      };
      await conexion.query(queryUpdate);

      const querySelect = {
        text: `SELECT estudiante_cumplimentado_1, estudiante_cumplimentado_2 FROM permutas WHERE id = $1`,
        values: [permutaId],
      };
      const resultado = await conexion.query(querySelect);
      const { estudiante_cumplimentado_1, estudiante_cumplimentado_2 } = resultado.rows[0];
      const mensaje = "La permuta ha sido validada correctamente. Recuerda que ahora debes presentar el documento firmado en el Registro Electrónico de la Universidad para completar el proceso.";
      try {
        const chatIdEstudiante1 = await autorizacionService?.obtenerChatIdUsuario(estudiante_cumplimentado_1);
        const chatIdEstudiante2 = await autorizacionService?.obtenerChatIdUsuario(estudiante_cumplimentado_2);
        await sendMessage(chatIdEstudiante1, mensaje);
        await sendMessage(chatIdEstudiante2, mensaje);
      } catch (msgError) {
        console.error("Error enviando mensaje de validación:", msgError);
      }
    } catch (error) {
      console.error("Error al validar la permuta:", error);
      throw new Error("Error al validar la permuta");
    } finally {
      await conexion.end();
    }
}

  async rechazarSolicitudPermuta(uvus, solicitud) {
    const conexion = await database.connectPostgreSQL();
    const update = {
      text: `update permuta set estado = 'RECHAZADA' where id = $1 and usuario_id_1_fk = (select id from usuario where nombre_usuario = $2)`,
      values: [`${solicitud}`, `${uvus}`],
    };
    await conexion.query(update);
    await conexion.end();
    return "Solicitud de permuta rechazada.";
  }

  async misPermutasPropuestas(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            p.id AS permuta_id,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            g1.nombre AS grupo_solicitante,
            g2.nombre AS grupo_solicitado,
            p.estado AS estado
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.usuario_id_1_fk = (
            SELECT id FROM usuario WHERE nombre_usuario = $1
          )
          and p.aceptada_2 = true
          AND p.aceptada_1 = false
          AND p.estado = 'ACEPTADA'
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error("Error al obtener las permutas propuestas:", error);
      throw new Error("Error al obtener las permutas propuestas");
    } finally {
      await conexion.end();
    }
  }

  async misPermutasPropuestasPorMi(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            p.id AS permuta_id,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            g1.nombre AS grupo_solicitante,
            g2.nombre AS grupo_solicitado,
            p.estado AS estado
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.usuario_id_2_fk = (
            SELECT id FROM usuario WHERE nombre_usuario = $1
          )
          AND p.aceptada_1 = false
          AND p.aceptada_2 = true
          AND p.estado = 'ACEPTADA'
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error("Error al obtener las permutas propuestas por mí:", error);
      throw new Error("Error al obtener las permutas propuestas por mí");
    } finally {
      await conexion.end();
    }
  }

  async obtenerPermutasValidadasPorUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            p.id AS permuta_id,
            a.nombre AS nombre_asignatura,
            a.codigo AS codigo_asignatura,
            g1.nombre AS grupo_1,
            g2.nombre AS grupo_2,
            p.estado AS estado
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.aceptada_1 = true
            AND p.aceptada_2 = true
            AND (p.estado = 'VALIDADA' OR p.estado ='FINALIZADA')
            AND (
              p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
              OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
            )
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error(
        "Error al obtener las permutas validadas por usuario:",
        error
      );
      throw new Error("Error al obtener las permutas validadas por usuario");
    } finally {
      await conexion.end();
    }
  }

  async obtenerPermutasAgrupadasPorUsuario(uvus) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
SELECT 
              p.id AS permuta_id,
              a.nombre AS nombre_asignatura,
              a.codigo AS codigo_asignatura,
              g1.nombre AS grupo_1,
              g2.nombre AS grupo_2,
              p.estado AS estado,
              LEAST(u1.nombre_usuario, u2.nombre_usuario) AS usuario_primario,
              GREATEST(u1.nombre_usuario, u2.nombre_usuario) AS usuario_secundario,
              (SELECT estado 
               FROM permutas 
               WHERE id = (
                 SELECT permutas_id_fk 
                 FROM permutas_permuta 
                 WHERE permuta_id_fk = p.id
                 LIMIT 1
               )
              ) AS estado_permuta_asociada
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          INNER JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
          INNER JOIN usuario u2 ON p.usuario_id_2_fk = u2.id
          WHERE (
              p.usuario_id_1_fk = (SELECT id FROM usuario WHERE nombre_usuario = $1)
              OR p.usuario_id_2_fk = (SELECT id FROM usuario WHERE nombre_usuario =$1)
          ) AND (p.estado = 'VALIDADA' OR p.estado = 'FINALIZADA') 
            AND p.aceptada_1 = true
            AND p.aceptada_2 = true
        `,
        values: [uvus],
      };

      const resultado = await conexion.query(query);

      // Agrupar las permutas por usuario_primario y usuario_secundario
      const permutasAgrupadas = resultado.rows.reduce((acc, row) => {
        const key = `${row.usuario_primario}-${row.usuario_secundario}`;
        if (!acc[key]) {
          acc[key] = [];
        }
        acc[key].push({
          permuta_id: row.permuta_id,
          nombre_asignatura: row.nombre_asignatura,
          codigo_asignatura: row.codigo_asignatura,
          grupo_1: row.grupo_1,
          grupo_2: row.grupo_2,
          estado: row.estado,
          estado_permuta_asociada: row.estado_permuta_asociada,
        });
        return acc;
      }, {});

      await conexion.end();

      // Convertir el objeto agrupado en un array
      return Object.entries(permutasAgrupadas).map(([usuarios, permutas]) => ({
        usuarios: usuarios.split("-"),
        permutas,
      }));
    } catch (error) {
      console.error(
        "Error al obtener las permutas agrupadas por usuario:",
        error
      );
      throw new Error("Error al obtener las permutas agrupadas por usuario");
    } finally {
      await conexion.end();
    }
  }

  async obtenerEstadoPermutaYUsuarios(permutasId) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
          SELECT 
            per.estado,
            per.archivo,
            u1.nombre_usuario as usuario_1,
            u2.nombre_usuario as usuario_2,
            p.id as permuta_id,
            a.codigo as codigo_asignatura,
            g1.nombre as grupo_1,
            g2.nombre as grupo_2
          FROM permutas per
          INNER JOIN permutas_permuta pp ON per.id = pp.permutas_id_fk
          INNER JOIN permuta p ON pp.permuta_id_fk = p.id
          INNER JOIN usuario u1 ON p.usuario_id_1_fk = u1.id
          INNER JOIN usuario u2 ON p.usuario_id_2_fk = u2.id
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE per.id = $1
        `,
        values: [permutasId],
      };

      const resultado = await conexion.query(query);
      await conexion.end();

      if (resultado.rows.length === 0) {
        throw new Error("No se encontró la permuta especificada");
      }

      return {
        estado: resultado.rows[0].estado,
        archivo: resultado.rows[0].archivo,
        permutas: resultado.rows.map((row) => ({
          permuta_id: row.permuta_id,
          usuario_1: row.usuario_1,
          usuario_2: row.usuario_2,
          codigo_asignatura: row.codigo_asignatura,
          grupo_1: row.grupo_1,
          grupo_2: row.grupo_2,
        })),
      };
    } catch (error) {
      console.error("Error al obtener estado de permuta y usuarios:", error);
      throw new Error("Error al obtener estado de permuta y usuarios");
    } finally {
      await conexion.end();
    }
  }
}

const permutaService = new PermutaService();
export default permutaService;
