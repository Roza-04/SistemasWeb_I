import { createTransport } from 'nodemailer';
import logger from './logger.js';

class EmailService {
  constructor() {
    this.emailBackend = process.env.EMAIL_BACKEND || 'mailhog';
    this.emailProvider = process.env.EMAIL_PROVIDER || 'MailHog';
    this.emailFrom = process.env.EMAIL_FROM || 'unigo@soporte.com';
    this.emailFromName = process.env.EMAIL_FROM_NAME || 'UniGO';

    // Create transporter based on configuration
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    const config = {
      host: process.env.SMTP_HOST || '127.0.0.1',
      port: parseInt(process.env.SMTP_PORT || '1025'),
      secure: process.env.SMTP_USE_SSL === 'true'
    };

    // Add authentication if using real SMTP
    if (this.emailBackend === 'smtp') {
      config.auth = {
        user: process.env.SMTP_USERNAME,
        pass: process.env.SMTP_PASSWORD
      };
    }

    // Handle TLS
    if (process.env.SMTP_USE_TLS === 'true') {
      config.tls = {
        rejectUnauthorized: false
      };
    }

    logger.info(`📧 Email transporter configured for ${this.emailProvider}`);
    
    return createTransport(config);
  }

  async sendEmail({ to, subject, text, html }) {
    try {
      const mailOptions = {
        from: `"${this.emailFromName}" <${this.emailFrom}>`,
        to,
        subject,
        text,
        html: html || text
      };

      const info = await this.transporter.sendMail(mailOptions);
      
      logger.info(`✅ Email sent: ${subject} to ${to}`);
      logger.debug(`Message ID: ${info.messageId}`);
      
      return {
        success: true,
        messageId: info.messageId
      };
    } catch (error) {
      logger.error(`❌ Failed to send email to ${to}:`, error);
      throw error;
    }
  }

  async sendVerificationCode(email, code) {
    const subject = 'Código de verificación - UniGO';
    const text = `Tu código de verificación es: ${code}\n\nEste código expirará en ${process.env.EMAIL_CODE_EXPIRE_MINUTES || 15} minutos.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">¡Bienvenido a UniGO!</h2>
        <p>Tu código de verificación es:</p>
        <div style="background-color: #F3F4F6; padding: 20px; text-align: center; font-size: 32px; font-weight: bold; letter-spacing: 5px; margin: 20px 0;">
          ${code}
        </div>
        <p>Este código expirará en ${process.env.EMAIL_CODE_EXPIRE_MINUTES || 15} minutos.</p>
        <p>Si no has solicitado este código, puedes ignorar este mensaje.</p>
        <hr style="margin: 30px 0; border: none; border-top: 1px solid #E5E7EB;">
        <p style="color: #6B7280; font-size: 12px;">
          Este es un correo automático de UniGO. Por favor no respondas a este mensaje.
        </p>
      </div>
    `;

    return await this.sendEmail({ to: email, subject, text, html });
  }

  async sendBookingNotification(to, booking, ride) {
    const subject = 'Nueva solicitud de reserva - UniGO';
    const text = `Tienes una nueva solicitud de reserva para tu viaje de ${ride.departure_city} a ${ride.destination_city}.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #4F46E5;">Nueva solicitud de reserva</h2>
        <p>Tienes una nueva solicitud de reserva para tu viaje:</p>
        <div style="background-color: #F3F4F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p><strong>Origen:</strong> ${ride.departure_city}</p>
          <p><strong>Destino:</strong> ${ride.destination_city}</p>
          <p><strong>Fecha:</strong> ${ride.date}</p>
          <p><strong>Asientos solicitados:</strong> ${booking.seats}</p>
        </div>
        <p>Ingresa a UniGO para aceptar o rechazar la solicitud.</p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }

  async sendBookingConfirmation(to, booking, ride) {
    const subject = '¡Reserva confirmada! - UniGO';
    const text = `Tu reserva para el viaje de ${ride.departure_city} a ${ride.destination_city} ha sido confirmada.`;
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #10B981;">¡Reserva confirmada!</h2>
        <p>Tu reserva ha sido confirmada:</p>
        <div style="background-color: #F3F4F6; padding: 15px; margin: 20px 0; border-radius: 8px;">
          <p><strong>Origen:</strong> ${ride.departure_city}</p>
          <p><strong>Destino:</strong> ${ride.destination_city}</p>
          <p><strong>Fecha:</strong> ${ride.date}</p>
          <p><strong>Hora:</strong> ${ride.time}</p>
          <p><strong>Asientos:</strong> ${booking.seats}</p>
          <p><strong>Precio:</strong> €${ride.price}</p>
        </div>
        <p>¡Nos vemos en el viaje!</p>
      </div>
    `;

    return await this.sendEmail({ to, subject, text, html });
  }
}

// Singleton instance
let emailService = null;

export const getEmailService = () => {
  if (!emailService) {
    emailService = new EmailService();
  }
  return emailService;
};

export default getEmailService;
