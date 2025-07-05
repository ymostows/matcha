import pool from '../config/database';

async function cleanDatabase() {
  console.log('🧹 Nettoyage de la base de données...\n');
  
  const client = await pool.connect();
  
  try {
    // Compter les utilisateurs actuels
    const userCountResult = await client.query('SELECT COUNT(*) FROM users');
    const photoCountResult = await client.query('SELECT COUNT(*) FROM photos');
    const profileCountResult = await client.query('SELECT COUNT(*) FROM profiles');
    
    console.log(`📊 État actuel:`);
    console.log(`   - Utilisateurs: ${userCountResult.rows[0].count}`);
    console.log(`   - Photos: ${photoCountResult.rows[0].count}`);
    console.log(`   - Profils: ${profileCountResult.rows[0].count}\n`);
    
    // Supprimer tous les comptes de test (garder seulement l'utilisateur de test principal)
    console.log('🗑️  Suppression des comptes de test...');
    
    // Désactiver temporairement les contraintes de clé étrangère pour faciliter la suppression
    await client.query('SET session_replication_role = replica;');
    
    // Supprimer toutes les données des tables liées d'abord
    console.log('   🧹 Suppression des données liées...');
    await client.query('DELETE FROM notifications WHERE user_id != 1');
    await client.query('DELETE FROM profile_visits WHERE visitor_id != 1 AND visited_id != 1');
    await client.query('DELETE FROM messages WHERE sender_id != 1');
    await client.query('DELETE FROM matches WHERE user1_id != 1 AND user2_id != 1');
    await client.query('DELETE FROM likes WHERE liker_id != 1 AND liked_id != 1');
    
    // Supprimer les photos (sauf celles de l'utilisateur test principal avec ID=1)
    const deletePhotosResult = await client.query(`
      DELETE FROM photos WHERE user_id != 1
    `);
    console.log(`   ✅ ${deletePhotosResult.rowCount} photos supprimées`);
    
    // Supprimer les profils (sauf celui de l'utilisateur test principal)
    const deleteProfilesResult = await client.query(`
      DELETE FROM profiles WHERE user_id != 1
    `);
    console.log(`   ✅ ${deleteProfilesResult.rowCount} profils supprimés`);
    
    // Supprimer les utilisateurs (sauf l'utilisateur test principal avec ID=1)
    const deleteUsersResult = await client.query(`
      DELETE FROM users WHERE id != 1
    `);
    console.log(`   ✅ ${deleteUsersResult.rowCount} utilisateurs supprimés`);
    
    // Réactiver les contraintes de clé étrangère
    await client.query('SET session_replication_role = DEFAULT;');
    
    // Vérifier l'état final
    const finalUserCount = await client.query('SELECT COUNT(*) FROM users');
    const finalPhotoCount = await client.query('SELECT COUNT(*) FROM photos');
    const finalProfileCount = await client.query('SELECT COUNT(*) FROM profiles');
    
    console.log(`\n📊 État après nettoyage:`);
    console.log(`   - Utilisateurs restants: ${finalUserCount.rows[0].count}`);
    console.log(`   - Photos restantes: ${finalPhotoCount.rows[0].count}`);
    console.log(`   - Profils restants: ${finalProfileCount.rows[0].count}`);
    
    // Vérifier que l'utilisateur de test principal existe toujours
    const testUserResult = await client.query(`
      SELECT id, email, username FROM users WHERE id = 1
    `);
    
    if (testUserResult.rows.length > 0) {
      console.log(`\n✅ Utilisateur de test principal conservé: ${testUserResult.rows[0].email} (ID: ${testUserResult.rows[0].id})`);
    } else {
      console.log(`\n⚠️  Utilisateur de test principal non trouvé`);
    }
    
    console.log('\n🎉 Nettoyage terminé ! Base de données prête pour de nouveaux profils.\n');
    
  } catch (error) {
    console.error('❌ Erreur lors du nettoyage:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Script principal
async function main() {
  try {
    await cleanDatabase();
    console.log('✅ Script de nettoyage terminé avec succès!');
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