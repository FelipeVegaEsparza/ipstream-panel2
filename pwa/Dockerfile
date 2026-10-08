# Build por cliente para Dockploy.
# Uso (Dockploy/Easypanel): BUILD_ARGS="CLIENT=radio-prueba"
ARG CLIENT=radio-prueba

FROM node:20-alpine AS build
WORKDIR /app
ARG CLIENT

COPY package.json package-lock.json ./
RUN npm ci

COPY . .
# "$CLIENT" entre comillas y la validación kebab-case en scripts/build-client.mjs
# hacen que un CLIENT malformado falle el build en vez de expandirse como shell.
RUN npm run build:client -- "$CLIENT"

FROM nginx:alpine
ARG CLIENT
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist/${CLIENT} /usr/share/nginx/html
# Importante: el master de nginx DEBE correr como root en la imagen oficial
# (necesita /var/run/nginx.pid, /var/log/nginx y /var/cache/nginx). Los workers
# ya bajan al usuario "nginx" mediante la config principal de la imagen, así que
# NO usar "USER nginx": deja al contenedor sin responder (502 Bad Gateway).
EXPOSE 80

# Healthcheck: marca el contenedor como unhealthy si nginx deja de responder.
# nginx:alpine incluye wget (busybox). Dockploy/Easypanel pueden usar este
# estado para reiniciar el contenedor o avisar antes de un 502.
HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
  CMD wget -q -O /dev/null http://127.0.0.1/ || exit 1
