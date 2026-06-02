import { parse } from 'csv-parse/sync';

export const ALLOWED_DEGREES = [
  'Ingeniería Informática - Ingeniería del Software',
  'Ingeniería Informática - Ingeniería de Computadores',
  'Ingeniería Informática - Tecnologías Informáticas',
  'Ingeniería Informática - Inteligencia Artificial',
  'Ingeniería de la Salud',
];

const HEADER_ALIASES = new Map([
  ['uvus', 'uvus'],
  ['usuario', 'uvus'],
  ['nombreusuario', 'uvus'],
  ['nombredeusuario', 'uvus'],
  ['nombre', 'nombre'],
  ['dni', 'dni'],
  ['tipodedelegado', 'tipo'],
  ['tipodelegado', 'tipo'],
  ['tipo', 'tipo'],
  ['delegado', 'tipo'],
  ['grado', 'grado'],
  ['titulacion', 'grado'],
  ['carrera', 'grado'],
  ['grupo', 'grupo'],
  ['grupocurso', 'grupo'],
  ['cursogrupo', 'grupo'],
  ['cursoygrupo', 'grupo'],
  ['grupoycurso', 'grupo'],
  ['clase', 'grupo'],
  ['cursodelegado', 'cursoDelegado'],
  ['cursodelegada', 'cursoDelegado'],
  ['cursotitulacion', 'cursoDelegado'],
  ['cursoestudios', 'cursoDelegado'],
  ['cursoacademicoestudiante', 'cursoDelegado'],
  ['correo', 'correo'],
  ['email', 'correo'],
  ['mail', 'correo'],
  ['correoelectronico', 'correo'],
  ['emaildelegado', 'correo'],
  ['correodelegado', 'correo'],
  ['curso', 'curso'],
  ['cursoacademico', 'curso'],
]);

export class CSVValidationError extends Error {
  constructor(errors) {
    super(errors.join('\n'));
    this.name = 'CSVValidationError';
    this.errors = errors;
  }
}

export function parseCsvUpload(data, today = new Date()) {
  const text = decodeCsv(data);
  const delimiter = detectDelimiter(text);
  let table;

  try {
    table = parse(text, {
      bom: true,
      delimiter,
      relax_column_count: true,
      skip_empty_lines: true,
      trim: true,
    });
  } catch (error) {
    throw new CSVValidationError([`El CSV no se pudo leer: ${error.message}`]);
  }

  if (table.length === 0) {
    throw new CSVValidationError(['El CSV no contiene cabecera.']);
  }

  const [headers, ...rawRows] = table;
  const headerMap = buildHeaderMap(headers);
  const errors = missingHeaderErrors(headerMap);
  const rows = [];

  rawRows.forEach((rawRow, index) => {
    if (!rawRow.some((value) => String(value || '').trim())) {
      return;
    }

    const rowNumber = index + 2;
    const row = rowFromValues(headers, rawRow);
    const uvus = cell(row, headerMap, 'uvus');
    const nombre = cell(row, headerMap, 'nombre');
    const dni = cell(row, headerMap, 'dni');
    const tipo = cell(row, headerMap, 'tipo');
    const gradoInput = cell(row, headerMap, 'grado');
    const grupoInput = cell(row, headerMap, 'grupo');
    const cursoDelegadoInput = cell(row, headerMap, 'cursoDelegado');
    const correo = cell(row, headerMap, 'correo');
    const cursoInput = cell(row, headerMap, 'curso');

    const rowErrors = [];
    if (uvus && !/^[A-Za-z0-9._-]{3,64}$/.test(uvus)) rowErrors.push('uvus no tiene un formato válido');
    if (!nombre) rowErrors.push('falta Nombre');
    if (!dni) rowErrors.push('falta DNI');

    const tipoDelegado = delegateType(tipo);
    if (!tipoDelegado) rowErrors.push('tipoDeDelegado debe ser Centro, Curso o Grupo');
    if (correo && !isEmail(correo)) rowErrors.push('correo no tiene un formato válido');

    let grado = '';
    let grupo = '';
    let cursoDelegado = '';
    if (tipoDelegado === 'Grupo' || tipoDelegado === 'Curso') {
      grado = canonicalDegree(gradoInput);
      if (!grado) {
        rowErrors.push(`si tipoDeDelegado es ${tipoDelegado}, grado debe ser uno de los grados permitidos`);
      }
    }

    if (tipoDelegado === 'Grupo') {
      grupo = grupoInput;
      if (!grupo) {
        rowErrors.push('si tipoDeDelegado es Grupo, grupo debe indicar el curso y grupo, por ejemplo 1º Grupo 1');
      }
    }

    if (tipoDelegado === 'Curso') {
      cursoDelegado = cursoDelegadoInput || grupoInput;
      grupo = grupoInput && grupoInput !== cursoDelegado ? grupoInput : '';
      if (!grupo) {
        grupo = cursoDelegado;
      }
      if (!cursoDelegado) {
        rowErrors.push('si tipoDeDelegado es Curso, cursoDelegado debe indicar el curso, por ejemplo 1º');
      }
    }

    let cursoCorto = '';
    let cursoLargo = '';
    try {
      [cursoCorto, cursoLargo] = parseCourse(cursoInput, today);
    } catch (error) {
      rowErrors.push(error.message);
    }

    if (rowErrors.length > 0) {
      errors.push(`Línea ${rowNumber}: ${rowErrors.join('; ')}.`);
      return;
    }

    rows.push({
      rowNumber,
      uvus,
      nombre,
      dni,
      tipo_delegado: tipoDelegado,
      grado,
      grupo,
      curso_delegado: cursoDelegado,
      correo,
      curso_corto: cursoCorto,
      curso_largo: cursoLargo,
    });
  });

  if (rows.length === 0 && errors.length === 0) {
    errors.push('El CSV no contiene filas con datos.');
  }

  if (errors.length > 0) {
    throw new CSVValidationError(errors);
  }

  return rows;
}

export function parseCourse(value, today = new Date()) {
  const text = String(value || '').trim();
  if (!text) {
    const startYear = currentAcademicStartYear(today);
    return courseLabels(startYear, startYear + 1);
  }

  const normalized = text.replace(/[–—/]/g, '-');
  const parts = normalized.match(/\d{2,4}/g) || [];
  if (parts.length !== 2) {
    throw new Error('curso debe tener formato 25-26 o 2025 - 2026');
  }

  const startYear = expandStartYear(parts[0]);
  const endYear = expandEndYear(parts[1], startYear);
  if (endYear !== startYear + 1) {
    throw new Error('curso debe cubrir dos años académicos consecutivos');
  }

  return courseLabels(startYear, endYear);
}

export function currentAcademicStartYear(today) {
  return today.getMonth() >= 8 ? today.getFullYear() : today.getFullYear() - 1;
}

export function buildSummaryCsv(rows, filenames) {
  const outputRows = [
    ['UVUS', 'Nombre', 'DNI', 'tipoDeDelegado', 'grado', 'cursoDelegado', 'grupo', 'correo', 'curso', 'cursoAcademico', 'archivo_pdf'],
    ...rows.map((row, index) => [
      row.uvus,
      row.nombre,
      row.dni,
      row.tipo_delegado,
      row.grado,
      row.curso_delegado,
      row.grupo,
      row.correo,
      row.curso_corto,
      row.curso_largo,
      filenames[index],
    ]),
  ];

  const csv = outputRows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
  return Buffer.from(`\ufeff${csv}\r\n`, 'utf8');
}

export function sampleCsv() {
  const rows = [
    ['UVUS', 'Nombre', 'DNI', 'tipoDeDelegado', 'grado', 'cursoDelegado', 'grupo', 'correo', 'curso'],
    ['pabmedmej', 'Pablo Medinilla Mejías', '32908032 - T', 'Centro', '', '', '', 'pablo@example.com', ''],
    [
      'margarclo',
      'María García López',
      '12345678 - Z',
      'Grupo',
      'Ingeniería Informática - Ingeniería del Software',
      '',
      '1º Grupo 1',
      'maria@example.com',
      '25-26',
    ],
    [
      'anaperezz',
      'Ana Pérez Ruiz',
      '87654321 - X',
      'Curso',
      'Ingeniería Informática - Tecnologías Informáticas',
      '2º',
      '',
      'ana@example.com',
      '25-26',
    ],
  ];
  const csv = rows.map((row) => row.map(escapeCsvCell).join(';')).join('\r\n');
  return Buffer.from(`\ufeff${csv}\r\n`, 'utf8');
}

export function isEmail(value) {
  return /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(String(value || '').trim());
}

function decodeCsv(data) {
  const buffer = Buffer.isBuffer(data) ? data : Buffer.from(data || '');
  if (buffer.length === 0) return '';

  for (const encoding of ['utf-8', 'windows-1252', 'iso-8859-1']) {
    try {
      return new TextDecoder(encoding, { fatal: true }).decode(buffer);
    } catch {
      // Try the next likely CSV encoding.
    }
  }

  return buffer.toString('utf8');
}

function detectDelimiter(text) {
  const sample = text.split(/\r?\n/).filter(Boolean).slice(0, 10).join('\n');
  const counts = new Map([
    [';', countChar(sample, ';')],
    [',', countChar(sample, ',')],
    ['\t', countChar(sample, '\t')],
  ]);
  return [...counts.entries()].sort((a, b) => b[1] - a[1])[0][0] || ';';
}

function countChar(value, character) {
  return [...value].filter((item) => item === character).length;
}

function buildHeaderMap(headers) {
  const headerMap = new Map();
  headers.forEach((header) => {
    const canonical = HEADER_ALIASES.get(key(header));
    if (canonical && !headerMap.has(canonical)) {
      headerMap.set(canonical, header);
    }
  });
  return headerMap;
}

function missingHeaderErrors(headerMap) {
  const labels = {
    nombre: 'Nombre',
    dni: 'DNI',
    tipo: 'tipoDeDelegado',
  };
  const missing = ['nombre', 'dni', 'tipo'].filter((name) => !headerMap.has(name));
  if (missing.length === 0) return [];
  return [`Faltan columnas obligatorias: ${missing.map((name) => labels[name]).join(', ')}.`];
}

function rowFromValues(headers, values) {
  return headers.reduce((row, header, index) => {
    row[header] = String(values[index] || '').trim();
    return row;
  }, {});
}

function cell(row, headerMap, canonical) {
  const fieldName = headerMap.get(canonical);
  if (!fieldName) return '';
  return String(row[fieldName] || '').trim();
}

function delegateType(value) {
  const normalized = key(value);
  if (normalized === 'centro' || normalized.includes('centro')) return 'Centro';
  if (normalized === 'curso' || normalized.includes('curso')) return 'Curso';
  if (normalized === 'grupo' || normalized.includes('grupo')) return 'Grupo';
  return null;
}

function canonicalDegree(value) {
  const lookup = new Map(ALLOWED_DEGREES.map((degree) => [key(degree), degree]));
  return lookup.get(key(value)) || '';
}

function courseLabels(startYear, endYear) {
  return [`${String(startYear % 100).padStart(2, '0')}-${String(endYear % 100).padStart(2, '0')}`, `${startYear} - ${endYear}`];
}

function expandStartYear(value) {
  if (value.length === 4) return Number(value);
  const year = Number(value);
  return year < 70 ? 2000 + year : 1900 + year;
}

function expandEndYear(value, startYear) {
  if (value.length === 4) return Number(value);
  const year = Number(value);
  let endYear = Math.floor(startYear / 100) * 100 + year;
  if (endYear <= startYear) endYear += 100;
  return endYear;
}

function key(value) {
  return String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('es')
    .replace(/[^a-z0-9]+/g, '');
}

function escapeCsvCell(value) {
  const text = String(value ?? '');
  if (!/[;"\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}
