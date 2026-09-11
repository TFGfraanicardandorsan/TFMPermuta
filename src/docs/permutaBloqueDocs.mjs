/**
 * @swagger
 * /solicitudPermuta/cursos:
 *   get:
 *     tags: [Permutas]
 *     summary: Cursos y asignaturas matriculadas del usuario autenticado
 *     security:
 *       - cookieAuth: []
 *     responses:
 *       '200':
 *         description: Cursos con sus códigos y nombres de asignatura.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err: { type: boolean }
 *                 result:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       curso: { type: string, enum: [PRIMERO, SEGUNDO, TERCERO, CUARTO] }
 *                       asignaturas:
 *                         type: array
 *                         items:
 *                           type: object
 *                           properties:
 *                             codigo_asignatura: { type: integer }
 *                             nombre_asignatura: { type: string }
 *       '401':
 *         description: Sin sesión.
 *       '403':
 *         description: Requiere rol de estudiante.
 * 
 * /solicitudPermuta/solicitarPermutaCurso:
 *   post:
 *     tags: [Permutas]
 *     summary: Solicita permutas independientes o en bloque por curso
 *     description: >-
 *       El bloque exige todas las asignaturas matriculadas del curso y se resuelve
 *       con una misma persona. Cada curso se envía por separado. Creación atómica.
 *       Los destinos son números de grupo, no IDs. Los bloques se aceptan o
 *       rechazan completos desde las propuestas del sistema. La cancelación de
 *       una solicitud cancela su bloque. La edición de destinos conserva el bloque.
 *       Los listados de solicitudes y propuestas añaden curso, en_bloque y bloque_id.
 *       El listado de interesantes añade aceptable_individual; false impide la
 *       aceptación manual. Un documento debe incluir todos los miembros del bloque.
 *     security:
 *       - cookieAuth: []
 *         csrfToken: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [curso, en_bloque, solicitudes]
 *             properties:
 *               curso: { type: string, enum: [PRIMERO, SEGUNDO, TERCERO, CUARTO] }
 *               en_bloque: { type: boolean }
 *               solicitudes:
 *                 type: array
 *                 minItems: 1
 *                 maxItems: 100
 *                 items:
 *                   type: object
 *                   required: [asignatura, grupos_deseados]
 *                   properties:
 *                     asignatura:
 *                       type: integer
 *                       minimum: 1
 *                       maximum: 2147483647
 *                       description: Código de asignatura, no ID interno.
 *                     grupos_deseados:
 *                       type: array
 *                       minItems: 1
 *                       maxItems: 100
 *                       items: { type: integer, minimum: 1, maximum: 2147483647 }
 *     responses:
 *       '201':
 *         description: Todas las solicitudes se han creado.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err: { type: boolean }
 *                 result:
 *                   type: object
 *                   properties:
 *                     curso: { type: string }
 *                     en_bloque: { type: boolean }
 *                     bloque_id: { type: string, format: uuid, nullable: true }
 *                     solicitudes_ids:
 *                       type: array
 *                       items: { type: integer }
 *       '400':
 *         description: Datos inválidos, bloque incompleto o asignaturas/grupos no disponibles.
 *       '401':
 *         description: Sin sesión.
 *       '403':
 *         description: Sin permiso o CSRF inválido.
 *       '409':
 *         description: Ya existe una solicitud o permuta activa; no se crea ninguna solicitud.
 */
