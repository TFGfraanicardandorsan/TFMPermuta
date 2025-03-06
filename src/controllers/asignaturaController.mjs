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

const personaMatriculadaEnAsignatura = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await asignaturaService.personaMatriculadaEnAsignatura(uvus, req.body.asignatura)})
        } catch (err){
            console.log('api personaMatriculadaEnAsignatura ha tenido una excepción')
            res.sendStatus(500)
        }
}
export default {
    obtenerAsignaturasMiEstudioUsuario,
    personaMatriculadaEnAsignatura
}