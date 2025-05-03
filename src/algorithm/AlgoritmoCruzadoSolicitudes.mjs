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
        const estudiantesPorProcesar = [...this.grafo.keys()];
        
        // Ordenar estudiantes por número de conexiones (descendente)
        estudiantesPorProcesar.sort((a, b) => {
            return this.grafo.get(b).size - this.grafo.get(a).size;
        });

        while (estudiantesPorProcesar.length > 0) {
            const estudiante = estudiantesPorProcesar.shift();
            
            if (visitado.has(estudiante)) continue;

            // Encontrar el mejor vecino basado en número de asignaturas compartidas
            let mejorVecino = null;
            let maxAsignaturas = 0;
            let asignaturasCompartidas = new Set();

            for (let [vecino, asignaturas] of this.grafo.get(estudiante)) {
                if (!visitado.has(vecino)) {
                    // Verificar reciprocidad de la permuta
                    const asignaturasVecino = this.grafo.get(vecino).get(estudiante);
                    if (asignaturasVecino) {
                        const intersection = new Set(
                            [...asignaturas].filter(x => asignaturasVecino.has(x))
                        );
                        if (intersection.size > maxAsignaturas) {
                            mejorVecino = vecino;
                            maxAsignaturas = intersection.size;
                            asignaturasCompartidas = intersection;
                        }
                    }
                }
            }

            if (mejorVecino && maxAsignaturas > 0) {
                emparejamiento.push({
                    estudiante1: estudiante,
                    estudiante2: mejorVecino,
                    asignaturas: Array.from(asignaturasCompartidas)
                });
                visitado.add(estudiante);
                visitado.add(mejorVecino);
                
                // Remover el vecino emparejado de la lista por procesar
                const index = estudiantesPorProcesar.indexOf(mejorVecino);
                if (index > -1) {
                    estudiantesPorProcesar.splice(index, 1);
                }
            }
        }
        
        return emparejamiento;
    }
}

export default PermutaMatching;