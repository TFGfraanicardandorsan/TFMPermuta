import plazosService from "../services/plazosService.mjs";
import GenericValidators from "../utils/genericValidators.mjs";

const { isDate } = GenericValidators;

const insertarPlazoPermuta = async (req, res) => {
  try {
    if (!req.session.user) {
      return res.status(401).json({ err: true, message: "No hay usuario en la sesión" });
    }
    const uvus = req.session.user.nombre_usuario;
    const { inicio_primer_periodo, fin_primer_periodo, inicio_segundo_periodo, fin_segundo_periodo } = req.body;

    // Validaciones básicas (puedes mejorarlas según tus necesidades)
    if (!inicio_primer_periodo || !fin_primer_periodo || !inicio_segundo_periodo || !fin_segundo_periodo) {
      return res.status(400).json({ err: true, message: "Faltan datos de los periodos" });
    }

    const validarFechas = [
      { valor: inicio_primer_periodo, nombre: "Inicio primer periodo" },
      { valor: fin_primer_periodo, nombre: "Fin primer periodo" },
      { valor: inicio_segundo_periodo, nombre: "Inicio segundo periodo" },
      { valor: fin_segundo_periodo, nombre: "Fin segundo periodo" },
    ];

    for (const campo of validarFechas) {
      const validacion = isDate(campo.valor, campo.nombre);
      if (!validacion.valido) {
        return res.status(400).json({ err: true, message: validacion.mensaje });
      }
    }

    const result = await plazosService.insertarPlazoPermuta({
      inicio_primer_periodo,
      fin_primer_periodo,
      inicio_segundo_periodo,
      fin_segundo_periodo,
      uvus
    });

    res.status(201).json({ err: false, result });
  } catch (error) {
    console.error("Error en insertarPlazoPermuta:", error);
    res.status(500).json({ err: true, message: "Error al insertar el plazo de permuta" });
  }
};

export default {
  insertarPlazoPermuta
};