import permutaService from "../services/permutaService.mjs";

const obtenerPermutas = async (req,res) => {
    try{
        const permutas = await permutaService.getPermutas();
        res.send({err:false, result:permutas})
        } catch (err){
            console.log('api obtenerPermutas ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerPermutas
}