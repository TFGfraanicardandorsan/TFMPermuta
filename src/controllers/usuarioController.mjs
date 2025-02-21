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

const actualizarEstudiosUsuario = async (req,res) => {
    try{
        const actualizarEstudiosUsuario = await usuarioService.actualizarEstudiosUsuario(req.body.estudio);
        res.send({err:false, result:actualizarEstudiosUsuario})
        } catch (err){
            console.log('api actualizarEstudiosUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
    }
export default {
    obtenerDatosUsuario,
    actualizarEstudiosUsuario
}