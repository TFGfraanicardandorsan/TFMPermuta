/**
 * @swagger
 * tags:
 *   name: Incidencias
 *   description: Gestión de incidencias
 */

/**
 * @swagger
 * /incidencia/obtenerIncidencias:
 *   post:
 *     summary: Obtener todas las incidencias
 *     tags: [Incidencias]
 *     responses:
 *       200:
 *         description: Lista de incidencias
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *       401:
 *         description: No hay usuario en la sesión
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/ErrorResponse'
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/obtenerIncidenciasAsignadasUsuario:
 *   post:
 *     summary: Obtener incidencias asignadas al usuario en sesión
 *     tags: [Incidencias]
 *     responses:
 *       200:
 *         description: Lista de incidencias asignadas al usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/obtenerIncidenciasAsignadas:
 *   post:
 *     summary: Obtener todas las incidencias asignadas
 *     tags: [Incidencias]
 *     responses:
 *       200:
 *         description: Lista de incidencias asignadas
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/obtenerIncidenciasAsignadasAdmin:
 *   post:
 *     summary: Obtener incidencias asignadas al administrador en sesión
 *     tags: [Incidencias]
 *     responses:
 *       200:
 *         description: Lista de incidencias asignadas al administrador
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/obtenerIncidenciasSinAsignar:
 *   post:
 *     summary: Obtener incidencias sin asignar
 *     tags: [Incidencias]
 *     responses:
 *       200:
 *         description: Lista de incidencias sin asignar
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Incidencia'
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/obtenerIncidenciaPorId:
 *   post:
 *     summary: Obtener una incidencia por su ID
 *     tags: [Incidencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_incidencia
 *             properties:
 *               id_incidencia:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Incidencia encontrada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   $ref: '#/components/schemas/Incidencia'
 *       400:
 *         description: ID de incidencia no válido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/asignarmeIncidencia:
 *   post:
 *     summary: Asignarse una incidencia (administrador)
 *     tags: [Incidencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_incidencia
 *             properties:
 *               id_incidencia:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Incidencia asignada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: string
 *                   example: "Ha sido asignada la incidencia 1 correctamente"
 *       400:
 *         description: ID de incidencia no válido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/solucionarIncidencia:
 *   post:
 *     summary: Marcar una incidencia como solucionada
 *     tags: [Incidencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - id_incidencia
 *             properties:
 *               id_incidencia:
 *                 type: integer
 *                 example: 1
 *     responses:
 *       200:
 *         description: Incidencia solucionada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: string
 *                   example: "La incidencia 1 ha sido solucionada correctamente."
 *       400:
 *         description: ID de incidencia no válido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /incidencia/crearIncidencia:
 *   post:
 *     summary: Crear una nueva incidencia
 *     tags: [Incidencias]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - descripcion
 *               - tipo_incidencia
 *             properties:
 *               descripcion:
 *                 type: string
 *                 example: "No funciona el proyector del aula 1.1"
 *               tipo_incidencia:
 *                 type: string
 *                 example: "infraestructura"
 *               fileId:
 *                 type: string
 *                 nullable: true
 *                 example: "archivo123.pdf"
 *     responses:
 *       200:
 *         description: Incidencia creada correctamente
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   type: string
 *                   example: "Se ha creado la incidencia correctamente"
 *       400:
 *         description: Datos de entrada no válidos
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */