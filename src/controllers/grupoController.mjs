import grupoService from "../services/grupoService.mjs";


const obtenerGruposPorAsignatura = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({err:false, result: await grupoService.obtenerGruposPorAsignatura(req.body.asignatura)})
        } catch (err){
            console.log('api obtenerGruposPorAsignatura ha tenido una excepción')
            res.sendStatus(500)
        }
}
const insertarMisGrupos = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await grupoService.insertarMisGrupos(uvus,req.body.num_grupo,req.body.codigo)})
        } catch (err){
            console.log('api insertarMisGrupos ha tenido una excepción')
            res.sendStatus(500)
        }
}
const obtenerMiGrupoAsignatura = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await grupoService.obtenerMiGrupoAsignatura(uvus)})
        } catch (err){
            console.log('api obtenerMiGrupoAsignatura ha tenido una excepción')
            res.sendStatus(500)
        }
}

const obtenerTodosGruposMisAsignaturasUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await grupoService.obtenerTodosGruposMisAsignaturasUsuario(uvus)})
        } catch (err){
            console.log('api obtenerTodosGruposMisAsignaturasUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerGruposPorAsignatura,
    insertarMisGrupos,
    obtenerMiGrupoAsignatura,
    obtenerTodosGruposMisAsignaturasUsuario
}
