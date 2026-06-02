import permutaService from "../services/permutaService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";
import solicitudPermutaService from "../services/solicitudPermutaService.mjs";

const generarBorradorPermutas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const IdsPermuta = req.body.IdsPermuta;
        if (!Array.isArray(IdsPermuta) || IdsPermuta.some(id => !GenericValidators.isInteger(id, "PermutaId").valido)) {
            return res.status(400).json({ error: true, message: "IdsPermuta debe ser un array de enteros" });
        }
        res.status(200).json({ error: false, result: await permutaService.generarBorradorPermutas(IdsPermuta, uvus) });
    } catch (err) {
        console.error("Error en generarBorradorPermutas:", err);
        res.status(500).json({ error: true, message: "Error al crear la generarBorradorPermutas" });
    }
};

const listarPermutas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const IdsPermuta = req.body.IdsPermuta;
        if (!Array.isArray(IdsPermuta) || IdsPermuta.some(id => !GenericValidators.isInteger(id, "PermutaId").valido)) {
            return res.status(400).json({ error: true, message: "IdsPermuta debe ser un array de enteros" });
        }
        res.status(200).json({ error: false, result: await permutaService.listarPermutas(IdsPermuta) });
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
        const uvus = req.session.user.nombre_usuario;
        const { archivo } = req.body;
        const validId = GenericValidators.isInteger(req.body.permutaId, "PermutaId");
        if (!validId.valido) {
            return res.status(400).json({ err: true, message: validId.mensaje });
        }
        const permutaId = validId.valor;
        const validArchivo = GenericValidators.isFilePdfOrPng(archivo, "Archivo", 50);
        if (!validArchivo.valido || !/^[0-9a-fA-F-]{36}\.pdf$/.test(archivo)) {
            return res.status(400).json({ err: true, message: "El archivo debe ser un PDF con nombre UUID.pdf" });
        }
        res.send({ err: false, result: await permutaService.firmarPermuta(permutaId, archivo,uvus) });
    } catch (err) {
        console.error('api firmarPermuta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en firmarPermuta', details: err.message });
    }
};

const aceptarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const { archivo } = req.body;
        const validId = GenericValidators.isInteger(req.body.permutaId, "PermutaId");
        if (!validId.valido) {
            return res.status(400).json({ err: true, message: validId.mensaje });
        }
        const permutaId = validId.valor;
        const validArchivo = GenericValidators.isFilePdfOrPng(archivo, "Archivo", 50);
        if (!validArchivo.valido || !/^[0-9a-fA-F-]{36}\.pdf$/.test(archivo)) {
            return res.status(400).json({ err: true, message: "El archivo debe ser un PDF con nombre UUID.pdf" });
        }
        res.send({ err: false, result: await permutaService.aceptarPermuta(permutaId, archivo, uvus) });
    } catch (err) {
        console.error('api aceptarPermuta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en aceptarPermuta', details: err.message });
    }
};

const validarPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const validId = GenericValidators.isInteger(req.body.permutaId, "PermutaId");
        if (!validId.valido) {
            return res.status(400).json({ err: true, message: validId.mensaje });
        }
        const permutaId = validId.valor;
        res.send({ err: false, result: await permutaService.validarPermuta(permutaId) });
    } catch (err) {
        console.error('api validarPermuta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en validarPermuta', details: err.message });
    }
};

const rechazarSolicitudPermuta = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const validId = GenericValidators.isInteger(req.body.solicitud, "SolicitudId");
        if (!validId.valido) {
            return res.status(400).json({ err: true, message: validId.mensaje });
        }
        const solicitud = validId.valor;
        res.send({ err: false, result: await permutaService.rechazarSolicitudPermuta(uvus, solicitud) });
    } catch (err) {
        console.error('api rechazarSolicitudPermuta ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en rechazarSolicitudPermuta', details: err.message });
    }
};


const misPermutasPropuestas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.status(200).json({ err: false, result: await permutaService.misPermutasPropuestas(uvus) });
    } catch (err) {
        console.error('api misPermutasPropuestas ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en misPermutasPropuestas', details: err.message });
    }
};

const misPermutasPropuestasPorMi = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        res.status(200).json({ err: false, result: await permutaService.misPermutasPropuestasPorMi(uvus) });
    } catch (err) {
        console.error('api misPermutasPropuestasPorMi ha tenido una excepción:', err);
        res.status(500).json({ err: true, message: 'Error interno en misPermutasPropuestasPorMi', details: err.message });
    }
};

const obtenerPermutasValidadasPorUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    res.status(200).json({ err: false, result: await permutaService.obtenerPermutasValidadasPorUsuario(uvus)});
  } catch (err) {
    console.error("api obtenerPermutasValidadasPorUsuario ha tenido una excepción:", err);
    res.status(500).json({ err: true, message: "Error interno en obtenerPermutasValidadasPorUsuario", details: err.message});
  }
};

const obtenerPermutasAgrupadasPorUsuario = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    res.status(200).json({ err: false, result: await permutaService.obtenerPermutasAgrupadasPorUsuario(uvus)});
  } catch (err) {
    console.error("api obtenerPermutasAgrupadasPorUsuario ha tenido una excepción:", err);
    res.status(500).json({ err: true, message: "Error interno en obtenerPermutasAgrupadasPorUsuario", details: err.message });
  }
};

const actualizarVigenciaPermutas = async (req, res) => {
    try {
        if (!req.session.user) {
            return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
        }
        const uvus = req.session.user.nombre_usuario;
        const result1 = await permutaService.actualizarLaVigenciaPermuta();
        const result2 = await permutaService.actualizarLaVigenciaPermutas();
        const result3 = await solicitudPermutaService.actualizarLaVigenciaSolicitud();
        res.status(200).json({ err: false, result: [result1, result2, result3] });
    } catch (err) {
        console.error("api actualizarVigenciaPermutasYSolicitudes ha tenido una excepción:", err);
        res.status(500).json({ err: true, message: "Error interno en actualizarVigenciaPermutasYSolicitudes", details: err.message });
    }
};

export default {
    listarPermutas,
    aceptarPermuta,
    rechazarSolicitudPermuta,
    misPermutasPropuestas,
    misPermutasPropuestasPorMi,
    obtenerPermutasValidadasPorUsuario,
    obtenerPermutasAgrupadasPorUsuario,
    generarBorradorPermutas,
    firmarPermuta,
    validarPermuta,
    actualizarVigenciaPermutas
}