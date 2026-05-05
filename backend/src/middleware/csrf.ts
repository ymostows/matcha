import { Request, Response, NextFunction } from 'express';

const SAFE_METHODS = ['GET', 'HEAD', 'OPTIONS'];

export const csrfProtection = (req: Request, res: Response, next: NextFunction): void => {
  if (SAFE_METHODS.includes(req.method)) {
    next();
    return;
  }

  const allowedOrigins = process.env.CORS_ORIGINS
    ? process.env.CORS_ORIGINS.split(',')
    : [
        'http://localhost:5173',
        'http://localhost:5174',
        'http://localhost:3000',
        process.env.FRONTEND_URL || 'http://localhost:5173',
      ];

  const origin = req.headers.origin ?? req.headers.referer ?? '';

  // Autoriser les requêtes locales (scripts de seed, tests backend)
  const ip = req.ip ?? req.socket.remoteAddress ?? '';
  const isLocalhost = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
  if (!origin && isLocalhost) {
    next();
    return;
  }

  const allowed = allowedOrigins.some(o => origin.startsWith(o.trim()));
  if (!allowed) {
    res.status(403).json({ success: false, message: 'Accès interdit : Origin non autorisé' });
    return;
  }

  next();
};
