import database from "../config/database.mjs";

class FuncionalidadService{

async insertarFuncionalidad(funcionalidad){
    const conexion = await database.connectPostgreSQL();
    const query = {
      text: `INSERT INTO funcionalidad (nombre) VALUES ($1)`,
      values: [`${funcionalidad}`],
    };
    await conexion.query(query);
    await conexion.end();
    return 'Se ha insertado la funcionalidad correctamente';
  }
}
const funcionalidadService = new FuncionalidadService();
export default funcionalidadService;