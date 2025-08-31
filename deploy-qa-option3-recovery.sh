#!/bin/bash

# =================================================================
# OPCIÓN 3: RECUPERACIÓN Y FIX DE ERRORES
# =================================================================
# Descripción: Soluciona problemas comunes y recupera el deployment
# Ideal para: Cuando hay errores 500, problemas de DB o servicios caídos
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AristoTest QA - Recuperación y Fixes        ${NC}"
echo -e "${BLUE}================================================${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"

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

echo -e "${YELLOW}1. Diagnosticando problemas...${NC}"

# Verificar si existe el directorio
if [ ! -d "/home/dynamtek/aristoTEST" ]; then
    echo -e "${RED}No existe deployment. Use la Opción 1 primero.${NC}"
    exit 1
fi

cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}2. Limpiando procesos zombie...${NC}"
# Matar procesos node huérfanos
ps aux | grep node | grep -v grep | awk '{print $2}' | xargs -r kill -9 2>/dev/null || true
# Limpiar puerto 3001
sudo lsof -ti:3001 | xargs -r sudo kill -9 2>/dev/null || true
# Limpiar puerto 9000 (MinIO)
sudo lsof -ti:9000 | xargs -r sudo kill -9 2>/dev/null || true

echo -e "${YELLOW}3. Verificando configuración de base de datos...${NC}"
cd backend

# Crear archivo .env correcto
cat > .env << 'EOF'
NODE_ENV=production
PORT=3001
HOST=0.0.0.0

# Database - IMPORTANTE: Usar aristotest
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
DB_NAME=aristotest
DB_DIALECT=postgres
DB_POOL_MAX=5
DB_POOL_MIN=1
DB_POOL_ACQUIRE=30000
DB_POOL_IDLE=10000

# JWT
JWT_SECRET=aristotest-qa-jwt-secret-2025-secure
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2025-secure
JWT_EXPIRE=7d
JWT_REFRESH_EXPIRE=30d

# Session
SESSION_SECRET=aristotest-qa-session-2025

# AI APIs
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
OPENAI_API_KEY=sk-proj-1mNE4R_-zFKWjbDaAtX6R7YgvpfCTjks9PGyFXsTwmfwT23fLKxFK2uRGJAuBpqH2
CLAUDE_API_KEY=sk-ant-api03-tgv-dbsuzjXhBOSgJnlg6yi9b5_W6fglfvAqftw6Db80r6u7bk9_GIbAEZaz
USE_MOCK_TRANSCRIPTION=false

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_USE_SSL=false
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos

# FFmpeg
FFMPEG_PATH=/usr/bin/ffmpeg

# CORS
CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com
SOCKET_CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000

# Files
MAX_FILE_SIZE=104857600
UPLOAD_DIR=/tmp/uploads

# QR
QR_BASE_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com

# Tenant
TENANT_ID=1
DEFAULT_TENANT_ID=1

# Trust Proxy
TRUST_PROXY=true
EOF

echo -e "${YELLOW}4. Verificando conexión a base de datos...${NC}"
PGPASSWORD=',U8x=]N02SX4' psql -h ec2-3-91-26-178.compute-1.amazonaws.com -U labsis -d aristotest -c "SELECT 1" > /dev/null 2>&1 && \
    echo -e "${GREEN}✅ Conexión a DB exitosa${NC}" || \
    echo -e "${RED}❌ No se puede conectar a la DB${NC}"

echo -e "${YELLOW}5. Limpiando y reconstruyendo backend...${NC}"
# Limpiar node_modules si hay problemas
rm -rf node_modules package-lock.json
npm install --production

# Intentar compilar
npm run build 2>/dev/null || {
    echo -e "${YELLOW}Build falló, intentando alternativa...${NC}"
    # Si falla, usar la versión anterior de dist si existe
    if [ ! -d "dist" ]; then
        echo -e "${RED}No hay dist disponible. Necesita compilación manual.${NC}"
    fi
}

# Aplicar fixes críticos
if [ -f "dist/services/video-transcription.service.js" ]; then
    echo -e "${YELLOW}Aplicando fix de transcripción...${NC}"
    sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js
fi

if [ -f "dist/server.js" ]; then
    echo -e "${YELLOW}Aplicando fix de trust proxy...${NC}"
    grep -q "trust proxy" dist/server.js || sed -i "/const app = express();/a app.set('trust proxy', true);" dist/server.js
fi

echo -e "${YELLOW}6. Ejecutando migraciones forzadas...${NC}"
export NODE_ENV=production
npx sequelize-cli db:migrate --env production 2>/dev/null || {
    echo -e "${YELLOW}Migraciones ya aplicadas o error en migraciones${NC}"
}

echo -e "${YELLOW}7. Creando usuario admin si no existe...${NC}"
cat > fix-admin.js << 'EOF'
const bcrypt = require('bcrypt');
const { Sequelize } = require('sequelize');

const sequelize = new Sequelize('aristotest', 'labsis', ',U8x=]N02SX4', {
  host: 'ec2-3-91-26-178.compute-1.amazonaws.com',
  dialect: 'postgres',
  logging: false
});

async function fixAdmin() {
  try {
    const hash = bcrypt.hashSync('admin123', 10);
    await sequelize.query(
      `INSERT INTO users (email, password, first_name, last_name, role, tenant_id, created_at, updated_at) 
       VALUES ('admin@aristotest.com', :hash, 'Admin', 'User', 'admin', 1, NOW(), NOW())
       ON CONFLICT (email) DO UPDATE SET password = :hash`,
      { replacements: { hash } }
    );
    console.log('✅ Usuario admin actualizado');
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await sequelize.close();
  }
}

fixAdmin();
EOF

node fix-admin.js
rm fix-admin.js

echo -e "${YELLOW}8. Verificando/Instalando MinIO...${NC}"
if [ ! -f /usr/local/bin/minio ]; then
    wget -q https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
    sudo mv minio /usr/local/bin/
fi

# Crear directorio de datos
mkdir -p storage/minio-data

# Reiniciar MinIO
sudo systemctl restart minio 2>/dev/null || {
    echo -e "${YELLOW}Iniciando MinIO manualmente...${NC}"
    nohup minio server storage/minio-data --address :9000 --console-address :9001 > minio.log 2>&1 &
}

echo -e "${YELLOW}9. Reiniciando backend con PM2...${NC}"
pm2 delete aristotest-backend 2>/dev/null || true

# Crear ecosystem config actualizado
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M',
    node_args: '--max-old-space-size=512'
  }]
}
EOF

mkdir -p logs
pm2 start ecosystem.config.js
pm2 save

echo -e "${YELLOW}10. Verificando frontend...${NC}"
cd ../frontend

if [ ! -d "dist" ]; then
    echo -e "${YELLOW}Compilando frontend...${NC}"
    npm install
    npm run build
fi

echo -e "${YELLOW}11. Reiniciando Nginx...${NC}"
sudo nginx -t && sudo systemctl reload nginx

echo -e "${GREEN}✅ Recuperación completada!${NC}"
echo ""
echo -e "${BLUE}Estado de servicios:${NC}"
pm2 status
echo ""
echo -e "${BLUE}Verificación de endpoints:${NC}"
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:3001/api/v1/health
echo ""
echo -e "${BLUE}Últimos errores (si hay):${NC}"
pm2 logs aristotest-backend --err --lines 5 --nostream
echo ""
echo -e "${GREEN}URLs de acceso:${NC}"
echo "Frontend: http://ec2-52-55-189-120.compute-1.amazonaws.com"
echo "Backend API: http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1"
echo "MinIO: http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
echo ""
echo -e "${GREEN}Credenciales:${NC}"
echo "Admin: admin@aristotest.com / admin123"

REMOTE_SCRIPT

echo -e "${GREEN}✅ Script de recuperación ejecutado!${NC}"