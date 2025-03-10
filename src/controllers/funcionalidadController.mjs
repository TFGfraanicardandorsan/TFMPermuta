import funcionalidadService from "../services/funcionalidadService.mjs";


const insertarFuncionalidad = async (req,res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({err:false, result: await funcionalidadService.insertarFuncionalidad(req.body.funcionalidad)})
        } catch (err){
            console.log('api insertarFuncionalidad ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    insertarFuncionalidad
}
