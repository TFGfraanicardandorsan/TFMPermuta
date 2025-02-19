class PermutaMatching {
    constructor(estudiantes, solicitudes) {
        this.estudiantes = new Set(estudiantes);
        this.solicitudes = solicitudes;
        this.grafo = new Map();
    }

    construirGrafo() {
        this.estudiantes.forEach(estudiante => this.grafo.set(estudiante, []));
        this.solicitudes.forEach(([a, b]) => {
            this.grafo.get(a).push(b);
            this.grafo.get(b).push(a);
        });
    }

    emparejar() {
        const visitado = new Set();
        const emparejamiento = [];

        for (let estudiante of this.estudiantes) {
            if (!visitado.has(estudiante)) {
                for (let vecino of this.grafo.get(estudiante)) {
                    if (!visitado.has(vecino)) {
                        emparejamiento.push([estudiante, vecino]);
                        visitado.add(estudiante);
                        visitado.add(vecino);
                        break;
                    }
                }
            }
        }
        return emparejamiento;
    }
}

const permuta = new PermutaMatching(estudiantes, solicitudes);
permuta.construirGrafo();
const permutasOptimas = permuta.emparejar();
console.log("Permutas óptimas:", permutasOptimas);