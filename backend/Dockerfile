# ── Étape 1 : installation des dépendances ──────────────────
FROM node:20-alpine AS deps

WORKDIR /app

# Copier uniquement les fichiers de dépendances pour exploiter le cache Docker
COPY package*.json ./

# Installer uniquement les dépendances de production
RUN npm ci --only=production && npm cache clean --force

# ── Étape 2 : image de production ───────────────────────────
FROM node:20-alpine AS production

# Métadonnées
LABEL maintainer="MediPharma Team"
LABEL description="Backend API - Gestion des médicaments hospitaliers"

WORKDIR /app

# Créer un utilisateur non-root (sécurité)
RUN addgroup -g 1001 -S appgroup && \
    adduser  -u 1001 -S appuser -G appgroup

# Copier les dépendances depuis l'étape précédente
COPY --from=deps /app/node_modules ./node_modules

# Copier le code source
COPY src/ ./src/
COPY package*.json ./

# Changer le propriétaire des fichiers
RUN chown -R appuser:appgroup /app

# Basculer vers l'utilisateur non-root
USER appuser

# Variables d'environnement par défaut (surchargées par docker-compose)
ENV NODE_ENV=production \
    PORT=5000

EXPOSE 5000

# Healthcheck natif Docker
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD wget -qO- http://localhost:5000/api/health || exit 1

CMD ["node", "src/app.js"]
