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
    .slice(0,5) 
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
    .slice(0, 5)
    .map((notificacion, index) => `
🔔 <b>Notificación ${emojisNumeros[index]} </b>
📅 <i>${formatearFecha(notificacion.fecha_creacion)}</i>
📝 <b>Contenido:</b> ${notificacion.contenido}
    `.trim())
    .join('\n\n');
};

export const formatearNuevaIncidencia = (descripcion, tipo_incidencia, fecha_creacion) => {
  return (
    `<b>🆕 Nueva incidencia registrada en la aplicación de permutas</b>\n\n` +
    `📄 <b>Descripción:</b> ${descripcion}\n` +
    `🔖 <b>Tipo de incidencia:</b> ${tipo_incidencia}\n` +
    `🕒 <i>Fecha de creación: ${formatearFecha(fecha_creacion)}</i>`
  );
};