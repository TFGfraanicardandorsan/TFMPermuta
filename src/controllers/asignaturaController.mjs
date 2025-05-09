import asignaturaService from "../services/asignaturaService.mjs";

const obtenerAsignaturasMiEstudioUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await asignaturaService.obtenerAsignaturasMiEstudioUsuario(uvus)})
        } catch (err){
            console.log('api obtenerAsignaturasMiEstudioUsuario ha tenido una excepción')
            res.sendStatus(500)
        }
}
const asignaturaPermutable = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        res.send({err:false, result:await asignaturaService.asignaturasPermutables()})
        } catch (err){
            console.log('api asignaturasPermutables ha tenido una excepción')
            res.sendStatus(500)
        }
}

const asignaturaPermutableUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await asignaturaService.asignaturasPermutablesUsuario(uvus)})
        } catch (err){
            console.log('api asignaturasPermutables ha tenido una excepción')
            res.sendStatus(500)
        }
}

const obtenerTodosGruposMisAsignaturasSinGrupoUsuario = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await asignaturaService.obtenerTodosGruposMisAsignaturasSinGrupoUsuario(uvus)})
        } catch (err){
            console.log('api asignaturasPermutables ha tenido una excepción')
            res.sendStatus(500)
        }
}

const obtenerAsignaturasNoMatriculadas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({ err: false, result: await asignaturaService.obtenerAsignaturasNoMatriculadas(uvus) });
    } catch (err) {
        console.log('API obtenerAsignaturasNoMatriculadas ha tenido una excepción:', err);
        res.sendStatus(500);
    }
};

export default {
    obtenerAsignaturasMiEstudioUsuario,
    asignaturaPermutable,
    asignaturaPermutableUsuario,
    obtenerTodosGruposMisAsignaturasSinGrupoUsuario,
    obtenerAsignaturasNoMatriculadas
}