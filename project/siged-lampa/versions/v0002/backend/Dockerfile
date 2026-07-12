FROM node:24-alpine AS production
WORKDIR /app
RUN addgroup -S appgroup && adduser -S appuser -G appgroup
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts && npm cache clean --force
COPY database/ ./database/
COPY backend/ ./backend/
RUN chown -R appuser:appgroup /app
USER appuser
EXPOSE 3000
ENV NODE_ENV=production
HEALTHCHECK --interval=15s --timeout=5s --start-period=30s --retries=3 CMD wget --no-verbose --tries=1 --spider http://127.0.0.1:3000/health || exit 1
CMD ["node", "backend/src/server.js"]
