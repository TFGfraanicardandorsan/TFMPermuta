import funcionalidadService from "../services/funcionalidadService.mjs";


const insertarFuncionalidad = async (req,res) => {
    try{
        const insertarFuncionalidad = await funcionalidadService.insertarFuncionalidad(req.body.funcionalidad);
        res.send({err:false, result:insertarFuncionalidad})
        } catch (err){
            console.log('api insertarFuncionalidad ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    insertarFuncionalidad
}
