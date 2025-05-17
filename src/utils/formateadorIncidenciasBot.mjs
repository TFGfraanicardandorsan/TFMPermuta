import { formatearFecha } from "./formateadorFechas.mjs";
const emojisNumeros = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣'];

export const avisoAdmin = (nombreCompleto, uvusEnviado, chatId) =>
`📥 *Nuevo registro pendiente de aprobación:*\n\n` +
`👤 *Nombre completo:* ${nombreCompleto}\n` +
`🆔 *UVUS:* ${uvusEnviado}\n` +
`✉️ *Correo:* ${uvusEnviado}@alum.us.es\n` +
`💬 *Chat ID:* ${chatId}\n`

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

export const formatearNotificaciones = (notificaciones) => {
  return notificaciones
    .slice(0, 5) // las 5 más recientes (ya vienen ordenadas por fecha desc)
    .map((notificacion, index) => `
🔔 <b>Notificación ${emojisNumeros[index]} </b>
📅 <i>${formatearFecha(notificacion.fecha_creacion)}</i>
📝 <b>Contenido:</b> ${notificacion.contenido}
    `.trim())
    .join('\n\n');
};