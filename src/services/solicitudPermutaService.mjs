import database from "../config/database.mjs";
import asignaturaService from "./asignaturaService.mjs";

class SolicitudPermutaService {
     async solicitarPermuta(uvus,asignatura,grupos_deseados) {
        const conexion = await database.connectPostgreSQL();
        matriculado= asignaturaService.personaMatriculadaEnAsignatura(asignatura);
    
        if (matriculado === true){    
          const query = {
          text: `SELECT id 
          FROM grupo 
          WHERE id = (SELECT id FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) 
          AND asignatura_id_fk = (SELECT id FROM asignatura WHERE codigo = $1)`,
          values: [`${asignatura}`,`${uvus}`],
        };
        const grupo_actual = await conexion.query(query);
        if (grupos_deseados.includes(grupo_actual)){
          return "Solicitaste una permuta a tu mismo grupo.";
        }
        const insert = {
          text: `insert into solicitud_permuta (usuario_id_fk ,grupo_solicitante_id_fk, estado, id_asignatura_fk) values ((
          SELECT id FROM usuario WHERE nombre_usuario = $2),(
SELECT id FROM grupo WHERE id in (SELECT grupo_id_fk FROM usuario_grupo WHERE usuario_id_fk = (SELECT id FROM usuario WHERE nombre_usuario = $2)) AND asignatura_id_fk = 
          (SELECT id FROM asignatura WHERE codigo = $1)),
          'SOLICITADA',
        (Select id from asignatura where codigo = $1))`,
          values: [`${asignatura}`,`${uvus}`],
        };
        await conexion.query(insert);
        for (const grupo of grupos_deseados) {
          const insert = {
            text: `insert into grupo_deseado (solicitud_permuta_id_fk , grupo_id_fk ) values(
            (select id from solicitud_permuta where usuario_id_fk = (select id from usuario where nombre_usuario=$3) and id_asignatura_fk = (select id from asignatura where codigo = $1)),
            (select id from grupo where nombre = $2 and grupo.asignatura_id_fk = (select id from asignatura where codigo = $1)))`,
            values: [`${asignatura}`, `${grupo}`,`${uvus}`],
          };
          const res = await conexion.query(insert);
          
        await conexion.end();
        console.log(res);
        }
      return 'Permuta de la asignatura solicitada.';
      }
    }

    // TODO: Implementar el método getSolicitudesPermutaInteresantes
    async getSolicitudesPermutaInteresantes(num_grupo,codigo){
      const conexion = await database.connectPostgreSQL();
      const insert = {
        text: ``,

      };
      const res = await conexion.query(query);
      await conexion.end();
      return res;
   }
}
const solicitudPermutaService = new SolicitudPermutaService();
export default solicitudPermutaService