import pg from "pg";
import login from "./config/login.mjs";

class AppNodeLibrary {
  constructor() {}

  about() {
    return "appNodeLibrary => appnl";
  }

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

  async isSesionAutenticada(sesionid){
    const sesion = login.getSesion(sesionid);
    if(!sesion) {
      console.log('isSesionValid => sesion no válida')
      return false
    }
    return true;
  }

  async obtenerDatosUsuario(sesionid) {
    const sesion = login.getSesion(sesionid);
    const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `SELECT * FROM Usuario WHERE email = '${userid}'`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    sesion.userdata = res.rows[0];
    return sesion.userdata;
  }

  async getAutorizacion(sesionid){
    const sesion = login.getSesion(sesionid);
    const userData = await this.obtenerDatosUsuario(sesionid)

    if(!userData){
      return {err:true, errmsg: 'Esta cuenta no existe'}
    }
    if (userData.estado === 0){
      return {err:true, errmsg:'Cuenta deshabilitado'}
    }
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `SELECT f.nombre AS funcionalidad 
      FROM Usuario u
      JOIN roles r ON u.username = r.username_user
      JOIN rol_funcionalidad rf ON r.permisos = rf.rol
      JOIN funcionalidades f ON rf.id_funcionalidad = f.id
      WHERE u.username = '${userData.username}'`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows
  }
}
const appnl = new AppNodeLibrary();
export default appnl;
