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
 *     summary: Obtener notificaciones del usuario en sesión
 *     tags: [Notificaciones]
 *     responses:
 *       200:
 *         description: Lista de notificaciones
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
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