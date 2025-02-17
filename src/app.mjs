import express from 'express';
import dotenv from 'dotenv'
import cors from 'cors'
import usuarioService from './services/usuarioService.mjs';
import funcionalidadService from './services/funcionalidadService.mjs';
import estudiosService from './services/estudiosService.mjs';
import asignaturaService from './services/asignaturaService.mjs';
import usuarioRouter from './routes/usuarioRoutes.mjs'
dotenv.config();

const app = express();

// Middleware nativo para JSON
app.use(express.json());
// Middleware nativo para formularios URL encoded
app.use(express.urlencoded({extended:true}))

// Configuración de CORS
app.use(cors({
    origin:'http://localhost:3033',
    methods: ['GET', 'POST'],
    credentials:true
}));

app.get('/', (req, res) => {
    res.send('¡Hola Mundo! 😊');
});


app.use('/api/v1/usuario', usuarioRouter)
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

//TODO: CREAR CON HTTPS PARA QUE SEAN CIFRADAS
const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});