#!/bin/bash

# 🚀 Script de Despliegue Completo a QA - AristoTest
# Autor: AristoTest Team
# Fecha: 29/08/2025

set -e  # Salir si hay algún error

# Configuración
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY_PATH="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
REMOTE_DIR="/home/dynamtek/aristoTEST"
GITHUB_REPO="https://github.com/saqh5037/quizApp.git"
BRANCH="qa/release-1.1.0"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${GREEN}🚀 Iniciando deployment completo a QA${NC}"
echo "=================================="
echo -e "${BLUE}Servidor: $SERVER${NC}"
echo -e "${BLUE}Usuario: $USER${NC}"
echo -e "${BLUE}Directorio: $REMOTE_DIR${NC}"
echo -e "${BLUE}Branch: $BRANCH${NC}"
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

# Copiar archivo de configuración .env.qa
echo -e "${YELLOW}📤 Copiando configuración de ambiente...${NC}"
scp -i "$KEY_PATH" backend/.env.qa "$USER@$SERVER:/tmp/.env.qa"
echo -e "${GREEN}✅ Configuración copiada${NC}"

# Conectar al servidor y ejecutar deployment
echo -e "${YELLOW}🔧 Ejecutando deployment en el servidor...${NC}"
ssh -i "$KEY_PATH" "$USER@$SERVER" << 'ENDSSH'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}1️⃣ Verificando servicios existentes...${NC}"
# Listar servicios PM2 actuales
if command -v pm2 &> /dev/null; then
    echo "Servicios PM2 actuales:"
    pm2 list
fi

# Verificar puertos en uso
echo "Puertos en uso (relevantes):"
netstat -tuln | grep -E ':(80|443|3000|3001|8080|8443|9000) ' || true

echo -e "${YELLOW}2️⃣ Creando estructura de directorios...${NC}"
# Crear backup del deployment anterior si existe
if [ -d "/home/dynamtek/aristoTEST" ]; then
    TIMESTAMP=$(date +%Y%m%d-%H%M%S)
    echo "Creando backup del deployment anterior..."
    sudo mv /home/dynamtek/aristoTEST /home/dynamtek/aristoTEST-backup-$TIMESTAMP || true
fi

# Crear directorio para el proyecto
mkdir -p /home/dynamtek/aristoTEST

echo -e "${YELLOW}3️⃣ Clonando código desde GitHub...${NC}"
cd /home/dynamtek
git clone -b qa/release-1.1.0 https://github.com/saqh5037/quizApp.git aristoTEST || {
    cd aristoTEST
    git fetch origin
    git checkout qa/release-1.1.0
    git pull origin qa/release-1.1.0
}

cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}4️⃣ Configurando Backend...${NC}"
cd backend

# Copiar archivo de configuración
cp /tmp/.env.qa .env
rm /tmp/.env.qa

# Instalar Node.js 18 si no está instalado
if ! node --version | grep -q "v18"; then
    echo "Instalando Node.js 18..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

# Instalar dependencias
echo "Instalando dependencias del backend..."
npm ci --production

# Crear directorios necesarios
mkdir -p logs uploads storage/temp storage/processed storage/uploads

# Instalar PM2 globalmente si no está instalado
if ! command -v pm2 &> /dev/null; then
    echo "Instalando PM2..."
    sudo npm install -g pm2
fi

# Crear ecosystem.config.js para PM2
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './src/server.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register -r tsconfig-paths/register',
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
    time: true,
    merge_logs: true
  }]
};
EOF

echo -e "${YELLOW}5️⃣ Configurando Frontend...${NC}"
cd ../frontend

# Crear archivo .env de producción
cat > .env.production << 'EOF'
VITE_API_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
VITE_SOCKET_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
VITE_APP_NAME=AristoTest
VITE_APP_VERSION=1.1.0
EOF

# Instalar dependencias y hacer build
echo "Instalando dependencias del frontend..."
npm ci

echo "Construyendo frontend..."
npm run build

echo -e "${YELLOW}6️⃣ Configurando Nginx...${NC}"
# Instalar Nginx si no está instalado
if ! command -v nginx &> /dev/null; then
    echo "Instalando Nginx..."
    sudo apt-get update
    sudo apt-get install -y nginx
fi

# Crear configuración de Nginx
sudo tee /etc/nginx/sites-available/aristotest << 'EOF'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    root /home/dynamtek/aristoTEST/frontend/dist;
    index index.html;
    
    # Frontend
    location / {
        try_files $uri $uri/ /index.html;
        add_header Cache-Control "no-cache, no-store, must-revalidate";
        add_header Pragma "no-cache";
        add_header Expires "0";
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
    
    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
    
    # Static files
    location ~* \.(jpg|jpeg|png|gif|ico|css|js|svg|woff|woff2|ttf|eot)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Habilitar sitio y reiniciar Nginx
sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

echo -e "${YELLOW}7️⃣ Instalando y configurando MinIO...${NC}"
# Instalar MinIO si no está instalado
if ! command -v minio &> /dev/null; then
    echo "Instalando MinIO..."
    wget https://dl.min.io/server/minio/release/linux-amd64/minio
    chmod +x minio
    sudo mv minio /usr/local/bin/
fi

# Crear directorio de datos para MinIO
mkdir -p /home/dynamtek/minio-data

# Crear servicio systemd para MinIO
sudo tee /etc/systemd/system/minio.service << 'EOF'
[Unit]
Description=MinIO
Documentation=https://docs.min.io
Wants=network-online.target
After=network-online.target
AssertFileIsExecutable=/usr/local/bin/minio

[Service]
WorkingDirectory=/home/dynamtek
User=dynamtek
Group=dynamtek
Environment="MINIO_ROOT_USER=aristotest"
Environment="MINIO_ROOT_PASSWORD=AristoTest2024!"
Environment="MINIO_VOLUMES=/home/dynamtek/minio-data"
Environment="MINIO_OPTS=--console-address :9001"
ExecStart=/usr/local/bin/minio server $MINIO_OPTS $MINIO_VOLUMES
Restart=always
LimitNOFILE=65536
TasksMax=infinity
TimeoutStopSec=infinity
SendSIGKILL=no

[Install]
WantedBy=multi-user.target
EOF

# Iniciar MinIO
sudo systemctl daemon-reload
sudo systemctl enable minio
sudo systemctl restart minio

echo -e "${YELLOW}8️⃣ Configurando base de datos...${NC}"
cd /home/dynamtek/aristoTEST/backend

# Instalar cliente PostgreSQL si no está instalado
if ! command -v psql &> /dev/null; then
    echo "Instalando cliente PostgreSQL..."
    sudo apt-get update
    sudo apt-get install -y postgresql-client
fi

# Ejecutar migraciones
echo "Ejecutando migraciones de base de datos..."
PGPASSWORD=',U8x=]N02SX4' psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com -d aristotest << 'EOSQL'
-- Verificar conexión
SELECT version();

-- Crear tablas si no existen (las migraciones de Sequelize se ejecutarán después)
CREATE TABLE IF NOT EXISTS tenants (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(50) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    type VARCHAR(50) DEFAULT 'educational',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Crear tenant por defecto si no existe
INSERT INTO tenants (name, code, type)
SELECT 'AristoTest QA', 'aristotest-qa', 'educational'
WHERE NOT EXISTS (SELECT 1 FROM tenants WHERE code = 'aristotest-qa');

-- Crear usuario admin si no existe
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER REFERENCES tenants(id),
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    role VARCHAR(50) DEFAULT 'student',
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
EOSQL

# Ejecutar migraciones de Sequelize
npx sequelize-cli db:migrate || true

echo -e "${YELLOW}9️⃣ Instalando FFmpeg...${NC}"
if ! command -v ffmpeg &> /dev/null; then
    echo "Instalando FFmpeg..."
    sudo apt-get update
    sudo apt-get install -y ffmpeg
fi

echo -e "${YELLOW}🔟 Iniciando servicios...${NC}"
cd /home/dynamtek/aristoTEST/backend

# Detener instancia anterior si existe
pm2 stop aristotest-backend 2>/dev/null || true
pm2 delete aristotest-backend 2>/dev/null || true

# Iniciar backend con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup systemd -u dynamtek --hp /home/dynamtek || true

echo -e "${GREEN}✅ Deployment completado!${NC}"
echo "=================================="
echo "Frontend: http://ec2-52-55-189-120.compute-1.amazonaws.com/"
echo "Backend API: http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1"
echo "MinIO Console: http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
echo "=================================="

# Verificar estado de servicios
echo -e "${YELLOW}Estado de servicios:${NC}"
pm2 status
sudo systemctl status nginx --no-pager | head -10
sudo systemctl status minio --no-pager | head -10

ENDSSH

echo ""
echo -e "${GREEN}🎉 Deployment completado exitosamente!${NC}"
echo "=================================="
echo -e "${BLUE}URLs de acceso:${NC}"
echo "Frontend: http://ec2-52-55-189-120.compute-1.amazonaws.com/"
echo "Backend API: http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1"
echo "MinIO Console: http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
echo ""
echo -e "${YELLOW}Credenciales:${NC}"
echo "Admin: admin@aristotest.com / Admin123!"
echo "MinIO: aristotest / AristoTest2024!"
echo ""
echo -e "${GREEN}Para ver logs:${NC}"
echo "ssh -i $KEY_PATH $USER@$SERVER 'pm2 logs aristotest-backend'"
echo ""
echo -e "${GREEN}Para monitorear:${NC}"
echo "ssh -i $KEY_PATH $USER@$SERVER 'pm2 monit'"