#!/bin/bash

# Script de diagnostic complet pour Matcha
# Identifie rapidement les problèmes courants après clonage

# Couleurs pour l'affichage
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

echo "🔍 DIAGNOSTIC COMPLET MATCHA"
echo "=================================="
echo ""

# 1. Informations système
log_info "1. Informations système"
echo "OS: $(uname -a)"
echo "Architecture: $(uname -m)"
echo "Date: $(date)"
echo "Utilisateur: $(whoami)"
echo "Répertoire: $(pwd)"
echo ""

# 2. Vérification des prérequis
log_info "2. Vérification des prérequis"

# Docker
if command -v docker >/dev/null 2>&1; then
    docker_version=$(docker --version)
    log_success "Docker installé: $docker_version"
    
    if docker info >/dev/null 2>&1; then
        log_success "Docker daemon accessible"
    else
        log_error "Docker daemon inaccessible"
        echo "   Essayez: sudo systemctl start docker"
        echo "   Ou: sudo usermod -aG docker \$USER (puis redémarrer la session)"
    fi
else
    log_error "Docker non installé"
fi

# Docker Compose
if command -v docker-compose >/dev/null 2>&1; then
    compose_version=$(docker-compose --version)
    log_success "Docker Compose installé: $compose_version"
else
    log_error "Docker Compose non installé"
fi

echo ""

# 3. Vérification des fichiers critiques
log_info "3. Vérification des fichiers critiques"

critical_files=(
    "docker-compose.yml"
    "database/init.sql"
    "backend/.env"
    "frontend/.env"
    "backend/package.json"
    "frontend/package.json"
)

for file in "${critical_files[@]}"; do
    if [ -f "$file" ]; then
        log_success "$file existe"
    else
        log_error "$file manquant"
    fi
done

echo ""

# 4. Vérification des ports
log_info "4. Vérification des ports"

ports=(3001 5173 5433 8080)
for port in "${ports[@]}"; do
    if lsof -i :$port >/dev/null 2>&1; then
        process=$(lsof -i :$port | tail -n 1 | awk '{print $1 " (PID: " $2 ")"}')
        log_warning "Port $port occupé par: $process"
    else
        log_success "Port $port libre"
    fi
done

echo ""

# 5. Vérification de l'espace disque
log_info "5. Espace disque"
df -h . | head -2
echo ""

# 6. État des conteneurs Docker
log_info "6. État des conteneurs Docker"

if docker-compose ps >/dev/null 2>&1; then
    echo "Conteneurs Matcha:"
    docker-compose ps
    echo ""
    
    # Vérifier les health checks
    log_info "Health checks des conteneurs:"
    for container in matcha-db matcha-backend matcha-frontend; do
        if docker ps --filter "name=$container" --format "table {{.Names}}\t{{.Status}}" | grep -q "healthy\|Up"; then
            status=$(docker ps --filter "name=$container" --format "{{.Status}}")
            log_success "$container: $status"
        else
            log_warning "$container: Problème détecté"
        fi
    done
    echo ""
else
    log_info "Aucun conteneur Matcha en cours d'exécution"
fi

# 7. Test des services (si en cours d'exécution)
log_info "7. Test des services"

# Test Backend
if curl -f -s "http://localhost:3001/api/health" >/dev/null 2>&1; then
    backend_response=$(curl -s "http://localhost:3001/api/health" | head -1)
    log_success "Backend API: Accessible"
    echo "   Réponse: $backend_response"
else
    log_warning "Backend API: Inaccessible"
fi

# Test Frontend
if curl -f -s "http://localhost:5173" >/dev/null 2>&1; then
    log_success "Frontend: Accessible"
else
    log_warning "Frontend: Inaccessible"
fi

# Test Base de données via Adminer
if curl -f -s "http://localhost:8080" >/dev/null 2>&1; then
    log_success "Adminer (DB): Accessible"
else
    log_warning "Adminer (DB): Inaccessible"
fi

# Test DB via Backend
if curl -f -s "http://localhost:3001/api/test-db" >/dev/null 2>&1; then
    db_response=$(curl -s "http://localhost:3001/api/test-db")
    log_success "Base de données: Fonctionnelle"
    echo "   $db_response"
else
    log_warning "Base de données: Problème détecté"
fi

echo ""

# 8. Test de l'endpoint registration (problème principal)
log_info "8. Test de l'endpoint d'inscription (erreur 500)"

if curl -f -s "http://localhost:3001/api/health" >/dev/null 2>&1; then
    log_info "Test de registration avec données valides..."
    
    test_response=$(curl -s -o /dev/null -w "%{http_code}" -X POST "http://localhost:3001/api/auth/register" \
        -H "Content-Type: application/json" \
        -d '{"username":"diag_test","email":"diag_test@example.com","first_name":"Diag","last_name":"Test","password":"Test123456"}' 2>/dev/null || echo "000")
    
    case $test_response in
        "200"|"201")
            log_success "Registration: Fonctionne parfaitement (code: $test_response)"
            ;;
        "400")
            log_success "Registration: Validation fonctionne (code: $test_response - normale pour données invalides)"
            ;;
        "409")
            log_success "Registration: Contraintes d'unicité fonctionnent (code: $test_response - normale pour doublons)"
            ;;
        "500")
            log_error "ERREUR 500 DÉTECTÉE ! Le problème persiste."
            echo "   Ceci indique un problème de base de données ou de configuration serveur."
            ;;
        "000")
            log_warning "Impossible de contacter le serveur"
            ;;
        *)
            log_warning "Réponse inattendue: $test_response"
            ;;
    esac
else
    log_info "Backend inaccessible, impossible de tester l'inscription"
fi

echo ""

# 9. Logs récents des services
log_info "9. Logs récents (si erreurs détectées)"

if docker-compose ps >/dev/null 2>&1; then
    # Vérifier s'il y a des erreurs dans les logs
    if docker-compose logs --tail=5 2>&1 | grep -i error >/dev/null; then
        log_warning "Erreurs détectées dans les logs:"
        echo "--- Logs Backend ---"
        docker-compose logs backend --tail=10 | grep -i error || echo "Pas d'erreurs backend"
        echo ""
        echo "--- Logs Frontend ---"
        docker-compose logs frontend --tail=10 | grep -i error || echo "Pas d'erreurs frontend"
        echo ""
        echo "--- Logs Database ---"
        docker-compose logs postgres --tail=10 | grep -i error || echo "Pas d'erreurs database"
        echo ""
    else
        log_success "Aucune erreur évidente dans les logs récents"
    fi
fi

# 10. Recommandations
echo ""
log_info "10. RECOMMANDATIONS"

echo "🔧 Si des problèmes sont détectés:"
echo "   1. Nettoyage complet: docker-compose down -v && docker system prune -f"
echo "   2. Nouvelle installation: ./setup-robust.sh"
echo "   3. Vérification manuelle du schéma: docker-compose exec postgres psql -U matcha_user -d matcha_db -f /docker-entrypoint-initdb.d/verify-schema.sql"
echo ""

echo "🚀 Si tout fonctionne:"
echo "   - Frontend: http://localhost:5173"
echo "   - Backend: http://localhost:3001/api"
echo "   - Adminer: http://localhost:8080"
echo ""

echo "📞 Support supplémentaire:"
echo "   - Vérifiez les logs complets: docker-compose logs"
echo "   - Redémarrez les services: docker-compose restart"
echo "   - Reset des volumes: docker-compose down -v"
echo ""

log_info "Diagnostic terminé !"