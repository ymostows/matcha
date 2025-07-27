# 🚀 Setup Rapide - Matcha

Ce guide permet de démarrer l'application Matcha immédiatement après avoir cloné le repo.

## 📋 Prérequis

- Docker et Docker Compose installés
- Git

## ⚡ Démarrage Express

```bash
# Cloner le repo
git clone <url-du-repo>
cd matcha

# Exécuter le script de setup automatique
chmod +x setup.sh
./setup.sh
```

Le script se charge de tout :
- ✅ Vérification des prérequis
- ✅ Création automatique des fichiers .env
- ✅ Configuration des conteneurs Docker
- ✅ Initialisation de la base de données
- ✅ Génération de profils de test (optionnel)

## 🌐 Accès à l'application

Une fois le setup terminé :

- **Frontend** : http://localhost:5173
- **Backend API** : http://localhost:3001
- **Adminer (DB)** : http://localhost:8080

## 🗄️ Base de données

La base de données est automatiquement initialisée avec :
- Schéma complet (tables, index, contraintes)
- Données de test (500 profils si demandé)
- Configuration par défaut

**Connexion Adminer** :
- Serveur : `postgres`
- Utilisateur : `matcha_user`
- Mot de passe : `matcha_password`
- Base de données : `matcha_db`

## 🔧 Commandes utiles

```bash
# Arrêter l'application
docker-compose down

# Redémarrer
docker-compose up -d

# Voir les logs
docker-compose logs -f

# Nettoyer complètement (supprime les données)
docker-compose down -v
docker volume prune -f
```

## 📁 Structure du projet

```
matcha/
├── backend/         # API Express.js + TypeScript
├── frontend/        # Interface React + TypeScript
├── database/        # Scripts SQL d'initialisation
├── .env files       # Configuration (inclus dans le repo)
└── docker-compose.yml
```

## 🔒 Sécurité

⚠️ **Important** : Ce projet est configuré pour le développement uniquement. Les fichiers `.env` contiennent des valeurs par défaut non sécurisées qui ne doivent JAMAIS être utilisées en production.