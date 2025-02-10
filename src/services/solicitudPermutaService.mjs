import database from "../config/database.mjs";
import asignaturaService from "./asignaturaService.mjs";

class SolicitudPermutaService {
    async getSolicitudesPermuta(asignatura){
        const conexion = await database.connectPostgreSQL();
        const query = {
          text: `select * from solicitud_permuta`,
        };
        const res = await conexion.query(query);
        await conexion.end();
        return res;
     }

     async solicitarPermuta(asignatura,grupos_deseados) {
        const conexion = await database.connectPostgreSQL();
        matriculado= asignaturaService.personaMatriculadaEnAsignatura(asignatura);
    
        if (matriculado == true){    
          const query = {
          text: `SELECT id 
          FROM grupo 
          WHERE id = (SELECT id FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = 'fraanicar')) 
          AND asignatura_id_fk = (SELECT id FROM asignatura WHERE codigo = $1)`,
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
const solicitudPermutaService = new SolicitudPermutaService();
export default solicitudPermutaService