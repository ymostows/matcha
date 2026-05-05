import pool from '../config/database';

async function cleanDatabase() {
  
  const client = await pool.connect();
  
  try {
    // Compter les utilisateurs actuels
    const userCountResult = await client.query('SELECT COUNT(*) FROM users');
    const photoCountResult = await client.query('SELECT COUNT(*) FROM photos');
    const profileCountResult = await client.query('SELECT COUNT(*) FROM profiles');
    
    
    // Supprimer tous les comptes de test (garder seulement l'utilisateur de test principal)
    
    // Désactiver temporairement les contraintes de clé étrangère pour faciliter la suppression
    await client.query('SET session_replication_role = replica;');
    
    // Supprimer toutes les données des tables liées d'abord
    await client.query('DELETE FROM notifications WHERE user_id != 1');
    await client.query('DELETE FROM profile_visits WHERE visitor_id != 1 AND visited_id != 1');
    await client.query('DELETE FROM messages WHERE sender_id != 1');
    await client.query('DELETE FROM matches WHERE user1_id != 1 AND user2_id != 1');
    await client.query('DELETE FROM likes WHERE liker_id != 1 AND liked_id != 1');
    
    // Supprimer les photos (sauf celles de l'utilisateur test principal avec ID=1)
    const deletePhotosResult = await client.query(`
      DELETE FROM photos WHERE user_id != 1
    `);
    
    // Supprimer les profils (sauf celui de l'utilisateur test principal)
    const deleteProfilesResult = await client.query(`
      DELETE FROM profiles WHERE user_id != 1
    `);
    
    // Supprimer les utilisateurs (sauf l'utilisateur test principal avec ID=1)
    const deleteUsersResult = await client.query(`
      DELETE FROM users WHERE id != 1
    `);
    
    // Réactiver les contraintes de clé étrangère
    await client.query('SET session_replication_role = DEFAULT;');
    
    // Vérifier l'état final
    const finalUserCount = await client.query('SELECT COUNT(*) FROM users');
    const finalPhotoCount = await client.query('SELECT COUNT(*) FROM photos');
    const finalProfileCount = await client.query('SELECT COUNT(*) FROM profiles');
    
    
    // Vérifier que l'utilisateur de test principal existe toujours
    const testUserResult = await client.query(`
      SELECT id, email, username FROM users WHERE id = 1
    `);
    
    if (testUserResult.rows.length > 0) {
    } else {
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
    await cleanDatabase();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
} 