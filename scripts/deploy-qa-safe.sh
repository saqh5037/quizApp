#!/bin/bash

# 🚀 Script de Deployment Seguro a QA
# Autor: AristoTest Team
# Fecha: 29/08/2025

set -e  # Salir si hay algún error

# Configuración
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY_PATH="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
REMOTE_BACKEND="/home/dynamtek/aristotest-backend"
REMOTE_FRONTEND="/var/www/aristotest"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deployment a QA${NC}"
echo "=================================="

# Verificar que el archivo de llave existe
if [ ! -f "$KEY_PATH" ]; then
    echo -e "${RED}❌ Error: No se encuentra la llave SSH en $KEY_PATH${NC}"
    exit 1
fi

# Verificar conectividad con el servidor
echo -e "${YELLOW}📡 Verificando conexión con el servidor...${NC}"
if ! ssh -i "$KEY_PATH" -o ConnectTimeout=5 "$USER@$SERVER" "echo 'Conexión exitosa'" > /dev/null 2>&1; then
    echo -e "${RED}❌ Error: No se puede conectar al servidor${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Conexión verificada${NC}"

# Build del frontend
echo -e "${YELLOW}🔨 Construyendo frontend...${NC}"
cd frontend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en build del frontend${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✅ Frontend construido${NC}"

# Build del backend
echo -e "${YELLOW}🔨 Construyendo backend...${NC}"
cd backend
npm run build
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en build del backend${NC}"
    exit 1
fi
cd ..
echo -e "${GREEN}✅ Backend construido${NC}"

# Crear backup en el servidor
echo -e "${YELLOW}📦 Creando backup en el servidor...${NC}"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
ssh -i "$KEY_PATH" "$USER@$SERVER" << EOF
    if [ -d "$REMOTE_BACKEND" ]; then
        cp -r "$REMOTE_BACKEND" "${REMOTE_BACKEND}-backup-$TIMESTAMP"
        echo "Backup del backend creado"
    fi
    if [ -d "$REMOTE_FRONTEND" ]; then
        sudo cp -r "$REMOTE_FRONTEND" "${REMOTE_FRONTEND}-backup-$TIMESTAMP"
        echo "Backup del frontend creado"
    fi
EOF
echo -e "${GREEN}✅ Backups creados${NC}"

# Deploy del backend
echo -e "${YELLOW}📤 Desplegando backend...${NC}"
rsync -avz --delete \
    --exclude='node_modules' \
    --exclude='.env' \
    --exclude='.env.local' \
    --exclude='logs' \
    --exclude='storage/minio-data' \
    --exclude='storage/processed' \
    --exclude='storage/uploads' \
    --exclude='uploads' \
    -e "ssh -i $KEY_PATH" \
    ./backend/ "$USER@$SERVER:$REMOTE_BACKEND/"

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en rsync del backend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Backend desplegado${NC}"

# Deploy del frontend
echo -e "${YELLOW}📤 Desplegando frontend...${NC}"
rsync -avz --delete \
    -e "ssh -i $KEY_PATH" \
    ./frontend/dist/ "$USER@$SERVER:~/aristotest-frontend-temp/"

ssh -i "$KEY_PATH" "$USER@$SERVER" << EOF
    sudo rm -rf $REMOTE_FRONTEND/*
    sudo mv ~/aristotest-frontend-temp/* $REMOTE_FRONTEND/
    rm -rf ~/aristotest-frontend-temp
EOF

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Error en deploy del frontend${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Frontend desplegado${NC}"

# Configurar el backend en el servidor
echo -e "${YELLOW}⚙️  Configurando backend en el servidor...${NC}"
ssh -i "$KEY_PATH" "$USER@$SERVER" << 'EOF'
    cd /home/dynamtek/aristotest-backend
    
    # Instalar dependencias de producción
    npm ci --production
    
    # Crear archivo .env si no existe
    if [ ! -f .env ]; then
        echo "Creando archivo .env..."
        cp .env.qa.example .env
        echo "⚠️  IMPORTANTE: Actualiza el archivo .env con las credenciales correctas"
    fi
    
    # Crear directorio de logs si no existe
    mkdir -p logs
    
    # Verificar PM2
    if ! command -v pm2 &> /dev/null; then
        echo "Instalando PM2..."
        npm install -g pm2
    fi
    
    # Crear ecosystem.config.js si no existe
    if [ ! -f ecosystem.config.js ]; then
        cat > ecosystem.config.js << 'EOFE'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      PORT: 3001
    },
    error_file: './logs/pm2-error.log',
    out_file: './logs/pm2-out.log',
    log_file: './logs/pm2-combined.log',
    time: true
  }]
};
EOFE
    fi
    
    # Reiniciar aplicación con PM2
    pm2 stop aristotest-backend 2>/dev/null || true
    pm2 delete aristotest-backend 2>/dev/null || true
    pm2 start ecosystem.config.js
    pm2 save
    pm2 startup systemd -u dynamtek --hp /home/dynamtek || true
EOF
echo -e "${GREEN}✅ Backend configurado y ejecutándose${NC}"

# Verificar el estado del deployment
echo -e "${YELLOW}🔍 Verificando estado del deployment...${NC}"
ssh -i "$KEY_PATH" "$USER@$SERVER" << EOF
    echo "Estado de PM2:"
    pm2 status
    echo ""
    echo "Últimas líneas del log:"
    pm2 logs aristotest-backend --lines 10 --nostream
EOF

# Test de conectividad
echo -e "${YELLOW}🧪 Probando endpoints...${NC}"
if curl -f -s -o /dev/null "http://$SERVER:3001/api/v1/quizzes/public"; then
    echo -e "${GREEN}✅ Backend API respondiendo correctamente${NC}"
else
    echo -e "${RED}⚠️  Backend API no responde (puede tomar unos segundos en iniciar)${NC}"
fi

if curl -f -s -o /dev/null "http://$SERVER/"; then
    echo -e "${GREEN}✅ Frontend respondiendo correctamente${NC}"
else
    echo -e "${RED}⚠️  Frontend no responde${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Deployment completado!${NC}"
echo "=================================="
echo -e "Frontend: ${GREEN}http://$SERVER/${NC}"
echo -e "Backend API: ${GREEN}http://$SERVER:3001/api/v1${NC}"
echo -e "PM2 Logs: ssh -i $KEY_PATH $USER@$SERVER 'pm2 logs aristotest-backend'"
echo ""
echo -e "${YELLOW}⚠️  Recordatorios:${NC}"
echo "1. Verificar el archivo .env en el servidor con las credenciales correctas"
echo "2. Verificar que MinIO esté ejecutándose en el servidor"
echo "3. Verificar la conexión a la base de datos PostgreSQL"
echo "4. Configurar Nginx si es necesario"
echo ""
echo -e "${GREEN}Para hacer rollback si algo falla:${NC}"
echo "ssh -i $KEY_PATH $USER@$SERVER"
echo "cd /home/dynamtek/"
echo "pm2 stop aristotest-backend"
echo "mv aristotest-backend aristotest-backend-failed"
echo "mv aristotest-backend-backup-$TIMESTAMP aristotest-backend"
echo "cd aristotest-backend && pm2 start ecosystem.config.js"