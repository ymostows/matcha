#!/bin/bash

# 🚀 Matcha - Script de Setup Initial
# Usage: ./setup-fresh.sh

set -e

echo "🎯 === MATCHA SETUP INITIAL ==="
echo ""

# Vérifier que nous sommes dans le bon répertoire
if [ ! -f "docker-compose.yml" ]; then
    echo "❌ Erreur: docker-compose.yml non trouvé. Exécutez ce script depuis le répertoire racine du projet."
    exit 1
fi

echo "📂 Vérification de la structure du projet..."
if [ ! -d "frontend" ] || [ ! -d "backend" ]; then
    echo "❌ Erreur: Répertoires frontend ou backend manquants."
    exit 1
fi

echo "✅ Structure du projet valide"
echo ""

# Nettoyer les volumes Docker existants
echo "🧹 Nettoyage des volumes Docker existants..."
docker-compose down -v 2>/dev/null || true
docker volume rm matcha_frontend_node_modules matcha_backend_node_modules 2>/dev/null || true

echo "✅ Volumes supprimés"
echo ""

# Installer les dépendances localement (optionnel pour l'IDE)
echo "📦 Installation des dépendances locales (pour l'IDE)..."

if [ -d "frontend" ]; then
    echo "  → Frontend..."
    cd frontend
    if [ -f "package.json" ]; then
        npm install --silent
        echo "  ✅ Frontend dependencies installées"
    fi
    cd ..
fi

if [ -d "backend" ]; then
    echo "  → Backend..."
    cd backend
    if [ -f "package.json" ]; then
        npm install --silent
        echo "  ✅ Backend dependencies installées"
    fi
    cd ..
fi

echo ""

# Construire et démarrer les conteneurs
echo "🐳 Construction et démarrage des conteneurs Docker..."
echo "   (Cela peut prendre quelques minutes la première fois)"
echo ""

docker-compose up --build -d

echo ""
echo "⏱️  Attente de la montée des services..."
sleep 10

# Vérifier que les services sont opérationnels
echo "🔍 Vérification des services..."

# Vérifier le backend
echo "  → Backend (http://localhost:3001)..."
for i in {1..30}; do
    if curl -s http://localhost:3001/api/health > /dev/null 2>&1; then
        echo "  ✅ Backend opérationnel"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  ❌ Backend non accessible après 30 tentatives"
        echo "  📋 Logs du backend:"
        docker-compose logs --tail=10 backend
        exit 1
    fi
    sleep 2
done

# Vérifier le frontend
echo "  → Frontend (http://localhost:5173)..."
for i in {1..30}; do
    if curl -s http://localhost:5173 > /dev/null 2>&1; then
        echo "  ✅ Frontend opérationnel"
        break
    fi
    if [ $i -eq 30 ]; then
        echo "  ❌ Frontend non accessible après 30 tentatives"
        echo "  📋 Logs du frontend:"
        docker-compose logs --tail=10 frontend
        exit 1
    fi
    sleep 2
done

echo ""
echo "🎉 === SETUP TERMINÉ AVEC SUCCÈS ==="
echo ""
echo "🌐 Accès aux services:"
echo "   • Frontend: http://localhost:5173"
echo "   • Backend:  http://localhost:3001"
echo "   • API Health: http://localhost:3001/api/health"
echo ""
echo "📋 Commandes utiles:"
echo "   • docker-compose logs -f          # Voir tous les logs"
echo "   • docker-compose logs -f frontend # Logs frontend uniquement"
echo "   • docker-compose logs -f backend  # Logs backend uniquement"
echo "   • docker-compose down             # Arrêter les services"
echo "   • docker-compose restart          # Redémarrer les services"
echo ""
echo "✨ Votre application Matcha est prête !"