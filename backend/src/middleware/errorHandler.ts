import { Request, Response, NextFunction } from 'express';

interface AppError extends Error {
  statusCode?: number;
  isOperational?: boolean;
}

const errorHandler = (err: AppError, req: Request, res: Response, next: NextFunction) => {
  err.statusCode = err.statusCode || 500;
  err.message = err.message || 'Erreur Interne du Serveur';

  // Log de l'erreur pour le débogage (peut être étendu avec un logger comme Winston)
  console.error('💥 ERREUR NON GÉRÉE 💥', {
    timestamp: new Date().toISOString(),
    path: req.path,
    method: req.method,
    statusCode: err.statusCode,
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });

  // Pour les erreurs opérationnelles (ex: validation, etc.), on envoie le message au client
  if (err.isOperational) {
    return res.status(err.statusCode).json({
      status: 'error',
      message: err.message
    });
  }

  // Pour les erreurs de programmation ou inconnues, on envoie un message générique
  // afin de ne pas fuiter de détails d'implémentation
  return res.status(500).json({
    status: 'error',
    message: 'Une erreur inattendue est survenue. Veuillez réessayer plus tard.'
  });
};

export default errorHandler; 