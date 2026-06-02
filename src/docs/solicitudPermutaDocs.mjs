/**
 * @swagger
 * tags:
 *   name: Solicitudes de Permuta
 *   description: Gestión de solicitudes de permuta
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