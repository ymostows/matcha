// Point d'entrée principal du serveur Express
import dotenv from 'dotenv';
// Charger les variables d'environnement EN PREMIER
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { testConnection } from './config/database';
import pool from './config/database';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import photosRoutes from './routes/photos';
import notificationsRoutes from './routes/notifications';
import chatRoutes from './routes/chat';
import { sanitizeInput } from './middleware/sanitization';
import { initializeEmailTransporter } from './config/email';
import errorHandler from './middleware/errorHandler';

// Créer l'application Express
const app = express();

// Configuration des middlewares (ordre important !)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:3001"], // Permettre les images de notre API
    }
  },
  crossOriginResourcePolicy: { policy: "cross-origin" } // Permettre le cross-origin pour les ressources
})); // Sécurité HTTP renforcée
app.use(cors({
  origin: [
    'http://localhost:5176', // Port actuel du frontend selon les logs
    'http://localhost:5174', // Port alternatif du frontend
    'http://localhost:5173', // Port par défaut de Vite
    'http://localhost:3000'  // Port mentionné dans l'env
  ],
  credentials: true
})); // CORS sécurisé avec plusieurs origins
app.use(express.json({ limit: '50mb' })); // Parser JSON avec limite pour base64
app.use(sanitizeInput); // Protection XSS

// Servir les fichiers statiques d'upload
const uploadsPath = path.join(__dirname, '../uploads');
app.use('/uploads', express.static(uploadsPath));

// Variables d'environnement
const PORT = process.env.PORT || 3001;

// Routes
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Serveur Matcha en marche!',
    timestamp: new Date().toISOString()
  });
});

// Route de test de la base de données
app.get('/api/test-db', async (req, res) => {
  try {
    const client = await pool.connect();
    const result = await client.query('SELECT COUNT(*) FROM users');
    client.release();
    
    res.json({
      status: 'OK',
      message: 'Base de données connectée!',
      userCount: result.rows[0].count
    });
  } catch (error) {
    console.error('Erreur DB:', error);
    res.status(500).json({
      status: 'ERROR',
      message: 'Erreur de connexion à la base de données'
    });
  }
});

// Routes d'authentification
app.use('/api/auth', authRoutes);

// Routes de profil
app.use('/api/profile', profileRoutes);

// Routes de photos
app.use('/api/photos', photosRoutes);

// Routes de notifications
app.use('/api/notifications', notificationsRoutes);

// Routes de chat
app.use('/api/chat', chatRoutes);

// Middleware de gestion des erreurs (doit être le dernier)
app.use(errorHandler);

// Démarrer le serveur
const startServer = async () => {
  try {
    // Tester la connexion à la base de données
    await testConnection();
    
    // Initialiser le transporteur email
    try {
      await initializeEmailTransporter();
      console.log('📧 Service email initialisé avec succès');
    } catch (emailError) {
      console.warn('⚠️ Avertissement: Service email non disponible, continuons sans email');
      console.warn('📧 Les emails ne seront pas envoyés mais les fonctionnalités continueront de fonctionner');
    }
    
    app.listen(PORT, () => {
      console.log(`🚀 Serveur Matcha démarré sur http://localhost:${PORT}`);
      console.log(`📡 Route de test : http://localhost:${PORT}/api/health`);
      console.log(`🗄️ Test DB : http://localhost:${PORT}/api/test-db`);
      console.log(`🔐 Auth routes : http://localhost:${PORT}/api/auth/*`);
      console.log(`🗄️ Base de données connectée avec succès`);
    });
  } catch (error) {
    console.error('❌ Erreur au démarrage du serveur:', error);
    process.exit(1);
  }
};

startServer();