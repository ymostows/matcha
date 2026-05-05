import nodemailer from 'nodemailer';
import crypto from 'crypto';

let transporter: nodemailer.Transporter;

const initializeEmailTransporter = async () => {
  // Priorité 1 : Mailtrap (variables d'environnement définies)
  if (process.env.MAILTRAP_USER && process.env.MAILTRAP_PASS) {
    transporter = nodemailer.createTransport({
      host: 'sandbox.smtp.mailtrap.io',
      port: 2525,
      auth: {
        user: process.env.MAILTRAP_USER,
        pass: process.env.MAILTRAP_PASS,
      },
    });
    return;
  }

  // Priorité 2 : Ethereal (compte jetable auto-créé, fallback dev)
  try {
    const testAccount = await nodemailer.createTestAccount();
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false,
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });
  } catch (error) {
    throw error;
  }
};

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const sendEmail = async (options: EmailOptions): Promise<string> => {
  if (!transporter) {
    await initializeEmailTransporter();
  }

  const info = await transporter.sendMail({
    from: '"Matcha 💕" <noreply@matcha.com>',
    to: options.to,
    subject: options.subject,
    html: options.html,
  });


  // Affiche le lien de prévisualisation uniquement pour Ethereal
  const previewUrl = nodemailer.getTestMessageUrl(info);
  if (previewUrl) {
  }

  return info.messageId;
};

const sendVerificationEmail = async (email: string, token: string): Promise<string> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">💕 Bienvenue sur Matcha !</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Vérifiez votre adresse email</h2>
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Merci de vous être inscrit sur Matcha ! Cliquez sur le bouton ci-dessous pour activer votre compte.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}"
             style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
                    color: white; padding: 15px 30px; text-decoration: none;
                    border-radius: 25px; font-weight: bold; font-size: 16px;
                    display: inline-block; box-shadow: 0 4px 15px rgba(220,38,38,0.3);">
            ✨ Vérifier mon email
          </a>
        </div>
        <p style="color: #999; font-size: 14px; line-height: 1.5;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${verificationUrl}" style="color: #dc2626; word-break: break-all;">${verificationUrl}</a>
        </p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 24 heures.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        © 2025 Matcha - L'amour au premier clic 💕
      </div>
    </div>
  `;

  return sendEmail({ to: email, subject: '💕 Vérifiez votre compte Matcha', html });
};

const sendPasswordResetEmail = async (email: string, token: string): Promise<string> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Réinitialisation de mot de passe</h1>
      </div>
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
        <h2 style="color: #333; margin-top: 0;">Réinitialisez votre mot de passe</h2>
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Vous avez demandé la réinitialisation de votre mot de passe. Cliquez sur le bouton ci-dessous.
        </p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}"
             style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%);
                    color: white; padding: 15px 30px; text-decoration: none;
                    border-radius: 25px; font-weight: bold; font-size: 16px;
                    display: inline-block; box-shadow: 0 4px 15px rgba(220,38,38,0.3);">
            🔑 Réinitialiser mon mot de passe
          </a>
        </div>
        <p style="color: #999; font-size: 14px; line-height: 1.5;">
          Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
        </p>
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, ignorez cet email.
        </p>
      </div>
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        © 2025 Matcha - L'amour au premier clic 💕
      </div>
    </div>
  `;

  return sendEmail({ to: email, subject: '🔐 Réinitialisation de votre mot de passe Matcha', html });
};

export const generateVerificationToken = (): string => crypto.randomBytes(32).toString('hex');
export const generateResetToken = (): string => crypto.randomBytes(32).toString('hex');

export { initializeEmailTransporter, sendEmail, sendVerificationEmail, sendPasswordResetEmail };
