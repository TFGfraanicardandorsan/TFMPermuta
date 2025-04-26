import { formatearFecha } from "./formateadorFechas.mjs";
const emojisNumeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

export const formatearIncidencias = (incidencias) => {
  return incidencias
    .slice(-5) // solo las 5 últimas
    .reverse() // invertir el orden para mostrar las más recientes primero
    .map((incidencia, index) => `
${emojisNumeros[index]} 
📅 <i> ${formatearFecha(incidencia.fecha_creacion)}</i>
📄 <b>Descripción:</b> ${incidencia.descripcion}
ℹ️ Tipo de incidencia: ${incidencia.tipo_incidencia}
📌 <b>Estado:</b> ${incidencia.estado_incidencia}
    `.trim())
    .join('\n\n'); // separación entre incidencias
};