import pg from 'pg';
import login from './config/login.mjs';

class AppNodeLibrary {
  constructor() {
  }

  about() {
    return 'appNodeLibrary => appnl';
  }

  async connectPostgreSQL() {
    const { Client } = pg;
    const client = new Client({
      user: process.env.DB_USER || '',
      password: process.env.DB_PASS || '',
      host: process.env.DB_HOST || '',
      port: process.env.DB_PORT || '',
      database: process.env.DB_DATABASE || '',
    });
    await client.connect();
    return client;
  }

  async getUserData(sesionid){
    const sesion = login.getSesion(sesionid)
    const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `SELECT * FROM Usuario WHERE email = '${userid}'`
    };
    const res = await conexion.query(query);
    await conexion.end();
    sesion.userdata = res.rows[0];
    console.log(sesion.userdata)
    return sesion.userdata
  }

}
const appnl = new AppNodeLibrary();
export default appnl;