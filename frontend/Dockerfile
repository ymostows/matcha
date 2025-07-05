FROM node:18-alpine

# Installer les dépendances système nécessaires
RUN apk add --no-cache curl

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances
RUN npm install

# Copier le code source
COPY . .

# Créer l'utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Changer la propriété des fichiers
RUN chown -R nodeuser:nodejs /app
USER nodeuser

# Exposer le port Vite (5173)
EXPOSE 5173

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:5173 || exit 1

# Commande de développement avec host 0.0.0.0 pour Docker
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0", "--port", "5173"] 