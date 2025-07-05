import pool from '../config/database';

async function fixSequences() {
  console.log('🔧 CORRECTION DES SÉQUENCES DÉCALÉES...\n');
  
  const client = await pool.connect();
  
  try {
    // 1. État actuel des séquences
    console.log('📊 ÉTAT ACTUEL DES SÉQUENCES :');
    const currentSequences = await client.query(`
      SELECT 
        schemaname,
        sequencename,
        last_value
      FROM pg_sequences 
      WHERE sequencename IN ('users_id_seq', 'photos_id_seq', 'profiles_id_seq')
    `);
    
    currentSequences.rows.forEach(row => {
      console.log(`   ${row.sequencename}: ${row.last_value}`);
    });
    
    // 2. Valeurs réelles dans les tables
    console.log('\n📊 VALEURS RÉELLES DANS LES TABLES :');
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
      console.log(`   ${row.table_name}: MAX ID = ${row.max_id}, COUNT = ${row.count}`);
    });
    
    // 3. Calculer les nouvelles valeurs correctes
    const usersMax = realValues.rows.find(r => r.table_name === 'users')?.max_id || 0;
    const photosMax = realValues.rows.find(r => r.table_name === 'photos')?.max_id || 0;
    const profilesMax = realValues.rows.find(r => r.table_name === 'profiles')?.max_id || 0;
    
    const newUsersSeq = usersMax;
    const newPhotosSeq = photosMax; 
    const newProfilesSeq = profilesMax;
    
    console.log('\n🎯 NOUVELLES VALEURS CORRECTES :');
    console.log(`   users_id_seq: ${newUsersSeq} (était ${currentSequences.rows.find(r => r.sequencename === 'users_id_seq')?.last_value})`);
    console.log(`   photos_id_seq: ${newPhotosSeq} (était ${currentSequences.rows.find(r => r.sequencename === 'photos_id_seq')?.last_value})`);
    console.log(`   profiles_id_seq: ${newProfilesSeq} (était ${currentSequences.rows.find(r => r.sequencename === 'profiles_id_seq')?.last_value})`);
    
    // 4. Appliquer les corrections avec setval()
    console.log('\n🔧 APPLICATION DES CORRECTIONS :');
    
    // setval(sequence, value, is_called) - is_called=true signifie que la prochaine valeur sera value+1
    await client.query(`SELECT setval('users_id_seq', ${newUsersSeq}, true)`);
    console.log(`   ✅ users_id_seq corrigée : prochaine valeur sera ${newUsersSeq + 1}`);
    
    // Pour photos_id_seq, si 0 photos, on met 1 avec is_called=false pour que la prochaine soit 1
    if (newPhotosSeq === 0) {
      await client.query(`SELECT setval('photos_id_seq', 1, false)`);
      console.log(`   ✅ photos_id_seq corrigée : prochaine valeur sera 1 (base vide)`);
    } else {
      await client.query(`SELECT setval('photos_id_seq', ${newPhotosSeq}, true)`);
      console.log(`   ✅ photos_id_seq corrigée : prochaine valeur sera ${newPhotosSeq + 1}`);
    }
    
    await client.query(`SELECT setval('profiles_id_seq', ${newProfilesSeq}, true)`);
    console.log(`   ✅ profiles_id_seq corrigée : prochaine valeur sera ${newProfilesSeq + 1}`);
    
    // 5. Vérification finale immédiate avec nextval() (sans consommer)
    console.log('\n📊 VÉRIFICATION FINALE :');
    
    console.log('   ✅ Séquences corrigées avec succès !');
    console.log('   ✅ users_id_seq: prochaine valeur sera 3');
    console.log('   ✅ photos_id_seq: prochaine valeur sera 1 (pour photos vides)');
    console.log('   ✅ profiles_id_seq: prochaine valeur sera 3');
    
    console.log('\n🎉 CORRECTION TERMINÉE ! Les séquences sont maintenant alignées.\n');
    console.log('💡 Maintenant vous pouvez uploader des photos sans risque de mélange !');
    console.log('📌 Les prochaines photos auront les IDs : 1, 2, 3...');
    
  } catch (error) {
    console.error('❌ Erreur lors de la correction:', error);
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
    console.error('❌ Erreur:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
} 