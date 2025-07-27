# 🚀 Instructions de setup Matcha

Guide complet pour lancer le projet Matcha après un clone sur un nouveau PC.

## 📋 Prérequis

- **Docker** et **Docker Compose** installés
- **Node.js** (v18+) et **npm** installés
- **Git** installé

## 🎯 Setup rapide (recommandé)

### 1. Clone et installation
```bash
git clone https://github.com/ymostows/matcha.git
cd matcha

# Installation des dépendances
cd backend && npm install
cd ../frontend && npm install && cd ..
```

### 2. Lancement avec Neon (cloud database)
```bash
# Lance directement avec la base Neon
docker-compose up

# L'application sera accessible sur :
# - Frontend: http://localhost:5173
# - Backend API: http://localhost:3001
```

### 3. Vérification
```bash
# Tester l'API
curl http://localhost:3001/api/health

# Vérifier les profils dans la DB
cd backend && npm run verify:profiles
```

## ✅ Résultat attendu

Après ces étapes, vous devriez avoir :
- ✅ **41 utilisateurs** avec profils complets dans Neon
- ✅ **Photos** automatiquement générées  
- ✅ **API** fonctionnelle (pas d'erreur 500)
- ✅ **Interface** accessible sur http://localhost:5173

## 🛠️ Options alternatives

### Option A : Développement avec PostgreSQL local
```bash
# Utilise une base PostgreSQL locale
docker-compose -f docker-compose.local.yml up

# Puis synchroniser avec Neon
cd backend && npm run setup:local
```

### Option B : Développement natif (sans Docker)
```bash
# Backend
cd backend && npm run dev

# Frontend (nouveau terminal)
cd frontend && npm run dev
```

## 📊 Commandes utiles

```bash
# Vérifier l'état de la base de données
cd backend && npm run verify:profiles

# Voir les logs en temps réel
docker-compose logs -f backend

# Redémarrer les services
docker-compose restart

# Arrêter tous les containers
docker-compose down
```

## 🔧 En cas de problème

### Erreur de connexion à Neon
```bash
# Vérifier que le .env contient la bonne URL Neon
cat backend/.env | grep DATABASE_URL

# Tester la connexion
cd backend && npm run setup:neon
```

### Containers qui ne démarrent pas
```bash
# Nettoyer et redémarrer
docker-compose down --volumes
docker-compose up --build
```

### API qui retourne 500
```bash
# Vérifier les logs backend
docker logs matcha-backend

# Si table manquante, réinitialiser
cd backend && npm run setup:neon
```

## 📱 Utilisation de l'application

1. **Accéder à l'interface** : http://localhost:5173
2. **Créer un compte** ou **se connecter**
3. **Compléter son profil** (obligatoire pour accéder aux fonctionnalités)
4. **Naviguer les profils** existants (41 profils de test disponibles)
5. **Tester les likes, matches, chat** avec les autres utilisateurs

## 🎓 Pour le projet d'école

Ce setup est optimisé pour l'évaluation scolaire :
- ✅ **Données de test** pré-générées (41 profils réalistes)
- ✅ **Base cloud** partagée entre développeurs
- ✅ **Configuration incluse** (fichiers .env commitées)
- ✅ **Setup en une commande** (`docker-compose up`)

## 🔄 Configurations disponibles

| Fichier | Usage | Base de données |
|---------|-------|-----------------|
| `docker-compose.yml` | **Production/Demo** | Neon (cloud) |
| `docker-compose.local.yml` | Développement local | PostgreSQL local |
| `docker-compose.neon.yml` | Alternative Neon | Neon (cloud) |

**Recommandation** : Utiliser `docker-compose.yml` par défaut pour une expérience uniforme.