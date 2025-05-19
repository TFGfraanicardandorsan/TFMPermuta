import notificacionService from "../services/notificacionService.mjs";

const getNotificacionesUsuario = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.json({ error: false, result: await notificacionService.getNotificacionesUsuario(uvus) });
    } catch (err) {
        console.error("Error en getNotificacionesUsuario:", err);
        res.status(500).json({ error: true, message: "Error al obtener las notificaciones" });
    }
};

const insertarNotificacion = async (req,res) => {
    try {
        // STRING, STRING
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result: await notificacionService.crearNotificacionesUsuario(uvus,req.body.contenido, req.body.receptor)})
        } catch (err){
            console.log('api insertarNotificacion ha tenido una excepción')

            res.sendStatus(500) }
        }
export default {
    getNotificacionesUsuario,
    insertarNotificacion
}