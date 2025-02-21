import express from 'express';
import session from 'express-session';
import passport from '../src/middleware/passport.mjs';
import dotenv from 'dotenv'
import cors from 'cors'
import https from 'https'
import fs from 'fs'
import usuarioService from './services/usuarioService.mjs';
import funcionalidadService from './services/funcionalidadService.mjs';
import estudiosService from './services/estudiosService.mjs';
import asignaturaService from './services/asignaturaService.mjs';
import autorizacionRouter from './routes/autorizacionRoutes.mjs'
import usuarioRouter from './routes/usuarioRoutes.mjs'
dotenv.config();

const app = express();

// Middleware nativo para JSON
app.use(express.json());
// Middleware nativo para formularios URL encoded
app.use(express.urlencoded({extended:true}))

// Middleware de Passport 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: true,
    saveUninitialized: true,
    cookie: { 
        secure: true,  // Cambiar secure: true si se usa HTTPS
        httpOnly: true,
    } 
}));

// Inicializar Passport 
app.use(passport.initialize());
app.use(passport.session());
// Configuración de CORS para permitir las peticiones desde el cliente
app.use(cors({
    origin:'https://permutas.eii.us.es:3033',
    methods: ['GET', 'POST'],
    credentials:true
}));

app.get('/', (req, res) => {
    res.send('¡Hola Mundo! 😊');
});

app.use('/api/v1/autorizacion', autorizacionRouter )
app.use('/api/v1/usuario', usuarioRouter)

// TODO: Tenemos que hacer que el sistema de rutas para que sea igual que el arriba
app.get('/api/misEstudios', async (req,res) => {
    try{
    const datosUsuario = await estudiosService.obtenerMiEstudioUsuario();
    res.send({err:false, result:datosUsuario})
    } catch (err){
        console.log('api obtenerMiEstudioUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
})

// FUNCIONALIDAD
app.post('/api/insertarFuncionalidad', async (req,res) => {
    try{
    const datosUsuario = await funcionalidadService.insertarFuncionalidad(req.body.funcionalidad);
    res.send({err:false, result:datosUsuario})
    } catch (err){
        console.log('api insertarFuncionalidadPrueba ha tenido una excepción')
        res.sendStatus(500)
    }
})
// ESTUDIOS
app.post('/api/seleccionarEstudios', async (req,res) => {
    try{
    const datosUsuario = await usuarioService.actualizarEstudiosUsuario(req.body.estudio);
    console.log(datosUsuario)
    res.send({err:false, result:datosUsuario})
    } catch (err){
        console.log('api actualizarEstudios ha tenido una excepción')
        res.sendStatus(500)
    }
})

app.get('/api/asignaturasMisEstudios', async (req,res) => {
    try{
    const datosUsuario = await asignaturaService.obtenerAsignaturasMiEstudioUsuario();
    res.send({err:false, result:datosUsuario})
    } catch (err){
        console.log('api obtenerMiEstudioUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
})

// CREAR EL SERVIDOR CON HTTPS
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
