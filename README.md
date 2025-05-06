# TFMPermuta

TFMPermuta es una aplicación diseñada para gestionar permutas de grupos y asignaturas en un entorno académico. Permite a los estudiantes solicitar, aceptar y gestionar permutas, mientras que los administradores pueden supervisar y validar estas solicitudes.

## Tabla de Contenidos

1. [Características](#características)
2. [Instalación](#instalación)
3. [Uso](#uso)
4. [Estructura del Proyecto](#estructura-del-proyecto)
5. [Variables de Entorno](#variables-de-entorno)
6. [Endpoints Principales](#endpoints-principales)
7. [Tecnologías Utilizadas](#tecnologías-utilizadas)
8. [Contribución](#contribución)
9. [Licencia](#licencia)

## Características

- **Gestión de usuarios**: Registro y autenticación mediante SAML.
- **Permutas**: Solicitud, aceptación, rechazo y validación de permutas.
- **Notificaciones**: Sistema de notificaciones para mantener a los usuarios informados.
- **Telegram Bot**: Integración con Telegram para gestionar incidencias y solicitudes.
- **Estadísticas**: Visualización de estadísticas de permutas y solicitudes.

## Instalación

1. Clona el repositorio:
   ```bash
   git clone https://github.com/usuario/TFMPermuta.git
   cd TFMPermuta
   ```

2. Instala las dependencias:
   ```bash
   npm install
   ```

3. Configura las variables de entorno:
   - Copia el archivo `.envSample` y renómbralo a `.env`.
   - Completa las variables de entorno necesarias, como la configuración de la base de datos y las credenciales SSL.

4. Inicia la aplicación:
   ```bash
   npm start
   ```

## Uso

1. Ejecuta el servidor localmente con `npm start`.
2. Accede a los endpoints de la API para gestionar usuarios, permutas e incidencias.
3. Usa el bot de Telegram para interactuar con el sistema desde tu dispositivo móvil.

## Estructura del Proyecto

```
TFMPermuta/
├── .envSample                # Archivo de ejemplo para variables de entorno
├── .gitignore                # Archivos y carpetas ignorados por Git
├── README.md                 # Documentación del proyecto
├── package.json              # Dependencias y configuración del proyecto
├── src/
│   ├── app.mjs               # Punto de entrada principal de la aplicación
│   ├── algorithm/            # Algoritmos para emparejamiento de permutas
│   ├── config/               # Configuración de la base de datos y SAML
│   ├── controllers/          # Controladores para manejar la lógica de negocio
│   ├── middleware/           # Middlewares para autenticación y manejo de archivos
│   ├── routes/               # Rutas de la API
│   ├── services/             # Servicios para interactuar con la base de datos
│   └── utils/                # Utilidades y funciones auxiliares
└── .vscode/
    └── launch.json           # Configuración para depuración en VSCode
```

## Variables de Entorno

El archivo `.env` debe incluir las siguientes variables:

- `DB_HOST`: Dirección del host de la base de datos.
- `DB_PORT`: Puerto de la base de datos.
- `DB_USER`: Usuario de la base de datos.
- `DB_PASSWORD`: Contraseña de la base de datos.
- `DB_NAME`: Nombre de la base de datos.
- `SSL_KEY_PATH`: Ruta al archivo de clave SSL.
- `SSL_CERT_PATH`: Ruta al archivo de certificado SSL.

## Endpoints Principales

### Usuarios
- `POST /api/v1/usuario/obtenerDatosUsuario`: Obtiene los datos del usuario autenticado.
- `POST /api/v1/usuario/actualizarEstudiosUsuario`: Actualiza los estudios del usuario.

### Permutas
- `POST /api/v1/permutas/solicitarPermuta`: Solicita una nueva permuta.
- `POST /api/v1/permutas/aceptarPermuta`: Acepta una permuta propuesta.
- `POST /api/v1/permutas/rechazarSolicitudPermuta`: Rechaza una solicitud de permuta.

### Incidencias
- `POST /api/v1/incidencia/crearIncidencia`: Crea una nueva incidencia.
- `POST /api/v1/incidencia/obtenerIncidencias`: Obtiene todas las incidencias.

### Estadísticas
- `POST /api/v1/estadisticas/permutas`: Obtiene estadísticas de permutas.
- `POST /api/v1/estadisticas/solicitudes`: Obtiene estadísticas de solicitudes.

## Tecnologías Utilizadas

- **Backend**: Node.js, Express.js
- **Base de Datos**: PostgreSQL
- **Autenticación**: SAML (SimpleSAMLphp)
- **Integración**: Telegram Bot API
- **Otros**: Multer para manejo de archivos, Passport.js para autenticación.

## Contribución

1. Haz un fork del repositorio.
2. Crea una rama para tu funcionalidad:
   ```bash
   git checkout -b nueva-funcionalidad
   ```
3. Realiza tus cambios y haz un commit:
   ```bash
   git commit -m "Añadida nueva funcionalidad"
   ```
4. Envía tus cambios:
   ```bash
   git push origin nueva-funcionalidad
   ```
5. Abre un Pull Request en GitHub.
