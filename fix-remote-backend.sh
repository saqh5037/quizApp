#!/bin/bash

# ==========================================
# ARISTOTEST - FIX REMOTE BACKEND
# ==========================================

set -e

# Configuración
REMOTE_HOST="52.55.189.120"
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest2"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}═══════════════════════════════════════════════${NC}"
echo -e "${BLUE}   ARISTOTEST - DIAGNÓSTICO Y REPARACIÓN${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════${NC}"

# 1. Estado actual
echo -e "\n${YELLOW}📊 1. ESTADO ACTUAL DEL SISTEMA${NC}"
echo -e "${YELLOW}────────────────────────────────────${NC}"

echo -e "🌐 Frontend (Nginx): "
if curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST | grep -q "200"; then
    echo -e "${GREEN}✅ Funcionando${NC}"
else
    echo -e "${RED}❌ No responde${NC}"
fi

echo -e "🔧 Backend (Node.js): "
if curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST:3001/health | grep -q "200"; then
    echo -e "${GREEN}✅ Funcionando${NC}"
else
    echo -e "${RED}❌ No responde (502 Bad Gateway)${NC}"
fi

echo -e "💾 Base de datos: "
if PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conectada${NC}"
    TABLES=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public';")
    echo -e "   📋 Tablas: $TABLES"
else
    echo -e "${RED}❌ No conecta${NC}"
fi

# 2. Información de la base de datos
echo -e "\n${YELLOW}📊 2. VERIFICACIÓN DE DATOS${NC}"
echo -e "${YELLOW}────────────────────────────────────${NC}"

# Verificar manual ID 7
echo -e "📚 Manual ID 7:"
MANUAL_EXISTS=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT COUNT(*) FROM manuals WHERE id = 7;")
if [ "$MANUAL_EXISTS" -gt 0 ]; then
    echo -e "${GREEN}✅ Existe en base de datos${NC}"
    MANUAL_INFO=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT title, is_public, status FROM manuals WHERE id = 7;")
    echo -e "   📝 Info: $MANUAL_INFO"
else
    echo -e "${RED}❌ No existe${NC}"
fi

# Verificar recursos educativos
echo -e "📖 Recursos educativos:"
STUDY_GUIDES=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT COUNT(*) FROM study_guides WHERE manual_id = 7;")
FLASH_CARDS=$(PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -t -c "SELECT COUNT(*) FROM flash_cards WHERE manual_id = 7;")
echo -e "   📘 Study Guides: $STUDY_GUIDES"
echo -e "   🎴 Flash Cards: $FLASH_CARDS"

# 3. Compilar y preparar backend local
echo -e "\n${YELLOW}🔨 3. PREPARANDO BACKEND LOCAL${NC}"
echo -e "${YELLOW}────────────────────────────────────${NC}"

cd backend

# Compilar con TypeScript
echo -e "📦 Compilando backend..."
npm run build-tsc 2>&1 | tail -5

# Crear archivo de configuración PM2 actualizado
echo -e "⚙️ Creando configuración PM2..."
cat > ecosystem.remote.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    node_args: '-r dotenv/config -r ./register-paths.js',
    instances: 1,
    exec_mode: 'fork',
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
      CORS_ORIGIN: 'http://52.55.189.120',
      SOCKET_CORS_ORIGIN: 'http://52.55.189.120',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_ACCESS_KEY: 'aristotest',
      MINIO_SECRET_KEY: 'AristoTest2024!',
      MINIO_BUCKET_NAME: 'aristotest-videos'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    autorestart: true,
    max_restarts: 10
  }]
};
EOF

cd ..

# 4. Soluciones sugeridas
echo -e "\n${YELLOW}💡 4. SOLUCIONES SUGERIDAS${NC}"
echo -e "${YELLOW}────────────────────────────────────${NC}"

echo -e "${BLUE}Para arreglar el backend remoto, necesitas:${NC}"
echo ""
echo -e "1. ${YELLOW}SSH al servidor:${NC}"
echo -e "   ${GREEN}ssh -i ~/.ssh/aristotest-qa.pem dynamtek@$REMOTE_HOST${NC}"
echo ""
echo -e "2. ${YELLOW}Una vez conectado, ejecutar:${NC}"
echo -e "   ${GREEN}cd /home/dynamtek/aristoTEST/backend${NC}"
echo -e "   ${GREEN}pm2 stop all${NC}"
echo -e "   ${GREEN}pm2 delete all${NC}"
echo -e "   ${GREEN}npm ci --production${NC}"
echo -e "   ${GREEN}pm2 start ecosystem.config.js${NC}"
echo -e "   ${GREEN}pm2 logs --lines 20${NC}"
echo ""
echo -e "3. ${YELLOW}Si PM2 no está instalado:${NC}"
echo -e "   ${GREEN}npm install -g pm2${NC}"
echo ""
echo -e "4. ${YELLOW}Verificar logs:${NC}"
echo -e "   ${GREEN}tail -f logs/error.log${NC}"

# 5. Comandos útiles
echo -e "\n${YELLOW}🛠️ 5. COMANDOS ÚTILES${NC}"
echo -e "${YELLOW}────────────────────────────────────${NC}"

echo -e "${BLUE}Verificar procesos Node.js:${NC}"
echo -e "ps aux | grep node"
echo ""
echo -e "${BLUE}Verificar puertos abiertos:${NC}"
echo -e "sudo netstat -tlnp | grep -E '(3001|80|9000)'"
echo ""
echo -e "${BLUE}Reiniciar Nginx:${NC}"
echo -e "sudo systemctl restart nginx"
echo ""
echo -e "${BLUE}Ver logs de Nginx:${NC}"
echo -e "sudo tail -f /var/log/nginx/error.log"

# 6. Script de emergencia
echo -e "\n${YELLOW}🚨 6. SCRIPT DE EMERGENCIA${NC}"
echo -e "${YELLOW}────────────────────────────────────${NC}"
echo -e "${BLUE}Guardando script de emergencia en: emergency-restart.sh${NC}"

cat > emergency-restart.sh << 'EMERGENCY'
#!/bin/bash
# EJECUTAR ESTO EN EL SERVIDOR REMOTO

# Matar procesos Node.js huérfanos
pkill -f node || true
pkill -f "npm" || true

# Limpiar PM2
pm2 kill

# Ir al directorio
cd /home/dynamtek/aristoTEST/backend

# Reinstalar dependencias
npm ci --production

# Crear configuración mínima
cat > ecosystem.emergency.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_NAME: 'aristotest2',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4'
    }
  }]
};
EOF

# Iniciar con PM2
pm2 start ecosystem.emergency.js
pm2 save
pm2 logs
EMERGENCY

chmod +x emergency-restart.sh

echo -e "\n${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DIAGNÓSTICO COMPLETADO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo -e "${YELLOW}⚠️ ACCIÓN REQUERIDA:${NC}"
echo -e "El backend remoto está caído. Necesitas acceso SSH para reiniciarlo."
echo -e "Si tienes la key SSH, ejecuta los comandos sugeridos arriba."
echo ""
echo -e "${BLUE}URLs del sistema:${NC}"
echo -e "Frontend: ${GREEN}http://$REMOTE_HOST${NC} ✅"
echo -e "Backend: ${GREEN}http://$REMOTE_HOST:3001${NC} ❌"
echo -e "Base de datos: ${GREEN}$DB_HOST${NC} ✅"