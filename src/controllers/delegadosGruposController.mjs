import delegadosPdfService from "../services/delegadosPdfService.mjs";

const generarAcreditacionesDelegados = async (req, res) => {
  try {
    if (!req.session.user || req.session.user.rol !== "administrador") {
      return res.status(403).json({ err: true, message: "Solo administradores pueden generar PDFs" });
    }
    const { nombreCompleto, dni } = req.body;
    if (!req.file) {
      return res.status(400).json({ err: true, message: "Falta el archivo CSV" });
    }
    const zipBuffer = await delegadosPdfService.generarDelegadosZip(req.file.buffer, { nombreCompleto, dni });
    res.setHeader("Content-Type", "application/zip");
    res.setHeader("Content-Disposition", "attachment; filename=acreditaciones_delegados.zip");
    res.send(zipBuffer);
  } catch (error) {
    console.error("Error generando ZIP de delegados:", error);
    res.status(500).json({ err: true, message: "Error generando ZIP" });
  }
};

export default { generarAcreditacionesDelegados };