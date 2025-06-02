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
import { setBotCommands } from './middleware/botCommands.mjs';
dotenv.config();
const app = express();

await setBotCommands(); // Establecer los comandos del bot de Telegram
app.use(express.json()); // Middleware nativo para JSON
app.use(express.urlencoded({extended:true})) // Middleware nativo para formularios URL encoded

// Middleware 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,
        httpOnly: true,
        sameSite: 'none',
        maxAge: 7200000 
      },
}));
// Inicializar Passport 
app.use(passport.initialize());
app.use(passport.session());

// Configuración de CORS para permitir las peticiones desde el cliente
app.use(cors({
    origin:['https://permutas.eii.us.es:3033', 'http://localhost:3033'],
    methods: ['GET', 'POST'],
    credentials:true
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

// Configurar el servidor con HTTPS
const keyPath = process.env.SSL_KEY_PATH || './src/config/certs/key.pem';
const certPath = process.env.SSL_CERT_PATH || './src/config/certs/cert.pem';
const options = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath),
    passphrase: process.env.SSL_PASSPHRASE
};

const server = https.createServer(options, app);
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`Servidor corriendo en https://localhost:${port}`);
    console.log(`Se están utilizando las claves ${keyPath} y ${certPath}`);
});
