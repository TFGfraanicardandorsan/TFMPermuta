import express from 'express';
import dotenv from 'dotenv'
import prueba from './server/appnl/prueba.mjs';
import login from './server/config/login.mjs';
import appnl from './server/appnl.mjs';
dotenv.config();


const app = express();

// Middleware nativo para JSON
app.use(express.json());
// Middleware nativo para formularios URL encoded
app.use(express.urlencoded({extended:true}))

app.get('/', (req, res) => {
    res.send('¡Hola Mundo! 😊');
});

app.get('/prueba',async (req,res) => {
    const respuesta = await prueba.consultaPrueba() 
    res.send({err:false, respuesta})
})

login.actualizaKidPem();


app.post('/apilogin/horaservidor', async (req,res) => {
    const ahora = new Date();
    const respuesta = {
        err:false,
        time:ahora,
        tz: ahora.getTimezoneOffset()
    };
    res.setHeader('Content-Type', 'application/json');
    res.end(JSON.stringify(respuesta))
})

app.post('/apilogin/login', async (req,res) => {
    res.setHeader('Content-Type', 'application/json');
    const loginResult = await login.loginJwt(req.body.idtoken);
    res.end(JSON.stringify(loginResult))
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