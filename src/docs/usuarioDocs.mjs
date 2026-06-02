/**
 * @swagger
 * tags:
 *   name: Usuarios
 *   description: Gestión de usuarios
 */

/**
 * @swagger
 * /usuario/obtenerDatosUsuario:
 *   post:
 *     summary: Obtener datos del usuario en sesión
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Datos del usuario
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 err:
 *                   type: boolean
 *                   example: false
 *                 result:
 *                   $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /usuario/actualizarCorreoUsuario:
 *   post:
 *     summary: Actualizar correo electrónico del usuario en sesión
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - correo
 *             properties:
 *               correo:
 *                 type: string
 *                 example: "nuevo@alum.us.es"
 *     responses:
 *       200:
 *         description: Correo actualizado correctamente
 *       400:
 *         description: Correo no válido
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /usuario/obtenerTodosUsuarios:
 *   post:
 *     summary: Obtener todos los usuarios (solo administrador)
 *     tags: [Usuarios]
 *     responses:
 *       200:
 *         description: Lista de todos los usuarios
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
 *                     $ref: '#/components/schemas/Usuario'
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */

/**
 * @swagger
 * /usuario/actualizarUsuario:
 *   post:
 *     summary: Actualizar datos de un usuario (solo administrador)
 *     tags: [Usuarios]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - uvus
 *             properties:
 *               uvus:
 *                 type: string
 *                 example: "juapergar"
 *               nombre_completo:
 *                 type: string
 *                 example: "Juan Pérez García"
 *               correo:
 *                 type: string
 *                 example: "juapergar@alum.us.es"
 *               rol:
 *                 type: string
 *                 enum: [estudiante, administrador]
 *                 example: "estudiante"
 *     responses:
 *       200:
 *         description: Usuario actualizado correctamente
 *       400:
 *         description: Falta el uvus del usuario
 *       401:
 *         description: No hay usuario en la sesión
 *       500:
 *         description: Error interno del servidor
 */