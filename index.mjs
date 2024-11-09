import express from 'express';
import dotenv from 'dotenv'
import prueba from './server/appnl/prueba.mjs';
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

const port = process.env.PORT || 3000;
app.listen(port, () => {
    console.log(`Servidor corriendo en http://localhost:${port}`);
});