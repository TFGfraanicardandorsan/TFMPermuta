import fs from 'fs/promises';
import path from 'path';

const DEFAULT_BASE_DIR = path.join(process.cwd(), 'storage', 'delegados');

export function delegadosStorageBaseDir(baseDir = process.env.DELEGADOS_CERTIFICADOS_DIR) {
  return path.resolve(baseDir || DEFAULT_BASE_DIR);
}

export async function saveCertificateDocuments(documents, baseDir = process.env.DELEGADOS_CERTIFICADOS_DIR) {
  const rootDir = delegadosStorageBaseDir(baseDir);
  const saved = [];

  for (const document of documents) {
    const typeDir = path.join(rootDir, certificateTypeFolder(document.row));
    await fs.mkdir(typeDir, { recursive: true });

    let filePath = path.join(typeDir, document.filename);
    try {
      await fs.writeFile(filePath, document.pdf, { flag: 'wx' });
    } catch (error) {
      if (error.code !== 'EEXIST') throw error;
      filePath = await nextAvailablePath(typeDir, document.filename);
      await fs.writeFile(filePath, document.pdf, { flag: 'wx' });
    }

    saved.push(savedDocument(document, rootDir, filePath));
  }

  return saved;
}

export function certificateTypeFolder(row) {
  if (row.tipo_delegado === 'Centro') return 'centro';
  if (row.tipo_delegado === 'Curso') return 'curso';
  return 'grupo';
}

async function nextAvailablePath(dir, filename) {
  const extension = path.extname(filename);
  const basename = path.basename(filename, extension);

  for (let index = 2; index < 10000; index += 1) {
    const candidate = path.join(dir, `${basename}_${index}${extension}`);
    try {
      await fs.access(candidate);
    } catch {
      return candidate;
    }
  }

  throw new Error(`No se pudo encontrar un nombre libre para ${filename}`);
}

function savedDocument(document, rootDir, filePath) {
  return {
    rowNumber: document.row.rowNumber,
    uvus: document.row.uvus,
    tipoDelegado: document.row.tipo_delegado,
    filename: path.basename(filePath),
    folder: certificateTypeFolder(document.row),
    relativePath: path.relative(rootDir, filePath),
    path: filePath,
  };
}
