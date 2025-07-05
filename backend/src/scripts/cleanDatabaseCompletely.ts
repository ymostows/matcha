import pool from '../config/database';

async function cleanDatabaseCompletely() {
  console.log('🧹 NETTOYAGE COMPLET de la base de données...\n');
  
  const client = await pool.connect();
  
  try {
    // État avant nettoyage
    const beforeUsers = await client.query('SELECT COUNT(*) FROM users');
    const beforePhotos = await client.query('SELECT COUNT(*) FROM photos');
    const beforeProfiles = await client.query('SELECT COUNT(*) FROM profiles');
    const beforeLikes = await client.query('SELECT COUNT(*) FROM likes');
    const beforeMatches = await client.query('SELECT COUNT(*) FROM matches');
    const beforeMessages = await client.query('SELECT COUNT(*) FROM messages');
    
    console.log(`📊 État AVANT nettoyage complet:`);
    console.log(`   - Utilisateurs: ${beforeUsers.rows[0].count}`);
    console.log(`   - Photos: ${beforePhotos.rows[0].count}`);
    console.log(`   - Profils: ${beforeProfiles.rows[0].count}`);
    console.log(`   - Likes: ${beforeLikes.rows[0].count}`);
    console.log(`   - Matches: ${beforeMatches.rows[0].count}`);
    console.log(`   - Messages: ${beforeMessages.rows[0].count}\n`);
    
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
      console.log(`🔒 Utilisateur principal à conserver: ${mainUserResult.rows[0].email} (ID: ${keepUserId})\n`);
    } else {
      console.log(`🔒 Aucun utilisateur principal trouvé, conservation par défaut de l'ID 1\n`);
    }
    
    // SUPPRESSION EN CASCADE - ordre important pour éviter les erreurs de contraintes
    console.log('🗑️  Suppression en cascade...\n');
    
    // 1. Tables de relations/interactions
    console.log('   🧹 Suppression des interactions...');
    const deletedNotifications = await client.query(`DELETE FROM notifications WHERE user_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedNotifications.rowCount || 0} notifications supprimées`);
    
    const deletedVisits = await client.query(`DELETE FROM profile_visits WHERE visitor_id != $1 AND visited_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedVisits.rowCount || 0} visites de profils supprimées`);
    
    const deletedMessages = await client.query(`DELETE FROM messages WHERE sender_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedMessages.rowCount || 0} messages supprimés`);
    
    const deletedMatches = await client.query(`DELETE FROM matches WHERE user1_id != $1 AND user2_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedMatches.rowCount || 0} matches supprimés`);
    
    const deletedLikes = await client.query(`DELETE FROM likes WHERE liker_id != $1 AND liked_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedLikes.rowCount || 0} likes supprimés`);
    
    // 2. Photos
    console.log('\n   📸 Suppression des photos...');
    const deletedPhotos = await client.query(`DELETE FROM photos WHERE user_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedPhotos.rowCount || 0} photos supprimées`);
    
    // 3. Profils
    console.log('\n   👤 Suppression des profils...');
    const deletedProfiles = await client.query(`DELETE FROM profiles WHERE user_id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedProfiles.rowCount || 0} profils supprimés`);
    
    // 4. Utilisateurs (sauf principal)
    console.log('\n   👥 Suppression des utilisateurs...');
    const deletedUsers = await client.query(`DELETE FROM users WHERE id != $1`, [keepUserId]);
    console.log(`      ✅ ${deletedUsers.rowCount || 0} utilisateurs supprimés`);
    
    // RÉINITIALISATION DES SÉQUENCES pour éviter les conflits d'ID
    console.log('\n🔄 Réinitialisation des séquences...');
    
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
    
    console.log(`   ✅ Séquence users redémarre à: ${nextUserId}`);
    console.log(`   ✅ Séquence photos redémarre à: ${nextPhotoId}`);
    console.log(`   ✅ Séquence profiles redémarre à: ${nextProfileId}`);
    
    // État après nettoyage
    const afterUsers = await client.query('SELECT COUNT(*) FROM users');
    const afterPhotos = await client.query('SELECT COUNT(*) FROM photos');
    const afterProfiles = await client.query('SELECT COUNT(*) FROM profiles');
    const afterLikes = await client.query('SELECT COUNT(*) FROM likes');
    const afterMatches = await client.query('SELECT COUNT(*) FROM matches');
    const afterMessages = await client.query('SELECT COUNT(*) FROM messages');
    
    console.log(`\n📊 État APRÈS nettoyage complet:`);
    console.log(`   - Utilisateurs: ${afterUsers.rows[0].count}`);
    console.log(`   - Photos: ${afterPhotos.rows[0].count}`);
    console.log(`   - Profils: ${afterProfiles.rows[0].count}`);
    console.log(`   - Likes: ${afterLikes.rows[0].count}`);
    console.log(`   - Matches: ${afterMatches.rows[0].count}`);
    console.log(`   - Messages: ${afterMessages.rows[0].count}`);
    
    // Vérification finale
    const finalUser = await client.query(`SELECT id, email, username FROM users WHERE id = $1`, [keepUserId]);
    if (finalUser.rows.length > 0) {
      console.log(`\n✅ Utilisateur principal conservé: ${finalUser.rows[0].email} (ID: ${finalUser.rows[0].id})`);
    }
    
    console.log('\n🎉 NETTOYAGE COMPLET TERMINÉ ! Base de données prête pour de nouveaux profils.\n');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage complet:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Script principal
async function main() {
  try {
    await cleanDatabaseCompletely();
    console.log('✅ Script de nettoyage complet terminé avec succès!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Erreur script:', error);
    process.exit(1);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  main();
} 