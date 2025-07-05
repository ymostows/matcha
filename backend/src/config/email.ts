import nodemailer from 'nodemailer';
import crypto from 'crypto';

// Configuration du transporteur email
let transporter: nodemailer.Transporter;

const initializeEmailTransporter = async () => {
  try {
    // Créer un compte de test Ethereal
    const testAccount = await nodemailer.createTestAccount();
    
    transporter = nodemailer.createTransport({
      host: 'smtp.ethereal.email',
      port: 587,
      secure: false, // true pour 465, false pour les autres ports
      auth: {
        user: testAccount.user,
        pass: testAccount.pass,
      },
    });

    console.log('📧 Configuration email Ethereal initialisée');
    console.log('📧 Compte test:', testAccount.user);
    console.log('📧 Mot de passe:', testAccount.pass);
    console.log('📧 Lien Ethereal: https://ethereal.email');
  } catch (error) {
    console.error('❌ Erreur lors de l\'initialisation de l\'email:', error);
    throw error;
  }
};

// Interface pour les options d'email
interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Fonction pour envoyer un email
const sendEmail = async (options: EmailOptions): Promise<string> => {
  try {
    if (!transporter) {
      await initializeEmailTransporter();
    }

    const info = await transporter.sendMail({
      from: '"Matcha 💕" <noreply@matcha.com>',
      to: options.to,
      subject: options.subject,
      html: options.html,
    });

    console.log('✅ Email envoyé:', info.messageId);
    console.log('🔗 Aperçu Ethereal:', nodemailer.getTestMessageUrl(info));
    
    return info.messageId;
  } catch (error) {
    console.error('❌ Erreur lors de l\'envoi de l\'email:', error);
    throw error;
  }
};

// Fonction pour envoyer un email de vérification
const sendVerificationEmail = async (email: string, token: string): Promise<string> => {
  const verificationUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/verify-email/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">💕 Bienvenue sur Matcha !</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; margin-top: 0;">Vérifiez votre adresse email</h2>
        
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Merci de vous être inscrit sur Matcha ! Pour commencer à utiliser votre compte, 
          veuillez cliquer sur le bouton ci-dessous pour vérifier votre adresse email.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
            ✨ Vérifier mon email
          </a>
        </div>
        
        <p style="color: #999; font-size: 14px; line-height: 1.5;">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
          <a href="${verificationUrl}" style="color: #dc2626; word-break: break-all;">${verificationUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 24 heures. Si vous n'avez pas demandé cette vérification, 
          vous pouvez ignorer cet email en toute sécurité.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        © 2024 Matcha - L'amour au premier clic 💕
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: '💕 Vérifiez votre compte Matcha',
    html
  });
};

// Fonction pour envoyer un email de réinitialisation de mot de passe
const sendPasswordResetEmail = async (email: string, token: string): Promise<string> => {
  const resetUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password/${token}`;
  
  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f9f9f9;">
      <div style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); padding: 30px; text-align: center; border-radius: 10px 10px 0 0;">
        <h1 style="color: white; margin: 0; font-size: 28px;">🔐 Réinitialisation de mot de passe</h1>
      </div>
      
      <div style="background: white; padding: 30px; border-radius: 0 0 10px 10px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <h2 style="color: #333; margin-top: 0;">Réinitialisez votre mot de passe</h2>
        
        <p style="color: #666; line-height: 1.6; font-size: 16px;">
          Vous avez demandé la réinitialisation de votre mot de passe sur Matcha. 
          Cliquez sur le bouton ci-dessous pour créer un nouveau mot de passe.
        </p>
        
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #dc2626 0%, #ec4899 100%); 
                    color: white; 
                    padding: 15px 30px; 
                    text-decoration: none; 
                    border-radius: 25px; 
                    font-weight: bold; 
                    font-size: 16px;
                    display: inline-block;
                    box-shadow: 0 4px 15px rgba(220, 38, 38, 0.3);">
            🔑 Réinitialiser mon mot de passe
          </a>
        </div>
        
        <p style="color: #999; font-size: 14px; line-height: 1.5;">
          Si le bouton ne fonctionne pas, copiez et collez ce lien dans votre navigateur :<br>
          <a href="${resetUrl}" style="color: #dc2626; word-break: break-all;">${resetUrl}</a>
        </p>
        
        <p style="color: #999; font-size: 14px; margin-top: 30px;">
          Ce lien expirera dans 1 heure. Si vous n'avez pas demandé cette réinitialisation, 
          vous pouvez ignorer cet email en toute sécurité.
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
        © 2024 Matcha - L'amour au premier clic 💕
      </div>
    </div>
  `;

  return await sendEmail({
    to: email,
    subject: '🔐 Réinitialisation de votre mot de passe Matcha',
    html
  });
};

// Générer un token de vérification unique
export const generateVerificationToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

// Générer un token de reset de mot de passe
export const generateResetToken = (): string => {
  return crypto.randomBytes(32).toString('hex');
};

export { initializeEmailTransporter, sendEmail, sendVerificationEmail, sendPasswordResetEmail }; 