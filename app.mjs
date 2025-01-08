import express from 'express';
import dotenv from 'dotenv'
import cors from 'cors'
import appnl from './routes/appnl.mjs';
dotenv.config();


const app = express();

// Middleware nativo para JSON
app.use(express.json());
// Middleware nativo para formularios URL encoded
app.use(express.urlencoded({extended:true}))

// Configuración de CORS
app.use(cors({
    origin:'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials:true
}));

app.get('/', (req, res) => {
    res.send('¡Hola Mundo! 😊');
});

// A partir de aquí las peticiones deben estar autenticadas
app.post('/api/*', async (req,res,next) => {
    if ((typeof req.body.sesionid !== 'string') || (req.body.sesionid.length > 36)){
        res.sendStatus(400);
    } else if (await appnl.isSesionAutenticada(req.body.sesionid)){
        next();
    } else {
        res.sendStatus(401);
    }
})

app.post('/api/getAutorizaciones', async (req,res) => {
    try{
    const result = await appnl.getAutorizacion(req.body.sesionid);
    res.send({err:false, result})
    } catch (err){
        console.log('api getAutorizaciones ha tenido una excepción')
        res.sendStatus(500)
    }
})

app.post('/api/obtenerDatosUsuario', async (req,res) => {
    try{
    const datosUsuario = await appnl.obtenerDatosUsuario(req.body.sesionid);
    res.send({err:false, result:datosUsuario})
    } catch (err){
        console.log('api obtenerDatosUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
})


const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});