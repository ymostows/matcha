import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import pool from '../config/database';

const router = Router();

// GET /api/dashboard/stats - Obtenir toutes les statistiques du dashboard
router.get('/stats', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    
    // Une seule requête optimisée pour récupérer toutes les stats
    const result = await pool.query(`
      SELECT 
        -- Nombre de likes reçus
        (SELECT COUNT(*) FROM likes WHERE liked_id = $1 AND is_like = true) as likes_received,
        
        -- Nombre de matches (likes mutuels)
        (SELECT COUNT(*) FROM matches WHERE user1_id = $1 OR user2_id = $1) as matches_count,
        
        -- Nombre de vues de profil
        (SELECT COUNT(*) FROM profile_visits WHERE visited_id = $1) as profile_visits,
        
        -- Nombre de messages non lus (à implémenter quand les conversations seront prêtes)
        0 as unread_messages
    `, [userId]);
    
    const stats = result.rows[0];
    
    res.json({
      success: true,
      stats: {
        likes: parseInt(stats.likes_received) || 0,
        matches: parseInt(stats.matches_count) || 0,
        messages: parseInt(stats.unread_messages) || 0,
        visits: parseInt(stats.profile_visits) || 0
      }
    });
  } catch (error) {
    console.error('Erreur récupération stats dashboard:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

export default router;