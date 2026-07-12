FROM node:24-alpine AS build
ARG VITE_API_BASE_URL
ARG VITE_REQUEST_TIMEOUT_MS
ARG VITE_MAX_UPLOAD_BYTES
ARG VITE_DATA_MODE
ARG VITE_ENABLE_DEMO_FALLBACK
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL \
    VITE_REQUEST_TIMEOUT_MS=$VITE_REQUEST_TIMEOUT_MS \
    VITE_MAX_UPLOAD_BYTES=$VITE_MAX_UPLOAD_BYTES \
    VITE_DATA_MODE=$VITE_DATA_MODE \
    VITE_ENABLE_DEMO_FALLBACK=$VITE_ENABLE_DEMO_FALLBACK
WORKDIR /app
COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci --ignore-scripts && npm cache clean --force
COPY frontend/tsconfig.json frontend/vite.config.ts frontend/index.html ./
COPY frontend/src/ ./src/
RUN npm run build

FROM nginx:1.27-alpine AS production
RUN apk add --no-cache curl
COPY --from=build /app/dist /usr/share/nginx/html
COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
RUN chown -R nginx:nginx /usr/share/nginx/html && chmod -R 755 /usr/share/nginx/html
EXPOSE 80
HEALTHCHECK --interval=15s --timeout=5s --start-period=10s --retries=3 CMD curl -f http://127.0.0.1/ || exit 1
CMD ["nginx", "-g", "daemon off;"]
