import grupoService from "../services/grupoService.mjs";


const getMiGrupoAsignatura = async (req,res) => {
    try{
        const getMiGrupoAsignatura = await grupoService.getMiGrupoAsignatura(req.body.funcionalidad);
        res.send({err:false, result:getMiGrupoAsignatura})
        } catch (err){
            console.log('api getMiGrupoAsignatura ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    getMiGrupoAsignatura
}
