#!/bin/bash

echo "🚀 Démarrage du projet Matcha avec Docker"
echo "========================================"

# Vérifier si Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé"
    exit 1
fi

# Vérifier si Docker Compose est installé
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé"
    exit 1
fi

# Arrêter les conteneurs existants et nettoyer
echo "🛑 Nettoyage des conteneurs existants..."
docker-compose down

echo "🚀 Démarrage de tous les services..."
docker-compose up -d

echo "⏳ Attente du démarrage des services..."
sleep 15

echo "📊 État des services :"
docker-compose ps

echo ""
echo "🎯 Application prête !"
echo ""
echo "📱 URLs disponibles :"
echo "   • 🌐 Application web : http://localhost:5173"
echo "   • 🔧 API Backend    : http://localhost:3001"
echo "   • 🩺 Health check   : http://localhost:3001/api/health"
echo "   • 🗄️ Base de données : http://localhost:8080 (Adminer)"
echo ""
echo "🔍 Pour voir les logs :"
echo "   docker-compose logs -f"
echo ""
echo "🛑 Pour arrêter :"
echo "   docker-compose down"
echo ""
echo "✅ Tout fonctionne avec Docker !" 