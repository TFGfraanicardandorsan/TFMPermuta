const compararIds = (a, b) => String(a).localeCompare(String(b), "es", { numeric: true });

/**
 * Calcula intercambios recíprocos. Una arista entre dos estudiantes contiene
 * todas las asignaturas en las que cada uno desea el grupo actual del otro.
 *
 * Objetivo lexicográfico:
 *   1. Maximizar el número de asignaturas resueltas (respetando los bloques).
 *   2. Entre las soluciones con ese máximo, minimizar el número de parejas
 *      distintas, porque se genera un documento por cada pareja.
 *
 * Se codifica como un único valor, M · asignaturas − parejas, con M mayor que
 * cualquier número posible de parejas: una asignatura más siempre compensa
 * cualquier ahorro de documentos.
 *
 * Cada componente independiente se resuelve con ramificación y poda exacta
 * (cotas por asignatura y por alumno, y ruptura de simetrías entre alumnos con
 * solicitudes idénticas). `limiteTrabajo` es un presupuesto global y
 * determinista (≈ operaciones elementales). Al agotarse, la rama en curso se
 * completa de forma voraz y `estadisticas.optimoGarantizado` pasa a false; en
 * ese caso `cotaAsignaturas` y `cotaMinimaDocumentos` acotan lo que se pierde,
 * y una fase de mejora (`limiteMejora`) vuelve a resolver de forma exacta
 * vecindarios de la solución mientras encuentre mejoras.
 *
 * `parejasAbiertas` son parejas que ya tienen permutas pendientes de
 * documento: añadirles asignaturas no genera un documento nuevo, así que el
 * algoritmo las considera abiertas desde el principio.
 */
const clavePareja = (a, b) => [String(a), String(b)].sort(compararIds).join('|');

class PermutaMatching {
  constructor(solicitudes = [], { limiteTrabajo = 1.5e8, limiteMejora = 1.5e8, tamanoVecindario = 16,
    parejasAbiertas = [] } = {}) {
    this.tamanoVecindario = tamanoVecindario;
    this.solicitudes = solicitudes;
    this.limiteTrabajo = limiteTrabajo;
    this.limiteMejora = limiteMejora;
    this.parejasAbiertas = new Set([...parejasAbiertas].map(par =>
      Array.isArray(par) ? clavePareja(par[0], par[1]) : clavePareja(...String(par).split('|'))));
    this.aristas = [];
    this.bloques = new Map();
    this.grupos = new Map();
    this.firmas = new Map();
    this.grafoConstruido = false;
    this.estadisticas = null;
  }

  construirGrafo() {
    this.bloques.clear();
    this.grupos.clear();
    this.firmas.clear();
    const porAsignaturaYGrupo = new Map();
    const solicitudesUnicas = new Map();
    const rasgos = new Map();
    const rasgo = (estudianteId, texto) => {
      if (!rasgos.has(estudianteId)) rasgos.set(estudianteId, new Set());
      rasgos.get(estudianteId).add(texto);
    };

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
      this.grupos.set(`${estudianteId}|${asignatura}`, String(grupoActual));
      rasgo(estudianteId, `s:${asignatura}|${grupoActual}|${grupoDeseado}`);

      const clave = `${estudianteId}|${asignatura}|${grupoActual}|${grupoDeseado}`;
      solicitudesUnicas.set(clave, { estudianteId, asignatura, grupoActual, grupoDeseado });

      const indice = `${asignatura}|${grupoActual}`;
      if (!porAsignaturaYGrupo.has(indice)) porAsignaturaYGrupo.set(indice, new Set());
      porAsignaturaYGrupo.get(indice).add(estudianteId);
    }

    // Dos alumnos con la misma firma (mismas solicitudes y mismos bloques) son
    // intercambiables; el solver lo aprovecha para no explorar ramas simétricas.
    for (const bloque of this.bloques.values()) {
      rasgo(bloque.estudianteId, 'b:' + [...bloque.asignaturas].sort(compararIds).join(','));
    }
    for (const [estudianteId, conjunto] of rasgos) {
      this.firmas.set(estudianteId, [...conjunto].sort().join(';'));
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
    this.grafoConstruido = true;
    return this;
  }

  // Cada candidato es indivisible; los conflictos son por alumno/asignatura,
  // no por alumno, de modo que cada curso puede resolverse con otra persona.
  crearCandidatos() {
    const candidatos = [];
    const bloquesPorEstudiante = new Map();
    for (const bloque of this.bloques.values()) {
      if (!bloquesPorEstudiante.has(bloque.estudianteId)) bloquesPorEstudiante.set(bloque.estudianteId, []);
      bloquesPorEstudiante.get(bloque.estudianteId).push(bloque);
    }
    for (const arista of this.aristas) {
      const disponibles = new Map(arista.asignaturas.map(id => [String(id), id]));
      const bloques = [
        ...(bloquesPorEstudiante.get(arista.estudiante1) ?? []),
        ...(bloquesPorEstudiante.get(arista.estudiante2) ?? []),
      ];
      const vistos = new Set();
      for (const inicio of disponibles.keys()) {
        if (vistos.has(inicio)) continue;
        // Cierre transitivo: un bloque de cualquiera de los dos arrastra todas
        // sus asignaturas, que deben resolverse con esta misma pareja.
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
    if (!this.grafoConstruido) this.construirGrafo();
    const candidatos = this.crearCandidatos();
    const elegidos = [];
    const busqueda = { usado: 0, limite: this.limiteTrabajo };
    const mejora = { usado: 0, limite: this.limiteMejora };
    const estadisticas = { componentes: 0, nodos: 0, optimoGarantizado: true,
      cotaAsignaturas: 0, cotaMinimaDocumentos: 0, mejorasLocales: 0 };
    const tocados = new Set([...this.parejasAbiertas].flatMap(par => par.split('|')));
    // De menor a mayor: el presupuesto es global y los pequeños quedan demostrados.
    const componentes = this.#componentes(candidatos).sort((a, b) => a.length - b.length);
    const pendientesDeMejora = [];
    for (const componente of componentes) {
      const resultado = this.#resolverComponente(componente, busqueda, tocados);
      estadisticas.componentes++;
      estadisticas.nodos += resultado.nodos;
      if (!resultado.optimo) {
        estadisticas.optimoGarantizado = false;
        pendientesDeMejora.push([componente, resultado]);
      } else {
        elegidos.push(...resultado.elegidos);
      }
      estadisticas.cotaAsignaturas += resultado.cotaAsignaturas;
      estadisticas.cotaMinimaDocumentos += resultado.cotaMinimaDocumentos;
    }
    for (const [componente, resultado] of pendientesDeMejora) {
      const mejorado = this.#mejorarComponente(componente, resultado.elegidos, mejora, tocados);
      estadisticas.mejorasLocales += mejorado.mejoras;
      elegidos.push(...mejorado.elegidos);
    }

    const parejas = new Map();
    for (const candidato of elegidos) {
      const clave = candidato.estudiante1 + '|' + candidato.estudiante2;
      if (!parejas.has(clave)) parejas.set(clave, {
        estudiante1: candidato.estudiante1, estudiante2: candidato.estudiante2, asignaturas: [] });
      parejas.get(clave).asignaturas.push(...candidato.asignaturas);
    }
    const resultado = [...parejas.values()].map(p => ({ ...p, asignaturas: p.asignaturas.sort(compararIds) }))
      .sort((a,b) => compararIds(a.estudiante1,b.estudiante1) || compararIds(a.estudiante2,b.estudiante2));
    this.estadisticas = {
      ...estadisticas,
      asignaturasResueltas: resultado.reduce((n, p) => n + p.asignaturas.length, 0),
      parejas: resultado.length,
      // Las parejas que ya tenían permutas pendientes comparten documento.
      documentos: resultado.filter(p => !this.parejasAbiertas.has(clavePareja(p.estudiante1, p.estudiante2))).length,
      trabajo: busqueda.usado + mejora.usado,
    };
    return resultado;
  }

  /**
   * Búsqueda de vecindario grande: libera las parejas de un grupo de alumnos
   * cercanos, mantiene fijo el resto y vuelve a resolver ese trozo de forma
   * exacta. Solo acepta cambios que mejoran (más asignaturas o menos parejas).
   */
  #mejorarComponente(candidatos, elegidosIniciales, presupuesto, tocadosExternos) {
    let tamano = this.tamanoVecindario;
    const clave = c => c.estudiante1 + '|' + c.estudiante2;
    const vecinos = new Map();
    for (const c of candidatos) {
      for (const [a, b] of [[c.estudiante1, c.estudiante2], [c.estudiante2, c.estudiante1]]) {
        if (!vecinos.has(a)) vecinos.set(a, new Set());
        vecinos.get(a).add(b);
      }
    }
    const alumnos = [...vecinos.keys()].sort(compararIds);
    let elegidos = [...elegidosIniciales];
    let mejoras = 0;
    // Vecindario adaptativo: si una vuelta completa no mejora, se amplía.
    let huboMejora = true;
    while (presupuesto.usado < presupuesto.limite) {
      if (!huboMejora) {
        if (tamano >= alumnos.length) break;
        tamano = Math.ceil(tamano * 1.5);
      }
      huboMejora = false;
      for (const semilla of alumnos) {
        if (presupuesto.usado >= presupuesto.limite) break;
        // Preparar el vecindario recorre el componente: también consume presupuesto.
        presupuesto.usado += 4 * (candidatos.length + elegidos.length);
        // Región: la semilla, sus compañeros actuales y, después, sus posibles compañeros.
        const companeros = new Map();
        for (const c of elegidos) {
          for (const [a, b] of [[c.estudiante1, c.estudiante2], [c.estudiante2, c.estudiante1]]) {
            if (!companeros.has(a)) companeros.set(a, new Set());
            companeros.get(a).add(b);
          }
        }
        const region = new Set([semilla]);
        const cola = [semilla];
        while (cola.length && region.size < tamano) {
          const actual = cola.shift();
          const siguientes = [...(companeros.get(actual) ?? []), ...[...vecinos.get(actual)].sort(compararIds)];
          for (const otro of siguientes) {
            if (region.size >= tamano) break;
            if (!region.has(otro)) { region.add(otro); cola.push(otro); }
          }
        }
        const dentro = c => region.has(c.estudiante1) && region.has(c.estudiante2);
        const fijos = elegidos.filter(c => !dentro(c));
        const liberados = elegidos.filter(dentro);
        const ocupados = new Set(fijos.flatMap(c => [...c.recursos]));
        const sub = candidatos.filter(c => dentro(c) && [...c.recursos].every(r => !ocupados.has(r)));
        if (!sub.length) continue;
        const tocados = new Set([...tocadosExternos, ...fijos.flatMap(c => [c.estudiante1, c.estudiante2])]);
        const local = { usado: 0, limite: Math.min(presupuesto.limite - presupuesto.usado, presupuesto.limite / 20) };
        const resultado = this.#resolverComponente(sub, local, tocados);
        presupuesto.usado += local.usado;
        const valorar = lista => [
          lista.reduce((n, c) => n + c.asignaturas.length, 0),
          new Set(lista.map(clave).filter(k => !this.parejasAbiertas.has(k))).size,
        ];
        const [asigAntes, parejasAntes] = valorar(liberados);
        const [asigDespues, parejasDespues] = valorar(resultado.elegidos);
        if (asigDespues > asigAntes || (asigDespues === asigAntes && parejasDespues < parejasAntes)) {
          elegidos = [...fijos, ...resultado.elegidos];
          mejoras++;
          huboMejora = true;
        }
      }
    }
    return { elegidos, mejoras };
  }

  // Dos candidatos dependen entre sí si comparten un recurso (alumno|asignatura)
  // o la misma pareja (comparten documento). Sin dependencia, se resuelven aparte.
  #componentes(candidatos) {
    const padre = candidatos.map((_, i) => i);
    const raiz = i => { while (padre[i] !== i) { padre[i] = padre[padre[i]]; i = padre[i]; } return i; };
    const primero = new Map();
    candidatos.forEach((c, i) => {
      for (const clave of [...c.recursos, 'par:' + c.estudiante1 + '|' + c.estudiante2]) {
        if (!primero.has(clave)) primero.set(clave, i);
        else padre[raiz(i)] = raiz(primero.get(clave));
      }
    });
    const grupos = new Map();
    candidatos.forEach((c, i) => {
      const r = raiz(i);
      if (!grupos.has(r)) grupos.set(r, []);
      grupos.get(r).push(c);
    });
    return [...grupos.values()];
  }

  #resolverComponente(candidatos, presupuesto, tocadosExternos = new Set()) {
    const C = candidatos.length;
    const indice = (mapa, clave) => {
      if (!mapa.has(clave)) mapa.set(clave, mapa.size);
      return mapa.get(clave);
    };
    const estudiantes = new Map();
    const recursos = new Map();
    const pares = new Map();
    const asignaturas = new Map();
    const clases = new Map();
    const plazas = new Map();
    const recursoEstudiante = [];
    const recursoAsignatura = [];
    const claseAsignatura = [];
    const plazaLado = [];
    const plazaEstudiante = [];
    const parEstudiantes = [];

    const paresPorEstudiante = [];
    const datos = candidatos.map(c => {
      const e1 = indice(estudiantes, c.estudiante1);
      const e2 = indice(estudiantes, c.estudiante2);
      const par = indice(pares, c.estudiante1 + '|' + c.estudiante2);
      if (!parEstudiantes[par]) {
        parEstudiantes[par] = [e1, e2];
        (paresPorEstudiante[e1] ??= []).push(par);
        (paresPorEstudiante[e2] ??= []).push(par);
      }
      const rec = [];
      const plazasCandidato = [];
      for (const id of c.asignaturas) {
        const a = indice(asignaturas, String(id));
        for (const [est, e] of [[c.estudiante1, e1], [c.estudiante2, e2]]) {
          const tamano = recursos.size;
          const r = indice(recursos, est + '|' + id);
          if (r === tamano) { recursoEstudiante[r] = e; recursoAsignatura[r] = a; }
          rec.push(r);
        }
        // Clase = {asignatura, grupoA, grupoB}: todo intercambio de la clase
        // pone en juego un alumno de cada uno de los dos grupos.
        const g1 = this.grupos.get(c.estudiante1 + '|' + id);
        const g2 = this.grupos.get(c.estudiante2 + '|' + id);
        const [ga, gb] = [g1, g2].sort();
        const tamanoClases = clases.size;
        const k = indice(clases, `${id}|${ga}|${gb}`);
        if (k === tamanoClases) claseAsignatura[k] = a;
        for (const [est, g] of [[c.estudiante1, g1], [c.estudiante2, g2]]) {
          const tamanoPlazas = plazas.size;
          const s = indice(plazas, `${k}|${est}`);
          if (s === tamanoPlazas) {
            plazaLado[s] = 2 * k + (g === ga ? 0 : 1);
            plazaEstudiante[s] = estudiantes.get(est);
          }
          plazasCandidato.push(s);
        }
      }
      return { rec, plazas: plazasCandidato, par, peso: c.asignaturas.length, e1, e2 };
    });

    const R = recursos.size;
    const P = pares.size;
    const A = asignaturas.size;
    const K = clases.size;
    const S = plazas.size;
    const E = estudiantes.size;
    const porRecurso = Array.from({ length: R }, () => []);
    datos.forEach((d, i) => d.rec.forEach(r => porRecurso[r].push(i)));
    const firma = [...estudiantes.keys()].map(id => this.firmas.get(id) ?? id);
    const claveAsignaturas = candidatos.map(c => c.asignaturas.join(','));

    // Estado de la búsqueda
    const bloqueos = new Int32Array(C);     // recursos no libres de cada candidato
    const toques = new Int32Array(E);       // recursos no libres de cada alumno
    const usosPar = new Int32Array(P);
    // Parejas con permutas pendientes: ya abiertas, no cuestan documento.
    for (const [par, p] of pares) if (this.parejasAbiertas.has(par)) usosPar[p] = 1;
    // Un alumno con compromisos previos ya no es intercambiable con otro idéntico.
    for (const [id, e] of estudiantes) if (tocadosExternos.has(id)) toques[e] = 1;
    // Memoria auxiliar reutilizada en cada nodo
    const opcionesRecurso = new Int32Array(R);
    const pesoPar = new Int32Array(P);
    const marcaPlaza = new Int32Array(S);
    const lado = new Int32Array(2 * K);
    const recursosAsignatura = new Int32Array(A);
    const coberturaAsignatura = new Int32Array(A);
    const capacidad = new Int32Array(E);
    const mejorPeso = new Int32Array(E);
    const forzadas = new Int32Array(E);
    const capacidadAbierta = new Int32Array(E);
    const ladoForzado = new Uint8Array(2 * K);
    const clasesActivas = new Int32Array(A);
    const claseUnica = new Int32Array(A);
    const cotaPorAsignatura = new Int32Array(A);
    const necesidad = new Int32Array(E);
    const enIndependiente = new Uint8Array(E);
    const ordenNecesidad = [];
    // Peso máximo de una pareja: suma de sus candidatos (asignaturas disjuntas).
    for (const d of datos) pesoPar[d.par] += d.peso;
    let maxPesoPar = 1;
    for (let p = 0; p < P; p++) maxPesoPar = Math.max(maxPesoPar, pesoPar[p]);
    const cubetasPar = new Int32Array(maxPesoPar + 1);
    const cubetasPlaza = new Int32Array(maxPesoPar + 1);

    // M supera el máximo de parejas posibles: una asignatura más pesa más que
    // cualquier cantidad de documentos ahorrados.
    const M = C + 1;
    const seleccion = [];
    let mejorValor = -Infinity;
    let mejorSeleccion = [];
    let nodos = 0;
    let trabajo = presupuesto.usado;
    let optimo = true;
    const limite = presupuesto.limite;
    const costeNodo = C + R + P + S + 1;

    const bloquear = r => {
      for (const c of porRecurso[r]) bloqueos[c]++;
      toques[recursoEstudiante[r]]++;
    };
    const desbloquear = r => {
      for (const c of porRecurso[r]) bloqueos[c]--;
      toques[recursoEstudiante[r]]--;
    };

    const cotaSuperior = (asignaturasActuales, parejasActuales) => {
      opcionesRecurso.fill(0);
      pesoPar.fill(0);
      lado.fill(0);
      capacidadAbierta.fill(0);
      let hayDisponibles = false;
      for (let i = 0; i < C; i++) {
        if (bloqueos[i]) continue;
        hayDisponibles = true;
        const d = datos[i];
        for (const r of d.rec) opcionesRecurso[r]++;
        pesoPar[d.par] += d.peso;
        if (usosPar[d.par]) { capacidadAbierta[d.e1] += d.peso; capacidadAbierta[d.e2] += d.peso; }
        for (const s of d.plazas) {
          if (marcaPlaza[s] !== nodos) { marcaPlaza[s] = nodos; lado[plazaLado[s]]++; }
        }
      }
      if (!hayDisponibles) return null;

      // Asignaturas: por cada una, un emparejamiento no supera la mitad de los
      // recursos con opciones ni una cobertura de vértices (lado menor de cada clase).
      recursosAsignatura.fill(0);
      coberturaAsignatura.fill(0);
      capacidad.fill(0);
      for (let r = 0; r < R; r++) {
        if (!opcionesRecurso[r]) continue;
        recursosAsignatura[recursoAsignatura[r]]++;
        capacidad[recursoEstudiante[r]]++;
      }
      for (let k = 0; k < K; k++) coberturaAsignatura[claseAsignatura[k]] += Math.min(lado[2 * k], lado[2 * k + 1]);
      let cotaAsig = 0;
      for (let a = 0; a < A; a++) {
        cotaPorAsignatura[a] = Math.min(recursosAsignatura[a] >> 1, coberturaAsignatura[a]);
        cotaAsig += cotaPorAsignatura[a];
      }
      const sumaCotas = cotaAsig;

      // Parejas: lo que aportan las ya abiertas no genera documentos nuevos.
      let pesoAbiertas = 0;
      let totalNuevas = 0;
      cubetasPar.fill(0);
      mejorPeso.fill(0);
      for (let p = 0; p < P; p++) {
        const w = pesoPar[p];
        if (!w) continue;
        if (usosPar[p] > 0) { pesoAbiertas += w; continue; }
        totalNuevas += w;
        cubetasPar[w]++;
        const [e1, e2] = parEstudiantes[p];
        if (w > mejorPeso[e1]) mejorPeso[e1] = w;
        if (w > mejorPeso[e2]) mejorPeso[e2] = w;
      }
      cotaAsig = Math.min(cotaAsig, pesoAbiertas + totalNuevas);
      const falta = cotaAsig - pesoAbiertas;
      let nuevas = 0;
      if (falta > 0) {
        // (a) Mínimo de parejas nuevas tomando las de mayor peso.
        let resto = falta;
        let porPeso = 0;
        for (let w = maxPesoPar; w > 0 && resto > 0; w--) {
          const n = Math.min(cubetasPar[w], Math.ceil(resto / w));
          porPeso += n;
          resto -= n * w;
        }
        // (b) Por alumno: cada pareja nueva da a cada miembro un "hueco" de como
        // mucho mejorPeso[e] asignaturas; hacen falta 2·falta recursos.
        cubetasPlaza.fill(0);
        for (let e = 0; e < E; e++) {
          const w = mejorPeso[e];
          if (!w) continue;
          cubetasPlaza[w] += Math.floor(capacidad[e] / w);
          const sobra = capacidad[e] % w;
          if (sobra) cubetasPlaza[sobra]++;
        }
        resto = 2 * falta;
        let huecos = 0;
        for (let w = maxPesoPar; w > 0 && resto > 0; w--) {
          const n = Math.min(cubetasPlaza[w], Math.ceil(resto / w));
          huecos += n;
          resto -= n * w;
        }
        nuevas = Math.max(porPeso, Math.ceil(huecos / 2));
      }
      // (c) Alumnos obligados: alcanzar la cota exige que cada asignatura llegue
      // a la suya. Si una asignatura tiene una sola clase activa y su cota es el
      // lado menor, todos los alumnos de ese lado tienen que cambiar.
      if (cotaAsig === sumaCotas) {
        clasesActivas.fill(0);
        ladoForzado.fill(0);
        forzadas.fill(0);
        for (let k = 0; k < K; k++) {
          if (!lado[2 * k]) continue;
          clasesActivas[claseAsignatura[k]]++;
          claseUnica[claseAsignatura[k]] = k;
        }
        for (let a = 0; a < A; a++) {
          if (clasesActivas[a] !== 1) continue;
          const k = claseUnica[a];
          if (lado[2 * k] === cotaPorAsignatura[a]) ladoForzado[2 * k] = 1;
          if (lado[2 * k + 1] === cotaPorAsignatura[a]) ladoForzado[2 * k + 1] = 1;
        }
        for (let s = 0; s < S; s++) {
          if (marcaPlaza[s] === nodos && ladoForzado[plazaLado[s]]) forzadas[plazaEstudiante[s]]++;
        }
        let incidencias = 0;
        ordenNecesidad.length = 0;
        for (let e = 0; e < E; e++) {
          necesidad[e] = 0;
          const pendiente = forzadas[e] - capacidadAbierta[e];
          if (pendiente <= 0) continue;
          // Ninguna pareja nueva puede cubrirle: la cota de asignaturas es inalcanzable.
          if (!mejorPeso[e]) return M * (asignaturasActuales + cotaAsig - 1) - parejasActuales;
          necesidad[e] = Math.ceil(pendiente / mejorPeso[e]);
          incidencias += necesidad[e];
          ordenNecesidad.push(e);
        }
        // Cada pareja nueva toca a lo sumo a un alumno de un conjunto
        // independiente (sin parejas nuevas posibles entre ellos).
        ordenNecesidad.sort((a, b) => necesidad[b] - necesidad[a] || a - b);
        let independiente = 0;
        for (const e of ordenNecesidad) {
          let libre = true;
          for (const p of paresPorEstudiante[e]) {
            if (!pesoPar[p] || usosPar[p]) continue;
            const [e1, e2] = parEstudiantes[p];
            if (enIndependiente[e1 === e ? e2 : e1]) { libre = false; break; }
          }
          if (libre) { enIndependiente[e] = 1; independiente += necesidad[e]; }
        }
        for (const e of ordenNecesidad) enIndependiente[e] = 0;
        nuevas = Math.max(nuevas, Math.ceil(incidencias / 2), independiente);
      }
      return M * (asignaturasActuales + cotaAsig) - (parejasActuales + nuevas);
    };

    let cotaRaiz = 0;
    const buscar = (asignaturasActuales, parejasActuales) => {
      nodos++;
      trabajo += costeNodo;
      const cota = cotaSuperior(asignaturasActuales, parejasActuales);
      if (nodos === 1) cotaRaiz = cota ?? M * asignaturasActuales - parejasActuales;
      if (cota === null) {
        const valor = M * asignaturasActuales - parejasActuales;
        if (valor > mejorValor) { mejorValor = valor; mejorSeleccion = [...seleccion]; }
        return;
      }
      if (cota <= mejorValor) return;

      // Ramificación: primero completar parejas ya abiertas (no cuestan otro
      // documento); si no hay, el recurso con menos opciones. Ramificar sobre
      // cualquier recurso mantiene la búsqueda completa.
      let recurso = -1;
      for (let i = 0; i < C && recurso < 0; i++) {
        if (bloqueos[i] || !usosPar[datos[i].par]) continue;
        for (const r of datos[i].rec) {
          if (recurso < 0 || opcionesRecurso[r] < opcionesRecurso[recurso]) recurso = r;
        }
      }
      if (recurso < 0) {
        for (let r = 0; r < R; r++) {
          if (opcionesRecurso[r] > 0 && (recurso < 0 || opcionesRecurso[r] < opcionesRecurso[recurso])) recurso = r;
        }
      }
      const yo = recursoEstudiante[recurso];
      const vistas = new Set();
      const opciones = [];
      for (const i of porRecurso[recurso]) {
        if (bloqueos[i]) continue;
        const d = datos[i];
        const otro = d.e1 === yo ? d.e2 : d.e1;
        // Simetría: dos compañeros intactos con la misma firma dan subárboles idénticos.
        if (!toques[otro]) {
          const clave = firma[otro] + '#' + claveAsignaturas[i];
          if (vistas.has(clave)) continue;
          vistas.add(clave);
        }
        opciones.push(i);
      }
      opciones.sort((a, b) =>
        (usosPar[datos[b].par] > 0) - (usosPar[datos[a].par] > 0)
        || pesoPar[datos[b].par] - pesoPar[datos[a].par]
        || datos[b].peso - datos[a].peso
        || a - b);

      let primera = true;
      for (const i of opciones) {
        if (!primera && trabajo >= limite) { optimo = false; return; }
        primera = false;
        const d = datos[i];
        d.rec.forEach(bloquear);
        const nueva = usosPar[d.par]++ === 0;
        seleccion.push(i);
        buscar(asignaturasActuales + d.peso, parejasActuales + (nueva ? 1 : 0));
        seleccion.pop();
        usosPar[d.par]--;
        d.rec.forEach(desbloquear);
      }
      // Rama en la que este alumno/asignatura no se intercambia.
      if (trabajo >= limite) { optimo = false; return; }
      bloquear(recurso);
      buscar(asignaturasActuales, parejasActuales);
      desbloquear(recurso);
    };

    buscar(0, 0);
    presupuesto.usado = trabajo;
    // Si la búsqueda termina, el óptimo está demostrado y la cota es la solución.
    const valorCota = optimo ? mejorValor : cotaRaiz;
    const cotaAsignaturas = Math.ceil(valorCota / M);
    const cotaMinimaDocumentos = M * cotaAsignaturas - valorCota;
    return { elegidos: mejorSeleccion.map(i => candidatos[i]), nodos, optimo, cotaAsignaturas, cotaMinimaDocumentos };
  }
}

export default PermutaMatching;
