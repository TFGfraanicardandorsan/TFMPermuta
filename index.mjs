import express from 'express';
import dotenv from 'dotenv'
import prueba from './server/appnl/prueba.mjs';
import jwt from './server/config/jwt.mjs';
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

jwt.actualizaKidPem();


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

app.post('/apilogin/loginJwt', async (req,res) => {
    res.setHeader('Content-Type', 'application/json');
    console.log(req.body.idtoken)
    const loginResult = await jwt.loginJwt(req.body.idtoken);
    res.end(JSON.stringify(loginResult))
})

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});