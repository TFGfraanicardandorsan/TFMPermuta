const compararIds = (a, b) => String(a).localeCompare(String(b), "es", { numeric: true });

/**
 * Calcula intercambios recíprocos. Una arista entre dos estudiantes contiene
 * todas las asignaturas en las que cada uno desea el grupo actual del otro.
 *
 * La solución maximiza las asignaturas resueltas respetando los bloques.
 * Los componentes grandes usan una aproximación determinista para
 * evitar un coste exponencial incontrolado.
 */
class PermutaMatching {
  constructor(solicitudes = [], { limiteComponenteExacto = 24 } = {}) {
    this.solicitudes = solicitudes;
    this.limiteComponenteExacto = limiteComponenteExacto;
    this.aristas = [];
    this.bloques = new Map();
  }

  construirGrafo() {
    this.bloques.clear();
    const porAsignaturaYGrupo = new Map();
    const solicitudesUnicas = new Map();

    for (const solicitud of this.solicitudes) {
      const estudianteOriginal = solicitud.estudianteId ?? solicitud.estudiante_id;
      const asignatura = solicitud.asignatura;
      const grupoActual = solicitud.grupoActual ?? solicitud.grupo_actual;
      const grupoDeseado = solicitud.grupoDeseado ?? solicitud.grupo_deseado;
      if ([estudianteOriginal, asignatura, grupoActual, grupoDeseado].some(valor => valor == null)) continue;
      const estudianteId = String(estudianteOriginal);
      if (solicitud.bloque_id) {
        const claveBloque = estudianteId + '|' + solicitud.bloque_id;
        if (!this.bloques.has(claveBloque)) this.bloques.set(claveBloque, { estudianteId, asignaturas: new Set() });
        const bloque = this.bloques.get(claveBloque);
        // La lista completa procede de BD, incluso si una solicitud no es elegible.
        for (const id of solicitud.asignaturas_bloque ?? [asignatura]) bloque.asignaturas.add(String(id));
      }
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

  // Cada candidato es indivisible; los conflictos son por alumno/asignatura,
  // no por alumno, de modo que cada curso puede resolverse con otra persona.
  crearCandidatos() {
    const candidatos = [];
    for (const arista of this.aristas) {
      const disponibles = new Map(arista.asignaturas.map(id => [String(id), id]));
      const bloques = [...this.bloques.values()].filter(b =>
        b.estudianteId === arista.estudiante1 || b.estudianteId === arista.estudiante2);
      const vistos = new Set();
      for (const inicio of disponibles.keys()) {
        if (vistos.has(inicio)) continue;
        const requeridas = new Set([inicio]);
        let ampliado = true;
        while (ampliado) {
          ampliado = false;
          for (const bloque of bloques) {
            if (![...bloque.asignaturas].some(id => requeridas.has(id))) continue;
            for (const id of bloque.asignaturas) {
              if (!requeridas.has(id)) { requeridas.add(id); ampliado = true; }
            }
          }
        }
        requeridas.forEach(id => vistos.add(id));
        if ([...requeridas].some(id => !disponibles.has(id))) continue;
        const asignaturas = [...requeridas].map(id => disponibles.get(id)).sort(compararIds);
        candidatos.push({ ...arista, asignaturas,
          recursos: new Set(asignaturas.flatMap(id => [arista.estudiante1 + '|' + id, arista.estudiante2 + '|' + id])) });
      }
    }
    return candidatos.sort((a,b) => b.asignaturas.length - a.asignaturas.length
      || compararIds(a.estudiante1,b.estudiante1) || compararIds(a.estudiante2,b.estudiante2)
      || compararIds(a.asignaturas[0],b.asignaturas[0]));
  }

  emparejar() {
    if (!this.aristas.length) this.construirGrafo();
    const candidatos = this.crearCandidatos();
    const porRecurso = new Map();
    candidatos.forEach((c,i) => c.recursos.forEach(r => {
      if (!porRecurso.has(r)) porRecurso.set(r, []);
      porRecurso.get(r).push(i);
    }));
    const pendientes = new Set(candidatos.map((_,i) => i));
    const elegidos = [];
    while (pendientes.size) {
      const cola = [pendientes.values().next().value];
      const componente = new Set(cola);
      while (cola.length) {
        const i = cola.pop();
        for (const recurso of candidatos[i].recursos) {
          for (const vecino of porRecurso.get(recurso)) {
            if (!componente.has(vecino)) { componente.add(vecino); cola.push(vecino); }
          }
        }
      }
      componente.forEach(i => pendientes.delete(i));
      const lista = [...componente].sort((a,b) => a-b).map(i => candidatos[i]);
      elegidos.push(...(lista.length <= this.limiteComponenteExacto
        ? this.#resolverExacto(lista) : this.#resolverVoraz(lista)));
    }
    const parejas = new Map();
    for (const candidato of elegidos) {
      const clave = candidato.estudiante1 + '|' + candidato.estudiante2;
      if (!parejas.has(clave)) parejas.set(clave, {
        estudiante1: candidato.estudiante1, estudiante2: candidato.estudiante2, asignaturas: [] });
      parejas.get(clave).asignaturas.push(...candidato.asignaturas);
    }
    return [...parejas.values()].map(p => ({ ...p, asignaturas: p.asignaturas.sort(compararIds) }))
      .sort((a,b) => compararIds(a.estudiante1,b.estudiante1) || compararIds(a.estudiante2,b.estudiante2));
  }

  #resolverExacto(candidatos) {
    const conflictos = candidatos.map(a => candidatos.reduce((mask,b,i) =>
      [...a.recursos].some(r => b.recursos.has(r)) ? mask | (1n << BigInt(i)) : mask, 0n));
    const memo = new Map();
    const resolver = mask => {
      if (!mask) return { peso: 0, lista: [] };
      if (memo.has(mask)) return memo.get(mask);
      let i = 0;
      while (!(mask & (1n << BigInt(i)))) i++;
      const sin = resolver(mask & ~(1n << BigInt(i)));
      const resto = resolver(mask & ~conflictos[i]);
      const con = { peso: resto.peso + candidatos[i].asignaturas.length, lista: [candidatos[i], ...resto.lista] };
      const mejor = con.peso >= sin.peso ? con : sin;
      memo.set(mask, mejor);
      return mejor;
    };
    return resolver((1n << BigInt(candidatos.length)) - 1n).lista;
  }

  #resolverVoraz(candidatos) {
    const usados = new Set();
    return candidatos.filter(c => {
      if ([...c.recursos].some(r => usados.has(r))) return false;
      c.recursos.forEach(r => usados.add(r));
      return true;
    });
  }
}

export default PermutaMatching;
