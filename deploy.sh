#!/bin/bash

# Configuración
VPS_USER="tu-usuario"
VPS_HOST="tu-vps-ip"
APP_PATH="/home/tu-usuario/ipstream-panel"

echo "🚀 Iniciando deploy a EasyPanel..."

# 1. Sincronizar archivos (excluyendo archivos innecesarios)
echo "📁 Sincronizando archivos..."
rsync -avz --progress \
  --exclude=node_modules \
  --exclude=.next \
  --exclude=.git \
  --exclude=.env \
  --exclude=prisma/dev.db \
  --exclude=deploy.sh \
  ./ $VPS_USER@$VPS_HOST:$APP_PATH/

# 2. Ejecutar comandos en el servidor
echo "🔧 Instalando dependencias y construyendo..."
ssh $VPS_USER@$VPS_HOST << 'EOF'
cd /home/tu-usuario/ipstream-panel
echo "📦 Instalando dependencias..."
npm ci --production=false
echo "🏗️ Construyendo la aplicación..."
npm run build
echo "🏗️ Generando Prisma Client..."
npx prisma generate
echo "🗄️ Sincronizando base de datos..."
npx prisma db push
echo "✅ Deploy completado en el servidor!"
EOF

echo "🎉 Deploy completado exitosamente!"
echo "🌐 Tu aplicación debería estar disponible en tu dominio de EasyPanel"