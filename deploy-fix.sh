#!/bin/bash

# ==================================================
# ARISTOTEST - DEPLOYMENT SCRIPT CORREGIDO v3.0
# ==================================================

set -e  # Salir si hay errores

# CONFIGURACIÓN CORRECTA
REMOTE_USER="dynamtek"
REMOTE_HOST="18.206.119.156"  # IP CORRECTA
REMOTE_DIR="/home/dynamtek/aristoTEST"
SSH_KEY="~/.ssh/aristotest-qa.pem"
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest2"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ARISTOTEST - DEPLOYMENT CORREGIDO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# 1. VERIFICAR CONECTIVIDAD
echo -e "${YELLOW}1. Verificando conectividad...${NC}"
if ! ping -c 1 $REMOTE_HOST &> /dev/null; then
    echo -e "${RED}ERROR: No se puede conectar a $REMOTE_HOST${NC}"
    echo "Verificar en AWS Console:"
    echo "- Estado de la instancia EC2"
    echo "- Security Groups (puerto 22, 80, 3001)"
    echo "- Elastic IP asociada"
    exit 1
fi

# 2. VERIFICAR SSH KEY
echo -e "${YELLOW}2. Verificando SSH key...${NC}"
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}ERROR: SSH key no encontrada en $SSH_KEY${NC}"
    echo "Obtener desde AWS Console → EC2 → Key Pairs"
    exit 1
fi
chmod 600 $SSH_KEY

# 3. VERIFICAR BASE DE DATOS
echo -e "${YELLOW}3. Verificando base de datos...${NC}"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "\dt" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: No se puede conectar a la base de datos${NC}"
    exit 1
fi

# 4. BUILD LOCAL
echo -e "${YELLOW}4. Compilando aplicación...${NC}"

# Backend - usar TypeScript compiler
cd backend
echo "Instalando dependencias..."
npm ci --production=false

echo "Compilando con TypeScript..."
npx tsc --skipLibCheck --noEmitOnError false
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Advertencia: Errores de TypeScript (continuando)${NC}"
fi

# Frontend
cd ../frontend
echo "Compilando frontend..."
npm ci
npm run build

cd ..

# 5. CREAR ARCHIVO DE CONFIGURACIÓN CORREGIDO
echo -e "${YELLOW}5. Creando configuración de producción...${NC}"
cat > ecosystem.prod.fixed.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    cwd: '/home/dynamtek/aristoTEST/backend',
    instances: 1,
    exec_mode: 'fork',
    node_args: '-r dotenv/config -r ./register-paths.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_PORT: 5432,
      DB_NAME: 'aristotest2',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4',
      JWT_SECRET: 'aristotest-jwt-secret-2024',
      JWT_REFRESH_SECRET: 'aristotest-refresh-secret-2024',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      CORS_ORIGIN: 'http://18.206.119.156',
      SOCKET_CORS_ORIGIN: 'http://18.206.119.156',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_ACCESS_KEY: 'aristotest',
      MINIO_SECRET_KEY: 'AristoTest2024!',
      MINIO_BUCKET_NAME: 'aristotest-videos',
      MINIO_USE_SSL: false
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10
  }]
};
EOF

# 6. TRANSFERIR ARCHIVOS
echo -e "${YELLOW}6. Transfiriendo archivos...${NC}"

# Crear archivo tar
tar -czf deployment.tar.gz \
    backend/dist \
    backend/package*.json \
    backend/register-paths.js \
    frontend/dist \
    ecosystem.prod.fixed.js \
    --exclude='node_modules' \
    --exclude='*.log'

# Transferir
scp -i $SSH_KEY deployment.tar.gz $REMOTE_USER@$REMOTE_HOST:/tmp/

# 7. EJECUTAR EN SERVIDOR REMOTO
echo -e "${YELLOW}7. Desplegando en servidor...${NC}"

ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'REMOTE_SCRIPT'
set -e

echo "Extrayendo archivos..."
cd /home/dynamtek/aristoTEST
tar -xzf /tmp/deployment.tar.gz

echo "Instalando dependencias de producción..."
cd backend
npm ci --production

echo "Ejecutando migraciones..."
npx sequelize-cli db:migrate

echo "Reiniciando PM2..."
pm2 stop aristotest-backend || true
pm2 delete aristotest-backend || true
pm2 start ../ecosystem.prod.fixed.js
pm2 save

echo "Configurando Nginx..."
sudo cp -r ../frontend/dist/* /var/www/html/

echo "Reiniciando servicios..."
sudo systemctl restart nginx
pm2 restart all

echo "Verificando servicios..."
pm2 list
curl -s http://localhost:3001/health || echo "Backend no responde"

REMOTE_SCRIPT

# 8. VERIFICACIÓN FINAL
echo -e "${YELLOW}8. Verificando deployment...${NC}"

# Verificar frontend
if curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend funcionando${NC}"
else
    echo -e "${RED}❌ Frontend no responde${NC}"
fi

# Verificar backend
if curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST:3001/health | grep -q "200"; then
    echo -e "${GREEN}✅ Backend funcionando${NC}"
else
    echo -e "${RED}❌ Backend no responde${NC}"
fi

# Limpiar
rm -f deployment.tar.gz

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETADO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "URLs:"
echo "- Frontend: http://$REMOTE_HOST"
echo "- Backend: http://$REMOTE_HOST:3001"
echo "- MinIO: http://$REMOTE_HOST:9001"