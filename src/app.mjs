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
import funcionalidadRouter from './routes/funcionalidadRoutes.mjs'
import asignaturaRouter from './routes/asignaturaRoutes.mjs'
import usuarioAsignaturaRouter from './routes/usuarioAsignaturaRoutes.mjs'
import usuarioGrupoRouter from './routes/usuarioGrupoRoutes.mjs'
import grupoRouter from './routes/grupoRoutes.mjs'
dotenv.config();
const app = express();

// Middleware nativo para JSON
app.use(express.json());
// Middleware nativo para formularios URL encoded
app.use(express.urlencoded({extended:true}))

// Middleware 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { 
        secure: true,
        sameSite: 'lax',
        maxAge: 86400000 
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

app.get('/api', (req, res) => {res.send('¡Hola Mundo! 😊')});

app.use('/api/v1/autorizacion', autorizacionRouter )
app.use('/api/v1/usuario', usuarioRouter)
app.use('/api/v1/estudio', estudioRouter)
app.use('/api/v1/funcionalidad', funcionalidadRouter)
app.use('/api/v1/asignatura', asignaturaRouter)
app.use('/api/v1/usuarioAsignatura', usuarioAsignaturaRouter)
app.use('/api/v1/usuarioGrupo', usuarioGrupoRouter)
app.use('/api/v1/grupo', grupoRouter)

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
