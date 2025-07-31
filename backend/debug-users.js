const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

async function checkUsers() {
  try {
    // Compter les utilisateurs avec géolocalisation
    const result = await pool.query(`
      SELECT 
        COUNT(*) as total_users,
        COUNT(CASE WHEN location_lat IS NOT NULL AND location_lng IS NOT NULL AND location_lat != 0 AND location_lng != 0 THEN 1 END) as users_with_location
      FROM profiles
    `);
    
    console.log('📊 Statistiques utilisateurs:');
    console.log('- Total utilisateurs:', result.rows[0].total_users);
    console.log('- Avec géolocalisation:', result.rows[0].users_with_location);
    
    // Voir quelques exemples
    const examples = await pool.query(`
      SELECT u.first_name, u.last_name, p.city, p.location_lat, p.location_lng
      FROM profiles p 
      JOIN users u ON p.user_id = u.id
      WHERE p.location_lat IS NOT NULL AND p.location_lng IS NOT NULL 
      AND p.location_lat != 0 AND p.location_lng != 0
      LIMIT 5
    `);
    
    console.log('\\n📍 Exemples d\'utilisateurs avec géolocalisation:');
    examples.rows.forEach(user => {
      console.log(`- ${user.first_name} ${user.last_name} (${user.city}): ${user.location_lat}, ${user.location_lng}`);
    });
    
  } catch (error) {
    console.error('❌ Erreur:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

checkUsers();