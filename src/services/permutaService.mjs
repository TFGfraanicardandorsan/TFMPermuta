import database from "../config/database.mjs";

class PermutaService{
    async getPermutas(){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select * from permuta`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
      }
}
const permutaService = new PermutaService();
export default permutaService;