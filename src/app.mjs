import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import pg from 'pg';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import { databaseConfig } from './config/database.mjs';
import { securityConfig } from './config/security.mjs';
import { loadTlsOptions } from './config/tls.mjs';
import { refreshSessionUser, securityErrorHandler, verifyTelegramWebhook } from './middleware/security.mjs';
import { verificarRol } from './middleware/rolMiddleware.mjs';
import dotenv from 'dotenv'
import cors from 'cors'
import https from 'https'
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
import adminPermutasRouter from './routes/adminPermutasRoutes.mjs'
import { setBotCommands } from './middleware/botCommands.mjs';
import { createCsrfProtection, issueCsrfToken } from './middleware/csrf.mjs';
import { swaggerUi, swaggerSpec } from './config/swagger.mjs';
import { iniciarPropuestasPermutaPeriodicas } from './services/propuestaPermutaScheduler.mjs';

dotenv.config();
const { frontendOrigins, trustProxy } = securityConfig();

const app = express();
app.disable('x-powered-by');
app.set('trust proxy', trustProxy);
app.use(helmet({ crossOriginResourcePolicy: { policy: 'same-site' } }));
app.use('/api', (req, res, next) => { res.setHeader('Cache-Control', 'no-store'); next(); });
app.use(rateLimit({ windowMs: 60_000, limit: 300, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/v1/autorizacion/saml', rateLimit({ windowMs: 60_000, limit: 20, standardHeaders: 'draft-8', legacyHeaders: false }));
app.use('/api/v1/telegram/webhook', verifyTelegramWebhook);

if (process.env.TELEGRAM_BOT_TOKEN) await setBotCommands();

app.use(cors({
    origin: frontendOrigins,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'X-CSRF-Token'],
    exposedHeaders: ['X-CSRF-Error'],
    credentials: true,
}));

// Middleware 
const PgSessionStore = connectPgSimple(session);
const sessionPool = new pg.Pool({ ...databaseConfig(), max: 5 });
sessionPool.on('error', (error) => console.error('Error del almacén de sesiones:', error.code));
app.use(session({
    store: new PgSessionStore({ pool: sessionPool, tableName: 'web_session', createTableIfMissing: false }),
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

app.use(refreshSessionUser);

if (process.env.ENABLE_API_DOCS === 'true') {
    app.use('/api-docs', verificarRol('administrador'), swaggerUi.serve, swaggerUi.setup(swaggerSpec));
}

app.get('/api/v1/csrf-token', issueCsrfToken);
app.use(createCsrfProtection({
    allowedOrigins: frontendOrigins,
    ignoredPaths: [
        '/api/v1/telegram/webhook',
    ],
}));

// Los cuerpos grandes solo se aceptan después de autenticar y comprobar CSRF.
app.use('/api/v1/delegados', verificarRol(['administrador', 'delegacion']),
    rateLimit({ windowMs: 60_000, limit: 20, keyGenerator: req => req.session.user.nombre_usuario,
        standardHeaders: 'draft-8', legacyHeaders: false }),
    express.json({ limit: '18mb', inflate: false }),
    express.urlencoded({ extended: false, limit: '18mb', parameterLimit: 30, inflate: false }));
app.use(express.json({ limit: '256kb', inflate: false }));
app.use(express.urlencoded({ extended: false, limit: '256kb', parameterLimit: 100, inflate: false }));

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
app.use('/api/v1/admin/permutas', adminPermutasRouter)
app.use(securityErrorHandler);

// Configurar el servidor con HTTPS
const options = loadTlsOptions();

const server = https.createServer(options, app);
server.requestTimeout = 30_000;
server.headersTimeout = 15_000;
server.keepAliveTimeout = 5_000;
const port = process.env.PORT || 3000;
server.listen(port, process.env.BIND_HOST || '127.0.0.1', () => {
    iniciarPropuestasPermutaPeriodicas();
    console.log(`Servidor corriendo en https://localhost:${port}`);
});
