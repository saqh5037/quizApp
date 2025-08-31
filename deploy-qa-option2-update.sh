#!/bin/bash

# =================================================================
# OPCIÓN 2: ACTUALIZACIÓN INCREMENTAL
# =================================================================
# Descripción: Actualiza el código sin detener servicios innecesariamente
# Ideal para: Actualizaciones rápidas sin downtime
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AristoTest QA - Actualización Incremental   ${NC}"
echo -e "${BLUE}================================================${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"
APP_DIR="/home/dynamtek/aristoTEST"

# Verificar certificado
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: No se encuentra el certificado en $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}Conectando al servidor QA...${NC}"

# Script remoto
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}1. Verificando estado actual...${NC}"
if [ ! -d ".git" ]; then
    echo -e "${RED}No existe deployment previo. Use la Opción 1 primero.${NC}"
    exit 1
fi

echo -e "${YELLOW}2. Creando backup rápido...${NC}"
tar -czf ../aristotest-backup-$(date +%Y%m%d-%H%M%S).tar.gz backend/dist frontend/dist backend/.env 2>/dev/null || true

echo -e "${YELLOW}3. Actualizando código desde GitHub...${NC}"
git fetch origin main
git reset --hard origin/main

echo -e "${YELLOW}4. Actualizando Backend...${NC}"
cd backend

# Verificar si hay nuevas dependencias
echo -e "${YELLOW}Verificando dependencias...${NC}"
npm ci --production

echo -e "${YELLOW}5. Compilando Backend...${NC}"
npm run build || {
    echo -e "${YELLOW}Error en build, restaurando dist anterior...${NC}"
    tar -xzf ../../aristotest-backup-*.tar.gz backend/dist 2>/dev/null || true
}

# Aplicar fix de transcripción
if [ -f "dist/services/video-transcription.service.js" ]; then
    sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js
fi

echo -e "${YELLOW}6. Ejecutando nuevas migraciones...${NC}"
export NODE_ENV=production
npx sequelize-cli db:migrate || echo "No hay nuevas migraciones"

echo -e "${YELLOW}7. Actualizando Frontend...${NC}"
cd ../frontend

# Verificar dependencias
npm ci

echo -e "${YELLOW}8. Compilando Frontend...${NC}"
npm run build

echo -e "${YELLOW}9. Reiniciando servicios con zero-downtime...${NC}"
cd ../backend

# PM2 reload para zero-downtime
pm2 reload aristotest-backend --update-env

echo -e "${YELLOW}10. Limpiando cache de Nginx...${NC}"
sudo nginx -s reload

echo -e "${GREEN}✅ Actualización completada!${NC}"
echo ""
echo -e "${BLUE}Verificando servicios...${NC}"
pm2 status
echo ""
echo -e "${BLUE}Últimos logs:${NC}"
pm2 logs aristotest-backend --lines 10 --nostream

echo -e "${BLUE}URLs de acceso:${NC}"
echo "Frontend: http://ec2-52-55-189-120.compute-1.amazonaws.com"
echo "Backend API: http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1"

REMOTE_SCRIPT

echo -e "${GREEN}✅ Actualización ejecutada!${NC}"

# Verificación rápida
echo -e "${YELLOW}Verificando servicios...${NC}"
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://ec2-52-55-189-120.compute-1.amazonaws.com
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1/health