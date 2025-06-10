import fs from 'fs';
import csv from 'csv-parser';
import database from '../config/database.mjs';

class ImportDatosService {
 async importarAsignaturasDesdeCSV(rutaArchivo) {
  return new Promise((resolve, reject) => {
    const asignaturas = [];
    fs.createReadStream(rutaArchivo)
      .pipe(csv())
      .on('data', (row) => {
        asignaturas.push({
          nombre: row['Asignatura'],
          siglas: row['Siglas'],
          grado: row['Grado'],
          curso: row['Curso'],
          numeroGrupos: row['Numero de grupos'],
          codigo: row['Codigo'],
        });
      })
      .on('end', async () => {
        const conexion = await database.connectPostgreSQL();
        try {
          for (const asignatura of asignaturas) {
            // Obtener el id del estudio por siglas
            const estudioRes = await conexion.query({
              text: 'SELECT id FROM estudios WHERE siglas = $1',
              values: [asignatura.grado],
            });
            if (estudioRes.rows.length === 0) continue;
            const estudios_id = estudioRes.rows[0].id;

            // Verificar si existe la asignatura por código
            const res = await conexion.query({
              text: 'SELECT id FROM asignatura WHERE codigo = $1',
              values: [asignatura.codigo],
            });

            let asignatura_id;
            if (res.rows.length === 0) {
              // Insertar nueva asignatura
              const insert = await conexion.query({
                text: `INSERT INTO asignatura (nombre, siglas, curso, codigo) VALUES ($1, $2, $3, $4) RETURNING id`,
                values: [asignatura.nombre, asignatura.siglas, asignatura.curso, asignatura.codigo],
              });
              asignatura_id = insert.rows[0].id;
            } else {
              // Actualizar asignatura (excepto numeroGrupos)
              asignatura_id = res.rows[0].id;
              await conexion.query({
                text: `UPDATE asignatura SET nombre = $1, siglas = $2, curso = $3 WHERE codigo = $4`,
                values: [asignatura.nombre, asignatura.siglas, asignatura.curso, asignatura.codigo],
              });
            }

            // Actualizar o insertar relación en asignatura_estudios
            const relRes = await conexion.query({
              text: 'SELECT * FROM asignatura_estudios WHERE asignatura_id = $1 AND estudios_id = $2',
              values: [asignatura_id, estudios_id],
            });
            if (relRes.rows.length === 0) {
              await conexion.query({
                text: `INSERT INTO asignatura_estudios (asignatura_id, estudios_id) VALUES ($1, $2)`,
                values: [asignatura_id, estudios_id],
              });
            }
            // Si ya existe la relación, no hace falta update porque solo son ids, pero si tuvieras más campos, aquí iría el update.

            // Ajustar número de grupos
            const gruposRes = await conexion.query({
              text: 'SELECT id, nombre FROM grupo WHERE asignatura_id_fk = $1 ORDER BY CAST(nombre AS INTEGER) ASC',
              values: [asignatura_id],
            });
            const gruposActuales = gruposRes.rows;
            const numActual = gruposActuales.length;
            const numDeseado = parseInt(asignatura.numeroGrupos, 10);

            // Insertar grupos si faltan
            if (numActual < numDeseado) {
              let ultimoNumero = 0;
              if (gruposActuales.length > 0) {
                ultimoNumero = Math.max(...gruposActuales.map(g => parseInt(g.nombre, 10)));
              }
              for (let i = 1; i <= numDeseado - numActual; i++) {
                await conexion.query({
                  text: 'INSERT INTO grupo (nombre, asignatura_id_fk) VALUES ($1, $2)',
                  values: [(ultimoNumero + i).toString(), asignatura_id],
                });
              }
            }

            // Eliminar grupos si sobran (en orden decreciente)
            if (numActual > numDeseado) {
              const gruposAEliminar = gruposActuales
                .slice(numDeseado) // los que sobran
                .sort((a, b) => parseInt(b.nombre, 10) - parseInt(a.nombre, 10)); // orden decreciente
              for (const grupo of gruposAEliminar) {
                await conexion.query({
                  text: 'DELETE FROM grupo WHERE id = $1',
                  values: [grupo.id],
                });
              }
            }
          }
          resolve();
        } catch (err) {
          reject(err);
        } finally {
          await conexion.end();
        }
      })
      .on('error', (err) => reject(err));
  });
}
}

const importDatosService = new ImportDatosService();
export default importDatosService;