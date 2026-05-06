FROM node:22-bookworm-slim AS build

ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --filter backend

COPY backend ./backend

RUN pnpm --filter backend build

FROM node:22-bookworm-slim AS production

ENV NODE_ENV=production
ENV PORT=3000
ENV HOST=0.0.0.0
ENV PNPM_HOME=/pnpm
ENV PATH=$PNPM_HOME:$PATH

WORKDIR /app

RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY backend/package.json ./backend/package.json

RUN pnpm install --frozen-lockfile --prod --filter backend

COPY --from=build /app/backend/dist ./backend/dist
COPY backend/scripts ./backend/scripts

WORKDIR /app/backend

EXPOSE 3000

CMD ["pnpm", "start:docker"]
