class PermutaMatching {
    constructor(estudiantes, permutas) {
        this.estudiantes = estudiantes;
        this.permutas = permutas;
        this.grafo = new Map();
    }

    construirGrafo() {
        // Inicializar el grafo con los estudiantes
        this.estudiantes.forEach(estudiante => {
            this.grafo.set(estudiante.id, new Map());
        });

        // Crear aristas basadas en las solicitudes de permuta, considerando asignaturas
        this.permutas.forEach(({ estudianteId, permutaA, asignatura }) => {
            const estudianteActual = this.estudiantes.find(e => e.id === estudianteId);
            const candidato = this.estudiantes.find(e => e.grupo === permutaA);

            if (candidato) {
                const conexiones = this.grafo.get(estudianteId);
                if (!conexiones.has(candidato.id)) {
                    conexiones.set(candidato.id, new Set());
                }
                conexiones.get(candidato.id).add(asignatura);
            }
        });
    }

    emparejar() {
        const visitado = new Set();
        const emparejamiento = [];

        for (let estudiante of this.grafo.keys()) {
            if (!visitado.has(estudiante)) {
                let mejorVecino = null;
                let maxAsignaturas = 0;

                for (let [vecino, asignaturas] of this.grafo.get(estudiante)) {
                    if (!visitado.has(vecino) && asignaturas.size > maxAsignaturas) {
                        mejorVecino = vecino;
                        maxAsignaturas = asignaturas.size;
                    }
                }

                if (mejorVecino) {
                    emparejamiento.push([estudiante, mejorVecino, Array.from(this.grafo.get(estudiante).get(mejorVecino))]);
                    visitado.add(estudiante);
                    visitado.add(mejorVecino);
                }
            }
        }
        return emparejamiento;
    }
}


const permuta = new PermutaMatching(estudiantes, permutas);
permuta.construirGrafo();
const permutasOptimas = permuta.emparejar();
console.log("Permutas óptimas:", permutasOptimas);