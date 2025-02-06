import pg from "pg";

class AppNodeLibrary {
  constructor() {}

  async connectPostgreSQL() {
    const { Client } = pg;
    const client = new Client({
      user: process.env.DB_USER || "",
      password: process.env.DB_PASS || "",
      host: process.env.DB_HOST || "",
      port: process.env.DB_PORT || "",
      database: process.env.DB_DATABASE || "",
    });
    await client.connect();
    return client;
  }

  //API PARA AUTORIZACIONES


  async obtenerDatosUsuario() {
    // const sesion = login.getSesion(sesionid);
    // const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `SELECT * FROM Usuario`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async pruebaInsertFuncionalidades(funcionalidad){
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `INSERT INTO funcionalidad (nombre) VALUES ($1)`,
      values: [`${funcionalidad}`],
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows[0];
  }

  async getAutorizacion(sesionid) {
    try {
      const userData = await this.obtenerDatosUsuario(sesionid);
  
      if (!userData) {
        return { err: true, errmsg: 'Esta cuenta no existe' };
      }
      if (userData.estado === 0) {
        return { err: true, errmsg: 'Cuenta deshabilitada' };
      }
  
      const conexion = await this.connectPostgreSQL();
      const query = {
        text: `SELECT f.nombre AS funcionalidad 
        FROM Usuario u 
        JOIN roles r ON u.username = r.username_user 
        JOIN rol_funcionalidad rf ON r.permisos = rf.rol 
        JOIN funcionalidades f ON rf.id_funcionalidad = f.id 
        WHERE u.username = $1`,
        values: [userData.username],
      };
  
      const res = await conexion.query(query);
      await conexion.end();
      return res.rows;
  
    } catch (error) {
      console.error('Error al obtener las autorizaciones:', error);
      return { err: true, errmsg: 'Error al obtener las autorizaciones' };
    }
  }
  
}
const appnl = new AppNodeLibrary();
export default appnl;
