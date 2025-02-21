import estudiosService from "../services/estudiosService.mjs";


const obtenerMiEstudioUsuario = async (req,res) => {
    try{
    const obtenerMiEstudioUsuario = await estudiosService.obtenerMiEstudioUsuario();
    res.send({err:false, result:obtenerMiEstudioUsuario})
    } catch (err){
        console.log('api obtenerMiEstudioUsuario ha tenido una excepción')
        res.sendStatus(500)
    }
}
export default {
    obtenerMiEstudioUsuario
}
