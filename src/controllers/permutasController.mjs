import permutaService from "../services/permutaService.mjs";

const crearListaPermutas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
            }
        const { archivo, IdsPermuta } = req.body;
        if (!archivo || !IdsPermuta) {
            return res.status(400).json({ error: true, message: "Faltan datos obligatorios" });
        }
        res.status(209).json({ error: false, result: await permutaService.crearListaPermutas(archivo,IdsPermuta)});
    } catch (err) {
        console.error("Error en crearListaPermutas:", err);
        res.status(500).json({ error: true, message: "Error al crear la crearListaPermutas" });
    }
};
const listarPermutas = async (req, res) => {
    try {
        res.status(200).json({ error: false, result: await permutaService.listarPermutas()});
    } catch (err) {
        console.error("Error en listarPermutas:", err);
        res.status(500).json({ error: true, message: "Error al listarPermutas" });
    }
};
const aceptarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const { archivo, permutaId } = req.body;        
        res.send({
            err: false, 
            result: await permutaService.aceptarPermuta(permutaId, archivo)
        });
    } catch (err) {
        console.error('api aceptarPermuta ha tenido una excepción:', err);
        res.status(500).json({ 
            err: true, 
            message: 'Error interno en aceptarPermuta', 
            details: err.message 
        });
    }
};

const rechazarSolicitudPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await permutaService.rechazarSolicitudPermuta(uvus, req.body.solicitud)})
        } catch (err){
            console.error('api rechazarSolicitudPermuta ha tenido una excepción:', err);
            res.status(500).json({ err: true, message: 'Error interno en rechazarSolicitudPermuta', details: err.message });
        }
    }

const misPermutasPropuestas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.status(200).json({ 
            err: false, 
            result: await permutaService.misPermutasPropuestas(uvus) 
        });
    } catch (err) {
        console.error('api misPermutasPropuestas ha tenido una excepción:', err);
        res.status(500).json({ 
            err: true, 
            message: 'Error interno en misPermutasPropuestas', 
            details: err.message 
        });
    }
};

export default {
    crearListaPermutas,
    listarPermutas,
    aceptarPermuta,
    rechazarSolicitudPermuta,
    misPermutasPropuestas
}