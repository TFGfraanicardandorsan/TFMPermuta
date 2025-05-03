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
        const permutaId = req.params.id;
        
        res.send({
            err: false, 
            result: await permutaService.aceptarPermuta(permutaId)
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

export default {
    crearListaPermutas,
    listarPermutas,
    aceptarPermuta
}