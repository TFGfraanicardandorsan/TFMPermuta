import database from "../config/database.mjs";

class FuncionalidadService{

async insertarFuncionalidad(funcionalidad){
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `INSERT INTO funcionalidad (nombre) VALUES ($1)`,
      values: [`${funcionalidad}`],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }
}
const funcionalidadService = new FuncionalidadService();
export default funcionalidadService;