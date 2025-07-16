# 🎯 Génération de Profils avec Photos de Qualité

Ce guide explique comment générer des profils réalistes avec des photos de qualité pour l'application Matcha.

## 📋 Prérequis

- Docker et Docker Compose installés
- Application Matcha démarrée (`docker-compose up`)
- Base de données PostgreSQL opérationnelle

## 🚀 Méthodes de Génération

### 1. Génération Simple et Rapide (Recommandée)

```bash
# Utiliser le script bash automatique
./generate-profiles.sh 15

# Ou avec Docker directement
docker-compose exec backend npm run generate:profiles 15
```

### 2. Génération avec Photos Réelles

```bash
# Script avec tentatives de téléchargement de vraies photos
docker-compose exec backend npm run generate:realistic 10
```

### 3. Génération Manuelle

```bash
# Générer 5 profils avec photos personnalisées
node generate-profiles.js 5
```

## 📸 Sources d'Images

### 1. **ThisPersonDoesNotExist.com**
- ✅ Visages générés par IA ultra-réalistes
- ✅ Personnes qui n'existent pas vraiment
- ✅ Haute qualité
- ⚠️ Peut parfois être lent

### 2. **Picsum Photos**
- ✅ Photos de stock de haute qualité
- ✅ Très rapide et fiable
- ✅ Variété de visages
- ⚠️ Photos réelles (pas de problème légal)

### 3. **UI Avatars**
- ✅ Avatars stylisés avec initiales
- ✅ Très rapide
- ✅ Fallback fiable
- ⚠️ Moins réaliste

## 🎨 Caractéristiques des Profils Générés

### 👤 Informations Utilisateur
- **Noms**: Prénoms et noms français réalistes
- **Âges**: 22-39 ans (distribution naturelle)
- **Genres**: Répartition équilibrée homme/femme
- **Orientations**: 70% hétéro, 15% homo, 15% bi

### 📝 Contenu des Profils
- **Biographies**: 8 templates différents par genre
- **Centres d'intérêt**: 3-7 intérêts parmi 25 disponibles
- **Villes**: 19 villes françaises principales
- **Géolocalisation**: Coordonnées GPS autour de Paris

### 📸 Photos
- **Nombre**: 3 photos par profil
- **Qualité**: Images 400x500 pixels minimum
- **Format**: Base64 encodé en JPEG
- **Photo de profil**: Première photo désignée comme principale

## 🔧 Configuration et Personnalisation

### Modifier le Nombre de Photos
```typescript
// Dans generateQualityProfiles.ts
await createProfilePhotos(user.id, firstName, lastName, gender, 5); // 5 photos au lieu de 3
```

### Ajouter de Nouvelles Sources d'Images
```typescript
// Dans generateQualityProfiles.ts
const IMAGE_SOURCES = {
  // Ajouter votre nouvelle source
  NEW_SOURCE: 'https://your-image-api.com/api',
  // ...
};
```

### Personnaliser les Biographies
```typescript
// Dans generateQualityProfiles.ts
const PROFILE_DATA = {
  homme: {
    bios: [
      "Votre nouvelle biographie...",
      // Ajouter plus de templates
    ]
  }
};
```

## 📊 Exemple d'Utilisation

```bash
# 1. Nettoyer la base de données (optionnel)
docker-compose exec backend npm run clean:db

# 2. Générer 20 profils de qualité
node generate-profiles.js 20

# 3. Vérifier les résultats
# - Aller sur http://localhost:5173/browsing
# - Ou vérifier dans Adminer: http://localhost:8080
```

## 🔍 Vérification des Résultats

### Dans l'Application
1. Aller sur `http://localhost:5173/browsing`
2. Se connecter avec un compte existant
3. Voir les nouveaux profils avec photos

### Dans la Base de Données
1. Aller sur `http://localhost:8080` (Adminer)
2. Se connecter avec les identifiants PostgreSQL
3. Vérifier les tables `users`, `profiles`, `photos`

## 🐛 Résolution des Problèmes

### Erreur: "This person does not exist is down"
- **Solution**: Le script utilisera automatiquement Picsum en fallback
- **Alternative**: Relancer le script plus tard

### Erreur: "Network timeout"
- **Solution**: Vérifier la connexion internet
- **Alternative**: Réduire le nombre de profils générés

### Erreur: "Database connection failed"
- **Solution**: Vérifier que PostgreSQL est démarré
- **Commande**: `docker-compose up postgres`

### Photos non chargées dans l'interface
- **Solution**: Vérifier que l'API backend est accessible
- **Commande**: `curl http://localhost:3001/api/health`

## 🎯 Conseils d'Utilisation

1. **Commencer petit**: Testez avec 5-10 profils d'abord
2. **Surveiller les logs**: Les scripts affichent des détails sur chaque étape
3. **Vérifier la qualité**: Testez l'interface après génération
4. **Nettoyage**: Utilisez `npm run clean:db` pour repartir à zéro

## 📈 Performance

- **Vitesse**: ~2-3 profils par minute
- **Qualité**: Photos 400x500px minimum
- **Fiabilité**: Système de fallback automatique
- **Stockage**: ~50KB par photo en base64

## 🔄 Mise à Jour

Pour mettre à jour les scripts :
1. Modifier les fichiers dans `backend/src/scripts/`
2. Relancer Docker : `docker-compose restart backend`
3. Tester les nouveaux scripts