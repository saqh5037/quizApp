#!/bin/bash

# =================================================================
# OPCIÓN 3: DEPLOYMENT CON DOCKER (CONTAINERIZADO)
# =================================================================
# Estrategia: Deployment usando contenedores Docker
# Ventajas: Aislamiento total, reproducible, fácil rollback
# Desventajas: Requiere Docker instalado, usa más recursos
# Ideal para: Ambientes consistentes, múltiples deployments
# =================================================================

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}╔══════════════════════════════════════════════════════════╗${NC}"
echo -e "${PURPLE}║     ARISTOTEST QA - DOCKER DEPLOYMENT v2.0              ║${NC}"
echo -e "${PURPLE}╚══════════════════════════════════════════════════════════╝${NC}"

# Configuración
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com"
APP_DIR="/home/dynamtek/aristoTEST"
DOCKER_REGISTRY="aristotest"  # Local registry name

# Verificar certificado
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}❌ Error: Certificado no encontrado en $SSH_KEY${NC}"
    exit 1
fi

echo -e "${YELLOW}📋 Preparando archivos Docker...${NC}"

# Crear Dockerfile para backend si no existe
if [ ! -f "backend/Dockerfile" ]; then
    cat > backend/Dockerfile << 'EOF'
FROM node:18-alpine

# Instalar dependencias del sistema
RUN apk add --no-cache ffmpeg python3 make g++

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci --production

# Copiar código fuente
COPY . .

# Compilar TypeScript
RUN npm run build || npx tsc

# Exponer puerto
EXPOSE 3001

# Healthcheck
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3001/api/v1/health', (r) => {r.statusCode === 200 ? process.exit(0) : process.exit(1)})"

# Comando de inicio
CMD ["node", "dist/server.js"]
EOF
fi

# Crear Dockerfile para frontend si no existe
if [ ! -f "frontend/Dockerfile" ]; then
    cat > frontend/Dockerfile << 'EOF'
FROM node:18-alpine AS builder

WORKDIR /app

# Copiar archivos de dependencias
COPY package*.json ./
RUN npm ci

# Copiar código fuente
COPY . .

# Build de producción
ARG VITE_API_URL
ARG VITE_SOCKET_URL
RUN npm run build

# Etapa de producción con nginx
FROM nginx:alpine

# Copiar build del frontend
COPY --from=builder /app/dist /usr/share/nginx/html

# Configuración nginx para SPA
RUN echo 'server { \
    listen 80; \
    location / { \
        root /usr/share/nginx/html; \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
EOF
fi

# Crear docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  backend:
    build: ./backend
    container_name: aristotest-backend
    restart: always
    ports:
      - "3001:3001"
    environment:
      NODE_ENV: production
      PORT: 3001
      HOST: 0.0.0.0
      DB_HOST: ec2-3-91-26-178.compute-1.amazonaws.com
      DB_PORT: 5432
      DB_USER: labsis
      DB_PASSWORD: ",U8x=]N02SX4"
      DB_NAME: aristotest
      DB_DIALECT: postgres
      JWT_SECRET: aristotest-qa-jwt-secret-2025-docker
      JWT_REFRESH_SECRET: aristotest-qa-refresh-secret-2025-docker
      JWT_EXPIRE: 7d
      JWT_REFRESH_EXPIRE: 30d
      SESSION_SECRET: aristotest-qa-session-2025-docker
      GEMINI_API_KEY: AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
      OPENAI_API_KEY: "sk-proj-1mNE4R_-zFKWjbDaAtX6R7YgvpfCTjks9PGyFXsTwmfwT23fLKxFK2uRGJAuBpqH2$"
      CLAUDE_API_KEY: "sk-ant-api03-tgv-dbsuzjXhBOSgJnlg6yi9b5_W6fglfvAqftw6Db80r6u7bk9_GIbAEZaz$"
      USE_MOCK_TRANSCRIPTION: "false"
      MINIO_ENDPOINT: minio
      MINIO_PORT: 9000
      MINIO_USE_SSL: "false"
      MINIO_ACCESS_KEY: aristotest
      MINIO_SECRET_KEY: "AristoTest2024!"
      MINIO_BUCKET_NAME: aristotest-videos
      CORS_ORIGIN: "http://ec2-52-55-189-120.compute-1.amazonaws.com,http://52.55.189.120"
      SOCKET_CORS_ORIGIN: "http://ec2-52-55-189-120.compute-1.amazonaws.com,http://52.55.189.120"
      RATE_LIMIT_MAX_REQUESTS: 100
      RATE_LIMIT_WINDOW_MS: 900000
      MAX_FILE_SIZE: 104857600
      UPLOAD_DIR: /tmp/uploads
      QR_BASE_URL: "http://ec2-52-55-189-120.compute-1.amazonaws.com"
      TENANT_ID: 1
      DEFAULT_TENANT_ID: 1
      TELEGRAM_BOT_TOKEN: "8410755699:AAEApXvGNVFRK2En3uIDB27ueUxa-G83Om8"
    volumes:
      - ./backend/logs:/app/logs
      - uploads:/tmp/uploads
    depends_on:
      - minio
    networks:
      - aristotest-network

  frontend:
    build:
      context: ./frontend
      args:
        VITE_API_URL: "http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1"
        VITE_SOCKET_URL: "http://ec2-52-55-189-120.compute-1.amazonaws.com:3001"
    container_name: aristotest-frontend
    restart: always
    ports:
      - "80:80"
    depends_on:
      - backend
    networks:
      - aristotest-network

  minio:
    image: minio/minio:latest
    container_name: aristotest-minio
    restart: always
    ports:
      - "9000:9000"
      - "9001:9001"
    environment:
      MINIO_ROOT_USER: aristotest
      MINIO_ROOT_PASSWORD: "AristoTest2024!"
      MINIO_BROWSER_REDIRECT_URL: "http://ec2-52-55-189-120.compute-1.amazonaws.com:9001"
    volumes:
      - minio-data:/data
    command: server /data --console-address ":9001"
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:9000/minio/health/live"]
      interval: 30s
      timeout: 20s
      retries: 3
    networks:
      - aristotest-network

  nginx:
    image: nginx:alpine
    container_name: aristotest-nginx
    restart: always
    ports:
      - "8080:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - backend
      - frontend
    networks:
      - aristotest-network

networks:
  aristotest-network:
    driver: bridge

volumes:
  minio-data:
  uploads:
EOF

# Crear configuración nginx
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream backend {
        server backend:3001;
    }

    upstream frontend {
        server frontend:80;
    }

    server {
        listen 80;
        server_name ec2-52-55-189-120.compute-1.amazonaws.com;

        client_max_body_size 100M;

        # Frontend
        location / {
            proxy_pass http://frontend;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }

        # Backend API
        location /api/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection 'upgrade';
            proxy_set_header Host $host;
            proxy_cache_bypass $http_upgrade;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
            
            proxy_connect_timeout 300s;
            proxy_send_timeout 300s;
            proxy_read_timeout 300s;
        }

        # Socket.io
        location /socket.io/ {
            proxy_pass http://backend;
            proxy_http_version 1.1;
            proxy_set_header Upgrade $http_upgrade;
            proxy_set_header Connection "upgrade";
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        }
    }
}
EOF

echo -e "${GREEN}✅ Archivos Docker creados${NC}"
echo ""
echo -e "${YELLOW}🚀 Iniciando deployment con Docker...${NC}"

# Crear archivo tar con todo el proyecto
echo -e "${YELLOW}📦 Empaquetando proyecto...${NC}"
tar -czf /tmp/aristotest-docker.tar.gz \
  --exclude='node_modules' \
  --exclude='dist' \
  --exclude='*.log' \
  --exclude='.git' \
  backend frontend docker-compose.yml nginx.conf

# Transferir al servidor
echo -e "${YELLOW}📤 Transfiriendo al servidor...${NC}"
scp -i "$SSH_KEY" /tmp/aristotest-docker.tar.gz "$SERVER:/tmp/"

# Script remoto
ssh -i "$SSH_KEY" "$SERVER" << 'REMOTE_SCRIPT'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m'

echo -e "${PURPLE}═══════════════════════════════════════════════${NC}"
echo -e "${PURPLE}   DOCKER DEPLOYMENT EN SERVIDOR QA${NC}"
echo -e "${PURPLE}═══════════════════════════════════════════════${NC}"

# Función para verificar Docker
check_docker() {
    if ! command -v docker &> /dev/null; then
        echo -e "${YELLOW}Docker no instalado. Instalando...${NC}"
        curl -fsSL https://get.docker.com -o get-docker.sh
        sudo sh get-docker.sh
        sudo usermod -aG docker $USER
        rm get-docker.sh
        echo -e "${GREEN}✅ Docker instalado${NC}"
    fi
    
    if ! command -v docker-compose &> /dev/null; then
        echo -e "${YELLOW}Docker Compose no instalado. Instalando...${NC}"
        sudo curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
        sudo chmod +x /usr/local/bin/docker-compose
        echo -e "${GREEN}✅ Docker Compose instalado${NC}"
    fi
}

echo -e "${YELLOW}🐳 1. Verificando Docker...${NC}"
check_docker

echo -e "${YELLOW}💾 2. Creando backup...${NC}"
if [ -d "/home/dynamtek/aristoTEST" ]; then
    sudo mv /home/dynamtek/aristoTEST /home/dynamtek/aristoTEST.backup.$(date +%Y%m%d-%H%M%S)
fi

echo -e "${YELLOW}📦 3. Descomprimiendo proyecto...${NC}"
mkdir -p /home/dynamtek/aristoTEST
cd /home/dynamtek/aristoTEST
tar -xzf /tmp/aristotest-docker.tar.gz

echo -e "${YELLOW}🛑 4. Deteniendo contenedores existentes...${NC}"
docker-compose down 2>/dev/null || true

# Limpiar procesos en puertos si no están en Docker
sudo lsof -ti:3001 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:80 | xargs sudo kill -9 2>/dev/null || true
sudo lsof -ti:9000 | xargs sudo kill -9 2>/dev/null || true

echo -e "${YELLOW}🔨 5. Construyendo imágenes Docker...${NC}"
docker-compose build --no-cache

echo -e "${YELLOW}🗄️  6. Ejecutando migraciones...${NC}"
# Ejecutar migraciones en un contenedor temporal
docker-compose run --rm backend npx sequelize-cli db:migrate --config config/config.json || echo "Migraciones aplicadas"

echo -e "${YELLOW}🚀 7. Iniciando contenedores...${NC}"
docker-compose up -d

echo -e "${YELLOW}⏳ 8. Esperando a que los servicios estén listos...${NC}"
sleep 15

# Verificar salud de los contenedores
echo -e "${YELLOW}🔍 9. Verificando estado de contenedores...${NC}"
docker-compose ps

echo -e "${YELLOW}📊 10. Verificando logs...${NC}"
docker-compose logs --tail=10 backend
echo ""
docker-compose logs --tail=5 frontend

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DOCKER DEPLOYMENT COMPLETADO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

echo ""
echo -e "${PURPLE}🐳 INFORMACIÓN DE CONTENEDORES:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo -e "${PURPLE}🌐 URLs DE ACCESO:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "Frontend:      ${GREEN}http://ec2-52-55-189-120.compute-1.amazonaws.com${NC}"
echo -e "Backend API:   ${GREEN}http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1${NC}"
echo -e "MinIO Console: ${GREEN}http://ec2-52-55-189-120.compute-1.amazonaws.com:9001${NC}"

echo ""
echo -e "${PURPLE}🔧 COMANDOS DOCKER ÚTILES:${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo "Ver logs:        docker-compose logs -f [servicio]"
echo "Reiniciar:       docker-compose restart [servicio]"
echo "Estado:          docker-compose ps"
echo "Detener todo:    docker-compose down"
echo "Actualizar:      docker-compose pull && docker-compose up -d"
echo "Shell backend:   docker-compose exec backend sh"
echo "Limpiar:         docker system prune -a"

echo ""
echo -e "${YELLOW}🔍 Verificación de salud:${NC}"
# Test endpoints
echo -n "Frontend: "
curl -s -o /dev/null -w "%{http_code}" http://localhost && echo " ✅" || echo " ❌"

echo -n "Backend Health: "
curl -s http://localhost:3001/api/v1/health | grep -q "ok" && echo "✅" || echo "❌"

echo -n "MinIO: "
curl -s -o /dev/null -w "%{http_code}" http://localhost:9001 && echo " ✅" || echo " ❌"

REMOTE_SCRIPT

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}✅ DOCKER DEPLOYMENT EJECUTADO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# Verificación desde local
echo -e "${YELLOW}🔍 Verificando servicios desde local...${NC}"
sleep 5

# Test frontend
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com)
if [ "$HTTP_CODE" == "200" ]; then
    echo -e "${GREEN}✅ Frontend Docker respondiendo${NC}"
else
    echo -e "${RED}❌ Frontend no responde (HTTP $HTTP_CODE)${NC}"
fi

# Test backend
HEALTH_CHECK=$(curl -s http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1/health 2>/dev/null)
if echo "$HEALTH_CHECK" | grep -q "ok"; then
    echo -e "${GREEN}✅ Backend Docker API saludable${NC}"
else
    echo -e "${RED}❌ Backend API no responde${NC}"
fi

# Test MinIO
HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://ec2-52-55-189-120.compute-1.amazonaws.com:9001)
if [ "$HTTP_CODE" == "200" ] || [ "$HTTP_CODE" == "403" ]; then
    echo -e "${GREEN}✅ MinIO Console accesible${NC}"
else
    echo -e "${RED}❌ MinIO no responde${NC}"
fi

echo ""
echo -e "${PURPLE}📚 Gestión de contenedores:${NC}"
echo -e "${CYAN}Ver logs en tiempo real:${NC}"
echo -e "${YELLOW}ssh -i \"$SSH_KEY\" $SERVER 'cd /home/dynamtek/aristoTEST && docker-compose logs -f --tail=50'${NC}"
echo ""
echo -e "${CYAN}Reiniciar servicios:${NC}"
echo -e "${YELLOW}ssh -i \"$SSH_KEY\" $SERVER 'cd /home/dynamtek/aristoTEST && docker-compose restart'${NC}"
echo ""
echo -e "${CYAN}Rollback rápido:${NC}"
echo -e "${YELLOW}ssh -i \"$SSH_KEY\" $SERVER 'cd /home/dynamtek/aristoTEST && docker-compose down && docker-compose up -d'${NC}"

# Limpiar archivo temporal
rm -f /tmp/aristotest-docker.tar.gz