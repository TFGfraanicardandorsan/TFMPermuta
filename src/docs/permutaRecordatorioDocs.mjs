/**
 * @swagger
 * /permutas/documento/{id}/recordatorio:
 *   post:
 *     tags: [Permutas]
 *     summary: Recuerda al compañero que complete su parte del documento
 *     description: >-
 *       El destinatario se deduce del estado actual del documento y nunca se
 *       acepta desde el cliente. Solo un participante cuya parte ya no está
 *       pendiente puede enviar el aviso. Crea una notificación personal en el
 *       sistema e intenta enviarla también por Telegram. Se limita a un aviso
 *       cada 15 minutos por documento y destinatario.
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 2147483647 }
 *         description: ID del documento de permuta, no de la permuta individual.
 *     responses:
 *       '200':
 *         description: Notificación interna creada; indica si Telegram también se envió.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err: { type: boolean, example: false }
 *                 result:
 *                   type: object
 *                   properties:
 *                     notificacionSistema: { type: boolean }
 *                     telegramEnviado: { type: boolean }
 *                     proximoRecordatorioMinutos: { type: integer, example: 15 }
 *       '400':
 *         description: ID inválido.
 *       '401':
 *         description: Sin sesión.
 *       '403':
 *         description: El usuario no participa en el documento.
 *       '409':
 *         description: No hay una parte ajena pendiente que pueda notificarse.
 *       '429':
 *         description: Ya se envió un recordatorio durante los últimos 15 minutos.
 */
