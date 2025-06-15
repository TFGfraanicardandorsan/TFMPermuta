import asignaturaService from "../services/asignaturaService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const obtenerAsignaturasMiEstudioUsuario = async (req,res) => {
    try {
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
    try {
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
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const { nombre, siglas, curso, codigo, estudios_id } = req.body;

        const validNombre = GenericValidators.isString(nombre, "Nombre", 100);
        if (!validNombre.valido) return res.status(400).json({ err: true, message: validNombre.mensaje });

        const validSiglas = GenericValidators.isString(siglas, "Siglas", 10);
        if (!validSiglas.valido) return res.status(400).json({ err: true, message: validSiglas.mensaje });

        const cursosValidos = ["PRIMERO", "SEGUNDO", "TERCERO", "CUARTO"];
        if (!cursosValidos.includes(curso)) {
            return res.status(400).json({ err: true, message: "El curso debe ser PRIMERO, SEGUNDO, TERCERO o CUARTO" });
        }

        const validCodigo = GenericValidators.isInteger(codigo, "Código");
        if (!validCodigo.valido) return res.status(400).json({ err: true, message: validCodigo.mensaje });
        const codigoValido = validCodigo.valor;

        const validEstudiosId = GenericValidators.isInteger(estudios_id, "Estudios ID");
        if (!validEstudiosId.valido) return res.status(400).json({ err: true, message: validEstudiosId.mensaje });
        const estudiosIdValido = validEstudiosId.valor;

        const nuevaAsignatura = await asignaturaService.crearAsignatura({ nombre, siglas, curso, codigo:codigoValido, estudios_id:estudiosIdValido });
        res.status(201).json({ err: false, result: nuevaAsignatura });
    } catch (err) {
        console.log('API crearAsignatura ha tenido una excepción:', err);
        res.sendStatus(500);
    }
};

const verAsignatura = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const { codigo } = req.body;
    if (!codigo) {
      return res.status(400).json({ err: true, message: "Falta el codigo de la asignatura" });
    }
    const asignatura = await asignaturaService.verAsignatura(codigo);
    if (!asignatura) {
      return res.status(404).json({ err: true, message: "Asignatura no encontrada" });
    }
    res.json({ err: false, result: asignatura });
  } catch (err) {
    console.log('API verAsignatura ha tenido una excepción:', err);
    res.sendStatus(500);
  }
};

export default {
    obtenerAsignaturasMiEstudioUsuario,
    asignaturaPermutable,
    asignaturaPermutableUsuario,
    obtenerTodosGruposMisAsignaturasSinGrupoUsuario,
    obtenerAsignaturasNoMatriculadas,
    crearAsignatura,
    verAsignatura
}