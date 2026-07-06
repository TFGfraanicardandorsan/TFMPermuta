const MES_INICIO_CURSO = 8; // Septiembre (los meses de Date empiezan en 0).

export const obtenerCursoAcademico = (fecha = new Date()) => {
  const fechaNormalizada = fecha instanceof Date ? fecha : new Date(fecha);
  if (Number.isNaN(fechaNormalizada.getTime())) {
    throw new TypeError("La fecha del curso académico no es válida");
  }

  const anio = fechaNormalizada.getUTCFullYear();
  const inicio = fechaNormalizada.getUTCMonth() >= MES_INICIO_CURSO ? anio : anio - 1;
  return `${inicio}-${inicio + 1}`;
};
