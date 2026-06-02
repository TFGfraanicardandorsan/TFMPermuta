# 📘 Project Best Practices

## 1. Project Purpose
Este proyecto implementa un backend Node.js (Express) para gestionar un sistema de permutas (intercambio de grupos/asignaturas) en el ámbito universitario. Expone APIs REST para usuarios, grupos, asignaturas, incidencias, notificaciones y procesos de autorización. Integra autenticación SAML, base de datos PostgreSQL y envío de correos electrónicos/Nodemailer y Telegram.

## 2. Project Structure
- src/
  - app.mjs: punto de entrada de la aplicación web.
  - config/: configuración de base de datos, SAML y certificados.
  - controllers/: capa de controladores HTTP. Encapsula la lógica de orquestación de peticiones/respuestas.
  - routes/: definición de rutas Express y middleware de roles.
  - services/: capa de negocio y acceso a datos (usa database.connectPostgreSQL()).
  - middleware/: middlewares (autenticación/roles, almacenamiento/multer, bot commands, passport).
  - utils/: utilidades comunes (email, validadores, formateadores, plantillas EJS para emails).
  - algorithm/: lógica del algoritmo de cruce de solicitudes de permuta.
- test/
  - formateadorFechas.test.mjs: ejemplo de test con node:test.
- swagger.yaml: especificación OpenAPI de la API.
- .envSample: variables de entorno de referencia.

Convenciones:
- ES Modules (.mjs) en todo el código.
- Separación de responsabilidades: routes -> controllers -> services -> DB.
- Configuración vía variables de entorno (.env) y utilidades específicas en src/config.

## 3. Test Strategy
- Framework: node:test (integrado en Node >= 20). Ejecutar con `npm test`.
- Organización: tests en carpeta `test/` con sufijo `.test.mjs`.
- Unidades vs Integración:
  - Unit tests: funciones puras en `utils/`, validaciones, formateadores, helpers de negocio sin E/S.
  - Integration tests: controladores/rutas con supertest y un servidor Express de prueba; servicios contra una DB de test o usando dobles/mocks para la capa DB.
- Mocking:
  - Mockear dependencias externas (DB, correo, Telegram) mediante módulos falsos o inyección de dependencias.
  - Para Node ESM, usar import mocks/fixtures o factories que permitan sustituir implementaciones.
- Cobertura:
  - Priorizar cobertura de utilidades y reglas de negocio en `services/`.
  - Objetivo orientativo: >=80% en lógica crítica (permutas, autorizaciones, notificaciones).

## 4. Code Style
- Estilo y lenguaje:
  - ES Modules y `type: module` en package.json.
  - async/await para I/O; capturar errores con try/catch en controladores y servicios.
  - Evitar `console.log` en producción. Usar `console.error` solo para errores que no se re-lancen o integrar un logger (p. ej., pino/winston) si se requiere trazabilidad.
- Nomenclatura:
  - Archivos y rutas en `lowerCamelCase` o `kebab-case` según carpeta; funciones y variables en `lowerCamelCase`.
  - Clases en `UpperCamelCase`.
  - Endpoints en español consistente y descriptivo (ej.: `/actualizarProyectoDocente`).
- Comentarios y documentación:
  - Comentar el porqué, no el qué. Evitar comentarios redundantes.
  - Mantener swagger.yaml sincronizado con las rutas.
- Manejo de errores:
  - En controladores: capturar y responder con códigos HTTP y mensajes claros.
  - En servicios: lanzar errores con mensajes semánticos; liberar recursos en `finally` si procede.
  - No exponer detalles sensibles de la DB ni del entorno en los mensajes.

## 5. Common Patterns
- Capas:
  - Routes: definen endpoints y middleware (roles/autenticación).
  - Controllers: validación básica, invocación a servicios, formateo de respuestas.
  - Services: reglas de negocio y acceso a datos (queries con PostgreSQL).
- Utilidades reutilizables:
  - `utils/genericValidators.mjs` para validaciones comunes.
  - `utils/formateadorFechas.mjs` para formatear fechas.
  - `utils/email.mjs` para envío de correos (render EJS + nodemailer).
- Configuración por entorno:
  - `.env` leído con dotenv en módulos que lo requieren.
- Seguridad y roles:
  - Middleware `rolMiddleware.mjs` para verificar permisos por ruta.
- Archivos y subida:
  - `middleware/almacenamiento.mjs` gestiona rutas de almacenamiento controladas por variables de entorno.

## 6. Do's and Don'ts
- ✅ Do's
  - Usar async/await con try/catch y `finally` para recursos.
  - Validar inputs en controllers utilizando utilidades de `utils/genericValidators.mjs`.
  - Aislar acceso a DB en `services/` y centralizar conexiones.
  - Mantener los endpoints coherentes con swagger.yaml.
  - Escribir tests unitarios para utilidades y reglas críticas.
  - Respetar separación de responsabilidades y mantener funciones pequeñas y enfocadas.
  - Usar variables de entorno para secretos y rutas de archivos (no hardcodear).

- ❌ Don'ts
  - No dejar `console.log` o prints de depuración en producción.
  - No acceder a la DB desde controladores directamente.
  - No duplicar lógica entre controladores y servicios (DRY).
  - No exponer información sensible en respuestas o logs.
  - No mezclar responsabilidades (ej.: validaciones profundas dentro de rutas).

## 7. Tools & Dependencies
- Principales librerías:
  - express: servidor HTTP y enrutado.
  - pg: conexión PostgreSQL.
  - dotenv: carga de configuración.
  - ejs + nodemailer: plantillas y envío de correo.
  - passport + passport-saml: autenticación SAML.
  - multer: carga de ficheros.
  - node-fetch: llamadas HTTP salientes.
  - uuid: generación de identificadores.
- Puesta en marcha:
  - Copiar `.envSample` a `.env` y completar variables.
  - `npm install`
  - `npm start` (o ejecutar `node src/app.mjs` según el script configurado)
  - `npm test` para ejecutar los tests con `node --test`.

## 8. Other Notes
- Mantener consistencia en el idioma (es-ES) en endpoints y mensajes.
- Enviar emails con plantillas EJS ubicadas en `src/utils`; adjuntos PDF bajo la carpeta configurada por `PDF_FOLDER`.
- Para pruebas de integración, desacoplar inicialización del servidor para permitir crear/derribar un app Express sin escuchar puerto.
- Revisar y actualizar `swagger.yaml` cuando se agreguen o cambien endpoints.
- Variables de entorno clave (ejemplos): credenciales email (EMAIL_USERNAME/PASSWORD), rutas de almacenamiento (ARCHIVADOR, PROYECTO_DOCENTE, PDF_FOLDER), claves SAML, DS/SSL.
