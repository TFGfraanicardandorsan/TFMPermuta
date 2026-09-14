/**
 * @swagger
 * tags:
 *   name: Administración de permutas
 *   description: Supervisión e intervención consistente sobre solicitudes, permutas y documentos
 */

/**
 * @swagger
 * /admin/permutas/panel:
 *   post:
 *     summary: Obtiene el resumen y los últimos registros del panel administrativo
 *     tags: [Administración de permutas]
 *     security: [{ cookieAuth: [], csrfToken: [] }]
 *     responses:
 *       200: { description: Resumen, solicitudes y permutas }
 *       403: { description: Requiere rol de administrador }
 * /admin/permutas/buscar-parejas:
 *   post:
 *     summary: Previsualiza el emparejamiento óptimo sin modificar datos
 *     tags: [Administración de permutas]
 *     security: [{ cookieAuth: [], csrfToken: [] }]
 *     responses:
 *       200: { description: Parejas, solicitudes analizadas y asignaturas resolubles }
 * /admin/permutas/generar-propuestas:
 *   post:
 *     summary: Calcula y persiste las propuestas óptimas disponibles
 *     tags: [Administración de permutas]
 *     security: [{ cookieAuth: [], csrfToken: [] }]
 *     responses:
 *       200: { description: Número de propuestas creadas }
 * /admin/permutas/solicitudes/{id}/cancelar:
 *   post:
 *     summary: Cancela una solicitud y sus bloques, permutas y documentos afectados
 *     tags: [Administración de permutas]
 *     security: [{ cookieAuth: [], csrfToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Recuento de registros actualizados atómicamente }
 *       404: { description: Solicitud no encontrada }
 *       409: { description: Solicitud no vigente o no pendiente }
 * /admin/permutas/permutas/{id}/cancelar:
 *   post:
 *     summary: Cancela una permuta por petición de uno de sus participantes
 *     tags: [Administración de permutas]
 *     security: [{ cookieAuth: [], csrfToken: [] }]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1 }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [usuario]
 *             properties:
 *               usuario: { type: string, description: UVUS del participante que solicita cancelar }
 *               motivo: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Recuento de solicitudes, permutas y documentos actualizados }
 *       404: { description: Permuta no encontrada o usuario ajeno }
 * /admin/permutas/retirar-vigencia:
 *   post:
 *     summary: Cierra atómicamente la vigencia global del periodo
 *     tags: [Administración de permutas]
 *     security: [{ cookieAuth: [], csrfToken: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               motivo: { type: string, maxLength: 500 }
 *     responses:
 *       200: { description: Recuento actualizado en las tres tablas }
 */
