import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import pool from '../config/database';
import { getSocketService } from '../services/socketService';

const router = Router();

// Types de notifications
export enum NotificationType {
  LIKE = 'like',
  MATCH = 'match',
  VISIT = 'visit',
  UNLIKE = 'unlike',
  MESSAGE = 'message'
}

// Interface pour les notifications
export interface Notification {
  id: number;
  user_id: number;
  type: NotificationType;
  message: string;
  data?: any;
  is_read: boolean;
  created_at: string;
}

// Fonction pour créer une notification avec broadcasting temps réel
export async function createNotification(
  userId: number,
  type: NotificationType,
  message: string,
  data?: any
): Promise<void> {
  try {
    // Si un acteur est identifié (data.userId), vérifier qu'il n'est pas bloqué
    const actorId = data?.userId;
    if (actorId && actorId !== userId) {
      const blockCheck = await pool.query(
        `SELECT 1 FROM blocks
         WHERE (blocker_id = $1 AND blocked_id = $2)
            OR (blocker_id = $2 AND blocked_id = $1)`,
        [userId, actorId]
      );
      if (blockCheck.rows.length > 0) {
        return;
      }
    }

    // Utiliser le service Socket.io qui gère déjà la sauvegarde DB + temps réel
    const socketService = getSocketService();
    await socketService.sendNotification(userId, {
      type,
      message,
      data
    });
  } catch (socketError) {
    // Fallback: sauvegarder en base sans temps réel
    await pool.query(`
      INSERT INTO notifications (user_id, type, message, data, is_read, created_at)
      VALUES ($1, $2, $3, $4, false, CURRENT_TIMESTAMP)
    `, [userId, type, message, JSON.stringify(data)]);
  }
}

// GET /api/notifications - Obtenir les notifications de l'utilisateur
router.get('/', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const limit = parseInt(req.query.limit as string) || 20;
    const offset = parseInt(req.query.offset as string) || 0;

    const result = await pool.query(`
      SELECT 
        n.id,
        n.user_id,
        n.type,
        n.message,
        n.data,
        n.is_read,
        n.created_at
      FROM notifications n
      WHERE n.user_id = $1
      ORDER BY n.created_at DESC
      LIMIT $2 OFFSET $3
    `, [userId, limit, offset]);

    const notifications = result.rows.map(row => ({
      ...row,
      data: (() => {
        if (!row.data) return null;
        if (typeof row.data === 'string') {
          try {
            return JSON.parse(row.data);
          } catch (e) {
            return null;
          }
        }
        return row.data;
      })()
    }));

    res.json({
      success: true,
      notifications,
      total: result.rows.length
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/notifications/:id/read - Marquer une notification comme lue
router.put('/:id/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const notificationId = parseInt(req.params.id as string);

    if (isNaN(notificationId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID notification invalide' 
      });
      return;
    }

    const result = await pool.query(`
      UPDATE notifications 
      SET is_read = true 
      WHERE id = $1 AND user_id = $2
    `, [notificationId, userId]);

    if (result.rowCount === 0) {
      res.status(404).json({ 
        success: false, 
        message: 'Notification non trouvée' 
      });
      return;
    }

    res.json({
      success: true,
      message: 'Notification marquée comme lue'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/notifications/read-all - Marquer toutes les notifications comme lues
router.put('/read-all', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    await pool.query(`
      UPDATE notifications 
      SET is_read = true 
      WHERE user_id = $1 AND is_read = false
    `, [userId]);

    res.json({
      success: true,
      message: 'Toutes les notifications marquées comme lues'
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/notifications/unread-count - Obtenir le nombre de notifications non lues
router.get('/unread-count', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const result = await pool.query(`
      SELECT COUNT(*) as count
      FROM notifications 
      WHERE user_id = $1 AND is_read = false
    `, [userId]);

    res.json({
      success: true,
      count: parseInt(result.rows[0].count)
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// Endpoint de test supprimé - le système de notifications est maintenant en production

export default router;