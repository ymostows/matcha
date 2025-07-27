# 🚀 Guide d'Installation Matcha

Ce guide garantit une installation réussie de Matcha après clonage du repository.

## 📋 Prérequis

- **Docker** et **Docker Compose** installés
- **Git** installé
- Ports libres : 3001, 5173, 5433, 8080

## ⚡ Installation Rapide

```bash
# 1. Cloner le repository
git clone <url-du-repo>
cd matcha

# 2. Lancer l'installation automatique
chmod +x setup.sh
./setup.sh
```

## 🔧 Que fait le script d'installation ?

1. ✅ **Vérification des prérequis** (Docker, Docker Compose)
2. ✅ **Création automatique des fichiers .env** depuis les exemples
3. ✅ **Construction des conteneurs Docker**
4. ✅ **Initialisation de la base de données** avec schéma complet
5. ✅ **Génération de 500 profils de test** (optionnel)
6. ✅ **Vérification du bon fonctionnement**

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

### Problème : Services ne démarrent pas
```bash
# Vérifier l'état des conteneurs
docker-compose ps

# Voir les logs d'erreur
docker-compose logs
```

### Problème : Ports occupés
```bash
# Vérifier les ports utilisés
sudo netstat -tulpn | grep -E ':(3001|5173|5433|8080)'

# Arrêter les services en conflit ou modifier les ports dans docker-compose.yml
```

### Problème : Base de données vide
```bash
# Régénérer les profils de test
docker-compose exec backend npm run seed:500
```

### Reset complet en cas de problème
```bash
# Nettoyer complètement
docker-compose down -v
docker system prune -f
docker volume prune -f

# Relancer l'installation
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

1. Vérifiez que tous les prérequis sont installés
2. Consultez les logs : `docker-compose logs`
3. Essayez un reset complet
4. Vérifiez que les ports ne sont pas occupés

---

🎉 **Bon développement avec Matcha !**