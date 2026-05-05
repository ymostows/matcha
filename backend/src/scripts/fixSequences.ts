import pool from '../config/database';

async function fixSequences() {
  
  const client = await pool.connect();
  
  try {
    // 1. État actuel des séquences
    const currentSequences = await client.query(`
      SELECT 
        schemaname,
        sequencename,
        last_value
      FROM pg_sequences 
      WHERE sequencename IN ('users_id_seq', 'photos_id_seq', 'profiles_id_seq')
    `);
    
    currentSequences.rows.forEach(row => {
    });
    
    // 2. Valeurs réelles dans les tables
    const realValues = await client.query(`
      SELECT 
        'users' as table_name,
        COALESCE(MAX(id), 0) as max_id,
        COUNT(*) as count
      FROM users
      UNION ALL
      SELECT 
        'photos' as table_name,
        COALESCE(MAX(id), 0) as max_id,
        COUNT(*) as count
      FROM photos
      UNION ALL
      SELECT 
        'profiles' as table_name,
        COALESCE(MAX(id), 0) as max_id,
        COUNT(*) as count
      FROM profiles
    `);
    
    realValues.rows.forEach(row => {
    });
    
    // 3. Calculer les nouvelles valeurs correctes
    const usersMax = realValues.rows.find(r => r.table_name === 'users')?.max_id || 0;
    const photosMax = realValues.rows.find(r => r.table_name === 'photos')?.max_id || 0;
    const profilesMax = realValues.rows.find(r => r.table_name === 'profiles')?.max_id || 0;
    
    const newUsersSeq = usersMax;
    const newPhotosSeq = photosMax; 
    const newProfilesSeq = profilesMax;
    
    
    // 4. Appliquer les corrections avec setval()
    
    // setval(sequence, value, is_called) - is_called=true signifie que la prochaine valeur sera value+1
    await client.query(`SELECT setval('users_id_seq', ${newUsersSeq}, true)`);
    
    // Pour photos_id_seq, si 0 photos, on met 1 avec is_called=false pour que la prochaine soit 1
    if (newPhotosSeq === 0) {
      await client.query(`SELECT setval('photos_id_seq', 1, false)`);
    } else {
      await client.query(`SELECT setval('photos_id_seq', ${newPhotosSeq}, true)`);
    }
    
    await client.query(`SELECT setval('profiles_id_seq', ${newProfilesSeq}, true)`);
    
    // 5. Vérification finale immédiate avec nextval() (sans consommer)
    
    
    
  } catch (error) {
    throw error;
  } finally {
    client.release();
  }
}

// Script principal
async function main() {
  try {
    await fixSequences();
    process.exit(0);
  } catch (error) {
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 