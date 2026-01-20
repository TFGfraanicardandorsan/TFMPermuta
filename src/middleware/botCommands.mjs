import { getTelegramApiUrl } from '../services/telegramService.mjs';
export const setBotCommands = async () => {
  try {
    const response = await fetch(`${getTelegramApiUrl()}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'Iniciar el bot' },
          { command: 'misincidencias', description: 'Ver mis incidencias' },
          { command: 'vernotificaciones', description: 'Ver notificaciones' },
          { command: 'perfil', description: 'Mi Perfil' },
          { command: 'ayuda', description: 'Mostrar ayuda' },
          { command: 'actualizarcorreo', description: 'Actualizar correo electrónico' }
        ]
      }),
    });

    const data = await response.json();
    if (!response.ok) {
      console.error('Error configurando comandos:', data);
    } else {
      console.log('Comandos configurados correctamente:', data);
    }
  } catch (err) {
    console.error('Error en setBotCommands:', err);
  }
};