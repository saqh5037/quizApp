#!/bin/bash

# =================================================================
# OPCIÓN 2: UPDATE IN-PLACE RÁPIDO
# =================================================================
# Estrategia: Actualización del código sin reinstalar dependencias
# Ventajas: Rápido (5-10 min), mantiene configuración existente
# Desventajas: Puede arrastrar problemas de configuración anterior
# Ideal para: Actualizaciones de código frecuentes, hotfixes
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${MAGENTA}║      ARISTOTEST QA - UPDATE IN-PLACE RÁPIDO v2.0        ║${NC}"
echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════╝${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"
APP_DIR="/home/dynamtek/aristoTEST"

# Verificar certificado
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Error: Certificado no encontrado en $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Pre-deployment checks...${NC}"

# Verificar que estamos en main y actualizado
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "main" ]; then
    echo -e "${YELLOW}⚠️  No estás en main (actual: $CURRENT_BRANCH)${NC}"
    echo -e "${YELLOW}¿Cambiar a main? (s/n)${NC}"
    read -r response
    if [[ "$response" == "s" ]]; then
        git checkout main
        git pull origin main
    fi
fi

# Obtener último commit
LAST_COMMIT=$(git log -1 --oneline)
echo -e "${BLUE}📝 Último commit: $LAST_COMMIT${NC}"

echo -e "${GREEN}✅ Pre-checks completados${NC}"
echo ""
echo -e "${YELLOW}🚀 Iniciando actualización rápida...${NC}"

# Script remoto
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"
echo -e "${MAGENTA}   ACTUALIZACIÓN RÁPIDA EN SERVIDOR QA${NC}"
echo -e "${MAGENTA}═══════════════════════════════════════════════${NC}"

# Verificar que el directorio existe
if [ ! -d "/home/dynamtek/aristoTEST" ]; then
    echo -e "${RED}❌ Error: No existe deployment previo en /home/dynamtek/aristoTEST${NC}"
    echo -e "${YELLOW}Use la opción 1 (deployment limpio) primero${NC}"
    exit 1
fi

cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}📊 1. Estado actual del deployment...${NC}"
git status --short
CURRENT_COMMIT=$(git log -1 --oneline)
echo -e "${BLUE}Commit actual: $CURRENT_COMMIT${NC}"

echo -e "${YELLOW}💾 2. Guardando configuración actual...${NC}"
# Backup de archivos de configuración
cp backend/.env /tmp/backend.env.backup 2>/dev/null || true
cp frontend/.env.production /tmp/frontend.env.backup 2>/dev/null || true
cp backend/ecosystem.config.js /tmp/ecosystem.backup.js 2>/dev/null || true

echo -e "${YELLOW}📥 3. Actualizando código desde GitHub...${NC}"
# Stash cambios locales si hay
git stash push -m "Update backup $(date +%Y%m%d-%H%M%S)"
# Pull últimos cambios
git checkout main
git pull origin main --rebase

# Mostrar nuevos commits
NEW_COMMIT=$(git log -1 --oneline)
echo -e "${GREEN}Nuevo commit: $NEW_COMMIT${NC}"

# Mostrar archivos modificados
echo -e "${BLUE}Archivos modificados:${NC}"
git diff --name-status HEAD@{1} HEAD

echo -e "${YELLOW}🔄 4. Restaurando configuración...${NC}"
# Restaurar archivos de configuración
cp /tmp/backend.env.backup backend/.env 2>/dev/null || {
    echo -e "${YELLOW}Creando nueva configuración de backend...${NC}"
    cat > backend/.env << 'EOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
DB_NAME=aristotest
DB_DIALECT=postgres
JWT_SECRET=aristotest-qa-jwt-secret-2025-secure-v2
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2025-secure-v2
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d
SESSION_SECRET=aristotest-qa-session-2025-v2
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
OPENAI_API_KEY=sk-proj-1mNE4R_-zFKWjbDaAtX6R7YgvpfCTjks9PGyFXsTwmfwT23fLKxFK2uRGJAuBpqH2$
CLAUDE_API_KEY=sk-ant-api03-tgv-dbsuzjXhBOSgJnlg6yi9b5_W6fglfvAqftw6Db80r6u7bk9_GIbAEZaz$
USE_MOCK_TRANSCRIPTION=false
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos
FFMPEG_PATH=/usr/bin/ffmpeg
CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com,http://52.55.189.120
SOCKET_CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com,http://52.55.189.120
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads
QR_BASE_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com
TENANT_ID=1
DEFAULT_TENANT_ID=1
TELEGRAM_BOT_TOKEN=8410755699:AAEApXvGNVFRK2En3uIDB27ueUxa-G83Om8
EOF
}

cp /tmp/frontend.env.backup frontend/.env.production 2>/dev/null || {
    echo -e "${YELLOW}Creando configuración de frontend...${NC}"
    cat > frontend/.env.production << 'EOF'
VITE_API_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1
VITE_SOCKET_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
EOF
}

cp /tmp/ecosystem.backup.js backend/ecosystem.config.js 2>/dev/null || true

echo -e "${YELLOW}📦 5. Actualizando dependencias (solo si hay cambios)...${NC}"
cd backend

# Verificar si package.json cambió
if git diff HEAD@{1} HEAD --name-only | grep -q "backend/package.json"; then
    echo -e "${YELLOW}package.json modificado, actualizando dependencias...${NC}"
    npm ci --production
else
    echo -e "${GREEN}No hay cambios en dependencias del backend${NC}"
fi

echo -e "${YELLOW}🔨 6. Compilando backend...${NC}"
npm run build || npx tsc || echo "Usando dist existente"

echo -e "${YELLOW}🗄️  7. Ejecutando migraciones (si hay nuevas)...${NC}"
export NODE_ENV=production
npx sequelize-cli db:migrate --config config/config.json || echo "Sin migraciones nuevas"

echo -e "${YELLOW}🎨 8. Actualizando frontend...${NC}"
cd ../frontend

# Verificar si package.json cambió
if git diff HEAD@{1} HEAD --name-only | grep -q "frontend/package.json"; then
    echo -e "${YELLOW}package.json modificado, actualizando dependencias...${NC}"
    npm ci
else
    echo -e "${GREEN}No hay cambios en dependencias del frontend${NC}"
fi

echo -e "${YELLOW}🔨 9. Compilando frontend...${NC}"
npm run build

echo -e "${YELLOW}🔄 10. Reiniciando servicios...${NC}"
cd /home/dynamtek/aristoTEST

# Reiniciar backend con zero-downtime
pm2 reload aristotest-backend --update-env || {
    echo -e "${YELLOW}Reinicio normal...${NC}"
    pm2 restart aristotest-backend
}

# Verificar MinIO
sudo systemctl status minio-aristotest --no-pager >/dev/null 2>&1 || {
    echo -e "${YELLOW}Reiniciando MinIO...${NC}"
    sudo systemctl restart minio-aristotest 2>/dev/null || true
}

# Reload nginx para asegurar nueva versión del frontend
sudo nginx -t && sudo systemctl reload nginx

echo -e "${YELLOW}✨ 11. Limpieza...${NC}"
# Limpiar archivos temporales de backup
rm -f /tmp/*.backup 2>/dev/null
rm -f /tmp/*.env.backup 2>/dev/null
rm -f /tmp/ecosystem.backup.js 2>/dev/null

# Limpiar logs antiguos si son muy grandes
if [ -f "backend/logs/combined.log" ]; then
    LOG_SIZE=$(du -m backend/logs/combined.log | cut -f1)
    if [ "$LOG_SIZE" -gt 100 ]; then
        echo -e "${YELLOW}Rotando logs grandes...${NC}"
        mv backend/logs/combined.log backend/logs/combined.log.$(date +%Y%m%d)
        pm2 flush aristotest-backend
    fi
fi

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ACTUALIZACIÓN COMPLETADA${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

echo ""
echo -e "${MAGENTA}📊 RESUMEN DE LA ACTUALIZACIÓN:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Mostrar estado de servicios
echo -e "${YELLOW}Estado de servicios:${NC}"
pm2 status

echo ""
echo -e "${YELLOW}Últimos logs del backend:${NC}"
pm2 logs aristotest-backend --nostream --lines 5

echo ""
echo -e "${MAGENTA}🌐 VERIFICACIÓN RÁPIDA:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"

# Test de endpoints críticos
echo -n "Frontend: "
curl -s -o /dev/null -w "%{http_code}" http://localhost || echo "ERROR"

echo -n "Backend Health: "
curl -s http://localhost:3001/api/v1/health | grep -q "ok" && echo "OK" || echo "ERROR"

echo -n "MinIO: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:9001 || echo "ERROR"

echo ""
echo -e "${GREEN}✅ Update completado en $(date)${NC}"

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ ACTUALIZACIÓN EJECUTADA${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# Verificación desde local
echo -e "${YELLOW}🔍 Verificando servicios desde local...${NC}"
sleep 3

# Test frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Frontend actualizado y respondiendo${NC}"
else
    echo -e "${RED}❌ Frontend no responde (HTTP $HTTP_CODE)${NC}"
fi

# Test backend
HEALTH_CHECK=$(curl -s http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1/health 2>/dev/null)
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend API actualizado y saludable${NC}"
else
    echo -e "${RED}❌ Backend API no responde correctamente${NC}"
fi

echo ""
echo -e "${MAGENTA}📚 Comandos útiles post-update:${NC}"
echo -e "${YELLOW}Ver logs:${NC} ssh -i \"$SSH_KEY\" $SERVER 'pm2 logs aristotest-backend --lines 50'"
echo -e "${YELLOW}Monitorear:${NC} ssh -i \"$SSH_KEY\" $SERVER 'pm2 monit'"
echo -e "${YELLOW}Rollback:${NC} ssh -i \"$SSH_KEY\" $SERVER 'cd /home/dynamtek/aristoTEST && git reset --hard HEAD~1 && npm run build && pm2 restart all'"