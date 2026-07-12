FROM node:20-slim
WORKDIR /app
COPY package.json ./
COPY backend ./backend
COPY frontend ./frontend
COPY data ./data
COPY db ./db
ENV NODE_ENV=production
ENV PORT=4173
EXPOSE 4173
CMD ["node", "backend/server.js"]
