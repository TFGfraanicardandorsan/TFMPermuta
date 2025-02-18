import asignaturaService from "../services/asignaturaService.mjs";

const obtenerAsignaturasMiEstudioUsuario = async (req,res) => {
    try{
        const permutas = await asignaturaService.obtenerAsignaturasMiEstudioUsuario();
        res.send({err:false, result:permutas})
        } catch (err){
            console.log('api obtenerAsignaturasMiEstudioUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerAsignaturasMiEstudioUsuario
}