import express from 'express';
import session from 'express-session';
import passport from '../src/middleware/passport.mjs';
import dotenv from 'dotenv'
import cors from 'cors'
import https from 'https'
import fs from 'fs'
import autorizacionRouter from './routes/autorizacionRoutes.mjs'
import usuarioRouter from './routes/usuarioRoutes.mjs'
import estudioRouter from './routes/estudiosRoutes.mjs'
import asignaturaRouter from './routes/asignaturaRoutes.mjs'
import usuarioAsignaturaRouter from './routes/usuarioAsignaturaRoutes.mjs'
import usuarioGrupoRouter from './routes/usuarioGrupoRoutes.mjs'
import grupoRouter from './routes/grupoRoutes.mjs'
import incidenciaRouter from './routes/incidenciaRoutes.mjs'
import notificacionRoutes from './routes/notificacionRoutes.mjs'
import solicitudPermutaRoutes from './routes/solicitudPermutaRoutes.mjs'
import uploadRouter from './routes/uploadRoutes.mjs'
import telegramRouter from './routes/telegramRoutes.mjs'
import permutaRouter from './routes/permutasRoutes.mjs'
import administradorRouter from './routes/administradorRoutes.mjs'
import delegadosRouter from './routes/delegadosRoutes.mjs'
import feedbackRouter from './routes/feedbackRoutes.mjs'
import { setBotCommands } from './middleware/botCommands.mjs';
import { createCsrfProtection, issueCsrfToken } from './middleware/csrf.mjs';
import { swaggerUi, swaggerSpec } from './config/swagger.mjs';
import { iniciarPropuestasPermutaPeriodicas } from './services/propuestaPermutaScheduler.mjs';

dotenv.config();
if (!process.env.SESSION_SECRET) {
    throw new Error('SESSION_SECRET es obligatoria para proteger las sesiones.');
}

const app = express();

await setBotCommands(); // Establecer los comandos del bot de Telegram
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || '30mb' })); // Middleware nativo para JSON
app.use(express.urlencoded({ extended: true, limit: process.env.URLENCODED_BODY_LIMIT || '30mb' })) // Middleware nativo para formularios URL encoded

const frontendOrigins = (process.env.FRONTEND_ORIGINS
    || 'https://permutas.eii.us.es,https://permutas.eii.us.es:3033,http://localhost:3033,http://127.0.0.1:3033')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

app.use(cors({
    origin: frontendOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Error'],
    credentials: true,
}));

// Swagger docs
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Middleware 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        path: '/',
        maxAge: 7200000 
      },
}));

// Inicializar Passport 
app.use(passport.initialize());
app.use(passport.session());

app.get('/api/v1/csrf-token', issueCsrfToken);
app.use(createCsrfProtection({
    allowedOrigins: frontendOrigins,
    ignoredPaths: [
        '/api/v1/telegram/webhook',
        '/api/v1/delegados/afirma-signature-storage/StorageService',
        '/api/v1/delegados/afirma-signature-retriever/RetrieveService',
    ],
}));

app.use('/api/v1/autorizacion', autorizacionRouter )
app.use('/api/v1/usuario', usuarioRouter)
app.use('/api/v1/estudio', estudioRouter)
app.use('/api/v1/asignatura', asignaturaRouter)
app.use('/api/v1/usuarioAsignatura', usuarioAsignaturaRouter)
app.use('/api/v1/usuarioGrupo', usuarioGrupoRouter)
app.use('/api/v1/incidencia', incidenciaRouter)
app.use('/api/v1/grupo', grupoRouter)
app.use('/api/v1/notificacion', notificacionRoutes)
app.use('/api/v1/solicitudPermuta', solicitudPermutaRoutes)
app.use('/api/v1/permutas', permutaRouter)
app.use('/api/v1', uploadRouter)
app.use('/api/v1/estadisticas', administradorRouter)
app.use('/api/v1/telegram',telegramRouter)
app.use('/api/v1/delegados', delegadosRouter)
app.use('/api/v1/feedback', feedbackRouter)

// Configurar el servidor con HTTPS
const resolveCertPath = (envPath, fallbackPaths) => {
    if (envPath) return envPath;
    return fallbackPaths.find((candidate) => fs.existsSync(candidate)) || fallbackPaths[0];
};
const keyPath = resolveCertPath(process.env.SSL_KEY_PATH, ['./src/config/certs/key.pem', './src/config/certs/privkey.pem']);
const certPath = resolveCertPath(process.env.SSL_CERT_PATH, ['./src/config/certs/cert.pem', './src/config/certs/fullchain.pem']);
const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    passphrase: process.env.SSL_PASSPHRASE
};

const server = https.createServer(options, app);
const port = process.env.PORT || 3000;
server.listen(port, () => {
    iniciarPropuestasPermutaPeriodicas();
    console.log(`Servidor corriendo en https://localhost:${port}`);
    console.log(`Se están utilizando las claves ${keyPath} y ${certPath}`);
});
