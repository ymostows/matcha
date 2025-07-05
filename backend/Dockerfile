FROM node:18-alpine

# Installer les dépendances système nécessaires
RUN apk add --no-cache \
    postgresql-client \
    curl

WORKDIR /app

# Copier les fichiers de dépendances
COPY package*.json ./

# Installer les dépendances (incluant ts-node globalement)
RUN npm install && \
    npm install -g ts-node typescript

# Copier le code source
COPY . .

# Créer l'utilisateur non-root pour la sécurité
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodeuser -u 1001

# Créer le dossier uploads et changer la propriété des fichiers
RUN mkdir -p /app/uploads && \
    chown -R nodeuser:nodejs /app && \
    chmod 755 /app/uploads
USER nodeuser

# Exposer le port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Commande de développement
CMD ["npm", "run", "dev"] 