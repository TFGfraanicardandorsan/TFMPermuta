import database from "./database.mjs";
import notificacionService from "./notificacionService.mjs";
import cron from "node-cron";

class PlazosService {
  async insertarPlazoPermuta(
    inicio_primer_periodo,
    fin_primer_periodo,
    inicio_segundo_periodo,
    fin_segundo_periodo,
    uvus
  ) {
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

  async notificarCierreProximoPlazoPermuta() {
    const conexion = await database.connectPostgreSQL();
    try {
      const query = {
        text: `
        SELECT id, fin_primer_periodo, fin_segundo_periodo
        FROM plazos_permutas
        WHERE 
          (fin_primer_periodo::date = (CURRENT_DATE + INTERVAL '1 day') OR
           fin_segundo_periodo::date = (CURRENT_DATE + INTERVAL '1 day'))
      `,
      };
      const res = await conexion.query(query);

      for (const plazo of res.rows) {
        if (
          plazo.fin_primer_periodo &&
          new Date(plazo.fin_primer_periodo).toISOString().slice(0, 10) ===
            new Date(Date.now() + 86400000)
              .toISOString()
              .slice(0, 10)
        ) {
          const contenido = `⏰ Recuerda: Mañana finaliza el <b>primer plazo</b> de permuta (ID: ${plazo.id}).`;
          await notificacionService.crearNotificacionesUsuario({
            uvus: "admin",
            contenido,
            receptor: "all",
          });
        }
        if (
          plazo.fin_segundo_periodo &&
          new Date(plazo.fin_segundo_periodo).toISOString().slice(0, 10) ===
            new Date(Date.now() + 86400000)
              .toISOString()
              .slice(0, 10)
        ) {
          const contenido = `⏰ Recuerda: Mañana finaliza el <b>segundo plazo</b> de permuta (ID: ${plazo.id}).`;
          await notificacionService.crearNotificacionesUsuario({
            uvus: "admin",
            contenido,
            receptor: "all",
          });
        }
      }
    } catch (error) {
      console.error("Error al notificar cierre próximo de plazo de permuta:", error);
    } finally {
      await conexion.end();
    }
  }
}

const plazosService = new PlazosService();
export default plazosService;

// Ejecuta todos los días a las 9:00 AM
cron.schedule("0 9 * * *", async () => {
  await plazosService.notificarCierreProximoPlazoPermuta();
});