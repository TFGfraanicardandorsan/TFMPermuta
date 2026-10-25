import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  host: "smtp.office365.com",
  port: 587,
  secure: false, // true para 465, false para otros puertos
  requireTLS: true,
  connectionTimeout: 10_000,
  socketTimeout: 30_000,
  auth: {
    user: process.env.EMAIL_USER, // Tu correo de Outlook
    pass: process.env.EMAIL_PASS, // Tu contraseña o app password
  },
  tls: {
    minVersion: 'TLSv1.2',
    rejectUnauthorized: true,
  },
});

export async function enviarCorreo({ to, subject, text, html }) {
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to,
    subject,
    text,
    html,
  };
  return transporter.sendMail(mailOptions);
}
