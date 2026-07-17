# IPStream Panel — Deploy a Producción

Guía paso a paso para hacer el primer deploy y configurar el flujo CI/CD.

## Requisitos

- VPS Ubuntu 22.04+ con IP pública
- Dominio apuntando a la IP del VPS (registro DNS A)
- Repo en GitHub con el código de este panel

## Estructura

```
deploy/
├── docker-compose.prod.yml    # Override de prod (imágenes prebuilt, Caddy, etc.)
├── Caddyfile                  # Reverse proxy + HTTPS automático
├── .env.prod.example          # Template de variables
├── README.md                  # Este archivo
└── scripts/
    ├── deploy.sh              # Idempotente, llamado por GitHub Actions
    └── health-check.sh        # Verifica que todo esté OK
```

## 1. Setup del VPS (una sola vez)

### Instalar Docker

```bash
# Conectar al VPS
ssh usuario@TU_IP

# Instalar Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Logout y volver a entrar para que tome efecto el grupo

# Verificar
docker --version
docker compose version
```

### Crear usuario `deploy` con SSH

```bash
# Crear usuario
sudo useradd -m -s /bin/bash deploy
sudo mkdir -p /home/deploy/.ssh
sudo chmod 700 /home/deploy/.ssh

# Copiar tu SSH key pública (la que usás para conectarte)
# Ajustá el path si tu key está en otro lado
cat ~/.ssh/id_ed25519.pub | sudo tee -a /home/deploy/.ssh/authorized_keys
sudo chmod 600 /home/deploy/.ssh/authorized_keys
sudo chown -R deploy:deploy /home/deploy/.ssh

# (Opcional) permitir sudo sin password para docker solo
echo "deploy ALL=(ALL) NOPASSWD: /usr/bin/docker" | sudo tee /etc/sudoers.d/deploy
```

### Clonar el repo

```bash
sudo mkdir -p /opt/ipstream-panel
sudo chown deploy:deploy /opt/ipstream-panel

# Logueate como deploy
sudo -u deploy -i

# Clonar (reemplazá con tu repo)
cd /opt
git clone https://github.com/TU_USUARIO/ipstream-panel.git ipstream-panel
cd ipstream-panel
```

## 2. Configurar variables de entorno (una sola vez)

### Generar secretos

En tu **laptop** (o en el VPS), generá los secretos:

```bash
echo "NEXTAUTH_SECRET=$(openssl rand -base64 32)"
echo "ENCRYPTION_KEY=$(openssl rand -hex 32)"
echo "STREAMING_AGENT_TOKEN=$(openssl rand -hex 32)"
echo "MYSQL_ROOT_PASSWORD=$(openssl rand -hex 20)"
echo "MYSQL_PASSWORD=$(openssl rand -hex 20)"
echo "ICE_ADMIN_PASSWORD=$(openssl rand -hex 20)"
echo "ICE_SOURCE_PASSWORD=$(openssl rand -hex 20)"
```

### Crear `.env` en el VPS

```bash
# En el VPS, como deploy
cd /opt/ipstream-panel
cp deploy/.env.prod.example .env
nano .env
# Pegá los valores generados arriba + tu dominio
```

**Valores críticos a completar:**

| Variable | Ejemplo | Cómo obtenerla |
|---|---|---|
| `STREAM_DOMAIN` | `stream.midominio.com` | Tu dominio |
| `NEXTAUTH_URL` | `https://stream.midominio.com` | https + tu dominio |
| `ICE_PUBLIC_URL` | `http://TU_IP:8000` | `http://IP:8000` |
| `ADMIN_EMAIL` | `admin@midominio.com` | Tu email |
| `ADMIN_PASSWORD` | `UnaPass123!` | Una pass fuerte |

```bashroot@vmi3100075:~# echo "=== Nombre del servicio ==="; systemctl list-units --type=service --no-pager 2>/dev/null | grep -i ssh; echo; echo "=== Status antes ==="; systemctl is-active ssh sshd 2>&1; echo; echo "=== Restart ==="; systemctl restart ssh && echo "ssh reiniciado OK"; echo; echo "=== Verificar que NO pide password ==="
=== Nombre del servicio ===
  ssh.service                                    loaded active running OpenBSD Secure Shell server

=== Status antes ===
active
inactive

=== Restart ===
ssh reiniciado OK

=== Verificar que NO pide password ===
root@vmi3100075:~# 

chmod 600 .env
```

## 3. Configurar DNS

En tu proveedor de DNS (Cloudflare, Route53, etc.):

| Tipo | Nombre | Valor | TTL |
|---|---|---|---|
| A | `stream` (o `@`) | `TU_IP_PUBLICA` | 300 |

Verificá que el DNS propague:

```bash
dig panelipstream.cl
# Debe devolver TU_IP_PUBLICA
```

## 4. Configurar GitHub Secrets

En tu repo de GitHub: **Settings → Secrets and variables → Actions → New repository secret**

Agregá estos 3 secrets:

| Nombre | Valor |
|---|---|
| `VPS_SSH_KEY` | El contenido completo de tu SSH private key (la que está en `~/.ssh/id_ed25519`) |
| `VPS_HOST` | `TU_IP_PUBLICA` o `panelipstream.cl` |
| `VPS_USER` | `deploy` |

## 5. Generar SSH key para GitHub Actions

**Importante**: la SSH key que subís a GitHub Secrets debe ser una key **dedicada** para deploys, no tu key personal.

```bash
# En el VPS, como deploy
sudo -u deploy -i
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_deploy_key -N ""

# Agregar la pública al authorized_keys (también puede ser la misma que ya usás)
cat ~/.ssh/github_deploy_key.pub >> ~/.ssh/authorized_keys

# Mostrar la privada para copiarla a GitHub Secrets
cat ~/.ssh/github_deploy_key
# ↑ Copiá todo el contenido (incluyendo BEGIN/END) a GitHub Secret VPS_SSH_KEY
```

## 6. Primer deploy

```bash
# En el VPS, como deploy
cd /opt/ipstream-panel

# Levantar todos los servicios
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml up -d

# Esperar ~30s y aplicar migraciones
sleep 30
docker exec ipstream-app npx prisma db push --accept-data-loss
```

**Verificá que todo esté OK:**

```bash
./deploy/scripts/health-check.sh
```

Salida esperada:
```
=== Containers ===
  ✓ ipstream-db: running (healthy)
  ✓ ipstream-app: running (healthy)
  ✓ ipstream-icecast: running (healthy)
  ✓ ipstream-liquidsoap: running
  ✓ ipstream-agent: running (healthy)
  ✓ ipstream-caddy: running
=== Health endpoint ===
  ✓ Panel health: {"status":"ok",...}
=== Icecast ===
  ✓ Icecast status OK
=== Streaming Agent ===
  ✓ Agent health: {"status":"ok",...}
=== Caddy (HTTPS) ===
  ⚠ Caddy: starting (puede ser que aún no se configuró el dominio)
✅ Todo OK
```

**Abrí en el browser:** `https://panelipstream.cl` — debería mostrar el panel.

**Caddy tarda 1-2 minutos** en obtener el cert de Let's Encrypt. Si ves error de cert, esperá unos minutos y recargá.

## 7. Probar el flujo CI/CD

En tu **laptop**:

```bash
# Hacer un cambio trivial (ej. agregar un espacio en un comentario)
git add .
git commit -m "test: trigger deploy"
git push origin main
```

Andá a GitHub → tu repo → **Actions** → debería aparecer el workflow corriendo.

**Esperá ~2-3 minutos.** El workflow:
1. Construye la imagen de Docker
2. La pushea a GitHub Container Registry (ghcr.io)
3. Se conecta al VPS via SSH
4. Ejecuta `deploy.sh`
5. Hace health check

Si todo está OK, el cambio debería estar en producción.

## 8. Workflow de desarrollo

```bash
# 1. Editar código en local
# 2. Probar localmente con docker compose up
# 3. Commit y push
git add .
git commit -m "feat: nueva funcionalidad"
git push origin main

# → GitHub Actions deploya automáticamente a producción
# → ~2 min después está en https://panelipstream.cl
```

## Comandos útiles en el VPS

```bash
# Ver logs
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f app
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f agent
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml logs -f caddy

# Ver estado
docker compose -f docker-compose.yml -f deploy/docker-compose.prod.yml ps

# Health check completo
./deploy/scripts/health-check.sh

# Re-aplicar migraciones manualmente
docker exec ipstream-app npx prisma db push --accept-data-loss

# Acceder a la DB
docker exec -it ipstream-db mysql -uroot -p$MYSQL_ROOT_PASSWORD ipstream_panel

# Deploy manual (sin esperar a GitHub Actions)
./deploy/scripts/deploy.sh <IMAGE_TAG>
```

## Troubleshooting

### Caddy no obtiene el cert

Verificá:
1. El DNS A record apunta correctamente a la IP
2. El puerto 80 y 443 están abiertos en el firewall
3. `docker logs ipstream-caddy` para ver el error

```bash
# Verificar DNS
dig panelipstream.cl

# Verificar puertos
sudo ufw status
sudo ufw allow 80
sudo ufw allow 443
sudo ufw allow 8000  # Icecast
```

### El deploy falla en GitHub Actions

1. **Verificá los secrets**: Settings → Secrets → VPS_SSH_KEY, VPS_HOST, VPS_USER
2. **Verificá que la key SSH tenga acceso**: desde otro equipo, `ssh deploy@TU_IP`
3. **Verificá los logs del workflow** en GitHub Actions
4. **Conectate al VPS manualmente** y corré `deploy.sh` para ver el error

### La imagen no se pull-ea

Si el workflow deploya antes de que el build termine, el `docker pull` falla. El script tiene un fallback que intenta `docker build` local, pero es lento.

**Solución**: asegurate de que el job `build-and-deploy` espere al build antes de hacer el SSH deploy. En el workflow actual, están en el mismo job así que ya es secuencial.

### El agent no conecta con Icecast

Verificá que el container `agent` puede resolver `icecast` y `liquidsoap`:

```bash
docker exec ipstream-streaming-agent ping -c 2 icecast
docker exec ipstream-streaming-agent ping -c 2 liquidsoap
```

## Próximos pasos (post v1)

- **Backups automatizados**: cron con `mysqldump` + `tar` a S3
- **Monitoring**: Uptime Kuma o similar (otro container)
- **Zero-downtime deploys**: blue-green con dos compose files
- **Multi-arch builds**: agregar `linux/arm64` para Apple Silicon
- **CDN para Icecast**: Cloudflare frente al stream para mejor distribución

---

¿Problemas? Revisá:
1. Los logs de GitHub Actions
2. `docker logs` de los containers que fallan
3. `./deploy/scripts/health-check.sh` para diagnóstico
