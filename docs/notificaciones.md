# Notificaciones con lectura individual y eventos privados

## Despliegue

Aplicar `sql/notificaciones_lectura_eventos.sql` antes de iniciar esta versión del backend. La migración es repetible y no elimina notificaciones existentes. No se ha ejecutado contra una base de datos desde esta implementación.

Las notificaciones anteriores mantienen sus destinatarios por rol/todos y pasan a la categoría `ADMINISTRACION`. Inicialmente estarán sin leer para cada usuario. Los avisos automáticos se generan para los cambios nuevos; no se reconstruye el histórico de permutas.

## API

Prefijo: `/api/v1/notificacion`. Todas las operaciones requieren sesión. Las mutaciones usan la protección CSRF existente.

- `POST /notificaciones`: conserva el formato `{ error: false, result: [...] }`. Cada entrada contiene `id`, `contenido`, `fecha_creacion`, `tipo`, `enlace`, `leida` y `fecha_lectura`. Primero devuelve las no leídas, luego las leídas; dentro de cada grupo, las más recientes. Solo devuelve avisos vigentes visibles para el usuario.
- `PATCH /:id/lectura`, cuerpo `{ "leida": true }` o `{ "leida": false }`: guarda el estado exclusivamente para el usuario de la sesión. Respuesta `{ err: false, result: { id, leida, fecha_lectura } }`. El ID debe ser un entero positivo. Devuelve 400 para datos inválidos, 401 sin sesión y 404 si la notificación no está disponible para ese usuario. Repetir la misma lectura conserva la primera fecha; volver a no leída borra la fecha.
- `POST /marcarTodasLeidas`: marca todos los avisos visibles vigentes del usuario. Devuelve `{ err: false, result: { actualizadas } }`; el contador incluye los avisos ya leídos procesados. No modifica lecturas de otras personas.
- `POST /insertarNotificacion`: mantiene `contenido` y `receptor`. Los avisos administrativos siguen dirigidos a `all`, `estudiante`, `administrador` o `delegacion`; su categoría se asigna automáticamente. No permite fabricar notificaciones privadas a otro alumno desde el cliente.

La categoría no determina la privacidad. Los avisos generales se filtran por rol/todos; los personales se filtran por `destinatario_id_fk`, independientemente del rol. El listado y la escritura de lectura comparten la misma condición de visibilidad.

## Eventos

| Categoría | Momentos | Destinatarios |
| --- | --- | --- |
| `ADMINISTRACION` | Publicación de un aviso administrativo | Rol seleccionado o todos |
| `PERMUTA` | Creación y cancelación de solicitudes | Solicitante |
| `PERMUTA` | Propuesta del sistema, aceptación inicial/manual, confirmación, rechazo | Participantes de esa permuta o bloque |
| `DOCUMENTO` | Borrador, primera firma, segunda firma, validación | Participantes vinculados al documento mediante `permutas_permuta` |
| `INCIDENCIA` | Aviso de cierre de incidencia | Usuario que abrió la incidencia |

Las notificaciones de solicitudes, permutas y documentos se insertan dentro de la transacción del cambio de estado. Si falla su persistencia, también se revierte el cambio. Una clave única por evento y destinatario evita duplicar el aviso de un bloque de varias asignaturas. Los reintentos de firma en el mismo estado tampoco generan un segundo aviso. Los mensajes existentes de Telegram se conservan y se envían después de confirmar las transacciones; las notificaciones web no requieren `chatid`.

Las firmas comprueban el estado anterior y la pertenencia al documento. El destinatario del mensaje de Telegram se obtiene también del documento concreto, evitando usar otra pareja cuando un alumno tiene varias permutas. La validación mantiene la ruta y rol de estudiante ya existentes y verifica que el usuario pertenece al documento.

## Frontend integrado

En `C:\Users\pokel\TFMFrontEnd`:

- `src/components/comun/WorkspaceNav.jsx`: campana con contador de no leídas y panel de notificaciones.
- `src/components/comun/home.jsx`: mismo centro de notificaciones en la página de inicio.
- `src/components/comun/NotificacionesLista.jsx`: categorías, lectura individual, marcar todas, enlaces internos y mostrar más.
- `src/hooks/useNotificaciones.js`: consulta inicial, actualización al recuperar foco/cada 30 segundos mientras la página está visible, y sincronización entre campana e inicio tras guardar. Descarta respuestas de consultas anteriores para no sobrescribir datos más recientes.
- `src/services/notificacion.js`: operaciones de lectura mediante el cliente HTTP y CSRF existentes.
- `src/styles/notificationCenter.css` y traducciones en español, inglés y francés.

Las no leídas tienen un borde/fondo distintivo y una etiqueta textual. Las leídas pierden ese distintivo y aparecen después. Se puede volver a marcar una como no leída. Abrir el panel no marca avisos automáticamente. Si falla el guardado se conserva el estado anterior y se muestra un error. La lectura es persistente en servidor, no en `localStorage`.

La actualización usa consultas periódicas, no WebSockets; un aviso nuevo aparece como máximo tras el siguiente refresco exitoso. El contador contempla todos los avisos recibidos, aunque se filtre una categoría o solo se muestre la primera página.
