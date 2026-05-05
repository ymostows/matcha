import pool from '../config/database';

async function cleanDatabaseCompletely() {
  
  const client = await pool.connect();
  
  try {
    // État avant nettoyage
    const beforeUsers = await client.query('SELECT COUNT(*) FROM users');
    const beforePhotos = await client.query('SELECT COUNT(*) FROM photos');
    const beforeProfiles = await client.query('SELECT COUNT(*) FROM profiles');
    const beforeLikes = await client.query('SELECT COUNT(*) FROM likes');
    const beforeMatches = await client.query('SELECT COUNT(*) FROM matches');
    const beforeMessages = await client.query('SELECT COUNT(*) FROM messages');
    
    
    // Déterminer quel utilisateur principal garder
    const mainUserResult = await client.query(`
      SELECT id, email, username 
      FROM users 
      WHERE email LIKE '%test@matcha.com%' OR email LIKE '%test%'
      ORDER BY id ASC 
      LIMIT 1
    `);
    
    let keepUserId = 1; // Par défaut
    if (mainUserResult.rows.length > 0) {
      keepUserId = mainUserResult.rows[0].id;
    } else {
    }
    
    // SUPPRESSION EN CASCADE - ordre important pour éviter les erreurs de contraintes
    
    // 1. Tables de relations/interactions
    const deletedNotifications = await client.query(`DELETE FROM notifications WHERE user_id != $1`, [keepUserId]);
    
    const deletedVisits = await client.query(`DELETE FROM profile_visits WHERE visitor_id != $1 AND visited_id != $1`, [keepUserId]);
    
    const deletedMessages = await client.query(`DELETE FROM messages WHERE sender_id != $1`, [keepUserId]);
    
    const deletedMatches = await client.query(`DELETE FROM matches WHERE user1_id != $1 AND user2_id != $1`, [keepUserId]);
    
    const deletedLikes = await client.query(`DELETE FROM likes WHERE liker_id != $1 AND liked_id != $1`, [keepUserId]);
    
    // 2. Photos
    const deletedPhotos = await client.query(`DELETE FROM photos WHERE user_id != $1`, [keepUserId]);
    
    // 3. Profils
    const deletedProfiles = await client.query(`DELETE FROM profiles WHERE user_id != $1`, [keepUserId]);
    
    // 4. Utilisateurs (sauf principal)
    const deletedUsers = await client.query(`DELETE FROM users WHERE id != $1`, [keepUserId]);
    
    // RÉINITIALISATION DES SÉQUENCES pour éviter les conflits d'ID
    
    // Obtenir le prochain ID disponible
    const maxUserId = await client.query('SELECT MAX(id) as max_id FROM users');
    const nextUserId = (maxUserId.rows[0].max_id || 0) + 1;
    
    const maxPhotoId = await client.query('SELECT MAX(id) as max_id FROM photos');
    const nextPhotoId = (maxPhotoId.rows[0].max_id || 0) + 1;
    
    const maxProfileId = await client.query('SELECT MAX(id) as max_id FROM profiles');
    const nextProfileId = (maxProfileId.rows[0].max_id || 0) + 1;
    
    // Réinitialiser les séquences
    await client.query(`ALTER SEQUENCE users_id_seq RESTART WITH ${nextUserId}`);
    await client.query(`ALTER SEQUENCE photos_id_seq RESTART WITH ${nextPhotoId}`);
    await client.query(`ALTER SEQUENCE profiles_id_seq RESTART WITH ${nextProfileId}`);
    
    
    // État après nettoyage
    const afterUsers = await client.query('SELECT COUNT(*) FROM users');
    const afterPhotos = await client.query('SELECT COUNT(*) FROM photos');
    const afterProfiles = await client.query('SELECT COUNT(*) FROM profiles');
    const afterLikes = await client.query('SELECT COUNT(*) FROM likes');
    const afterMatches = await client.query('SELECT COUNT(*) FROM matches');
    const afterMessages = await client.query('SELECT COUNT(*) FROM messages');
    
    
    // Vérification finale
    const finalUser = await client.query(`SELECT id, email, username FROM users WHERE id = $1`, [keepUserId]);
    if (finalUser.rows.length > 0) {
    }
    
    
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

// Script principal
async function main() {
  try {
    await cleanDatabaseCompletely();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
} 