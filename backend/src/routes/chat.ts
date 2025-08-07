import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import pool from '../config/database';
import { createNotification, NotificationType } from './notifications';
import { getSocketService } from '../services/socketService';

const router = Router();

// Interface pour les messages
export interface Message {
  id: number;
  conversation_id: number;
  sender_id: number;
  content: string;
  is_read: boolean;
  created_at: string;
}

// Interface pour les conversations
export interface Conversation {
  id: number;
  user1_id: number;
  user2_id: number;
  is_active: boolean;
  created_at: string;
  last_message_at: string;
}

// GET /api/chat/conversations - Obtenir les conversations de l'utilisateur
router.get('/conversations', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;

    const query = `
      SELECT 
        c.id,
        c.user1_id,
        c.user2_id,
        c.is_active,
        c.created_at,
        c.last_message_at,
        CASE 
          WHEN c.user1_id = $1 THEN u2.first_name
          ELSE u1.first_name
        END as other_user_name,
        CASE 
          WHEN c.user1_id = $1 THEN c.user2_id
          ELSE c.user1_id
        END as other_user_id,
        CASE 
          WHEN c.user1_id = $1 THEN (
            SELECT id 
            FROM photos 
            WHERE user_id = u2.id 
            ORDER BY is_profile_picture DESC, upload_date ASC
            LIMIT 1
          )
          ELSE (
            SELECT id 
            FROM photos 
            WHERE user_id = u1.id 
            ORDER BY is_profile_picture DESC, upload_date ASC
            LIMIT 1
          )
        END as other_user_photo_id,
        (
          SELECT content 
          FROM messages 
          WHERE conversation_id = c.id 
          ORDER BY created_at DESC 
          LIMIT 1
        ) as last_message_content,
        (
          SELECT COUNT(*)
          FROM messages 
          WHERE conversation_id = c.id 
            AND sender_id != $1 
            AND is_read = false
        ) as unread_count
      FROM conversations c
      JOIN users u1 ON c.user1_id = u1.id
      JOIN users u2 ON c.user2_id = u2.id
      WHERE (c.user1_id = $1 OR c.user2_id = $1) AND c.is_active = true
      ORDER BY c.last_message_at DESC
    `;

    const result = await pool.query(query, [userId]);
    
    // Log de debug pour voir les données
    console.log('🔍 DEBUG - Conversations récupérées:', JSON.stringify(result.rows.slice(0, 2), null, 2));
    
    res.json({
      success: true,
      conversations: result.rows
    });
  } catch (error) {
    console.error('Erreur récupération conversations:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/chat/conversations/:conversationId/messages - Obtenir les messages d'une conversation
router.get('/conversations/:conversationId/messages', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const conversationId = parseInt(req.params.conversationId!);
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;

    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID conversation invalide' 
      });
      return;
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    const conversationCheck = await pool.query(
      'SELECT 1 FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND is_active = true',
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      res.status(403).json({ 
        success: false, 
        message: 'Accès refusé à cette conversation' 
      });
      return;
    }

    const query = `
      SELECT 
        m.id,
        m.conversation_id,
        m.sender_id,
        m.content,
        m.is_read,
        m.created_at,
        u.first_name as sender_name
      FROM messages m
      JOIN users u ON m.sender_id = u.id
      WHERE m.conversation_id = $1
      ORDER BY m.created_at DESC
      LIMIT $2 OFFSET $3
    `;

    const result = await pool.query(query, [conversationId, limit, offset]);
    
    res.json({
      success: true,
      messages: result.rows.reverse() // Inverser pour avoir les plus anciens en premier
    });
  } catch (error) {
    console.error('Erreur récupération messages:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// POST /api/chat/conversations/:conversationId/messages - Envoyer un message
router.post('/conversations/:conversationId/messages', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const conversationId = parseInt(req.params.conversationId!);
    const { content } = req.body;

    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID conversation invalide' 
      });
      return;
    }

    if (!content || content.trim().length === 0) {
      res.status(400).json({ 
        success: false, 
        message: 'Le contenu du message est requis' 
      });
      return;
    }

    if (content.length > 1000) {
      res.status(400).json({ 
        success: false, 
        message: 'Le message est trop long (max 1000 caractères)' 
      });
      return;
    }

    // Vérifier que l'utilisateur fait partie de la conversation et qu'elle est active
    const conversationCheck = await pool.query(
      'SELECT user1_id, user2_id FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND is_active = true',
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      res.status(403).json({ 
        success: false, 
        message: 'Accès refusé à cette conversation ou conversation inactive' 
      });
      return;
    }

    const client = await pool.connect();
    try {
      // Insérer le message
      const messageResult = await client.query(`
        INSERT INTO messages (conversation_id, sender_id, content, is_read, created_at)
        VALUES ($1, $2, $3, false, CURRENT_TIMESTAMP)
        RETURNING id, conversation_id, sender_id, content, is_read, created_at
      `, [conversationId, userId, content.trim()]);

      // Mettre à jour last_message_at de la conversation
      await client.query(`
        UPDATE conversations 
        SET last_message_at = CURRENT_TIMESTAMP 
        WHERE id = $1
      `, [conversationId]);

      const newMessage = messageResult.rows[0];

      // Obtenir le nom de l'expéditeur pour l'événement Socket.io
      const senderResult = await client.query('SELECT first_name FROM users WHERE id = $1', [userId]);
      const senderName = senderResult.rows[0]?.first_name || 'Utilisateur';

      res.json({
        success: true,
        message: 'Message envoyé avec succès',
        messageData: {
          ...newMessage,
          sender_name: senderName
        }
      });

      // Émettre l'événement Socket.io en temps réel
      try {
        const socketService = getSocketService();
        socketService.getIO().to(`conversation_${conversationId}`).emit('new_message', {
          id: newMessage.id,
          conversation_id: newMessage.conversation_id,
          sender_id: newMessage.sender_id,
          content: newMessage.content,
          is_read: newMessage.is_read,
          created_at: newMessage.created_at,
          sender_name: senderName
        });
        console.log(`💬 Événement new_message émis pour conversation ${conversationId}`);
      } catch (socketError) {
        console.error('Erreur émission événement Socket.io:', socketError);
        // Ne pas faire échouer la requête si Socket.io a un problème
      }

    } finally {
      client.release();
    }

    // Créer une notification pour le destinataire
    const conversation = conversationCheck.rows[0];
    const recipientId = conversation.user1_id === userId ? conversation.user2_id : conversation.user1_id;
    
    // Obtenir le nom de l'expéditeur pour la notification
    const senderForNotif = await pool.query('SELECT first_name FROM users WHERE id = $1', [userId]);
    const senderName = senderForNotif.rows[0]?.first_name || 'Utilisateur';
    
    await createNotification(
      recipientId,
      NotificationType.MESSAGE,
      `💬 ${senderName} vous a envoyé un message`,
      { 
        userId: userId, 
        conversationId: conversationId,
        senderName: senderName
      }
    );

  } catch (error) {
    console.error('Erreur envoi message:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// PUT /api/chat/conversations/:conversationId/read - Marquer les messages comme lus
router.put('/conversations/:conversationId/read', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const conversationId = parseInt(req.params.conversationId!);

    if (isNaN(conversationId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID conversation invalide' 
      });
      return;
    }

    // Vérifier que l'utilisateur fait partie de la conversation
    const conversationCheck = await pool.query(
      'SELECT 1 FROM conversations WHERE id = $1 AND (user1_id = $2 OR user2_id = $2) AND is_active = true',
      [conversationId, userId]
    );

    if (conversationCheck.rows.length === 0) {
      res.status(403).json({ 
        success: false, 
        message: 'Accès refusé à cette conversation' 
      });
      return;
    }

    // Marquer tous les messages de cette conversation comme lus (sauf ceux envoyés par l'utilisateur)
    const updatedMessages = await pool.query(`
      UPDATE messages 
      SET is_read = true 
      WHERE conversation_id = $1 AND sender_id != $2 AND is_read = false
      RETURNING id, sender_id
    `, [conversationId, userId]);

    res.json({
      success: true,
      message: 'Messages marqués comme lus',
      updatedCount: updatedMessages.rows.length
    });

    // Émettre l'événement Socket.io pour notifier les expéditeurs que leurs messages ont été lus
    try {
      const socketService = getSocketService();
      
      // Pour chaque message marqué comme lu, notifier l'expéditeur
      for (const message of updatedMessages.rows) {
        socketService.getIO().to(`user_${message.sender_id}`).emit('message_read', {
          messageId: message.id,
          conversationId: conversationId,
          readBy: userId
        });
      }

      // Également émettre vers la conversation pour synchroniser tous les clients
      socketService.getIO().to(`conversation_${conversationId}`).emit('messages_read', {
        conversationId: conversationId,
        readBy: userId,
        messageIds: updatedMessages.rows.map(m => m.id)
      });

      console.log(`📖 ${updatedMessages.rows.length} messages marqués comme lus dans conversation ${conversationId}`);
      
      // Supprimer les notifications de messages de cette conversation pour l'utilisateur
      await pool.query(`
        UPDATE notifications 
        SET is_read = true 
        WHERE user_id = $1 
        AND type = 'MESSAGE' 
        AND data->>'conversationId' = $2::text
        AND is_read = false
      `, [userId, conversationId.toString()]);
      
    } catch (socketError) {
      console.error('Erreur émission événement messages lus:', socketError);
    }

  } catch (error) {
    console.error('Erreur marquer messages lus:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

// GET /api/chat/conversations/:userId/start - Démarrer une conversation avec un utilisateur
router.get('/conversations/:userId/start', authenticateToken, async (req: Request, res: Response): Promise<void> => {
  try {
    const userId = (req as any).user.userId;
    const otherUserId = parseInt(req.params.userId!);

    if (isNaN(otherUserId)) {
      res.status(400).json({ 
        success: false, 
        message: 'ID utilisateur invalide' 
      });
      return;
    }

    if (userId === otherUserId) {
      res.status(400).json({ 
        success: false, 
        message: 'Vous ne pouvez pas démarrer une conversation avec vous-même' 
      });
      return;
    }

    // Vérifier qu'il y a un match entre les deux utilisateurs
    const matchCheck = await pool.query(
      'SELECT 1 FROM matches WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)',
      [userId, otherUserId]
    );

    if (matchCheck.rows.length === 0) {
      res.status(403).json({ 
        success: false, 
        message: 'Vous devez matcher avec cet utilisateur pour démarrer une conversation' 
      });
      return;
    }

    // Vérifier si une conversation existe déjà
    let conversationResult = await pool.query(
      'SELECT id FROM conversations WHERE (user1_id = $1 AND user2_id = $2) OR (user1_id = $2 AND user2_id = $1)',
      [userId, otherUserId]
    );

    let conversationId;
    if (conversationResult.rows.length > 0) {
      conversationId = conversationResult.rows[0].id;
      
      // Réactiver la conversation si elle était inactive
      await pool.query(
        'UPDATE conversations SET is_active = true WHERE id = $1',
        [conversationId]
      );
    } else {
      // Créer une nouvelle conversation
      const newConversationResult = await pool.query(`
        INSERT INTO conversations (user1_id, user2_id, is_active, created_at, last_message_at)
        VALUES ($1, $2, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
        RETURNING id
      `, [Math.min(userId, otherUserId), Math.max(userId, otherUserId)]);
      
      conversationId = newConversationResult.rows[0].id;
    }

    res.json({
      success: true,
      conversationId
    });

  } catch (error) {
    console.error('Erreur démarrage conversation:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Erreur serveur' 
    });
  }
});

export default router;