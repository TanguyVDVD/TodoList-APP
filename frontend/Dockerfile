# --- Frontend Next.js - image de développement -------------------------------
FROM node:20-alpine

WORKDIR /app

# `libc6-compat` : compatibilité de certaines dépendances natives sur Alpine.
RUN apk add --no-cache libc6-compat

# Cache des dépendances : on copie d'abord les fichiers de manifeste.
# Le `*` rend package-lock.json optionnel (absent au premier build).
COPY package.json package-lock.json* ./
RUN npm install

# Le code est ensuite monté en bind-mount par docker-compose (hot-reload).
COPY . .

EXPOSE 3000

# Serveur de développement Next.js.
CMD ["npm", "run", "dev"]
