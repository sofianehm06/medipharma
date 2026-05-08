# ── Étape 1 : build React ────────────────────────────────────
FROM node:20-alpine AS build

WORKDIR /app

# Dépendances
COPY package*.json ./
RUN npm install --legacy-peer-deps && npm cache clean --force

# Code source
COPY public/ ./public/
COPY src/    ./src/

# Variables injectées au build
ARG REACT_APP_API_URL=http://localhost:5000/api
ENV REACT_APP_API_URL=$REACT_APP_API_URL

RUN npm run build

# ── Étape 2 : serveur Nginx de production ────────────────────
FROM nginx:1.25-alpine AS production

LABEL maintainer="MediPharma Team"
LABEL description="Frontend React - Gestion des médicaments hospitaliers"

# Supprimer la config Nginx par défaut
RUN rm /etc/nginx/conf.d/default.conf

# Copier notre config Nginx
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copier le build React
COPY --from=build /app/build /usr/share/nginx/html

# Healthcheck
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost/ || exit 1

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
