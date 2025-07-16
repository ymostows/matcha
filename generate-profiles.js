const { spawn } = require('child_process');
const path = require('path');

// Script pour lancer la génération de profils avec Docker
console.log('🚀 Génération de profils avec photos de qualité...');

const count = process.argv[2] || '15';
console.log(`📊 Nombre de profils à générer: ${count}`);

// Exécuter le script TypeScript dans le conteneur backend
const dockerCommand = 'docker-compose';
const dockerArgs = [
  'exec',
  'backend',
  'npm',
  'run',
  'ts-node',
  'src/scripts/generateQualityProfiles.ts',
  count
];

console.log(`🐳 Commande: ${dockerCommand} ${dockerArgs.join(' ')}`);

const child = spawn(dockerCommand, dockerArgs, {
  stdio: 'inherit',
  shell: true
});

child.on('error', (error) => {
  console.error('❌ Erreur lors de l\'exécution:', error);
});

child.on('close', (code) => {
  if (code === 0) {
    console.log('\n🎉 Génération terminée avec succès !');
    console.log('📱 Vous pouvez maintenant tester la page de browsing à: http://localhost:5173/browsing');
  } else {
    console.error(`❌ Processus terminé avec le code: ${code}`);
  }
});

// Gérer Ctrl+C
process.on('SIGINT', () => {
  console.log('\n⏹️ Arrêt de la génération...');
  child.kill('SIGINT');
  process.exit(0);
});