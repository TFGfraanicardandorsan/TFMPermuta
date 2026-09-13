/**
 * @swagger
 * tags:
 *   name: Notificaciones
 *   description: Gestión de notificaciones
 */

/**
 * @swagger
 * /notificacion/notificaciones:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Avisos visibles para el usuario, no leídos primero
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       '200':
 *         description: Solo avisos vigentes personales o de los roles del usuario.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error: { type: boolean }
 *                 result:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id: { type: integer }
 *                       contenido: { type: string }
 *                       fecha_creacion: { type: string, format: date-time }
 *                       tipo: { type: string, enum: [ADMINISTRACION, PERMUTA, DOCUMENTO, INCIDENCIA] }
 *                       enlace: { type: string, nullable: true }
 *                       leida: { type: boolean }
 *                       fecha_lectura: { type: string, format: date-time, nullable: true }
 *       '401':
 *         description: Sin sesión.
 *
 * /notificacion/{id}/lectura:
 *   patch:
 *     tags: [Notificaciones]
 *     summary: Cambia la lectura de una notificación para el usuario de la sesión
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 2147483647 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [leida]
 *             properties:
 *               leida: { type: boolean }
 *     responses:
 *       '200':
 *         description: Lectura guardada, sin afectar a otros usuarios.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err: { type: boolean }
 *                 result:
 *                   type: object
 *                   properties:
 *                     id: { type: integer }
 *                     leida: { type: boolean }
 *                     fecha_lectura: { type: string, format: date-time, nullable: true }
 *       '400':
 *         description: ID o booleano inválido.
 *       '401':
 *         description: Sin sesión.
 *       '404':
 *         description: Aviso inexistente, expirado o ajeno.
 *
 * /notificacion/marcarTodasLeidas:
 *   post:
 *     tags: [Notificaciones]
 *     summary: Marca todos los avisos visibles vigentes del usuario como leídos
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     responses:
 *       '200':
 *         description: Avisos procesados, incluidos los ya leídos.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err: { type: boolean }
 *                 result:
 *                   type: object
 *                   properties:
 *                     actualizadas: { type: integer }
 *       '401':
 *         description: Sin sesión.
 */

/**
 * @swagger
 * /notificacion/insertarNotificacion:
 *   post:
 *     summary: Crear una notificación (solo administrador)
 *     tags: [Notificaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - contenido
 *               - receptor
 *             properties:
 *               contenido:
 *                 type: string
 *                 example: "Notificación de prueba"
 *               receptor:
 *                 type: string
 *                 enum: [estudiante, administrador, all]
 *                 example: "estudiante"
 *     responses:
 *       200:
 *         description: Notificación creada correctamente
 *       400:
 *         description: Datos no válidos
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /notificacion/notificarCierreIncidencia:
 *   post:
 *     summary: Notificar cierre de incidencia al usuario que la abrió
 *     tags: [Notificaciones]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - incidenciaId
 *               - contenido
 *             properties:
 *               incidenciaId:
 *                 type: integer
 *                 example: 1
 *               contenido:
 *                 type: string
 *                 example: "La incidencia ha sido resuelta"
 *     responses:
 *       200:
 *         description: Notificación de cierre enviada correctamente
 *       400:
 *         description: Falta ID de incidencia o contenido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */