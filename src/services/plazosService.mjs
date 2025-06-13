import database from "./database.mjs";
import notificacionService from "./notificacionService.mjs";

class PlazosService {
async insertarPlazoPermuta(inicio_primer_periodo, fin_primer_periodo, inicio_segundo_periodo, fin_segundo_periodo, uvus) {
  const conexion = await database.connectPostgreSQL();
  try {
    const query = {
      text: `INSERT INTO plazos_permutas (inicio_primer_periodo, fin_primer_periodo, inicio_segundo_periodo, fin_segundo_periodo)
             VALUES ($1, $2, $3, $4) RETURNING *`,
      values: [
        inicio_primer_periodo,
        fin_primer_periodo,
        inicio_segundo_periodo,
        fin_segundo_periodo,
      ],
    };
    const res = await conexion.query(query);

    // Crear notificación para todos los usuarios (receptor = 'all')
    const contenido = `Nuevo plazo de permuta creado:\nPrimer periodo: ${inicio_primer_periodo} a ${fin_primer_periodo}\nSegundo periodo: ${inicio_segundo_periodo} a ${fin_segundo_periodo}`;
    await notificacionService.crearNotificacionesUsuario(uvus, contenido, 'all');

    return res.rows[0];
  } catch (error) {
    console.error("Error al insertar plazo de permuta:", error);
    throw error;
  } finally {
    await conexion.end();
  }
}
}
const plazosService = new PlazosService();
export default plazosService;