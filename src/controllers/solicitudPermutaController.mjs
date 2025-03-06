import solicitudPermutaService from "../services/solicitudPermutaService.mjs";


const solicitarPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.solicitarPermuta(uvus, req.body.asignatura, req.body.grupos_deseados)})
        } catch (err){
            console.log('api solicitarPermuta ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    solicitarPermuta
}