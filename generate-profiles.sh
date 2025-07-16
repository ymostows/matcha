#!/bin/bash

# Script pour générer des profils avec photos pour Matcha
# Usage: ./generate-profiles.sh [nombre_de_profils]

# Couleurs pour les messages
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher un message coloré
print_message() {
    echo -e "${2}${1}${NC}"
}

# Vérifier si Docker est en cours d'exécution
if ! docker info > /dev/null 2>&1; then
    print_message "❌ Docker n'est pas en cours d'exécution." $RED
    print_message "Veuillez démarrer Docker et relancer ce script." $YELLOW
    exit 1
fi

# Vérifier si docker-compose est disponible
if ! command -v docker-compose &> /dev/null; then
    print_message "❌ docker-compose n'est pas installé." $RED
    exit 1
fi

# Définir le nombre de profils à générer
PROFILE_COUNT=${1:-10}

# Validation du nombre
if ! [[ "$PROFILE_COUNT" =~ ^[0-9]+$ ]] || [ "$PROFILE_COUNT" -lt 1 ] || [ "$PROFILE_COUNT" -gt 100 ]; then
    print_message "❌ Veuillez fournir un nombre entre 1 et 100." $RED
    echo "Usage: $0 [nombre_de_profils]"
    echo "Exemple: $0 15"
    exit 1
fi

print_message "🚀 Génération de $PROFILE_COUNT profils avec photos..." $BLUE
print_message "📝 Cela peut prendre quelques minutes..." $YELLOW

# Vérifier si les conteneurs sont démarrés
if ! docker-compose ps | grep -q "Up"; then
    print_message "⚠️  Les conteneurs ne semblent pas démarrés." $YELLOW
    print_message "🔄 Démarrage des conteneurs..." $BLUE
    docker-compose up -d
    
    # Attendre que les conteneurs soient prêts
    print_message "⏳ Attente que les services soient prêts..." $YELLOW
    sleep 10
fi

# Exécuter le script de génération
print_message "🎯 Génération en cours..." $BLUE
if docker-compose exec -T backend npm run generate:profiles $PROFILE_COUNT; then
    print_message "✅ Génération terminée avec succès !" $GREEN
    print_message "📊 $PROFILE_COUNT profils créés avec photos personnalisées" $GREEN
    print_message "🌐 Vous pouvez maintenant tester l'application:" $BLUE
    print_message "   - Frontend: http://localhost:5173" $BLUE
    print_message "   - Page de browsing: http://localhost:5173/browsing" $BLUE
    print_message "   - Adminer (DB): http://localhost:8080" $BLUE
else
    print_message "❌ Erreur lors de la génération des profils." $RED
    print_message "🔍 Vérifiez les logs avec: docker-compose logs backend" $YELLOW
    exit 1
fi

print_message "🎉 Terminé ! Les profils sont maintenant disponibles dans l'application." $GREEN