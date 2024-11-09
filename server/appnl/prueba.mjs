import appnl from "../appnl.mjs";

class Prueba {
    async consultaPrueba() {
      const cliente = await appnl.connectPostgreSQL();
      const query = {
        text: `SELECT * FROM "Prueba"`,
        rowMode: 'array',
      };
      const res = await cliente.query(query);
      await cliente.end();
      return res.rows;
    }
  }
  const prueba = new Prueba();
  export default prueba;