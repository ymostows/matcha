# Tutoriel Matcha — Vue d'ensemble complète

## 1. Structure générale du projet

```
matcha/
├── backend/          ← API Express.js (TypeScript)
├── frontend/         ← App React (TypeScript + Vite)
├── docker-compose.yml
└── CLAUDE.md / README etc.
```

C'est un **monorepo** : 2 services indépendants qui tournent côte à côte.

---

## 2. Lancer le projet

```bash
docker-compose up        # Lance tout (backend + frontend)
```

- **Backend** → port **3001** (`http://localhost:3001`)
- **Frontend** → port **5173** (`http://localhost:5173`)
- **Base de données** → Neon (PostgreSQL cloud, pas en local)

En dev tu peux aussi lancer directement :

```bash
# Backend
cd backend && npm run dev

# Frontend
cd frontend && npm run dev
```

---

## 3. Backend — Architecture

### Point d'entrée : `backend/src/index.ts`

C'est le cerveau du backend. Il fait dans l'ordre :

1. Charge les variables d'environnement (`.env`)
2. Crée l'app Express + le serveur HTTP
3. Branche les **middlewares** de sécurité : Helmet (headers sécurisés), CORS (autorise le frontend), JSON parser, sanitization (anti-XSS)
4. Monte toutes les **routes** sous `/api/...`
5. Au démarrage : teste la DB, initialise les emails, initialise Socket.io

### Routes disponibles

| Préfixe | Fichier | Rôle |
|---|---|---|
| `/api/auth/*` | `routes/auth.ts` | Inscription, login, email verify, reset password |
| `/api/profile/*` | `routes/profile.ts` | CRUD profil, like/unlike, visite, block, report |
| `/api/photos/*` | `routes/photos.ts` | Upload/gestion photos |
| `/api/notifications/*` | `routes/notifications.ts` | Notifications utilisateur |
| `/api/chat/*` | `routes/chat.ts` | Conversations et messages |
| `/api/dashboard/*` | `routes/dashboard.ts` | Stats du dashboard |

---

## 4. Backend — Auth (`routes/auth.ts`)

Toutes les routes d'authentification. Voici le flux complet :

```
POST /register
  → Valide les champs (email, username, password, prénom/nom)
  → Hash le mot de passe (bcrypt, via UserModel)
  → Crée l'user en DB avec un token de vérification
  → Envoie un email de vérification
  → Retourne succès (SANS token JWT — il faut d'abord vérifier l'email)

GET /verify-email/:token
  → Vérifie le token
  → Met is_verified = true en DB

POST /login
  → Accepte email OU username + password
  → Vérifie que is_verified = true
  → Compare le mot de passe (bcrypt)
  → Génère un JWT (expire dans 7 jours)
  → Retourne { token, user }

POST /forgot-password  → envoie un email de reset
POST /reset-password/:token  → change le mot de passe
```

---

## 5. Backend — Middlewares

### `middleware/auth.ts` — `authenticateToken`

Middleware qui protège les routes. Il :

1. Lit le header `Authorization: Bearer <TOKEN>`
2. Vérifie le JWT avec `JWT_SECRET`
3. Attache `req.user = { userId, email, username }` pour les routes suivantes

**Usage dans les routes :**

```typescript
router.get('/something', authenticateToken, (req, res) => {
  const userId = req.user?.userId; // disponible ici
});
```

### `middleware/sanitization.ts`

Nettoie tous les inputs pour éviter les injections XSS.

### `middleware/validation.ts`

Validation des mots de passe (complexité, longueur...).

### `middleware/errorHandler.ts`

Gère les erreurs non catchées globalement.

---

## 6. Backend — Database (`config/database.ts`)

Connexion à **Neon PostgreSQL** via un pool de connexions (`pg.Pool`).

```typescript
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,  // dans .env
  max: 10,          // max 10 connexions simultanées
  // ...
});
```

**Usage dans les routes :**

```typescript
const result = await pool.query('SELECT * FROM users WHERE id = $1', [userId]);
```

Pas d'ORM : **SQL brut** partout (contrainte du sujet).

---

## 7. Backend — Models (`models/`)

Les models encapsulent les requêtes SQL répétitives.

| Fichier | Contenu |
|---|---|
| `User.ts` | `UserModel` : create, findByEmail, findByUsername, verifyPassword, verifyAccount, setPasswordResetToken, resetPassword, updateLastSeen... |
| `Profile.ts` | Profil étendu (bio, âge, localisation, intérêts, fame rating) |
| `Photo.ts` | Photos en base64 avec métadonnées |
| `UserSimple.ts` | Version allégée pour les listes |

---

## 8. Backend — Socket.io (`services/socketService.ts`)

Gère le **temps réel**. C'est une classe `SocketService` initialisée au démarrage du serveur.

**Authentification Socket** : le client envoie son JWT dans `socket.handshake.auth.token`.

### Événements écoutés (client → serveur)

| Événement | Action |
|---|---|
| `join_conversation` | Rejoint la room du chat |
| `leave_conversation` | Quitte la room |
| `typing_start` | Broadcast "untel tape..." |
| `typing_stop` | Broadcast "untel a arrêté" |
| `mark_notification_read` | Marque notif lue en DB |
| `get_online_users` | Retourne qui est en ligne |

### Événements émis (serveur → client)

| Événement | Déclenché quand |
|---|---|
| `new_notification` | Un like, visite, message... |
| `new_message` | Nouveau message dans un chat |
| `user_online` / `user_offline` | Quelqu'un se connecte/déconnecte |
| `user_typing` / `user_stop_typing` | Indicateur de frappe |

---

## 9. Frontend — Architecture

### Point d'entrée : `frontend/src/App.tsx`

L'app React est organisée en couches :

```
<Router>                  ← React Router (navigation)
  <AuthProvider>          ← Contexte d'auth (user, token, login/logout)
    <SocketProvider>      ← Contexte Socket.io (temps réel)
      <Header />          ← Navigation top bar
      <Routes>            ← Toutes les pages
```

### 3 types de routes

| Type | Comportement |
|---|---|
| `<PublicRoute>` | Redirige vers `/dashboard` si déjà connecté |
| `<ProtectedRoute>` | Redirige vers `/login` si pas de token |
| `<ProtectedRoute requireCompleteProfile>` | Redirige vers `/complete-profile` si profil incomplet |

---

## 10. Frontend — Pages

| Fichier | Route | Rôle |
|---|---|---|
| `LoginForm` / `RegisterForm` | `/login`, `/register` | Auth |
| `EmailVerificationPage` | `/verify-email/:token` | Vérification email |
| `ForgotPasswordPage` / `ResetPasswordPage` | `/forgot-password`, `/reset-password/:token` | Reset mot de passe |
| `ProfileCompletionPage` | `/complete-profile` | Compléter profil (obligatoire avant tout) |
| `ProfileEditPage` | `/profile-edit` | Éditer son profil |
| `ProfilePublicPage` | `/profile`, `/profile/:userId` | Voir un profil |
| `UserDashboard` | `/dashboard` | Tableau de bord |
| `BrowsingPage` | `/browsing` | Parcourir/découvrir des users |
| `MapPage` | `/map` | Carte géographique |
| `ConversationsPage` / `ChatPage` | `/conversations`, `/chat/:id` | Messagerie |

---

## 11. Frontend — Contextes (état global)

### `AuthContext.tsx`

L'état de l'utilisateur connecté, accessible partout avec `useAuth()` :

```typescript
const { user, token, login, logout, register, refreshUser, isLoading } = useAuth();
```

Au démarrage, il :
1. Lit le token du `localStorage`
2. Vérifie qu'il est toujours valide en appelant l'API
3. Restore la session si OK, nettoie sinon

### `SocketContext.tsx`

Gère la connexion Socket.io et expose :

```typescript
const {
  isConnected,
  notifications, unreadCount,
  onlineUsers,
  joinConversation, leaveConversation,
  startTyping, stopTyping,
  markNotificationRead,
  onNewMessage,   // callback pour les messages temps réel
} = useSocket();
```

---

## 12. Frontend — Services API

### `services/api.ts` — `ApiService`

Classe singleton qui wrappe tous les `fetch()`. Elle :
- Ajoute automatiquement le header `Authorization: Bearer <token>`
- Gère les erreurs HTTP
- Expose des méthodes : `login()`, `register()`, `logout()`, `forgotPassword()`, etc.

```typescript
import apiService from './services/api';
await apiService.login({ email, password });
```

### `services/profileApi.ts`

Tous les appels API liés aux profils (getMyProfile, updateProfile, like, visit, block...).

### `services/chatApi.ts`

Appels API pour les conversations et messages.

---

## 13. Frontend — Hook `useProfileCompletion`

```typescript
const { isComplete, isLoading } = useProfileCompletion();
```

Ce hook vérifie si le profil est complet (bio, photos, localisation, etc.).  
Si `isComplete = false`, `App.tsx` redirige automatiquement vers `/complete-profile`.  
C'est le garde-barrière de l'app.

---

## 14. Flux de données complet — Exemple : envoyer un like

```
1. Utilisateur clique "❤️" dans BrowsingPage
2. → profileApi.likeUser(targetId)       [frontend/services/profileApi.ts]
3. → POST /api/profile/:id/like          [HTTP vers backend]
4. → authenticateToken middleware         [vérifie JWT]
5. → routes/profile.ts                   [handler de la route]
6. → INSERT INTO likes ...               [SQL via pool]
7. → socketService.sendNotification()    [si match → notif temps réel]
8. → socket.io emit 'new_notification'   [vers le frontend de la cible]
9. → SocketContext reçoit → setNotifications()
10. → Header affiche le badge de notification
```

---

## 15. Scripts utiles (backend)

```bash
npm run clean:db           # Vide la DB
npm run setup:neon         # Crée le schéma (tables)
npm run seed:500           # Génère 500 faux profils pour les tests
npm run generate:realistic # Profils plus réalistes
npm run migrate:location   # Migration système de localisation
npm run fix:sequences      # Répare les séquences d'IDs
```

---

## 16. Résumé visuel

```
Browser
  │
  ├─ React (Vite, port 5173)
  │    ├─ AuthContext   ← gère user/token (localStorage)
  │    ├─ SocketContext ← temps réel (Socket.io)
  │    └─ Pages + Components
  │         └─ Services API (fetch HTTP)
  │
  ↕  HTTP (REST) + WebSocket (Socket.io)
  │
  ├─ Express.js (port 3001)
  │    ├─ Middlewares (Helmet, CORS, Auth JWT, Sanitize)
  │    ├─ Routes (/auth, /profile, /chat, /notifications...)
  │    ├─ Models (SQL brut, pg.Pool)
  │    └─ SocketService (Socket.io server)
  │
  └─ Neon PostgreSQL (cloud)
       └─ Tables : users, profiles, photos, likes, messages,
                   conversations, notifications, blocks, reports
```

---

## 17. Schéma des tables principales

| Table | Colonnes clés |
|---|---|
| `users` | id, email, username, password_hash, is_verified, verification_token, reset_token |
| `profiles` | user_id, biography, age, gender, sexual_preferences, location, fame_rating |
| `photos` | id, user_id, data (base64), is_profile_picture |
| `likes` | id, liker_id, liked_id, created_at |
| `conversations` | id, user1_id, user2_id (créée quand like mutuel) |
| `messages` | id, conversation_id, sender_id, content, created_at |
| `notifications` | id, user_id, type, message, data, is_read, created_at |
| `blocks` | id, blocker_id, blocked_id |

---

*Pour aller plus loin, regarde directement :*
- `backend/src/routes/profile.ts` — la route la plus longue (59kb !), contient toute la logique métier
- `frontend/src/pages/BrowsingPage.tsx` — la page principale de découverte
- `frontend/src/pages/ChatPage.tsx` — le chat en temps réel
