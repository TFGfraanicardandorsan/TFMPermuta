import solicitudesPermutasService from "../services/solicitudesPermutasService.mjs";


const obtenerSolicitudesPermutas = async (req,res) => {
    try{
        const datosUsuario = await solicitudesPermutasService.obtenerSolicitudesPermutas();
        res.send({err:false, result:datosUsuario})
        } catch (err){
            console.log('api obtenerSolicitudesPermutas ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerSolicitudesPermutas
}