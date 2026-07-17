# Configuración - EDITA ESTOS VALORES
$VPS_USER = "tu-usuario"
$VPS_HOST = "tu-vps-ip"
$APP_PATH = "/home/tu-usuario/ipstream-panel"

Write-Host "🚀 Iniciando deploy a EasyPanel..." -ForegroundColor Green

# 1. Verificar que rsync esté disponible
if (-not (Get-Command rsync -ErrorAction SilentlyContinue)) {
    Write-Host "❌ rsync no está instalado. Instalando..." -ForegroundColor Red
    Write-Host "💡 Instala rsync desde: https://www.itefix.net/cwrsync" -ForegroundColor Yellow
    Write-Host "💡 O usa WSL: wsl --install" -ForegroundColor Yellow
    exit 1
}

# 2. Sincronizar archivos
Write-Host "📁 Sincronizando archivos..." -ForegroundColor Blue
$excludes = @(
    "--exclude=node_modules",
    "--exclude=.next", 
    "--exclude=.git",
    "--exclude=.env",
    "--exclude=prisma/dev.db",
    "--exclude=deploy.ps1",
    "--exclude=deploy.sh"
)

$rsyncCmd = "rsync -avz --progress $($excludes -join ' ') ./ ${VPS_USER}@${VPS_HOST}:${APP_PATH}/"
Write-Host "Ejecutando: $rsyncCmd" -ForegroundColor Gray
Invoke-Expression $rsyncCmd

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Error en la sincronización de archivos" -ForegroundColor Red
    exit 1
}

# 3. Ejecutar comandos en el servidor
Write-Host "🔧 Instalando dependencias y construyendo..." -ForegroundColor Blue
$sshCommands = @"
cd $APP_PATH
echo "📦 Instalando dependencias..."
npm ci --production=false
echo "🏗️ Generando Prisma Client..."
npx prisma generate
echo "🗄️ Sincronizando base de datos..."
npx prisma db push
echo "✅ Deploy completado en el servidor!"
"@

ssh "${VPS_USER}@${VPS_HOST}" $sshCommands

if ($LASTEXITCODE -eq 0) {
    Write-Host "🎉 Deploy completado exitosamente!" -ForegroundColor Green
    Write-Host "🌐 Tu aplicación debería estar disponible en tu dominio de EasyPanel" -ForegroundColor Cyan
} else {
    Write-Host "❌ Error durante el deploy" -ForegroundColor Red
}