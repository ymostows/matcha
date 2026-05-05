// Point d'entrée principal du serveur Express
import dotenv from 'dotenv';
// Charger les variables d'environnement EN PREMIER
dotenv.config();

import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import { createServer } from 'http';
import { testConnection } from './config/database';
import pool from './config/database';
import authRoutes from './routes/auth';
import profileRoutes from './routes/profile';
import photosRoutes from './routes/photos';
import notificationsRoutes from './routes/notifications';
import chatRoutes from './routes/chat';
import dashboardRoutes from './routes/dashboard';
import { sanitizeInput } from './middleware/sanitization';
import { csrfProtection } from './middleware/csrf';
import { initializeEmailTransporter } from './config/email';
import errorHandler from './middleware/errorHandler';
import { initializeSocketService } from './services/socketService';

// Créer l'application Express
const app = express();

// Créer le serveur HTTP
const httpServer = createServer(app);

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
// Configuration CORS dynamique basée sur les variables d'environnement
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',')
  : [
      'http://localhost:5173', // Port par défaut de Vite
      'http://localhost:5174', // Port alternatif
      'http://localhost:3000',  // Port React classique
      process.env.FRONTEND_URL || 'http://localhost:5173'
    ];

app.use(cors({
  origin: corsOrigins,
  credentials: true
})); // CORS sécurisé avec origins configurables
app.use(express.json({ limit: '50mb' })); // Parser JSON avec limite pour base64
app.use(csrfProtection); // Protection CSRF via validation Origin
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

// Routes de dashboard
app.use('/api/dashboard', dashboardRoutes);

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
    } catch (emailError) {
    }
    
    // Initialiser Socket.io
    const socketService = initializeSocketService(httpServer);
    
    httpServer.listen(PORT, () => {
    });
  } catch (error) {
    process.exit(1);
  }
};

startServer();