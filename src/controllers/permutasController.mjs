import permutaService from "../services/permutaService.mjs";

//const crearListaPermutas = async (req, res) => {
//    try {
//        if (!req.session.user) {
//            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
//            }
//        const { archivo, IdsPermuta } = req.body;
//        if (!archivo || !IdsPermuta) {
//            return res.status(400).json({ error: true, message: "Faltan datos obligatorios" });
//       }
//        res.status(209).json({ error: false, result: await permutaService.crearListaPermutas(archivo,IdsPermuta)});
//    } catch (err) {
//        console.error("Error en crearListaPermutas:", err);
//        res.status(500).json({ error: true, message: "Error al crear la crearListaPermutas" });
//    }
//};
const generarBorradorPermutas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
            }
        const IdsPermuta  = req.body.IdsPermuta;
        if (!IdsPermuta) {
            return res.status(400).json({ error: true, message: "Faltan datos obligatorios" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.status(209).json({ error: false, result: await permutaService.generarBorradorPermutas(IdsPermuta,uvus)});
    } catch (err) {
        console.error("Error en generarBorradorPermutas:", err);
        res.status(500).json({ error: true, message: "Error al crear la generarBorradorPermutas" });
    }
};
const listarPermutas = async (req, res) => {
    try {
        const IdsPermuta  = req.body.IdsPermuta;
        res.status(200).json({ error: false, result: await permutaService.listarPermutas(IdsPermuta)});
    } catch (err) {
        console.error("Error en listarPermutas:", err);
        res.status(500).json({ error: true, message: "Error al listarPermutas" });
    }
};
const firmarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const { archivo, permutaId } = req.body;        
        res.send({
            err: false, 
            result: await permutaService.firmarPermuta(permutaId, archivo)
        });
    } catch (err) {
        console.error('api firmarPermuta ha tenido una excepción:', err);
        res.status(500).json({ 
            err: true, 
            message: 'Error interno en firmarPermuta', 
            details: err.message 
        });
    }
};
const aceptarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const { archivo, permutaId } = req.body;
        const uvus = req.session.user.nombre_usuario;
        res.send({
            err: false,
            result: await permutaService.aceptarPermuta(permutaId, archivo, uvus)
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

const misPermutasPropuestasPorMi = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.status(200).json({ 
            err: false, 
            result: await permutaService.misPermutasPropuestasPorMi(uvus) 
        });
    } catch (err) {
        console.error('api misPermutasPropuestasPorMi ha tenido una excepción:', err);
        res.status(500).json({ 
            err: true, 
            message: 'Error interno en misPermutasPropuestasPorMi', 
            details: err.message 
        });
    }
};

const obtenerPermutasValidadasPorUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    res.status(200).json({
      err: false,
      result: await permutaService.obtenerPermutasValidadasPorUsuario(uvus),
    });
  } catch (err) {
    console.error("api obtenerPermutasValidadasPorUsuario ha tenido una excepción:", err);
    res.status(500).json({
      err: true,
      message: "Error interno en obtenerPermutasValidadasPorUsuario",
      details: err.message,
    });
  }
};

const obtenerPermutasAgrupadasPorUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    res.status(200).json({
      err: false,
      result: await permutaService.obtenerPermutasAgrupadasPorUsuario(uvus),
    });
  } catch (err) {
    console.error("api obtenerPermutasAgrupadasPorUsuario ha tenido una excepción:", err);
    res.status(500).json({
      err: true,
      message: "Error interno en obtenerPermutasAgrupadasPorUsuario",
      details: err.message,
    });
  }
};
const obtenerEstadoPermutaYUsuarios = async (req, res) => {
  try {
        const { permutaId } = req.body;
        const resultado = await permutaService.obtenerEstadoPermutaYUsuarios(permutaId);
    res.status(200).json({
      success: true,
      data: resultado
    });
  } catch (error) {
    console.error('Error en obtenerEstadoPermutaYUsuarios:', error);
    res.status(500).json({
      success: false,
      message: error.message
    });
  }
};

export default {
//    crearListaPermutas,
    listarPermutas,
    aceptarPermuta,
    rechazarSolicitudPermuta,
    misPermutasPropuestas,
    misPermutasPropuestasPorMi,
    obtenerPermutasValidadasPorUsuario,
    obtenerPermutasAgrupadasPorUsuario,
    generarBorradorPermutas,
    firmarPermuta,
    obtenerEstadoPermutaYUsuarios
}