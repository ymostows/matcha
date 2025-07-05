#!/bin/bash

# 🐳 Scripts de gestion Docker pour Web Matcha
# ===============================================

# Couleurs pour l'affichage
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${BLUE}🐳 Web Matcha - Gestion Docker${NC}"
echo "================================="

case "$1" in
  "build")
    echo -e "${YELLOW}📦 Construction des images Docker...${NC}"
    docker-compose build --no-cache
    ;;
    
  "up")
    echo -e "${GREEN}🚀 Démarrage de l'application...${NC}"
    docker-compose up -d
    echo -e "${GREEN}✅ Application démarrée !${NC}"
    echo ""
    echo "📱 Frontend: http://localhost:5173"
    echo "🔧 Backend:  http://localhost:3001"
    echo "🗄️ Database: http://localhost:8080 (Adminer)"
    echo ""
    echo "Pour voir les logs: docker-compose logs -f"
    ;;
    
  "dev")
    echo -e "${GREEN}🔧 Démarrage en mode développement...${NC}"
    docker-compose up
    ;;
    
  "down")
    echo -e "${RED}🛑 Arrêt de l'application...${NC}"
    docker-compose down
    ;;
    
  "restart")
    echo -e "${YELLOW}🔄 Redémarrage de l'application...${NC}"
    docker-compose down
    docker-compose up -d
    echo -e "${GREEN}✅ Application redémarrée !${NC}"
    ;;
    
  "logs")
    echo -e "${BLUE}📋 Affichage des logs...${NC}"
    docker-compose logs -f
    ;;
    
  "clean")
    echo -e "${RED}🧹 Nettoyage Docker...${NC}"
    docker-compose down -v
    docker system prune -f
    echo -e "${GREEN}✅ Nettoyage terminé !${NC}"
    ;;
    
  "reset")
    echo -e "${RED}🔄 Reset complet (ATTENTION: supprime les données)...${NC}"
    read -p "Êtes-vous sûr ? (y/N): " -n 1 -r
    echo
    if [[ $REPLY =~ ^[Yy]$ ]]; then
      docker-compose down -v
      docker system prune -a -f
      docker volume prune -f
      echo -e "${GREEN}✅ Reset complet terminé !${NC}"
    else
      echo -e "${YELLOW}❌ Reset annulé.${NC}"
    fi
    ;;
    
  "status")
    echo -e "${BLUE}📊 Statut des conteneurs...${NC}"
    docker-compose ps
    ;;
    
  *)
    echo -e "${YELLOW}📖 Utilisation:${NC}"
    echo "  ./docker-scripts.sh build    - Construire les images"
    echo "  ./docker-scripts.sh up       - Démarrer en arrière-plan"
    echo "  ./docker-scripts.sh dev      - Démarrer en mode dev (logs visibles)"
    echo "  ./docker-scripts.sh down     - Arrêter l'application"
    echo "  ./docker-scripts.sh restart  - Redémarrer l'application"
    echo "  ./docker-scripts.sh logs     - Voir les logs"
    echo "  ./docker-scripts.sh status   - Voir le statut"
    echo "  ./docker-scripts.sh clean    - Nettoyer Docker"
    echo "  ./docker-scripts.sh reset    - Reset complet (DANGER)"
    ;;
esac 