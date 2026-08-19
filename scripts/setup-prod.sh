#!/bin/bash
# =====================================================
# IPStream Panel — setup-prod.sh
# =====================================================
# Prepara el archivo .env para producción de forma idempotente.
#
# Para cada variable CRÍTICA, si está vacía o con un default
# inseguro, genera un valor seguro con openssl rand.
# Las variables no-críticas las deja como están.
#
# Uso:
#   ./scripts/setup-prod.sh           # interactivo: pregunta antes de tocar
#   ./scripts/setup-prod.sh --force   # no interactivo: regenera si hay defaults
#   ./scripts/setup-prod.sh --check   # solo verifica, no toca nada
# =====================================================

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(dirname "$SCRIPT_DIR")"
cd "$PROJECT_DIR"

# Cargar .env si existe (para mantener valores no críticos)
ENV_FILE=".env"
ENV_EXAMPLE=".env.example"

if [[ ! -f $ENV_FILE ]]; then
  echo "❌ No se encontró .env en $PROJECT_DIR"
  echo "   Copiá .env.example a .env primero:"
  echo "     cp .env.example .env"
  exit 1
fi

# ====== Lista de secrets que deben ser seguros en prod ======
SECRET_VARS=(
  "NEXTAUTH_SECRET"
  "ENCRYPTION_KEY"
  "STREAMING_AGENT_TOKEN"
  "HARBOR_CALLBACK_SECRET"
  "ICE_ADMIN_PASSWORD"
  "ICE_SOURCE_PASSWORD"
  "ICE_RELAY_PASSWORD"
  "CRON_SECRET"
  "ONESIGNAL_WEBHOOK_SECRET"
)

# ====== Variables opcionales ======
# Vacías NO fallan el check (el template .env.prod.example las documenta como
# opcionales). Solo se marcan si contienen un patrón inseguro.
OPTIONAL_VARS=(
  "CRON_SECRET"
  "ONESIGNAL_WEBHOOK_SECRET"
)

# ====== Defaults inseguros conocidos ======
INSECURE_PATTERNS=(
  "change-me"       # matchea en cualquier posicion (case-insensitive abajo)
  "REEMPLAZAR"
  "CHANGE_ME"
  "dev-agent-token-change-me-in-prod"
  "dev-harbor-callback-token-change-me"
  "dev-secret-change-me"
  "hackme"
  "admin123456"
  "your-secret"
)

# ====== Validar un valor ======
is_insecure() {
  local val="$1"
  if [[ -z "$val" ]]; then
    echo "empty"
    return 0
  fi
  for pattern in "${INSECURE_PATTERNS[@]}"; do
    # Case-insensitive match para capturar 'Change-Me', 'CHANGE-ME', etc.
    if [[ "${val,,}" =~ ${pattern,,} ]]; then
      echo "matches: $pattern"
      return 0
    fi
  done
  return 1
}

# ====== ENCRYPTION_KEY: debe ser 64 hex chars ======
encrypt_key_valid() {
  local val="$1"
  if [[ "$val" =~ ^[a-fA-F0-9]{64}$ ]]; then
    return 0
  fi
  return 1
}

# ====== Verificar estado actual ======
echo "================================================"
echo "  IPStream Panel — Production setup"
echo "================================================"
echo ""

NEEDS_FIX=0
declare -A CURRENT_VALUES
declare -A NEW_VALUES

for var in "${SECRET_VARS[@]}"; do
  # tr -d '"' y "'": los .env pueden tener valores con o sin comillas
  # envolventes; los secretos (openssl) nunca contienen comillas, así que
  # normalizarlas no altera la validación.
  current=$(grep "^$var=" "$ENV_FILE" 2>/dev/null | cut -d= -f2- | tr -d '"' | tr -d "'" || true)
  CURRENT_VALUES[$var]="$current"

  # Opcionales: vacías son aceptables (no fallan el check)
  if [[ -z "$current" && " ${OPTIONAL_VARS[*]} " == *" $var "* ]]; then
    echo "  ✓ $var: ok (opcional, vacío)"
    continue
  fi

  # is_insecure retorna 0 si es inseguro, 1 si es seguro. Con set -e,
  # llamarlo en una linea propia aborta el script cuando el valor es
  # seguro (exit 1). Por eso lo usamos como condicion del if.
  if is_insecure "$current"; then
    reason=$(is_insecure "$current" 2>/dev/null)
    NEEDS_FIX=1
    echo "  ⚠ $var: insecure ($reason)"

    # Generar valor adecuado seg\u00fan la variable
    case "$var" in
      ENCRYPTION_KEY)
        NEW_VALUES[$var]=$(openssl rand -hex 32)
        echo "     -> nuevo: hex 64 chars"
        ;;
      NEXTAUTH_SECRET)
        NEW_VALUES[$var]=$(openssl rand -base64 32)
        echo "     -> nuevo: base64 32 bytes"
        ;;
      *)
        NEW_VALUES[$var]=$(openssl rand -hex 32)
        echo "     -> nuevo: hex 64 chars"
        ;;
    esac
  else
    # Validaci\u00f3n especial para ENCRYPTION_KEY
    if [[ "$var" == "ENCRYPTION_KEY" ]] && ! encrypt_key_valid "$current"; then
      NEEDS_FIX=1
      echo "  ⚠ $var: not 64 hex chars (rechazado por el agente)"
      NEW_VALUES[$var]=$(openssl rand -hex 32)
      echo "     -> nuevo: hex 64 chars"
    else
      echo "  ✓ $var: ok"
    fi
  fi
done

# ====== Modo check ======
if [[ "${1:-}" == "--check" ]]; then
  if [[ $NEEDS_FIX -eq 1 ]]; then
    echo ""
    echo "❌ .env tiene secrets inseguros o faltantes."
    exit 1
  else
    echo ""
    echo "✅ .env tiene todos los secrets seguros."
    exit 0
  fi
fi

# ====== Si no hay que tocar nada, salir ======
if [[ $NEEDS_FIX -eq 0 ]]; then
  echo ""
  echo "✅ .env est\u00e1 listo para producci\u00f3n."
  exit 0
fi

# ====== Si no es --force, pedir confirmaci\u00f3n ======
if [[ "${1:-}" != "--force" ]]; then
  echo ""
  read -p "Estas variables se van a regenerar. ¿Continuar? (y/N) " confirm
  if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
    echo "Cancelado."
    exit 1
  fi
fi

# ====== Hacer backup y actualizar ======
BACKUP_FILE="${ENV_FILE}.backup.$(date +%Y%m%d-%H%M%S)"
cp "$ENV_FILE" "$BACKUP_FILE"
echo ""
echo "📦 Backup guardado en $BACKUP_FILE"

for var in "${!NEW_VALUES[@]}"; do
  new_val="${NEW_VALUES[$var]}"
  # Escapar para sed (solo / y & en este caso, los valores son hex sin esos chars)
  escaped_val=$(printf '%s\n' "$new_val" | sed -e 's/[\/&]/\\&/g')

  if grep -q "^$var=" "$ENV_FILE"; then
    sed -i "s|^$var=.*|$var=$escaped_val|" "$ENV_FILE"
  else
    echo "$var=$new_val" >> "$ENV_FILE"
  fi
  echo "  ✓ $var actualizado"
done

echo ""
echo "✅ .env actualizado. Backup en $BACKUP_FILE"
echo ""
echo "⚠ RECORDATORIO: si cambiaste ENCRYPTION_KEY, tenés que rotar"
echo "  los passwords encriptados en la DB con:"
echo "    docker exec -i ipstream-app node - < scripts/rotate-stream-passwords.js"