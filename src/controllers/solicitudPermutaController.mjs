import solicitudPermutaService from "../services/solicitudPermutaService.mjs";


const solicitarPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        console.log('solicitarPermuta', req.body.asignatura, req.body.grupos_deseados)
        console.log('el problema no es del body')
        res.send({err:false, result:await solicitudPermutaService.solicitarPermuta(uvus, req.body.asignatura, req.body.grupos_deseados)})
        } catch (err){
            console.log('api solicitarPermuta ha tenido una excepción')
            res.sendStatus(500)
        }
}

const getSolicitudesPermutaInteresantes = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.getSolicitudesPermutaInteresantes(uvus)})
        } catch (err){
            console.log('api getSolicitudesPermutaInteresantes ha tenido una excepción')
            res.sendStatus(500)
        }
    }

const getMisSolicitudesPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.getMisSolicitudesPermuta(uvus)})
        } catch (err){
            console.log('api getMisSolicitudesPermuta ha tenido una excepción')
            res.sendStatus(500)
        }
    }

const aceptarSolicitudPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.aceptarSolicitudPermuta(uvus, req.body.solicitud)})
        } catch (err){
            console.log('api aceptarSolicitudPermuta ha tenido una excepción')
            res.sendStatus(500)
        }
    }
const rechazarSolicitudPermuta = async (req,res) => {
    try{
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.send({err:false, result:await solicitudPermutaService.rechazarSolicitudPermuta(uvus, req.body.solicitud)})
        } catch (err){
            console.log('api rechazarSolicitudPermuta ha tenido una excepción')
            res.sendStatus(500)
        }
    }
export default {
    solicitarPermuta,
    getSolicitudesPermutaInteresantes,
    getMisSolicitudesPermuta,
    aceptarSolicitudPermuta,
    rechazarSolicitudPermuta
}