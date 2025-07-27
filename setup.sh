#!/bin/bash

# Script de setup automatique pour Matcha
# Ce script configure l'environnement de développement après un clone

echo "🚀 Configuration de l'environnement Matcha..."

# Vérifier que Docker est installé
if ! command -v docker &> /dev/null; then
    echo "❌ Docker n'est pas installé. Veuillez installer Docker et Docker Compose."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose n'est pas installé. Veuillez installer Docker Compose."
    exit 1
fi

# Créer les fichiers .env depuis les exemples si nécessaire
echo "📋 Vérification des fichiers de configuration..."

if [ ! -f "backend/.env" ]; then
    if [ -f "backend/env.example" ]; then
        echo "📋 Création de backend/.env depuis env.example..."
        cp backend/env.example backend/.env
    else
        echo "❌ Fichier backend/env.example manquant"
        exit 1
    fi
fi

if [ ! -f "frontend/.env" ]; then
    if [ -f "frontend/env.example" ]; then
        echo "📋 Création de frontend/.env depuis env.example..."
        cp frontend/env.example frontend/.env
    else
        echo "❌ Fichier frontend/env.example manquant"
        exit 1
    fi
fi

echo "✅ Fichiers de configuration prêts"

# Nettoyer les volumes Docker existants (optionnel)
read -p "🗑️  Voulez-vous nettoyer les volumes Docker existants ? (y/N): " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo "🧹 Nettoyage des volumes..."
    docker-compose down -v
    docker volume prune -f
fi

# Construire et démarrer les conteneurs
echo "🏗️  Construction et démarrage des conteneurs..."
docker-compose up -d --build

# Attendre que les services soient prêts
echo "⏳ Attente du démarrage des services..."
sleep 10

# Vérifier que les services sont en cours d'exécution
echo "🔍 Vérification de l'état des services..."
docker-compose ps

# Générer des profils de test (optionnel)
read -p "👥 Voulez-vous générer des profils de test ? (Y/n): " -n 1 -r
echo
if [[ ! $REPLY =~ ^[Nn]$ ]]; then
    echo "📊 Génération de profils de test..."
    docker-compose exec backend npm run seed:500
fi

echo ""
echo "🎉 Configuration terminée !"
echo ""
echo "📱 Accès à l'application :"
echo "   Frontend : http://localhost:5173"
echo "   Backend  : http://localhost:3001"
echo "   Adminer  : http://localhost:8080"
echo ""
echo "🗄️  Informations de connexion Adminer :"
echo "   Serveur   : postgres"
echo "   Utilisateur : matcha_user"
echo "   Mot de passe : matcha_password"
echo "   Base de données : matcha_db"
echo ""
echo "🛑 Pour arrêter : docker-compose down"
echo "🔄 Pour redémarrer : docker-compose up -d"