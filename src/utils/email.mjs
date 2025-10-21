import nodemailer from 'nodemailer';
import ejs from 'ejs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class Email {
    constructor(){
        const userName = process.env.EMAIL_USERNAME;
        const passWord = process.env.EMAIL_PASSWORD;
        console.log("userName", userName)
        this.transporter = nodemailer.createTransport({
            host: 'smtp.office365.com',
            port: 587,
            secure: false,
            auth: {
                user: userName,
                pass: passWord,
            },
            tls: { rejectUnauthorized: true } // false para desarrollo en producción debería ser true para verificar certificados
        });
        this.pdfFolder = process.env.PDF_FOLDER
        this.templatesFolder = path.join(__dirname);
    }

    async sendEmail(to, subject, html,attachments = []) {
        try {
            const mailOptions = {
                from: process.env.EMAIL_USERNAME,
                to,
                subject,
                html,
                attachments
            };
            const info = await this.transporter.sendMail(mailOptions);
            console.log('Correo enviado a', to, "respuesta:" ,info.response);
        } catch (error) {
            console.error('Error al enviar el correo:', error);
        }
    }
    async sendEmailToStudentsDocumentoPermuta(estudiantes, subject, htmlTemplate, pdfUUID){
        console.log("PDFUUID comprobar que viene con extensión", pdfUUID);
        // Lista de correos de los estudiantes para el campo "to"
        let to;
        if (Array.isArray(estudiantes)) {
            to = estudiantes.map(est => est.correo).join(',');
        } else {
            to = estudiantes.correo;
        }
        const htmlTemplatePath = path.join(this.templatesFolder, htmlTemplate);
        const html = await ejs.renderFile(htmlTemplatePath, { estudiantes:Array.isArray(estudiantes) ? estudiantes : [estudiantes] });
        const attachments = pdfUUID ? [
            {
                filename: 'SolicitudPermuta.pdf',
                path: path.join(this.pdfFolder, pdfUUID),
                contentType: 'application/pdf'
            }
        ] : [];
        await this.sendEmail(to,subject,html, attachments);
    }
}
const email = new Email();
export default email;