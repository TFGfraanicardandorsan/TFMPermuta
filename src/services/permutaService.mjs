import database from "../config/database.mjs";

class PermutaService{
  async crearListaPermutas(archivo,IdsPermuta) {
    const conexion = await database.connectPostgreSQL();
    try {
      await conexion.query('BEGIN');
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
          values: [id,permutasId],
        };
        await conexion.query(queryPermutas_permuta);
      }
      await conexion.query('COMMIT');
      return "Se ha creado la lista de permutas correctamente";
    } catch (error) {
      await conexion.query('ROLLBACK');
      console.error("Error al listar permutas:", error);
      throw new Error("Error al listar permutas");
    } finally {
      await conexion.end();
    }
  }
}
const permutaService = new PermutaService();
export default permutaService;