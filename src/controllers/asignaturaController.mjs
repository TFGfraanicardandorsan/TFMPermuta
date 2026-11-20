import asignaturaService from "../services/asignaturaService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const MAX_INT_POSTGRES = 2_147_483_647;
const enteroPositivo = (valor) => {
    const numero = typeof valor === 'number' ? valor
        : typeof valor === 'string' && /^\d+$/.test(valor.trim()) ? Number(valor.trim()) : Number.NaN;
    return Number.isSafeInteger(numero) && numero > 0 && numero <= MAX_INT_POSTGRES ? numero : null;
};

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

        // isInteger acepta "12abc"; aquí exigimos enteros positivos estrictos que quepan en un INTEGER de PostgreSQL.
        const codigoValido = enteroPositivo(codigo);
        if (!codigoValido) return res.status(400).json({ err: true, message: "El código debe ser un entero positivo" });

        const estudiosIdValido = enteroPositivo(estudios_id);
        if (!estudiosIdValido) return res.status(400).json({ err: true, message: "Selecciona un grado válido" });

        const nuevaAsignatura = await asignaturaService.crearAsignatura({
            nombre: nombre.trim(),
            siglas: siglas.trim().toUpperCase(),
            curso,
            codigo: codigoValido,
            estudios_id: estudiosIdValido
        });
        res.status(201).json({ err: false, result: nuevaAsignatura });
    } catch (err) {
        if (err.statusCode && err.statusCode < 500) {
            return res.status(err.statusCode).json({ err: true, message: err.message });
        }
        console.log('API crearAsignatura ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: "Error interno al crear la asignatura" });
    }
};

const obtenerPanelAdmin = async (_req, res) => {
    try {
        res.json({ err: false, result: await asignaturaService.obtenerPanelAdmin() });
    } catch (err) {
        console.log('API obtenerPanelAdmin de asignaturas ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: "Error interno al cargar las asignaturas" });
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
    obtenerAsignaturasNoMatriculadas,
    crearAsignatura,
    obtenerPanelAdmin,
    verAsignatura
}