import database from "../config/database.mjs";

class ValoracionAsignaturaValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = "ValoracionAsignaturaValidationError";
    this.statusCode = 400;
  }
}

class ValoracionAsignaturaService {
  async obtenerPreguntasValoracionAsignatura() {
    const conexion = await database.connectPostgreSQL();
    try {
      const preguntas = await this.obtenerPreguntasActivas(conexion);
      return preguntas.map((pregunta) => this.formatearPregunta(pregunta));
    } finally {
      await conexion.end();
    }
  }

  async guardarValoracionAsignatura(uvus, asignaturaCodigo, respuestas, opciones = {}) {
    const conexion = opciones.conexion || await database.connectPostgreSQL();
    const conexionPropia = !opciones.conexion;

    try {
      if (conexionPropia) {
        await conexion.query("BEGIN");
      }

      const codigoAsignatura = this.validarCodigoAsignatura(asignaturaCodigo);
      const contexto = await this.obtenerContextoValoracion(conexion, uvus, codigoAsignatura);
      const preguntas = await this.obtenerPreguntasActivas(conexion);
      const respuestasNormalizadas = this.normalizarRespuestas(respuestas, preguntas);

      const values = respuestasNormalizadas.flatMap((respuesta) => [
        contexto.usuario_id,
        contexto.asignatura_id,
        respuesta.preguntaId,
        respuesta.respuestaBoolean,
        respuesta.respuestaNumero,
        respuesta.respuestaTexto,
      ]);

      const placeholders = respuestasNormalizadas
        .map((_, index) => `($${index * 6 + 1}, $${index * 6 + 2}, $${index * 6 + 3}, $${index * 6 + 4}, $${index * 6 + 5}, $${index * 6 + 6})`)
        .join(", ");

      await conexion.query({
        text: `
          INSERT INTO respuesta_valoracion_asignatura (
            usuario_id_fk,
            asignatura_id_fk,
            pregunta_id_fk,
            respuesta_boolean,
            respuesta_numero,
            respuesta_texto
          )
          VALUES ${placeholders}
          ON CONFLICT (usuario_id_fk, asignatura_id_fk, pregunta_id_fk)
          DO UPDATE SET
            respuesta_boolean = EXCLUDED.respuesta_boolean,
            respuesta_numero = EXCLUDED.respuesta_numero,
            respuesta_texto = EXCLUDED.respuesta_texto,
            fecha_respuesta = NOW()
        `,
        values,
      });

      if (conexionPropia) {
        await conexion.query("COMMIT");
      }

      return {
        mensaje: "Valoracion de asignatura guardada correctamente",
        respuestasGuardadas: respuestasNormalizadas.length,
        asignatura: {
          codigo: contexto.asignatura_codigo,
          nombre: contexto.asignatura_nombre,
          siglas: contexto.asignatura_siglas,
        },
      };
    } catch (err) {
      if (conexionPropia) {
        await conexion.query("ROLLBACK").catch(() => {});
      }
      throw err;
    } finally {
      if (conexionPropia) {
        await conexion.end();
      }
    }
  }

  async obtenerEstadisticasValoracionAsignaturas(asignaturaCodigo = null) {
    const conexion = await database.connectPostgreSQL();
    try {
      const codigoAsignatura = asignaturaCodigo === null || asignaturaCodigo === undefined || asignaturaCodigo === ""
        ? null
        : this.validarCodigoAsignatura(asignaturaCodigo);

      const query = codigoAsignatura === null
        ? {
            text: `
              SELECT
                a.codigo AS asignatura_codigo,
                a.nombre AS asignatura_nombre,
                a.siglas AS asignatura_siglas,
                p.id AS pregunta_id,
                p.codigo AS pregunta_codigo,
                p.bloque,
                p.bloque_nombre,
                p.enunciado,
                p.tipo_respuesta,
                p.orden,
                r.usuario_id_fk,
                r.respuesta_boolean,
                r.respuesta_numero,
                r.respuesta_texto,
                r.fecha_respuesta
              FROM asignatura a
              CROSS JOIN pregunta_valoracion_asignatura p
              LEFT JOIN respuesta_valoracion_asignatura r
                ON r.asignatura_id_fk = a.id
                AND r.pregunta_id_fk = p.id
              WHERE p.activa = TRUE
              ORDER BY a.codigo, p.orden, r.fecha_respuesta DESC
            `,
            values: [],
          }
        : {
            text: `
              SELECT
                a.codigo AS asignatura_codigo,
                a.nombre AS asignatura_nombre,
                a.siglas AS asignatura_siglas,
                p.id AS pregunta_id,
                p.codigo AS pregunta_codigo,
                p.bloque,
                p.bloque_nombre,
                p.enunciado,
                p.tipo_respuesta,
                p.orden,
                r.usuario_id_fk,
                r.respuesta_boolean,
                r.respuesta_numero,
                r.respuesta_texto,
                r.fecha_respuesta
              FROM asignatura a
              CROSS JOIN pregunta_valoracion_asignatura p
              LEFT JOIN respuesta_valoracion_asignatura r
                ON r.asignatura_id_fk = a.id
                AND r.pregunta_id_fk = p.id
              WHERE p.activa = TRUE
                AND a.codigo = $1
              ORDER BY a.codigo, p.orden, r.fecha_respuesta DESC
            `,
            values: [codigoAsignatura],
          };

      const res = await conexion.query(query);
      return this.formatearEstadisticas(res.rows);
    } finally {
      await conexion.end();
    }
  }

  async obtenerContextoValoracion(conexion, uvus, asignaturaCodigo) {
    const res = await conexion.query({
      text: `
        SELECT
          u.id AS usuario_id,
          a.id AS asignatura_id,
          a.codigo AS asignatura_codigo,
          a.nombre AS asignatura_nombre,
          a.siglas AS asignatura_siglas
        FROM usuario u
        CROSS JOIN asignatura a
        WHERE u.nombre_usuario = $1
          AND a.codigo = $2
      `,
      values: [uvus, asignaturaCodigo],
    });

    if (res.rows.length === 0) {
      throw new ValoracionAsignaturaValidationError("Usuario o asignatura no encontrados");
    }

    return res.rows[0];
  }

  async obtenerPreguntasActivas(conexion) {
    const res = await conexion.query({
      text: `
        SELECT id, codigo, bloque, bloque_nombre, enunciado, tipo_respuesta, condicion, orden
        FROM pregunta_valoracion_asignatura
        WHERE activa = TRUE
        ORDER BY orden
      `,
      values: [],
    });
    return res.rows;
  }

  normalizarRespuestas(respuestas, preguntas) {
    if (!Array.isArray(respuestas) || respuestas.length === 0) {
      throw new ValoracionAsignaturaValidationError("Las respuestas deben enviarse como un arreglo no vacío.");
    }

    const preguntasPorId = new Map(preguntas.map((pregunta) => [Number(pregunta.id), pregunta]));
    const idsUsados = new Set();

    return respuestas.map((respuesta) => {
      if (!respuesta || typeof respuesta !== "object") {
        throw new ValoracionAsignaturaValidationError("Cada respuesta debe ser un objeto válido.");
      }

      const preguntaIdRaw = respuesta.preguntaId ?? respuesta.pregunta_id ?? respuesta.idPregunta;
      const preguntaId = Number(preguntaIdRaw);
      if (!Number.isInteger(preguntaId)) {
        throw new ValoracionAsignaturaValidationError("Cada respuesta debe incluir un preguntaId válido.");
      }
      if (idsUsados.has(preguntaId)) {
        throw new ValoracionAsignaturaValidationError(`La pregunta ${preguntaId} está repetida en las respuestas`);
      }

      const pregunta = preguntasPorId.get(preguntaId);
      if (!pregunta) {
        throw new ValoracionAsignaturaValidationError(`La pregunta ${preguntaId} no existe o no está activa.`);
      }

      idsUsados.add(preguntaId);
      const valor = this.obtenerValorRespuesta(respuesta);
      return {
        preguntaId,
        ...this.normalizarValorRespuesta(pregunta, valor),
      };
    });
  }

  obtenerValorRespuesta(respuesta) {
    const campos = [
      "respuesta",
      "valor",
      "respuestaBoolean",
      "respuesta_boolean",
      "respuestaNumero",
      "respuesta_numero",
      "respuestaTexto",
      "respuesta_texto",
    ];

    for (const campo of campos) {
      if (Object.prototype.hasOwnProperty.call(respuesta, campo)) {
        return respuesta[campo];
      }
    }

    throw new ValoracionAsignaturaValidationError("Cada respuesta debe incluir un valor.");
  }

  normalizarValorRespuesta(pregunta, valor) {
    if (pregunta.tipo_respuesta === "si_no") {
      return {
        respuestaBoolean: this.normalizarBooleano(valor, pregunta.id),
        respuestaNumero: null,
        respuestaTexto: null,
      };
    }

    if (pregunta.tipo_respuesta === "texto") {
      return {
        respuestaBoolean: null,
        respuestaNumero: null,
        respuestaTexto: this.normalizarTexto(valor, pregunta.id),
      };
    }

    if (pregunta.tipo_respuesta === "escala_1_10") {
      return {
        respuestaBoolean: null,
        respuestaNumero: this.normalizarEscala(valor, pregunta.id),
        respuestaTexto: null,
      };
    }

    throw new ValoracionAsignaturaValidationError(`Tipo de respuesta no soportado para la pregunta ${pregunta.id}`);
  }

  normalizarBooleano(valor, preguntaId) {
    if (typeof valor === "boolean") {
      return valor;
    }

    if (typeof valor === "number") {
      if (valor === 1) return true;
      if (valor === 0) return false;
    }

    if (typeof valor === "string") {
      const valorNormalizado = valor
        .trim()
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

      if (["si", "s", "true", "1"].includes(valorNormalizado)) return true;
      if (["no", "n", "false", "0"].includes(valorNormalizado)) return false;
    }

    throw new ValoracionAsignaturaValidationError(`La respuesta de la pregunta ${preguntaId} debe ser sí/no.`);
  }

  normalizarTexto(valor, preguntaId) {
    if (typeof valor !== "string") {
      throw new ValoracionAsignaturaValidationError(`La respuesta de la pregunta ${preguntaId} debe ser un texto.`);
    }

    const texto = valor.trim();
    if (texto.length === 0) {
      throw new ValoracionAsignaturaValidationError(`La respuesta de la pregunta ${preguntaId} no puede estar vacía.`);
    }

    if (texto.length > 2000) {
      throw new ValoracionAsignaturaValidationError(`La respuesta de la pregunta ${preguntaId} no puede superar los 2000 caracteres.`);
    }

    return texto;
  }

  normalizarEscala(valor, preguntaId) {
    const numero = typeof valor === "number" ? valor : Number.parseFloat(valor);
    if (!Number.isFinite(numero) || numero < 1 || numero > 10) {
      throw new ValoracionAsignaturaValidationError(`La respuesta de la pregunta ${preguntaId} debe estar entre 1 y 10.`);
    }
    return numero;
  }

  validarCodigoAsignatura(asignaturaCodigo) {
    const codigo = Number(asignaturaCodigo);
    if (!Number.isInteger(codigo)) {
      throw new ValoracionAsignaturaValidationError("El código de la asignatura debe ser un entero.");
    }
    return codigo;
  }

  formatearPregunta(pregunta) {
    return {
      id: Number(pregunta.id),
      codigo: pregunta.codigo,
      bloque: Number(pregunta.bloque),
      bloqueNombre: pregunta.bloque_nombre,
      enunciado: pregunta.enunciado,
      tipoRespuesta: pregunta.tipo_respuesta,
      condicion: pregunta.condicion,
      orden: Number(pregunta.orden),
    };
  }

  formatearEstadisticas(rows) {
    const asignaturas = new Map();

    for (const row of rows) {
      const codigoAsignatura = Number(row.asignatura_codigo);
      if (!asignaturas.has(codigoAsignatura)) {
        asignaturas.set(codigoAsignatura, {
          codigo: codigoAsignatura,
          nombre: row.asignatura_nombre,
          siglas: row.asignatura_siglas,
          totalValoraciones: 0,
          bloques: [],
          _usuarios: new Set(),
          _bloques: new Map(),
        });
      }

      const asignatura = asignaturas.get(codigoAsignatura);
      if (row.usuario_id_fk !== null && row.usuario_id_fk !== undefined) {
        asignatura._usuarios.add(Number(row.usuario_id_fk));
      }

      const bloqueId = Number(row.bloque);
      if (!asignatura._bloques.has(bloqueId)) {
        const bloque = {
          bloque: bloqueId,
          bloqueNombre: row.bloque_nombre,
          preguntas: [],
          _preguntas: new Map(),
        };
        asignatura._bloques.set(bloqueId, bloque);
        asignatura.bloques.push(bloque);
      }

      const bloque = asignatura._bloques.get(bloqueId);
      const preguntaId = Number(row.pregunta_id);
      if (!bloque._preguntas.has(preguntaId)) {
        const pregunta = {
          id: preguntaId,
          codigo: row.pregunta_codigo,
          enunciado: row.enunciado,
          tipoRespuesta: row.tipo_respuesta,
          totalRespuestas: 0,
          _si: 0,
          _no: 0,
          _numeros: [],
          _textos: [],
        };
        bloque._preguntas.set(preguntaId, pregunta);
        bloque.preguntas.push(pregunta);
      }

      if (row.usuario_id_fk === null || row.usuario_id_fk === undefined) {
        continue;
      }

      const pregunta = bloque._preguntas.get(preguntaId);
      pregunta.totalRespuestas += 1;

      if (row.tipo_respuesta === "si_no") {
        if (row.respuesta_boolean === true) {
          pregunta._si += 1;
        } else {
          pregunta._no += 1;
        }
      }

      if (row.tipo_respuesta === "escala_1_10") {
        pregunta._numeros.push(Number(row.respuesta_numero));
      }

      if (row.tipo_respuesta === "texto" && row.respuesta_texto) {
        pregunta._textos.push({
          respuesta: row.respuesta_texto,
          fechaRespuesta: row.fecha_respuesta,
        });
      }
    }

    return Array.from(asignaturas.values()).map((asignatura) => {
      asignatura.totalValoraciones = asignatura._usuarios.size;
      delete asignatura._usuarios;
      delete asignatura._bloques;

      asignatura.bloques = asignatura.bloques.map((bloque) => {
        delete bloque._preguntas;
        bloque.preguntas = bloque.preguntas.map((pregunta) => this.formatearEstadisticaPregunta(pregunta));
        return bloque;
      });

      return asignatura;
    });
  }

  formatearEstadisticaPregunta(pregunta) {
    const estadistica = {
      id: pregunta.id,
      codigo: pregunta.codigo,
      enunciado: pregunta.enunciado,
      tipoRespuesta: pregunta.tipoRespuesta,
      totalRespuestas: pregunta.totalRespuestas,
    };

    if (pregunta.tipoRespuesta === "si_no") {
      estadistica.estadisticas = {
        si: pregunta._si,
        no: pregunta._no,
        porcentajeSi: this.calcularPorcentaje(pregunta._si, pregunta.totalRespuestas),
        porcentajeNo: this.calcularPorcentaje(pregunta._no, pregunta.totalRespuestas),
      };
    }

    if (pregunta.tipoRespuesta === "escala_1_10") {
      estadistica.estadisticas = {
        media: pregunta._numeros.length > 0
          ? Number((pregunta._numeros.reduce((total, numero) => total + numero, 0) / pregunta._numeros.length).toFixed(2))
          : null,
        maximo: pregunta._numeros.length > 0 ? Math.max(...pregunta._numeros) : null,
        minimo: pregunta._numeros.length > 0 ? Math.min(...pregunta._numeros) : null,
      };
    }

    if (pregunta.tipoRespuesta === "texto") {
      estadistica.estadisticas = {
        respuestas: pregunta._textos,
      };
    }

    return estadistica;
  }

  calcularPorcentaje(valor, total) {
    if (total === 0) {
      return 0;
    }
    return Number(((valor / total) * 100).toFixed(2));
  }
}

const valoracionAsignaturaService = new ValoracionAsignaturaService();
export default valoracionAsignaturaService;
