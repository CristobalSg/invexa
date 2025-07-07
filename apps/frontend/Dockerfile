FROM node:20-alpine AS builder
WORKDIR /app

# Copia el monorepo lockfiles y frontend completo
COPY pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/frontend ./apps/frontend

# Instala pnpm y dependencias
RUN npm install -g pnpm
RUN pnpm install --frozen-lockfile

WORKDIR /app/apps/frontend
RUN pnpm build

FROM nginx:1.25-alpine
COPY --from=builder /app/apps/frontend/dist /usr/share/nginx/html
COPY apps/frontend/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
