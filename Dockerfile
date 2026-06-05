FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Stage dedicato ai seed script — ha tutte le devDependencies (tsx, @types/pg...)
# Non esegue la build Next.js, quindi è veloce da buildare
FROM node:22-alpine AS scripts
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY scripts/ ./scripts/
COPY src/lib/ ./src/lib/
COPY src/types/ ./src/types/
COPY tsconfig.json ./

FROM node:22-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs
EXPOSE 3000
ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
