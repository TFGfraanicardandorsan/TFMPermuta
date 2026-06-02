/**
 * @swagger
 * tags:
 *   name: Delegados PDF
 *   description: Generación de acreditaciones de delegados en PDF
 */

/**
 * @swagger
 * /delegados/generarAcreditacionesDelegados:
 *   post:
 *     summary: Generar ZIP con PDFs de acreditaciones de delegados (solo administrador)
 *     tags: [Delegados PDF]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - csv
 *               - nombreCompleto
 *               - dni
 *             properties:
 *               csv:
 *                 type: string
 *                 format: binary
 *                 description: Archivo CSV con los datos de los delegados
 *               nombreCompleto:
 *                 type: string
 *                 example: "Director de la ETSII"
 *               dni:
 *                 type: string
 *                 example: "12345678A"
 *     responses:
 *       200:
 *         description: Archivo ZIP con los PDFs generados
 *         content:
 *           application/zip:
 *             schema:
 *               type: string
 *               format: binary
 *       400:
 *         description: Falta el archivo CSV
 *       403:
 *         description: Solo administradores pueden generar PDFs
 *       500:
 *         description: Error generando ZIP
 */