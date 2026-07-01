/**
 * @swagger
 * tags:
 *   name: Delegados
 *   description: Certificados y correos para Delegación de Alumnos
 */

/**
 * @swagger
 * /delegados/plantillaCSV:
 *   get:
 *     summary: Descargar plantilla CSV de certificados
 *     tags: [Delegados]
 *     responses:
 *       200:
 *         description: Plantilla CSV
 *         content:
 *           text/csv:
 *             schema:
 *               type: string
 *               format: binary
 *       403:
 *         description: Solo usuarios con rol delegacion
 */

/**
 * @swagger
 * /delegados/generarCertificados:
 *   post:
 *     summary: Generar certificados de delegados desde CSV
 *     tags: [Delegados]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *                 example: "Delegado de Centro"
 *               fechaSolicitud:
 *                 type: string
 *                 format: date
 *                 example: "2026-05-29"
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: PDF si hay una fila o ZIP si hay varias
 *       400:
 *         description: CSV o datos no válidos
 *       403:
 *         description: Solo usuarios con rol delegacion
 */

/**
 * @swagger
 * /delegados/generarAcreditacionesDelegados:
 *   post:
 *     summary: Alias compatible para generar certificados de delegados desde CSV
 *     tags: [Delegados]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: PDF si hay una fila o ZIP si hay varias
 *       403:
 *         description: Solo usuarios con rol delegacion
 */

/**
 * @swagger
 * /delegados/guardarCertificados:
 *   post:
 *     summary: Generar y guardar certificados en el servidor por tipo
 *     tags: [Delegados]
 *     description: Guarda los PDFs en DELEGADOS_CERTIFICADOS_DIR o, si no está configurado, en storage/delegados/centro, storage/delegados/curso y storage/delegados/grupo.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *               fechaSolicitud:
 *                 type: string
 *                 format: date
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Certificados guardados
 *       403:
 *         description: Solo usuarios con rol delegacion
 */

/**
 * @swagger
 * /delegados/prepararCorreos:
 *   post:
 *     summary: Generar correos Outlook .eml con certificados adjuntos
 *     tags: [Delegados]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *               remitenteEmail:
 *                 type: string
 *                 example: "delegacion_etsii@us.es"
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: EML si hay una fila o ZIP si hay varias
 *       400:
 *         description: Datos no válidos
 *       403:
 *         description: Solo usuarios con rol delegacion
 */

/**
 * @swagger
 * /delegados/enviarCertificados:
 *   post:
 *     summary: Enviar certificados por SMTP
 *     tags: [Delegados]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, passwordEmail, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *               remitenteEmail:
 *                 type: string
 *                 example: "delegacion_etsii@us.es"
 *               passwordEmail:
 *                 type: string
 *                 format: password
 *               smtpHost:
 *                 type: string
 *                 example: "smtp.office365.com"
 *               smtpPort:
 *                 type: integer
 *                 example: 587
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Envío completado
 *       400:
 *         description: Datos no válidos
 *       403:
 *         description: Solo usuarios con rol delegacion
 *       502:
 *         description: Error del proveedor de correo
 */

/**
 * @swagger
 * /delegados/enviarCertificadosTelegram:
 *   post:
 *     summary: Guardar certificados y enviarlos por Telegram usando UVUS
 *     tags: [Delegados]
 *     description: El CSV debe incluir columna UVUS. La API busca el chatid en usuario.nombre_usuario y envía cada PDF con el bot de Telegram.
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *               fechaSolicitud:
 *                 type: string
 *                 format: date
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Todos los certificados fueron enviados
 *       207:
 *         description: Algunos certificados se guardaron pero no pudieron enviarse por Telegram
 *       400:
 *         description: Falta UVUS o el CSV no es válido
 *       403:
 *         description: Solo usuarios con rol delegacion
 */

/**
 * @swagger
 * /delegados/firmar-lote:
 *   post:
 *     summary: Generar payload JSON con PDFs en base64 para firma por lotes
 *     tags: [Delegados]
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [firmante, csv]
 *             properties:
 *               firmante:
 *                 type: string
 *               csv:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Payload de firma
 *       403:
 *         description: Solo usuarios con rol delegacion
 */
