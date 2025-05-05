import database from "../config/database.mjs";

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
  async listarPermutas() {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: ` SELECT id, estado, archivo
                FROM permutas`
      };
      const resultado = await conexion.query(query);
      await conexion.end();
      return resultado.rows;
    } catch (error) {
      console.error("Error al listar permutas:", error);
      throw new Error("Error al listar permutas");
    }
  }
  async aceptarPermuta(permutaId, archivo) {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `UPDATE permutas 
               SET estado = 'ACEPTADA', archivo = $2
               WHERE id = $1`,
        values: [permutaId, archivo]
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

  async rechazarSolicitudPermuta(uvus, solicitud) {
    const conexion = await database.connectPostgreSQL();
    const update = {
      text: `update permuta set estado = 'RECHAZADA' where id = $1 and usurio_id_1_fk = (select id from usuario where nombre_usuario = $2)`,
      values: [`${solicitud}`, `${uvus}`],
    };
    await conexion.query(update);
    await conexion.end();
    return 'Solicitud de permuta rechazada.';
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
            g1.nombre AS grupo_1,
            g2.nombre AS grupo_2
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.usuario_id_1_fk = (
            SELECT id FROM usuario WHERE nombre_usuario = $1
          )
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
            g1.nombre AS grupo_1,
            g2.nombre AS grupo_2
          FROM permuta p
          INNER JOIN asignatura a ON p.asignatura_id_fk = a.id
          INNER JOIN grupo g1 ON p.grupo_id_1_fk = g1.id
          INNER JOIN grupo g2 ON p.grupo_id_2_fk = g2.id
          WHERE p.usuario_id_2_fk = (
            SELECT id FROM usuario WHERE nombre_usuario = $1
          )
          AND p.aceptada_2 = false
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
}

const permutaService = new PermutaService();
export default permutaService;
