#!/bin/bash

# Script de setup automatique renforcé pour Matcha
# Version 2.0 - Résistant aux erreurs et diagnostique les problèmes
# Ce script configure l'environnement de développement après un clone

set -e  # Arrêter en cas d'erreur

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Fonction pour afficher les messages colorés
log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Fonction pour vérifier si une commande existe
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Fonction pour attendre qu'un service soit prêt avec timeout
wait_for_service() {
    local service_name="$1"
    local url="$2"
    local max_attempts="$3"
    local attempt=1
    
    log_info "Attente du service $service_name..."
    
    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url" >/dev/null 2>&1; then
            log_success "$service_name est prêt !"
            return 0
        fi
        
        log_info "Tentative $attempt/$max_attempts pour $service_name..."
        sleep 5
        attempt=$((attempt + 1))
    done
    
    log_error "$service_name n'est pas accessible après $max_attempts tentatives"
    return 1
}

# Fonction pour diagnostiquer les problèmes
diagnose_issues() {
    log_info "🔍 Diagnostic automatique des problèmes..."
    
    # Vérifier les ports occupés
    log_info "Vérification des ports..."
    for port in 3001 5173 5433 8080; do
        if lsof -i :$port >/dev/null 2>&1; then
            local process=$(lsof -i :$port | tail -n 1 | awk '{print $1 " (PID: " $2 ")"}')
            log_warning "Port $port occupé par: $process"
        fi
    done
    
    # Vérifier l'espace disque
    local available_space=$(df -h . | tail -n 1 | awk '{print $4}')
    log_info "Espace disque disponible: $available_space"
    
    # Vérifier les logs Docker
    log_info "Dernières erreurs Docker (si existantes):"
    docker-compose logs --tail=10 2>/dev/null || log_warning "Pas de logs Docker disponibles"
    
    # Vérifier les conteneurs
    log_info "État des conteneurs:"
    docker-compose ps 2>/dev/null || log_warning "Impossible de vérifier l'état des conteneurs"
}

echo "🚀 Configuration de l'environnement Matcha - Setup Renforcé v2.0"
echo "=================================================================="

# 1. Vérifier les prérequis
log_info "1. Vérification des prérequis..."

if ! command_exists docker; then
    log_error "Docker n'est pas installé. Installation requise:"
    echo "- Ubuntu/Debian: curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh"
    echo "- Windows/Mac: https://docs.docker.com/get-docker/"
    exit 1
fi

if ! command_exists docker-compose; then
    log_error "Docker Compose n'est pas installé. Installation requise:"
    echo "- curl -L \"https://github.com/docker/compose/releases/download/v2.20.0/docker-compose-\$(uname -s)-\$(uname -m)\" -o /usr/local/bin/docker-compose"
    echo "- chmod +x /usr/local/bin/docker-compose"
    exit 1
fi

# Vérifier que Docker fonctionne
if ! docker info >/dev/null 2>&1; then
    log_error "Docker n'est pas démarré ou accessible. Essayez:"
    echo "- sudo systemctl start docker"
    echo "- sudo usermod -aG docker \$USER (puis redémarrer la session)"
    exit 1
fi

log_success "Prérequis validés"

# 2. Créer les fichiers .env depuis les exemples si nécessaire
log_info "2. Configuration des fichiers d'environnement..."

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/env.example" ]; then
        log_info "Création de backend/.env depuis env.example..."
        cp backend/env.example backend/.env
        log_success "backend/.env créé"
    else
        log_error "Fichier backend/env.example manquant"
        exit 1
    fi
else
    log_success "backend/.env existe déjà"
fi

if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/env.example" ]; then
        log_info "Création de frontend/.env depuis env.example..."
        cp frontend/env.example frontend/.env
        log_success "frontend/.env créé"
    else
        log_error "Fichier frontend/env.example manquant"
        exit 1
    fi
else
    log_success "frontend/.env existe déjà"
fi

# 3. Nettoyage automatique des volumes Docker (optionnel mais recommandé)
log_info "3. Gestion des volumes Docker..."

read -p "🗑️  Voulez-vous nettoyer les volumes Docker existants ? (O/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    log_info "Nettoyage des volumes Docker..."
    
    # Arrêter les conteneurs existants
    docker-compose down -v 2>/dev/null || true
    
    # Nettoyer les volumes spécifiques à Matcha
    docker volume rm matcha_postgres_data 2>/dev/null || true
    
    # Nettoyer les volumes orphelins
    docker volume prune -f
    
    log_success "Nettoyage terminé"
else
    log_info "Conservation des volumes existants"
fi

# 4. Construire et démarrer les conteneurs avec gestion d'erreur
log_info "4. Construction et démarrage des conteneurs..."

# Construire d'abord sans démarrer pour détecter les erreurs de build
log_info "Construction des images Docker..."
if ! docker-compose build 2>&1 | tee /tmp/docker-build.log; then
    log_error "Erreur lors de la construction des images Docker"
    log_info "Logs de construction:"
    tail -20 /tmp/docker-build.log
    diagnose_issues
    exit 1
fi

# Démarrer les services
log_info "Démarrage des conteneurs..."
if ! docker-compose up -d; then
    log_error "Erreur lors du démarrage des conteneurs"
    diagnose_issues
    exit 1
fi

# 5. Attendre que les services soient prêts avec timeouts intelligents
log_info "5. Vérification du démarrage des services..."

# Attendre PostgreSQL (critique)
if ! wait_for_service "PostgreSQL" "http://localhost:8080" 24; then
    log_error "PostgreSQL/Adminer n'est pas accessible"
    diagnose_issues
    exit 1
fi

# Attendre le Backend (critique)
if ! wait_for_service "Backend API" "http://localhost:3001/api/health" 18; then
    log_error "Backend API n'est pas accessible"
    log_info "Logs du backend:"
    docker-compose logs backend --tail=20
    diagnose_issues
    exit 1
fi

# Attendre le Frontend (moins critique)
if ! wait_for_service "Frontend" "http://localhost:5173" 12; then
    log_warning "Frontend pourrait avoir des problèmes"
    log_info "Logs du frontend:"
    docker-compose logs frontend --tail=10
fi

# 6. Vérification de l'intégrité de la base de données
log_info "6. Vérification de l'intégrité de la base de données..."

# Tester la connexion à la base de données
if curl -f -s "http://localhost:3001/api/test-db" >/dev/null; then
    log_success "Base de données accessible et fonctionnelle"
    
    # Exécuter le script de vérification du schéma (optionnel)
    if [ -f "database/verify-schema.sql" ]; then
        log_info "Exécution de la vérification du schéma..."
        if docker-compose exec -T postgres psql -U matcha_user -d matcha_db -f /docker-entrypoint-initdb.d/verify-schema.sql 2>/dev/null; then
            log_success "Schéma de base de données vérifié"
        else
            log_warning "Impossible de vérifier le schéma automatiquement"
        fi
    fi
else
    log_error "Base de données inaccessible"
    log_info "Logs de la base de données:"
    docker-compose logs postgres --tail=10
    diagnose_issues
    exit 1
fi

# 7. Génération des profils de test (optionnel)
log_info "7. Génération des données de test..."

read -p "👥 Voulez-vous générer 500 profils de test ? (O/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    log_info "Génération de profils de test..."
    
    # Vérifier que le script de génération existe
    if docker-compose exec backend test -f "/app/src/scripts/generateProfiles.js"; then
        if docker-compose exec backend npm run seed:500; then
            log_success "Profils de test générés avec succès"
        else
            log_warning "Erreur lors de la génération des profils (non critique)"
            log_info "L'application fonctionne quand même"
        fi
    else
        log_warning "Script de génération non trouvé (non critique)"
    fi
else
    log_info "Génération de profils ignorée"
fi

# 8. Tests finaux et affichage des résultats
log_info "8. Tests finaux..."

# Test de l'endpoint de registration pour vérifier que l'erreur 500 est résolue
log_info "Test de l'endpoint d'inscription..."
test_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3001/api/auth/register" \
    -H "Content-Type: application/json" \
    -d '{"username":"test_setup","email":"test_setup@example.com","first_name":"Test","last_name":"Setup","password":"Test123456"}' 2>/dev/null || echo "000")

if [ "$test_response" = "400" ] || [ "$test_response" = "409" ]; then
    log_success "Endpoint d'inscription fonctionne (réponse attendue: $test_response)"
elif [ "$test_response" = "500" ]; then
    log_error "ERREUR 500 encore présente ! Le problème n'est pas résolu."
    log_info "Diagnostic détaillé requis..."
    diagnose_issues
    exit 1
else
    log_warning "Réponse inattendue de l'endpoint: $test_response"
fi

# Affichage final
echo ""
echo "🎉 Configuration terminée avec succès !"
echo "======================================"
echo ""
log_success "📱 Accès à l'application :"
echo "   Frontend : http://localhost:5173"
echo "   Backend  : http://localhost:3001/api"
echo "   Adminer  : http://localhost:8080"
echo ""
log_success "🗄️  Informations de connexion Adminer :"
echo "   Serveur   : postgres"
echo "   Utilisateur : matcha_user"
echo "   Mot de passe : matcha_password"
echo "   Base de données : matcha_db"
echo ""
log_info "🛠️  Commandes utiles :"
echo "   Arrêter : docker-compose down"
echo "   Redémarrer : docker-compose up -d"
echo "   Voir les logs : docker-compose logs -f"
echo "   Reset complet : docker-compose down -v && ./setup-robust.sh"
echo ""

# Vérifier l'état final
log_info "État final des services:"
docker-compose ps

echo ""
log_success "✨ Installation terminée ! L'erreur 500 devrait être résolue."
echo "💡 Si vous rencontrez encore des problèmes, exécutez './setup-robust.sh' à nouveau."