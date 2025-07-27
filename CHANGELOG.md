# CHANGELOG - Matcha

## Version 2.0.0 (2025-07-27) - 🚑 CORRECTION MAJEURE ERREUR 500

### 🚨 PROBLÈME RÉSOLU
- **ERREUR 500 lors de l'inscription** - Complètement résolue
- **Conflits de base de données** - Éliminés définitivement  
- **Problèmes de setup sur nouvelles machines** - Corrigés

### 🛠️ AMÉLIORATIONS MAJEURES

#### Phase 1: Base de Données ✅
- **Schéma unifié v2.0** : Fusion de `init.sql` et toutes les migrations en un seul fichier cohérent
- **Suppression des migrations conflictuelles** : Plus de doublons de colonnes (`read`/`is_read`, `isComplete`)
- **Script de vérification d'intégrité** : `database/verify-schema.sql` pour diagnostiquer les problèmes
- **Backup automatique** : Ancien schéma sauvegardé dans `database/backup/`

#### Phase 2: Installation Robuste ✅  
- **Script setup-robust.sh** : Installation résistante aux erreurs avec diagnostic intégré
- **Nettoyage automatique** : Détection et résolution des conflits de volumes Docker
- **Timeouts intelligents** : Attente adaptative pour machines lentes
- **Tests de validation** : Vérification automatique de l'endpoint d'inscription

#### Phase 3: Compatibilité Multi-Architecture ✅
- **Volumes Docker optimisés** : Séparation des `node_modules` par service
- **CORS dynamique** : Configuration via variables d'environnement `CORS_ORIGINS`
- **Variables d'environnement étendues** : Support pour différents environnements

#### Phase 4: Diagnostic et Support ✅
- **Script diagnose.sh** : Diagnostic automatique complet des problèmes
- **Documentation mise à jour** : Guide de dépannage avec solutions spécifiques
- **Logs améliorés** : Messages d'erreur plus clairs et informatifs

### 📁 NOUVEAUX FICHIERS

```
database/
├── unified-schema.sql          # Schéma unifié v2.0 (remplace init.sql)
├── verify-schema.sql          # Script de vérification d'intégrité  
└── backup/                    # Sauvegardes des anciens fichiers
    ├── init-original.sql
    └── migrations/

setup-robust.sh               # Installation renforcée avec diagnostic
diagnose.sh                   # Diagnostic automatique des problèmes
CHANGELOG.md                  # Ce fichier
```

### 🔧 FICHIERS MODIFIÉS

```
docker-compose.yml            # Volumes optimisés, variables CORS
backend/src/index.ts          # CORS dynamique configurable
backend/env.example           # Nouvelles variables CORS_ORIGINS
SETUP-GUIDE.md               # Documentation mise à jour v2.0
```

### 🗑️ FICHIERS SUPPRIMÉS

```
database/migrations/          # Dossier supprimé pour éviter les conflits
├── 001_update_notifications.sql
└── add_isComplete_to_profiles.sql
```

### 🚀 UTILISATION

#### Installation Standard
```bash
git clone <repo>
cd matcha
chmod +x setup-robust.sh
./setup-robust.sh
```

#### Diagnostic
```bash
./diagnose.sh  # Identifie automatiquement les problèmes
```

### 🔍 TESTS EFFECTUÉS

- ✅ Installation sur Ubuntu 22.04 (x86_64)
- ✅ Installation sur macOS (ARM64) 
- ✅ Test erreur 500 → Résolue
- ✅ Test conflits de ports → Détectés automatiquement
- ✅ Test volumes Docker → Optimisés
- ✅ Test CORS multi-origins → Fonctionnel

### 🐛 BUGS CORRIGÉS

1. **Erreur 500 lors de l'inscription**
   - Cause: Conflits de colonnes `notifications.read` vs `notifications.is_read`
   - Solution: Schéma unifié avec colonnes cohérentes

2. **Conflits de migrations**
   - Cause: Ordre d'exécution non déterministe
   - Solution: Un seul fichier `init.sql` unifié

3. **Problèmes de volumes Docker entre architectures**
   - Cause: `node_modules` partagés entre host et conteneur
   - Solution: Volumes Docker nommés séparés

4. **CORS rigide**
   - Cause: Origins hardcodés dans le code
   - Solution: Configuration via variables d'environnement

5. **Setup fragile sur nouvelles machines**
   - Cause: Pas de validation ni diagnostic
   - Solution: Scripts robustes avec vérifications multiples

### ⚠️ BREAKING CHANGES

- **Dossier `database/migrations/` supprimé** : Les migrations sont maintenant intégrées dans `init.sql`
- **Nouvelle variable `CORS_ORIGINS`** : À configurer dans `backend/.env`
- **Volumes Docker renommés** : `backend_node_modules` et `frontend_node_modules`

### 🔄 MIGRATION DEPUIS v1.x

```bash
# Sauvegarde automatique lors de la mise à jour
git pull origin main

# Reset recommandé pour éviter les conflits
docker-compose down -v
./setup-robust.sh
```

### 🎯 PROCHAINES AMÉLIORATIONS

- [ ] Tests automatisés pour l'installation
- [ ] Support pour différents environnements (staging, production)
- [ ] Docker Compose override pour développement
- [ ] Monitoring de la santé des services

---

## Version 1.0.0 (2025-07-26) - Version Initiale

### Fonctionnalités
- Application de rencontres complète (React + Express + PostgreSQL)
- Système d'authentification avec vérification email
- Profils utilisateurs avec photos
- Système de likes/matches
- Chat temps réel
- Notifications en temps réel
- Dashboard utilisateur

### Limitations Connues  
- Erreur 500 lors de l'inscription sur nouvelles machines
- Setup fragile avec conflits de base de données
- Installation manuelle complexe