import usuarioService from "../services/usuarioService.mjs";


const obtenerDatosUsuario = async (req,res) => {
    try{
        const datosUsuario = await usuarioService.obtenerDatosUsuario();
        res.send({err:false, result:datosUsuario})
        } catch (err){
            console.log('api obtenerDatosUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerDatosUsuario
}