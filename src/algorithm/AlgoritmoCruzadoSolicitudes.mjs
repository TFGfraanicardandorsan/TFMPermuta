const compararIds = (a, b) => String(a).localeCompare(String(b), "es", { numeric: true });

/**
 * Calcula intercambios recíprocos. Una arista entre dos estudiantes contiene
 * todas las asignaturas en las que cada uno desea el grupo actual del otro.
 *
 * La solución maximiza, por este orden: asignaturas resueltas y estudiantes
 * emparejados. Los componentes grandes usan una aproximación determinista para
 * evitar un coste exponencial incontrolado.
 */
class PermutaMatching {
  constructor(solicitudes = [], { limiteComponenteExacto = 24 } = {}) {
    this.solicitudes = solicitudes;
    this.limiteComponenteExacto = limiteComponenteExacto;
    this.aristas = [];
  }

  construirGrafo() {
    const porAsignaturaYGrupo = new Map();
    const solicitudesUnicas = new Map();

    for (const solicitud of this.solicitudes) {
      const estudianteOriginal = solicitud.estudianteId ?? solicitud.estudiante_id;
      const asignatura = solicitud.asignatura;
      const grupoActual = solicitud.grupoActual ?? solicitud.grupo_actual;
      const grupoDeseado = solicitud.grupoDeseado ?? solicitud.grupo_deseado;
      if ([estudianteOriginal, asignatura, grupoActual, grupoDeseado].some(valor => valor == null)) continue;
      const estudianteId = String(estudianteOriginal);
      if (String(grupoActual) === String(grupoDeseado)) continue;

      const clave = `${estudianteId}|${asignatura}|${grupoActual}|${grupoDeseado}`;
      solicitudesUnicas.set(clave, { estudianteId, asignatura, grupoActual, grupoDeseado });

      const indice = `${asignatura}|${grupoActual}`;
      if (!porAsignaturaYGrupo.has(indice)) porAsignaturaYGrupo.set(indice, new Set());
      porAsignaturaYGrupo.get(indice).add(estudianteId);
    }

    const aristas = new Map();
    for (const solicitud of solicitudesUnicas.values()) {
      const candidatos = porAsignaturaYGrupo.get(`${solicitud.asignatura}|${solicitud.grupoDeseado}`) ?? [];
      for (const candidatoId of candidatos) {
        if (String(solicitud.estudianteId) === candidatoId) continue;
        const reciproca = `${candidatoId}|${solicitud.asignatura}|${solicitud.grupoDeseado}|${solicitud.grupoActual}`;
        if (!solicitudesUnicas.has(reciproca)) continue;

        const ids = [solicitud.estudianteId, candidatoId].sort(compararIds);
        const claveArista = `${ids[0]}|${ids[1]}`;
        if (!aristas.has(claveArista)) {
          aristas.set(claveArista, { estudiante1: ids[0], estudiante2: ids[1], asignaturas: new Set() });
        }
        aristas.get(claveArista).asignaturas.add(solicitud.asignatura);
      }
    }

    this.aristas = [...aristas.values()]
      .map(arista => ({ ...arista, asignaturas: [...arista.asignaturas].sort(compararIds) }))
      .sort((a, b) => b.asignaturas.length - a.asignaturas.length
        || compararIds(a.estudiante1, b.estudiante1)
        || compararIds(a.estudiante2, b.estudiante2));
    return this;
  }

  emparejar() {
    if (!this.aristas.length) this.construirGrafo();
    const pendientes = new Set(this.aristas.flatMap(a => [String(a.estudiante1), String(a.estudiante2)]));
    const resultado = [];

    while (pendientes.size) {
      const inicio = pendientes.values().next().value;
      const componente = new Set([inicio]);
      const cola = [inicio];
      while (cola.length) {
        const actual = cola.pop();
        for (const arista of this.aristas) {
          const a = String(arista.estudiante1);
          const b = String(arista.estudiante2);
          if (a !== actual && b !== actual) continue;
          const vecino = a === actual ? b : a;
          if (!componente.has(vecino)) { componente.add(vecino); cola.push(vecino); }
        }
      }
      componente.forEach(id => pendientes.delete(id));
      const aristas = this.aristas.filter(a => componente.has(String(a.estudiante1)) && componente.has(String(a.estudiante2)));
      resultado.push(...(componente.size <= this.limiteComponenteExacto
        ? this.#resolverExacto([...componente], aristas)
        : this.#resolverVoraz(aristas)));
    }
    return resultado;
  }

  #resolverExacto(vertices, aristas) {
    const indice = new Map(vertices.map((id, i) => [id, i]));
    const incidentes = vertices.map(() => []);
    aristas.forEach(arista => {
      const a = indice.get(String(arista.estudiante1));
      const b = indice.get(String(arista.estudiante2));
      incidentes[a].push({ arista, vecino: b });
      incidentes[b].push({ arista, vecino: a });
    });
    const memo = new Map();
    const mejor = (x, y) => x.peso !== y.peso ? (x.peso > y.peso ? x : y)
      : x.pares !== y.pares ? (x.pares > y.pares ? x : y) : x;
    const resolver = mascara => {
      if (mascara === 0n) return { peso: 0, pares: 0, aristas: [] };
      const clave = mascara.toString();
      if (memo.has(clave)) return memo.get(clave);
      let i = 0;
      while ((mascara & (1n << BigInt(i))) === 0n) i++;
      const sinI = mascara & ~(1n << BigInt(i));
      let solucion = resolver(sinI);
      for (const { arista, vecino } of incidentes[i]) {
        const bitVecino = 1n << BigInt(vecino);
        if ((sinI & bitVecino) === 0n) continue;
        const resto = resolver(sinI & ~bitVecino);
        solucion = mejor(solucion, {
          peso: resto.peso + arista.asignaturas.length,
          pares: resto.pares + 1,
          aristas: [arista, ...resto.aristas]
        });
      }
      memo.set(clave, solucion);
      return solucion;
    };
    return resolver((1n << BigInt(vertices.length)) - 1n).aristas;
  }

  #resolverVoraz(aristas) {
    const usados = new Set();
    return aristas.filter(arista => {
      const a = String(arista.estudiante1);
      const b = String(arista.estudiante2);
      if (usados.has(a) || usados.has(b)) return false;
      usados.add(a); usados.add(b);
      return true;
    });
  }
}

export default PermutaMatching;
