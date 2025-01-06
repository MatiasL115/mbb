# =====================
# 1) Etapa Builder
# =====================
FROM node:18-alpine AS builder

# Crea la carpeta de trabajo
WORKDIR /app

# Copiamos package.json y package-lock.json (o yarn.lock) primero
COPY package*.json ./

# Copiamos la carpeta prisma (importante que contenga schema.prisma)
COPY prisma ./prisma

# Instalamos todas las dependencias (incluyendo devDependencies, para TypeScript y Prisma)
RUN npm install

# Copiamos el resto de tu código (incluyendo .ts, tsconfig.json, etc.)
COPY . .

# Compilamos (TypeScript -> dist/)
RUN npm run build

# Generamos el cliente de Prisma (si no ocurre automáticamente en postinstall)
RUN npx prisma generate

# =====================
# 2) Etapa Producción
# =====================
FROM node:18-alpine

# Opcional: define NODE_ENV para ayudarte con logs / librerías
ENV NODE_ENV=production

# Crea el directorio de trabajo
WORKDIR /app

# Copiamos los archivos necesarios desde la etapa builder:
#  1) package*.json para instalar solo dependencias de producción
#  2) dist/ (el resultado de la compilación)
#  3) prisma/ si tu app en runtime necesita migraciones o seeds
COPY --from=builder /app/package*.json ./
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/prisma ./prisma

# Instalamos solo dependencias de producción
RUN npm install --production

# Expone el puerto (ajústalo si tu app escucha en otro)
EXPOSE 3000

# Comando final: levanta tu app (ajusta si tu archivo de entrada es otro)
CMD ["node", "dist/index.js"]
