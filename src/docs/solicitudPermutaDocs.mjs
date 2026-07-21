/**
 * @swagger
 * tags:
 *   name: Solicitudes de Permuta
 *   description: Gestión de solicitudes de permuta
 */

/**
 * @swagger
 * /solicitudPermuta/{solicitudId}/grupos-deseados:
 *   patch:
 *     summary: Editar los grupos deseados de una solicitud propia
 *     description: Sustituye el conjunto de grupos deseados, insertando y eliminando solo las diferencias. La solicitud debe conservar al menos un grupo y no puede tener una permuta activa.
 *     tags: [Solicitudes de Permuta]
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: solicitudId
 *         required: true
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Identificador de la solicitud que pertenece al usuario autenticado
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - grupos_deseados_ids
 *             properties:
 *               grupos_deseados_ids:
 *                 type: array
 *                 minItems: 1
 *                 uniqueItems: true
 *                 items:
 *                   type: integer
 *                   minimum: 1
 *                 example: [12, 13]
 *     responses:
 *       200:
 *         description: Grupos deseados actualizados correctamente
 *       400:
 *         description: Cuerpo inválido o grupos no válidos para la asignatura
 *       403:
 *         description: Sesión sin rol de estudiante o token CSRF no válido
 *       404:
 *         description: La solicitud no existe o no pertenece al usuario autenticado
 *       409:
 *         description: La solicitud no es editable o ya tiene una permuta activa
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /solicitudPermuta/cancelarSolicitudPermuta:
 *   post:
 *     summary: Cancelar una solicitud de permuta (usuario creador)
 *     tags: [Solicitudes de Permuta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - solicitud
 *             properties:
 *               solicitud:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Solicitud cancelada correctamente
 *       400:
 *         description: ID de solicitud no válido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /solicitudPermuta/adminCancelarSolicitudPermuta:
 *   post:
 *     summary: Cancelar cualquier solicitud de permuta (solo administrador)
 *     tags: [Solicitudes de Permuta]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - solicitud
 *             properties:
 *               solicitud:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Solicitud cancelada correctamente
 *       400:
 *         description: ID de solicitud no válido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */
