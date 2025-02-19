import incidenciaService from "../services/incidenciaService.mjs";


const obtenerIncidencias = async (req,res) => {
    try{
        const obtenerIncidencias = await incidenciaService.getIncidencias();
        res.send({err:false, result:obtenerIncidencias})
        } catch (err){
            console.log('api obtenerIncidencias ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerIncidencias
}