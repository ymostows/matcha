# 🚀 Guide d'Installation Matcha v2.0

Ce guide garantit une installation réussie de Matcha après clonage du repository.

🎆 **VERSION 2.0** - Résolution des problèmes d'erreur 500 et installation robuste sur toutes machines.

## 📋 Prérequis

- **Docker** et **Docker Compose** installés
- **Git** installé
- Ports libres : 3001, 5173, 5433, 8080

## ⚡ Installation Rapide

### Option 1: Installation robuste (recommandée)
```bash
# 1. Cloner le repository
git clone <url-du-repo>
cd matcha

# 2. Lancer l'installation robuste
chmod +x setup-robust.sh
./setup-robust.sh
```

### Option 2: Installation classique
```bash
# 1. Cloner le repository
git clone <url-du-repo>
cd matcha

# 2. Lancer l'installation automatique
chmod +x setup.sh
./setup.sh
```

## 🔧 Que fait le script d'installation robuste ?

1. ✅ **Vérification des prérequis** (Docker, Docker Compose, permissions)
2. ✅ **Création automatique des fichiers .env** depuis les exemples
3. ✅ **Nettoyage automatique** des volumes Docker conflictuels
4. ✅ **Construction des conteneurs Docker** avec gestion d'erreurs
5. ✅ **Initialisation de la base de données** avec schéma unifié v2.0
6. ✅ **Vérification de l'intégrité** du schéma
7. ✅ **Test de l'éendpoint d'inscription** (erreur 500 résolue)
8. ✅ **Génération de 500 profils de test** (optionnel)
9. ✅ **Diagnostic automatique** en cas de problème

## 🌐 Accès à l'application

Après installation réussie :

- **Application Web** : http://localhost:5173
- **API Backend** : http://localhost:3001/api
- **Base de données (Adminer)** : http://localhost:8080

### 🗄️ Connexion à la base de données (Adminer)

- **Serveur** : `postgres`
- **Utilisateur** : `matcha_user`
- **Mot de passe** : `matcha_password`
- **Base de données** : `matcha_db`

## 🛠️ Commandes de développement

```bash
# Arrêter l'application
docker-compose down

# Redémarrer
docker-compose up -d

# Voir les logs en temps réel
docker-compose logs -f

# Reset complet (supprime toutes les données)
docker-compose down -v
./setup.sh
```

## 🔍 Dépannage

### 🚑 Diagnostic Automatique
```bash
# Lancer le diagnostic complet
./diagnose.sh
```
Ce script identifie automatiquement 90% des problèmes courants.

### 🚫 Erreur 500 lors de l'inscription (RÉSOLU)
Ce problème a été résolu dans la v2.0 :
- **Cause** : Conflits de colonnes dans la base de données
- **Solution** : Schéma unifié sans migrations conflictuelles
- **Test** : `./diagnose.sh` vérifie automatiquement

### Problème : Services ne démarrent pas
```bash
# Diagnostic détaillé
./diagnose.sh

# Vérifier l'état des conteneurs
docker-compose ps

# Voir les logs d'erreur
docker-compose logs
```

### Problème : Ports occupés
```bash
# Le diagnostic détecte automatiquement les conflits
./diagnose.sh

# Libérer les ports manuellement
sudo lsof -ti:3001,5173,5433,8080 | xargs -r sudo kill
```

### Reset complet en cas de problème
```bash
# Reset automatique avec le script robuste
docker-compose down -v
./setup-robust.sh

# OU reset manuel
docker-compose down -v
docker system prune -f
docker volume prune -f
./setup.sh
```

## 📁 Structure du projet

```
matcha/
├── setup.sh                 # Script d'installation automatique
├── docker-compose.yml       # Configuration Docker
├── backend/                 # API Express.js + TypeScript
│   ├── Dockerfile
│   ├── .env                 # Configuration backend (auto-généré)
│   └── src/
├── frontend/                # Interface React + TypeScript
│   ├── Dockerfile
│   ├── .env                 # Configuration frontend (auto-généré)
│   └── src/
├── database/                # Scripts d'initialisation PostgreSQL
│   ├── init.sql            # Schéma de base
│   └── migrations/         # Migrations
└── README-SETUP.md         # Guide rapide
```

## 🔒 Sécurité

⚠️ **Important** : Cette configuration est pour le **développement uniquement**.

- Les fichiers `.env` contiennent des valeurs par défaut non sécurisées
- Ne jamais utiliser ces configurations en production
- Les mots de passe et secrets doivent être changés pour un déploiement réel

## 🎯 Fonctionnalités testables

Une fois l'installation terminée, vous pouvez tester :

1. **Inscription/Connexion** avec vérification email (simulée)
2. **Completion de profil** avec photos et informations
3. **Navigation des profils** avec filtres
4. **Système de likes** et matches
5. **Chat en temps réel** entre utilisateurs matchés
6. **Notifications** en temps réel
7. **Historique des likes** et visites

## 📞 Support

Si vous rencontrez des problèmes :

1. **TOUJOURS commencer par** : `./diagnose.sh`
2. **Installation robuste** : `./setup-robust.sh`
3. **Vérification du schéma** : `docker-compose exec postgres psql -U matcha_user -d matcha_db -f /docker-entrypoint-initdb.d/verify-schema.sql`
4. **Logs détaillés** : `docker-compose logs -f`

### 🆕 Nouveautés v2.0
- ✅ Résolution définitive de l'erreur 500
- ✅ Schéma de base de données unifié
- ✅ Installation robuste multi-architecture
- ✅ Diagnostic automatique intégré
- ✅ CORS dynamique configurable
- ✅ Volumes Docker optimisés

---

🎉 **Bon développement avec Matcha !**