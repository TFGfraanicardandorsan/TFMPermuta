# Revisión de seguridad y despliegue

Revisión del repositorio realizada el 24–25 de octubre de 2026. Los parches están
en el directorio de trabajo; no se ha accedido al servidor ni desplegado cambios.
No se dispone de su sistema operativo, proxy ni gestor de procesos. Los bloques
de Linux siguientes requieren sustituir las variables por los valores reales;
las alternativas Certbot, Nginx, systemd y PM2 solo se aplican si se usan.

## Hallazgos y correcciones

| Prioridad | Hallazgo comprobado | Corrección |
| --- | --- | --- |
| Crítica | Clave privada TLS versionada, coincidente con el certificado del repositorio, válido hasta el 21/01/2027. | Clave retirada; sin certificados de respaldo automáticos; el backend rechaza esa clave aunque se copie fuera del repositorio. Es obligatorio rotar y revocar en el servidor. |
| Crítica | Webhook de Telegram sin autenticación y callbacks de alta sin comprobar al administrador. | Secreto del webhook comprobado en tiempo constante, rol vigente del emisor y chat autorizado. |
| Alta | Creación de documentos con permutas ajenas y consulta sin comprobar participantes. | Se verifican usuario, pareja, estado, vigencia, bloques completos y ausencia de documento previo dentro de la transacción. |
| Alta | Subida a disco antes de autenticar, sin límites ni permisos para modificar plantillas. | Sesión antes de multipart; solo administración puede modificar plantillas/proyectos; un archivo, 12 MiB, extensión/MIME y cabecera PDF/PNG comprobados. |
| Alta | Descarga de archivos sin autorización sobre el documento; validación de ruta ineficaz. | Nombres UUID, contención de rutas reales, relación con el propietario/participantes y descarga privada. |
| Alta | Posibilidad de asociar archivos de otro usuario a firmas/incidencias. | Registro de propietario y comprobación antes de adjuntar. |
| Alta | Dependencias antiguas: 22 paquetes afectados en la auditoría inicial, incluidos 2 críticos. | Actualizaciones y eliminación de dependencias sin uso. Se retira passport-saml y la autenticación sigue delegada en SimpleSAMLphp. |
| Alta | AutoFirma exento de CSRF, con operaciones GET y almacén compartido sin límite total. | POST con CSRF, aislamiento por sesión, caducidad y máximo global de 50 MiB de datos de cadenas. |
| Media | Roles de sesión obsoletos tras bajas o cambios. | Consulta de usuario activo y rol en cada petición autenticada; errores de autorización no crean sesiones. |
| Media | Sesiones en MemoryStore, cuerpos grandes globales y documentación pública. | Sesiones PostgreSQL, límites de tamaño/frecuencia, documentación deshabilitada por defecto y restringida a administración. |
| Media | Cookies completas reenviadas a SSO con redirecciones automáticas. | Solo cookies explícitas del SP, HTTPS, sin redirecciones y límites de tiempo/tamaño. |
| Media | Destino SMTP controlable por el cliente. | Lista de hosts autorizados y puertos 465/587; TLS obligatorio. |
| Media | Detalles internos en respuestas, parsers y transferencias sin acotación suficiente. | Errores genéricos, Helmet, límites CSV y tiempos de espera de red/SQL. |

La comprobación del encabezado de un PDF/PNG **no es un antivirus ni verifica
criptográficamente las firmas PDF**. Los estados FIRMADA/ACEPTADA conservan la
semántica existente de la aplicación. Si representan una firma legalmente validada,
se necesita un verificador de firmas/cadenas de confianza antes de dar ese estado.

## Orden de despliegue

1. Respaldar base de datos, configuración y archivos; preparar mantenimiento.
2. Actualizar Node.js, emitir un certificado con una clave nueva y revocar el anterior.
3. Instalar este código y sus dependencias; aplicar la migración SQL.
4. Configurar directorios privados, secretos, CORS y proxy.
5. Comprobar configuración, arrancar, registrar el webhook y validar los flujos reales.

No arranques esta versión con la clave filtrada, sin las tablas nuevas o sin adaptar
AutoFirma. Conserva los respaldos fuera del directorio publicado por el servidor web.

### Variables operativas y respaldo

Ejecuta desde una shell Bash del servidor. Sustituye estos ejemplos:

```bash
export APP_DIR=/ruta/real/TFMPermuta
export APP_USER=tfmpermuta
export SERVICE=tfmpermuta
export DB_HOST=127.0.0.1
export DB_PORT=5432
export DB_NAME=tfmpermuta
export DB_OWNER=postgres
export APP_DB_ROLE=tfmpermuta_app
export BACKUP_DIR="$HOME/tfmpermuta-backup-$(date +%Y%m%d-%H%M%S)"
umask 077
mkdir -m 700 "$BACKUP_DIR"
cd "$APP_DIR"
cp -- .env "$BACKUP_DIR/env"
# Pide la contraseña; no la pongas en la línea de comandos.
pg_dump -h "$DB_HOST" -p "$DB_PORT" -U "$DB_OWNER" -W -Fc \
  -f "$BACKUP_DIR/database.dump" "$DB_NAME"
# Si ya utilizas esta ubicación para los documentos:
sudo tar -C /var/lib -czf "$BACKUP_DIR/archivos.tar.gz" tfmpermuta
sudo chmod 600 "$BACKUP_DIR/archivos.tar.gz"
```

Adapta la última ruta a BUZON/ARCHIVADOR/PLANTILLAS actuales. No cambies esas rutas
sin copiar antes los documentos: los adjuntos históricos conservan la autorización
por sus relaciones en la base de datos. Los archivos huérfanos antiguos no reciben
un propietario supuesto; para volver a adjuntarlos hay que subirlos otra vez.

### Actualizar Node.js

Usa una versión mantenida con los parches del 21/10/2026: Node 22.23.4 o posterior
de la rama 22, 24.22.1 o posterior de la rama 24, o 26.12.1 o posterior de la rama 26.
Si utilizas NVM, como el usuario que ejecuta la aplicación:

```bash
nvm install 22
nvm use 22
nvm alias default 22
node --version
```

Si usas paquetes del sistema, actualiza desde el repositorio de Node que ya tengas
configurado y comprueba la versión; no basta con actualizar las dependencias npm.
Con systemd, verifica que `ExecStart` utiliza el ejecutable actualizado:

```bash
sudo systemctl show "$SERVICE" -p User -p WorkingDirectory -p ExecStart
```

### Rotar TLS y revocar el certificado comprometido

Si el certificado lo administra Certbot, identifica primero su nombre:

```bash
sudo certbot certificates
export CERT_NAME=permutas.eii.us.es
# Guardar el certificado público antiguo ANTES de renovarlo.
sudo cp -- "/etc/letsencrypt/live/$CERT_NAME/cert.pem" "$BACKUP_DIR/old-cert.pem"
sudo certbot renew --cert-name "$CERT_NAME" --force-renewal --new-key
```

`--new-key` fuerza una clave nueva incluso si la configuración reutiliza claves.
Instala el nuevo par donde el usuario de Node pueda leerlo, sin hacer públicas las claves:

```bash
sudo install -d -o root -g "$APP_USER" -m 750 /etc/tfmpermuta/tls
sudo install -o root -g "$APP_USER" -m 640 \
  "/etc/letsencrypt/live/$CERT_NAME/privkey.pem" /etc/tfmpermuta/tls/privkey.pem
sudo install -o root -g "$APP_USER" -m 640 \
  "/etc/letsencrypt/live/$CERT_NAME/fullchain.pem" /etc/tfmpermuta/tls/fullchain.pem
```

Configura SSL_KEY_PATH y SSL_CERT_PATH con esas rutas. Prepara un deploy hook de
Certbot que repita las dos instalaciones y reinicie Node tras futuras renovaciones.
Después de activar y verificar el certificado nuevo en el proxy y en Node, revoca
el **certificado antiguo guardado**, no el nuevo:

```bash
sudo certbot revoke --cert-path "$BACKUP_DIR/old-cert.pem" \
  --reason keycompromise --no-delete-after-revoke
```

Comprueba que el certificado guardado es el comprometido. Si el certificado de Git
es distinto del anterior servido, también debe revocarse: está disponible como
`src/config/certs/cert.pem` (público). Si otra CA emitió el certificado, usa su proceso
de reemisión/revocación; Certbot no sirve para todas las CA.

La clave seguirá en el historial Git y en clones anteriores. Rotación/revocación
son obligatorias aunque el repositorio sea privado. La limpieza del historial debe
coordinarse con quienes mantienen sus ramas y clones; esta revisión no reescribe
historia ni fuerza pushes. Rota también cualquier contraseña de `.envSample`
histórico que se hubiera reutilizado en producción y cualquier secreto expuesto
en logs, copias o accesos indebidos.

### Dependencias, pruebas y migración

Detén el servicio durante el cambio de código/configuración. Para systemd:

```bash
sudo systemctl stop "$SERVICE"
cd "$APP_DIR"
# Instala aquí la revisión parcheada mediante tu procedimiento de despliegue.
npm ci --ignore-scripts
npm test
npm audit --omit=dev
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_OWNER" -W -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -f sql/seguridad_sesiones_archivos.sql
```

La migración es transaccional e idempotente: crea `web_session` y `archivo_subido`;
no borra sesiones, usuarios ni documentos existentes. Si la conexión de `.env`
ya es la del propietario adecuado, la alternativa es
`node scripts/apply-security-migration.mjs`. No ejecutes ambas por necesidad.

Usa un rol exclusivo de la aplicación, sin privilegios de superusuario. Si no existe,
créalo con la herramienta de PostgreSQL y asígnale una contraseña interactiva:

```bash
createuser -h "$DB_HOST" -p "$DB_PORT" -U "$DB_OWNER" -W \
  --login --no-superuser --no-createdb --no-createrole --pwprompt "$APP_DB_ROLE"
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_OWNER" -W -d "$DB_NAME" \
  -v ON_ERROR_STOP=1 -v app_role="$APP_DB_ROLE" -v db_name="$DB_NAME" <<'SQL'
GRANT CONNECT ON DATABASE :"db_name" TO :"app_role";
GRANT USAGE ON SCHEMA public TO :"app_role";
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO :"app_role";
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO :"app_role";
SQL
```

Omite `createuser` si el rol existe. El ejemplo de permisos supone una base dedicada
a TFMPermuta; en una compartida concede permisos solo a sus tablas. Las migraciones
futuras se ejecutan como propietario, otorgando después los permisos correspondientes.
Configura DB_USER/DB_PASS con este rol; no cambies ni rebajes el rol `postgres`.
Restringe PostgreSQL a loopback o a la red privada necesaria en `postgresql.conf` y
`pg_hba.conf`; utiliza `scram-sha-256`. Para conexión remota activa DB_SSL y una CA
válida. Conserva acceso administrativo probado antes de cambiar las reglas.

### Directorios, configuración y secretos

Las carpetas deben ser distintas y estar fuera de cualquier raíz/alias de Nginx o
Apache. Estos comandos crean los destinos de `.envSample`; adapta los actuales:

```bash
sudo install -d -o "$APP_USER" -g "$APP_USER" -m 700 \
  /var/lib/tfmpermuta/buzon /var/lib/tfmpermuta/archivador \
  /var/lib/tfmpermuta/proyecto-docente /var/lib/tfmpermuta/plantillas \
  /var/lib/tfmpermuta/delegados
sudo chown "$APP_USER:$APP_USER" "$APP_DIR/.env"
sudo chmod 600 "$APP_DIR/.env"
# Revisar .envSample e incorporar variables a .env sin sustituir las existentes.
sudoedit "$APP_DIR/.env"
```

Configura NODE_ENV=production, FRONTEND_ORIGINS con los orígenes HTTPS exactos,
PUBLIC_BASE_URL con la URL pública que dirige `/api/v1` a este backend,
BIND_HOST=127.0.0.1 y TRUST_PROXY=loopback cuando el proxy es local. Si está en otra
máquina, utiliza únicamente sus IP/subredes y limita la escucha/red a esa topología.
No uses `TRUST_PROXY=true` ni expongas innecesariamente el puerto Node a Internet.

Con el servicio detenido, como el propietario de `.env`:

```bash
cd "$APP_DIR"
node scripts/rotate-security-secrets.mjs
npm run security:check -- --database
```

El script genera secretos aleatorios nuevos sin imprimirlos y guarda una copia
`.env.backup-*` con permisos 600. Todas las sesiones anteriores quedan invalidadas.
No copies secretos reales a `.envSample`. El chequeo exige también los directorios
configurados y rechaza la clave TLS que estuvo en Git.

### Proxy y servicios

Nginx: integra estas directivas en el bloque de ubicación de la API existente;
no sustituyas la configuración de SimpleSAMLphp ni del frontend:

```nginx
# Dentro de location /api/ { ... }, con el puerto real de PORT:
client_max_body_size 18m;
client_body_timeout 15s;
proxy_connect_timeout 5s;
proxy_read_timeout 60s;
proxy_set_header Host $host;
proxy_set_header X-Forwarded-Proto $scheme;
# Si este Nginx recibe directamente Internet, sobrescribe cualquier valor enviado.
proxy_set_header X-Forwarded-For $remote_addr;
proxy_pass https://127.0.0.1:3000;
proxy_ssl_server_name on;
proxy_ssl_name permutas.eii.us.es;
proxy_ssl_verify on;
proxy_ssl_trusted_certificate /etc/ssl/certs/ca-certificates.crt;
```

La CA de este ejemplo corresponde a Debian/Ubuntu; adapta la ruta a tu distribución.
Si hay varios proxies, define la cadena de confianza real. El backend continúa usando
HTTPS. Verifica que el proxy no sirve directamente `.env`, `.git`, el código fuente
ni las carpetas de archivos privados. Con Apache aplica las restricciones equivalentes.

```bash
# Solo si usas Nginx:
sudo nginx -t
sudo systemctl reload nginx
# Solo si usas systemd para Node:
sudo systemctl restart "$SERVICE"
sudo systemctl status "$SERVICE" --no-pager
sudo journalctl -u "$SERVICE" -n 50 --no-pager
```

Alternativa PM2, con el nombre real y como su usuario: `pm2 restart NOMBRE --update-env`.
Verifica el intérprete de PM2 si has cambiado Node. Usa un único proceso para esta
versión: el intercambio de AutoFirma y los límites de frecuencia son locales al
proceso. La distribución en varias instancias requiere un almacén compartido para
esos componentes. No ejecutes Node como root.

En Debian/Ubuntu revisa también los paquetes del sistema:

```bash
sudo apt-get update
apt list --upgradable
# Aplicar en una ventana de mantenimiento, comprobando reinicios requeridos:
sudo apt-get upgrade
sudo ss -lntp
```

Limita con tu firewall existente los puertos de PostgreSQL y Node a los orígenes
necesarios. No habilites reglas de firewall genéricas sin conocer el puerto y los
orígenes de SSH: no se puede dar una regla segura contra bloqueo sin esa información.

### Registrar webhook y verificar

Si utilizas Telegram, ejecuta una vez con la configuración nueva, desde APP_DIR:

```bash
node scripts/configure-telegram-webhook.mjs
```

El script usa TELEGRAM_BOT_TOKEN y TELEGRAM_WEBHOOK_SECRET de `.env`, registra
`secret_token` y no muestra credenciales. ADMIN_CHAT_ID debe coincidir con el chat
de administración; quienes aceptan altas deben estar registrados y activos con
rol administrador y con su ID personal de Telegram vinculado.

Pruebas externas sin sesión (sustituye el origen si procede):

```bash
export PUBLIC_URL=https://permutas.eii.us.es
curl -i -X POST "$PUBLIC_URL/api/v1/telegram/webhook" \
  -H 'Content-Type: application/json' --data '{}'
# Esperado: 403 (503 si el bot no está configurado).
curl -i -X POST "$PUBLIC_URL/api/v1/upload"
# Esperado: 403 por CSRF antes de aceptar el cuerpo.
curl -i "$PUBLIC_URL/api-docs/"
# Esperado: 404 deshabilitado, o 403 sin rol si ENABLE_API_DOCS=true.
```

Valida después con cuentas de prueba: inicio/cierre SSO, sesión tras reinicio,
revocación tras desactivar usuario, alta del bot, subida de incidencia, borrador de
una pareja, dos firmas, descarga por participantes y denegación a un tercero.
Prueba una alta legítima en Telegram y comprueba la entrega del webhook.

## Cambios que requieren comprobar el frontend/SSO

- Mantener `credentials: 'include'` y obtener X-CSRF-Token con `/api/v1/csrf-token`.
- AutoFirma: usar POST y X-CSRF-Token tanto para guardar como para recuperar; una
  sesión no puede recuperar el intercambio de otra. Si el cliente nativo no puede
  enviar estos datos, será necesario adaptar el puente usando capacidades de un
  solo uso; no volver a eximir estas rutas de autenticación/CSRF.
- Multipart: `tipo` debe preceder al campo `file`. PDF para documentos, proyectos
  y plantillas; PNG adicionalmente para incidencias. Subir antes de adjuntar.
- `/saml/login` redirige a SimpleSAMLphp. Revisar ReturnTo y las cookies reales del
  SP (SIMPLESAML_COOKIE_NAMES). El puente conserva la lectura de atributos HTML del
  SP existente: su compatibilidad requiere prueba contra la instalación real.
  La configuración, versión, validación SAML y metadatos del SP no están en este
  repositorio y necesitan auditoría en el servidor. La API oficial de SimpleSAMLphp
  es la opción adecuada para sustituir este acoplamiento a HTML en una integración futura.

## Validación y límites

Resultado final: **141/141 pruebas correctas con Node.js 22.23.4**, arranque HTTPS
de la aplicación completa con certificado temporal y comprobación de sintaxis de
todos los módulos. `npm audit --omit=dev` informa **0 vulnerabilidades conocidas**.

Se ejecutan pruebas unitarias y HTTP locales de autenticación del webhook, autorización,
archivos multipart, límites, CSRF, SSO y aislamiento de AutoFirma, junto con la suite
existente. El registro de npm pasó de 22 paquetes afectados a 0 tras actualizar.
Un resultado limpio de npm no acredita ausencia de vulnerabilidades del sistema.

No se han probado aquí PostgreSQL real, Nginx/Apache, SimpleSAMLphp/IdP, SMTP/Graph,
Telegram ni AutoFirma contra servicios reales. Tampoco se han inspeccionado cuentas
del sistema, firewall, backups ni actividad pasada: no se puede determinar si hubo
explotación. Revisa logs de altas, borradores, subidas, sesiones y certificados del
periodo en que estuvieron expuestas las rutas/claves. Las pruebas locales no envían
correos ni mensajes.

Referencias oficiales: [Telegram setWebhook](https://core.telegram.org/bots/api#setwebhook),
[seguridad Express](https://expressjs.com/advanced/best-practice-security/),
[Node.js: parches de octubre](https://nodejs.org/en/blog/vulnerability/october-2026-security-releases),
[Certbot](https://eff-certbot.readthedocs.io/en/stable/using.html),
[integración SimpleSAMLphp](https://simplesamlphp.org/docs/stable/simplesamlphp-sp.html).
