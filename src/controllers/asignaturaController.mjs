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

const crearAsignatura = async (req, res) => {
    try {
        // Puedes añadir validaciones aquí si lo deseas
        const { nombre, siglas, curso, codigo } = req.body;
        if (!nombre || !siglas || !curso || !codigo) {
            return res.status(400).json({ err: true, message: "Faltan campos obligatorios" });
        }
        const nuevaAsignatura = await asignaturaService.crearAsignatura({ nombre, siglas, curso, codigo });
        res.status(201).json({ err: false, result: nuevaAsignatura });
    } catch (err) {
        console.log('API crearAsignatura ha tenido una excepción:', err);
        res.sendStatus(500);
    }
};

export default {
    obtenerAsignaturasMiEstudioUsuario,
    asignaturaPermutable,
    asignaturaPermutableUsuario,
    obtenerTodosGruposMisAsignaturasSinGrupoUsuario,
    obtenerAsignaturasNoMatriculadas,
    crearAsignatura
}