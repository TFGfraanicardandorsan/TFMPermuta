import fs from "fs";
import path from "path";
import { parse } from "csv-parse/sync";
import PDFDocument from "pdfkit";
import archiver from "archiver";
import os from "os";

class DelegadosPdfService {
  async generarDelegadosZip(csvBuffer, acreditador) {
    const registros = parse(csvBuffer, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    });

    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "delegados-"));
    const pdfPaths = [];

    for (const persona of registros) {
      const pdfPath = path.join(
        tempDir,
        `${persona.nombre_completo.replace(/\s+/g, "_")}_${persona.dni}.pdf`
      );
      const doc = new PDFDocument();
      doc.pipe(fs.createWriteStream(pdfPath));
      doc.fontSize(14).text(`Acreditación de Delegado/a`, { align: "center" });
      doc.moveDown();
      doc.fontSize(12).text(
        `D. ${acreditador.nombreCompleto} (DNI: ${acreditador.dni}) acredita que, a fecha de hoy, `
      );
      doc.moveDown();
      doc.text(
        `D./Dña. ${persona.nombre_completo} (DNI: ${persona.dni}) es delegado/a del grupo ${persona.grupo}, curso ${persona.curso}, del grado ${persona.estudio}.`
      );
      doc.moveDown();
      doc.text(`Fecha de acreditación: ${new Date().toLocaleDateString()}`);
      doc.end();
      pdfPaths.push(pdfPath);
    }

    const zipPath = path.join(tempDir, "acreditaciones_delegados.zip");
    await new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver("zip");
      output.on("close", resolve);
      archive.on("error", reject);
      archive.pipe(output);
      for (const pdf of pdfPaths) {
        archive.file(pdf, { name: path.basename(pdf) });
      }
      archive.finalize();
    });

    const zipBuffer = fs.readFileSync(zipPath);
    // Limpieza opcional de archivos temporales aquí
    return zipBuffer;
  }
}

const delegadosPdfService = new DelegadosPdfService();
export default delegadosPdfService;