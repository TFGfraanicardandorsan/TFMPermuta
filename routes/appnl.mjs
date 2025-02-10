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
  

  async obtenerMiEstudioUsuario() {
    // const sesion = login.getSesion(sesionid);
    // const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `select e.nombre from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario ='fraanicar');`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerAsignaturasMiEstudioUsuario() {
    // const sesion = login.getSesion(sesionid);
    // const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `select * from asignatura a where a.id in (select asignatura_id from asignatura_estudios ae where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario ='fraanicar')))`,
    };
    const res = await conexion.query(query);
    await conexion.end();
    return res.rows;
  }

  async obtenerMisAsignaturasUsuario() {
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

  async actualizarEstudios(estudio){
    const conexion = await this.connectPostgreSQL();
    const prueba = {
      text: `select estudios_id_fk from usuario u where u.nombre_usuario ='fraanicar'`,
    };

    const resPrueba = await conexion.query(query);
    console.log(resPrueba);
    if (resPrueba==null){
      const query = {
        text: `Update usuario u set = $1 where u.nombre_usuario ='fraanicar'`,
        values: [`${estudio}`],
      };
      const res = await conexion.query(query);
      await conexion.end();
      return 'Estudios seleccionados';
    }
    return 'No puedes cambiar los estudios ya seleccionados ponte en contacto con un administrador a través de una incidencia';
  }

async personaMatriculadaEnAsignatura(asignatura){
   // const sesion = login.getSesion(sesionid);
    // const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    const query = {
      text: `select * from asignatura a where a.id in (select asignatura_id from asignatura_estudios ae where ae.estudios_id = (select e.id  from estudios e where id = (select u.estudios_id_fk  from usuario u where u.nombre_usuario ='fraanicar')) ) and a.codigo= $1 ;`,
      values: [`${asignatura}`],
    };
    const res = await conexion.query(query);
    await conexion.end();ç
    if (res.length == 0){
      return false;
    }
    return true;
}

async getSolicitudesPermuta(asignatura){
   const conexion = await this.connectPostgreSQL();
   const query = {
     text: `select * from solicitud_permuta`,
   };
   const res = await conexion.query(query);
   await conexion.end();
   return res;
}

async getPermutas(){
  const conexion = await this.connectPostgreSQL();
  const query = {
    text: `select * from permuta`,
  };
  const res = await conexion.query(query);
  await conexion.end();
  return res;
}

async getNotificaciones(){
  const conexion = await this.connectPostgreSQL();
  const query = {
    text: `select * from notificacion`,
  };
  const res = await conexion.query(query);
  await conexion.end();
  return res;
}

async getIncidencias(){
  const conexion = await this.connectPostgreSQL();
  const query = {
    text: `select * from incidencia`,
  };
  const res = await conexion.query(query);
  await conexion.end();
  return res;
}

async getGruposPorAsignatura(){
  const conexion = await this.connectPostgreSQL();
  const query = {
    text: `select * from grpos where asignatura = (Select id from asignatura where codigo = $1)`,
    values: [`${asignatura}`],
  };
  const res = await conexion.query(query);
  await conexion.end();ç
  return res;
}

async solicitarPermuta(asignatura,grupos_deseados) {
  // const sesion = login.getSesion(sesionid);
    // const userid = sesion.userid;
    const conexion = await this.connectPostgreSQL();
    matriculado= this.personaMatriculadaEnAsignatura(asignatura);

    if (matriculado == true){    
      const query = {
      text: `SELECT id FROM grupo WHERE id = (SELECT id FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = 'fraanicar')) AND asignatura_id_fk = (SELECT id FROM asignatura WHERE codigo = $1)`,
      values: [`${asignatura}`],
    };
    const grupo_actual = await conexion.query(query);
    if (grupos_deseados.includes(grupo_actual)){
      return "Solicitaste una permuta a tu mismo grupo.";
    }
    const insert = {
      text: `insert into solicitud_permuta (usuario_id_fk ,grupo_solicitante_id_fk, estado) values ((
      SELECT id FROM usuario WHERE nombre_usuario = 'fraanicar'),(SELECT id FROM grupo WHERE id = (
      SELECT id FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = 'fraanicar')) AND asignatura_id_fk = 
      (SELECT id FROM asignatura WHERE codigo = $1)),'SOLICITADA')`,
      values: [`${asignatura}`],
    };
    for (const grupo of grupos_deseados) {
      const insert = {
        text: `insert into grupo_deseado (solicitud_permuta_id_fk,grupo_id_fk) values ((select id from solicitud_permuta where solicitud_permuta.usuario_id_fk = (
        select id from usuario where usuario.nombre_usuario ='fraanicar') 
        and solicitud_permuta.grupo_solicitante_id_fk = (
        SELECT id FROM grupo WHERE id = (
        SELECT usuario_grupo.grupo_id_fk  FROM usuario_grupo WHERE usuario_id_fk = (
        SELECT id FROM usuario WHERE nombre_usuario = 'fraanicar')) AND asignatura_id_fk = (SELECT id FROM asignatura WHERE id = 3))),
      (select id from grupo where nombre = $2 and grupo.asignatura_id_fk = (select id from asignatura where id = (select sp.grupo_solicitante_id_fk  from solicitud_permuta sp )))
        )`,
        values: [`${asignatura}`, `${grupo}`],
      };
      const res = await conexion.query(insert);
      
    await conexion.end();
    console.log(res);
    }
  return 'Permuta de la asignatura solicitada.';
  }
}

}
const appnl = new AppNodeLibrary();
export default appnl;
