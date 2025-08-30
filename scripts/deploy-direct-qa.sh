#!/bin/bash

# 🚀 Deployment Directo a QA - Simple y Efectivo
# Sin complicaciones, solo lo necesario para deployar correctamente

set -e

echo "🚀 Iniciando deployment directo a QA"
echo "========================================"

# Configuración
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"

# 1. Build local del frontend con assets
echo "📦 1. Construyendo frontend..."
cd /Users/samuelquiroz/Documents/proyectos/quiz-app/frontend
npm run build -- --config vite.config.build.ts
echo "✅ Frontend construido"

# 2. Crear tar con todo el proyecto
echo "📦 2. Empaquetando proyecto..."
cd /Users/samuelquiroz/Documents/proyectos/quiz-app
tar -czf /tmp/deploy-qa.tar.gz \
  --exclude='node_modules' \
  --exclude='*.log' \
  --exclude='storage/minio-data' \
  backend frontend/dist
echo "✅ Proyecto empaquetado"

# 3. Transferir al servidor
echo "📤 3. Transfiriendo al servidor..."
scp -i "$KEY" /tmp/deploy-qa.tar.gz "$USER@$SERVER:/tmp/"
scp -i "$KEY" backend/.env.qa "$USER@$SERVER:/tmp/.env"
echo "✅ Archivos transferidos"

# 4. Ejecutar instalación en el servidor
echo "🔧 4. Instalando en el servidor..."
ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
set -e

# Limpiar deployment anterior
echo "Limpiando deployment anterior..."
pm2 kill 2>/dev/null || true
rm -rf /home/dynamtek/aristoTEST

# Crear directorio y descomprimir
echo "Descomprimiendo proyecto..."
mkdir -p /home/dynamtek/aristoTEST
cd /home/dynamtek/aristoTEST
tar -xzf /tmp/deploy-qa.tar.gz

# Configurar backend
echo "Configurando backend..."
cd backend
cp /tmp/.env .env
npm install
mkdir -p logs uploads storage

# Crear PM2 config simple
cat > ecosystem.config.js << 'EOF'
const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.resolve(__dirname, '.env') });

module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './src/server.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register/transpile-only -r tsconfig-paths/register',
    instances: 1,
    exec_mode: 'fork',
    env: process.env
  }]
};
EOF

# Configurar Nginx
echo "Configurando Nginx..."
sudo tee /etc/nginx/sites-available/aristotest > /dev/null << 'EOF'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    root /home/dynamtek/aristoTEST/frontend/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
EOF

sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl restart nginx

# Iniciar MinIO
echo "Iniciando MinIO..."
sudo systemctl restart minio 2>/dev/null || true

# Iniciar backend
echo "Iniciando backend..."
pm2 start ecosystem.config.js
pm2 save

echo "✅ Deployment completado en el servidor"
ENDSSH

# 5. Verificación
echo "🔍 5. Verificando deployment..."
sleep 10

# Verificar frontend
if curl -s -o /dev/null -w "%{http_code}" http://$SERVER/ | grep -q "200"; then
    echo "✅ Frontend accesible"
else
    echo "❌ Error: Frontend no accesible"
fi

# Verificar backend
if curl -s http://$SERVER:3001/api/v1/auth/login -X POST -H "Content-Type: application/json" -d '{"email":"test","password":"test"}' | grep -q "error"; then
    echo "✅ Backend respondiendo"
else
    echo "❌ Error: Backend no responde"
fi

echo ""
echo "========================================"
echo "🎉 DEPLOYMENT COMPLETADO"
echo "========================================"
echo ""
echo "URLs:"
echo "Frontend: http://$SERVER/"
echo "Backend: http://$SERVER:3001/api/v1"
echo "MinIO: http://$SERVER:9001"
echo ""
echo "Para ver logs:"
echo "ssh -i $KEY $USER@$SERVER 'pm2 logs'"