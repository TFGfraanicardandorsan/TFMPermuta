import nodemailer from "nodemailer";

const transporter = nodemailer.createTransport({
  service: "gmail", // O usa 'smtp' y configura host, port, etc.
  auth: {
    user: process.env.EMAIL_USER, // Configura en tus variables de entorno
    pass: process.env.EMAIL_PASS,
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