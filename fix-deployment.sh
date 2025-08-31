#!/bin/bash

# =================================================================
# FIX DEPLOYMENT - Soluciona problemas de build en QA
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}================================================${NC}"
echo -e "${BLUE}   AristoTest QA - Fix de Build y Deployment   ${NC}"
echo -e "${BLUE}================================================${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"

# Verificar certificado
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}Error: No se encuentra el certificado en $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}Conectando al servidor QA para fix de build...${NC}"

# Script remoto
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${YELLOW}1. Navegando al directorio del proyecto...${NC}"
cd /home/dynamtek/aristoTEST

echo -e "${YELLOW}2. Instalando dependencias de build en backend...${NC}"
cd backend

# Instalar todas las dependencias incluyendo dev para build
npm install

echo -e "${YELLOW}3. Intentando build con tsc directo...${NC}"
# Usar tsc directamente si Babel falla
npx tsc || {
    echo -e "${YELLOW}tsc falló, intentando con babel con configuración corregida...${NC}"
    
    # Crear babel.config.js correcto
    cat > babel.config.js << 'EOF'
module.exports = {
  presets: [
    ['@babel/preset-env', {
      targets: { node: '18' }
    }],
    '@babel/preset-typescript'
  ],
  plugins: [
    ['module-resolver', {
      root: ['./src'],
      alias: {
        '@config': './src/config',
        '@controllers': './src/controllers',
        '@middleware': './src/middleware',
        '@models': './src/models',
        '@routes': './src/routes',
        '@services': './src/services',
        '@utils': './src/utils',
        '@socket': './src/socket',
        '@types': './src/types'
      }
    }]
  ]
}
EOF

    # Intentar babel nuevamente
    npx babel src --out-dir dist --extensions .ts,.js --copy-files || {
        echo -e "${RED}Build con babel también falló${NC}"
        
        # Como último recurso, usar el código fuente directamente con ts-node
        echo -e "${YELLOW}4. Configurando para ejecutar con ts-node...${NC}"
        npm install -g ts-node typescript @types/node
        
        # Crear script de inicio alternativo
        cat > start-dev.js << 'STARTSCRIPT'
require('ts-node').register({
  transpileOnly: true,
  compilerOptions: {
    module: 'commonjs'
  }
});
require('./src/server.ts');
STARTSCRIPT
    }
}

# Aplicar fixes críticos si dist existe
if [ -d "dist" ]; then
    echo -e "${GREEN}✅ Build exitoso, aplicando fixes...${NC}"
    
    # Fix de transcripción
    if [ -f "dist/services/video-transcription.service.js" ]; then
        sed -i "s/process\.env\.USE_MOCK_TRANSCRIPTION !== 'false'/process.env.USE_MOCK_TRANSCRIPTION === 'true'/g" dist/services/video-transcription.service.js
    fi
    
    # Fix de trust proxy
    if [ -f "dist/server.js" ]; then
        grep -q "trust proxy" dist/server.js || sed -i "/const app = express();/a app.set('trust proxy', true);" dist/server.js
    fi
fi

echo -e "${YELLOW}5. Instalando y compilando frontend...${NC}"
cd ../frontend

# Limpiar e instalar
rm -rf node_modules package-lock.json
npm install

# Build frontend
npm run build || {
    echo -e "${RED}Error en build de frontend${NC}"
    exit 1
}

echo -e "${YELLOW}6. Iniciando servicios con PM2...${NC}"
cd ../backend

# Detener procesos anteriores
pm2 delete all 2>/dev/null || true

# Determinar qué script usar
if [ -f "dist/server.js" ]; then
    echo -e "${GREEN}Usando dist/server.js${NC}"
    
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
    max_memory_restart: '500M'
  }]
}
EOF
    
elif [ -f "start-dev.js" ]; then
    echo -e "${YELLOW}Usando ts-node con start-dev.js${NC}"
    
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './start-dev.js',
    instances: 1,
    exec_mode: 'fork',
    interpreter: 'node',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      HOST: '0.0.0.0'
    },
    error_file: './logs/err.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    max_memory_restart: '500M'
  }]
}
EOF

else
    echo -e "${RED}No se pudo compilar el backend${NC}"
    exit 1
fi

# Iniciar PM2
mkdir -p logs
pm2 start ecosystem.config.js
pm2 save

echo -e "${YELLOW}7. Iniciando MinIO...${NC}"
# Matar proceso anterior si existe
sudo lsof -ti:9000 | xargs -r sudo kill -9 2>/dev/null || true

# Iniciar MinIO
nohup minio server storage/minio-data --address :9000 --console-address :9001 > minio.log 2>&1 &

echo -e "${YELLOW}8. Configurando Nginx...${NC}"

# Crear configuración de nginx
sudo tee /etc/nginx/sites-available/aristotest << 'EOF'
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    # Frontend
    location / {
        root /home/dynamtek/aristoTEST/frontend/dist;
        try_files $uri $uri/ /index.html;
        
        # Headers de seguridad
        add_header X-Frame-Options "SAMEORIGIN" always;
        add_header X-Content-Type-Options "nosniff" always;
        add_header X-XSS-Protection "1; mode=block" always;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001/api;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 90;
        
        # Para archivos grandes
        client_max_body_size 100M;
    }
    
    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:3001/socket.io;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
EOF

# Habilitar sitio
sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx

echo -e "${GREEN}✅ Fix de deployment completado!${NC}"
echo ""
echo -e "${BLUE}Estado de servicios:${NC}"
pm2 status
echo ""

# Esperar un momento para que los servicios inicien
sleep 5

echo -e "${BLUE}Verificación de endpoints:${NC}"
curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost || echo "Frontend: Error"
curl -s -o /dev/null -w "Backend: %{http_code}\n" http://localhost:3001/api/v1/health || echo "Backend: Error"
echo ""

echo -e "${GREEN}URLs de acceso:${NC}"
echo "Frontend: http://ec2-52-55-189-120.compute-1.amazonaws.com"
echo "Backend API: http://ec2-52-55-189-120.compute-1.amazonaws.com/api/v1"
echo "MinIO Console: http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
echo ""
echo -e "${GREEN}Credenciales:${NC}"
echo "Admin: admin@aristotest.com / admin123"
echo "MinIO: aristotest / AristoTest2024!"

REMOTE_SCRIPT

echo -e "${GREEN}✅ Script de fix ejecutado exitosamente!${NC}"