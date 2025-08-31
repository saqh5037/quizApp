#!/bin/bash
# =============================================================================
# OPCIÓN 3: BLUE-GREEN DEPLOYMENT - ARISTOTEST QA
# =============================================================================
# Autor: AristoTest DevOps Team
# Fecha: 2025-08-31
# Versión: 1.0.0
# Descripción: Deployment Blue-Green con zero downtime y rollback instantáneo
# =============================================================================

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# 1. VARIABLES Y CONFIGURACIÓN
# =============================================================================

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m' # No Color

# Configuración del servidor
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SSH_USER="dynamtek"
SERVER_IP="52.55.189.120"
SERVER_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"

# Paths de deployment Blue-Green
BLUE_PATH="/home/dynamtek/aristoTEST"           # Producción actual (Blue)
GREEN_PATH="/home/dynamtek/aristoTEST_new"      # Nueva versión (Green)
CURRENT_LINK="/home/dynamtek/aristoTEST_current" # Symlink al deployment activo

# Configuración de la base de datos
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest2"  # CRÍTICO: NO cambiar a aristotest
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Paths locales
LOCAL_PROJECT_PATH="/Users/samuelquiroz/Documents/proyectos/quiz-app"
BACKEND_PATH="${LOCAL_PROJECT_PATH}/backend"
FRONTEND_PATH="${LOCAL_PROJECT_PATH}/frontend"

# Timestamp para identificación
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
DEPLOYMENT_ID="bg_${TIMESTAMP}"

# Log file
LOG_FILE="${LOCAL_PROJECT_PATH}/deployment_bluegreen_${TIMESTAMP}.log"

# Puertos para testing
BLUE_PORT=3001
GREEN_PORT=3002  # Puerto temporal para testing del Green

# Estado del deployment
CURRENT_ENV=""  # Se detectará automáticamente (blue o green)
TARGET_ENV=""   # Se establecerá según el ambiente actual

# =============================================================================
# 2. FUNCIONES DE UTILIDAD
# =============================================================================

# Función para logging
log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
            ;;
        INFO)
            echo -e "${BLUE}[INFO] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
            ;;
        BLUE)
            echo -e "${CYAN}[BLUE] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
            ;;
        GREEN)
            echo -e "${MAGENTA}[GREEN] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
            ;;
        *)
            echo "[${timestamp}] ${message}" | tee -a "$LOG_FILE"
            ;;
    esac
}

# Función para ejecutar comandos SSH
ssh_exec() {
    local command=$1
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${SSH_USER}@${SERVER_HOST}" "$command" 2>&1 | tee -a "$LOG_FILE"
}

# Función para verificar el estado del último comando
check_status() {
    if [ $? -eq 0 ]; then
        log SUCCESS "$1"
        return 0
    else
        log ERROR "$2"
        return 1
    fi
}

# =============================================================================
# 3. DETECCIÓN DE AMBIENTE ACTUAL
# =============================================================================

detect_current_environment() {
    log INFO "=== Detectando Ambiente Actual ==="
    
    CURRENT_ENV=$(ssh_exec "
        if [ -L '${CURRENT_LINK}' ]; then
            # Si existe el symlink, seguirlo
            readlink ${CURRENT_LINK} | grep -o 'aristoTEST\\(_new\\)\\?' | sed 's/aristoTEST/_blue_/;s/aristoTEST_new/_green_/' | tr -d '_'
        elif [ -d '${BLUE_PATH}' ] && pm2 list 2>/dev/null | grep -q 'aristotest-backend.*online'; then
            # Si no hay symlink pero Blue está activo
            echo 'blue'
        else
            # No hay deployment activo
            echo 'none'
        fi
    " | tail -1)
    
    # Limpiar el resultado
    CURRENT_ENV=$(echo "$CURRENT_ENV" | tr -d '[:space:]')
    
    # Determinar el target
    if [ "$CURRENT_ENV" = "blue" ] || [ "$CURRENT_ENV" = "none" ]; then
        TARGET_ENV="green"
        log BLUE "Ambiente actual: BLUE (${BLUE_PATH})"
        log GREEN "Target deployment: GREEN (${GREEN_PATH})"
    elif [ "$CURRENT_ENV" = "green" ]; then
        TARGET_ENV="blue"
        log GREEN "Ambiente actual: GREEN (${GREEN_PATH})"
        log BLUE "Target deployment: BLUE (${BLUE_PATH})"
    else
        log WARNING "No se detectó ambiente activo, asumiendo Blue como actual"
        CURRENT_ENV="blue"
        TARGET_ENV="green"
    fi
    
    log SUCCESS "Detección completada: Current=$CURRENT_ENV, Target=$TARGET_ENV"
}

# =============================================================================
# 4. PRE-CHECKS BLUE-GREEN
# =============================================================================

pre_checks_bluegreen() {
    log INFO "=== Pre-Checks para Blue-Green Deployment ==="
    
    # Verificar SSH key
    if [ ! -f "$SSH_KEY" ]; then
        log ERROR "SSH key no encontrada: $SSH_KEY"
        exit 1
    fi
    
    # Verificar conectividad SSH
    log INFO "Verificando conectividad SSH..."
    if ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no -o ConnectTimeout=5 "${SSH_USER}@${SERVER_HOST}" "echo 'SSH OK'" &>/dev/null; then
        log SUCCESS "Conexión SSH establecida"
    else
        log ERROR "No se puede conectar al servidor"
        exit 1
    fi
    
    # Verificar espacio en disco (necesitamos el doble para Blue-Green)
    log INFO "Verificando espacio en disco..."
    DISK_USAGE=$(ssh_exec "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
    if [ "$DISK_USAGE" -gt 80 ]; then
        log ERROR "Espacio en disco insuficiente para Blue-Green: ${DISK_USAGE}% usado"
        log ERROR "Se requiere al menos 20% libre para mantener dos ambientes"
        exit 1
    fi
    log SUCCESS "Espacio en disco OK: ${DISK_USAGE}% usado"
    
    # Verificar puertos disponibles
    log INFO "Verificando puertos disponibles..."
    PORT_CHECK=$(ssh_exec "
        netstat -tuln | grep -E ':${GREEN_PORT}\\s' && echo 'PORT_BUSY' || echo 'PORT_FREE'
    " | tail -1)
    
    if [[ "$PORT_CHECK" == *"PORT_BUSY"* ]]; then
        log WARNING "Puerto ${GREEN_PORT} está ocupado, se usará otro puerto para testing"
    else
        log SUCCESS "Puerto ${GREEN_PORT} disponible para testing"
    fi
    
    # Verificar Nginx instalado
    log INFO "Verificando Nginx..."
    if ssh_exec "which nginx" &>/dev/null; then
        log SUCCESS "Nginx instalado y disponible"
    else
        log ERROR "Nginx no está instalado. Se requiere para Blue-Green deployment"
        exit 1
    fi
    
    log SUCCESS "Pre-checks Blue-Green completados"
}

# =============================================================================
# 5. BUILD COMPLETO
# =============================================================================

build_full() {
    log INFO "=== Build Completo para Blue-Green ==="
    
    # Build Frontend
    log INFO "Construyendo Frontend..."
    cd "$FRONTEND_PATH"
    
    # Limpiar build anterior
    rm -rf dist
    
    # Instalar dependencias
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log INFO "Instalando dependencias del frontend..."
        npm ci
    fi
    
    # Build producción
    npm run build
    check_status "Frontend construido exitosamente" "Error al construir frontend"
    
    # Crear tarball
    tar -czf "${LOCAL_PROJECT_PATH}/frontend_bg_${TIMESTAMP}.tar.gz" -C dist .
    log SUCCESS "Frontend empaquetado"
    
    # Build Backend
    log INFO "Construyendo Backend..."
    cd "$BACKEND_PATH"
    
    # Limpiar build anterior
    rm -rf dist
    
    # Instalar dependencias
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log INFO "Instalando dependencias del backend..."
        npm ci
    fi
    
    # Build con manejo de errores
    if npm run build 2>/dev/null; then
        log SUCCESS "Backend construido con Babel"
    else
        log WARNING "Babel falló, usando TypeScript compiler..."
        npm run build-tsc
        check_status "Backend construido con TSC" "Error al construir backend"
    fi
    
    # Crear tarball completo
    tar -czf "${LOCAL_PROJECT_PATH}/backend_bg_${TIMESTAMP}.tar.gz" \
        dist \
        package.json \
        package-lock.json \
        migrations \
        seeders \
        .sequelizerc \
        --exclude='node_modules' \
        --exclude='storage' \
        --exclude='logs'
    
    log SUCCESS "Backend empaquetado"
    log SUCCESS "Build completo finalizado"
}

# =============================================================================
# 6. PREPARAR AMBIENTE GREEN
# =============================================================================

prepare_green_environment() {
    log GREEN "=== Preparando Ambiente GREEN ==="
    
    local GREEN_DIR=""
    local GREEN_PM2_NAME=""
    local GREEN_TEST_PORT=""
    
    if [ "$TARGET_ENV" = "green" ]; then
        GREEN_DIR="$GREEN_PATH"
        GREEN_PM2_NAME="aristotest-backend-green"
        GREEN_TEST_PORT="$GREEN_PORT"
    else
        GREEN_DIR="$BLUE_PATH"
        GREEN_PM2_NAME="aristotest-backend-blue"
        GREEN_TEST_PORT="$GREEN_PORT"
    fi
    
    ssh_exec "
        # Limpiar ambiente Green anterior si existe
        if [ -d '${GREEN_DIR}' ]; then
            echo 'Limpiando ambiente Green anterior...'
            pm2 delete ${GREEN_PM2_NAME} 2>/dev/null || true
            rm -rf ${GREEN_DIR}.old
            mv ${GREEN_DIR} ${GREEN_DIR}.old
        fi
        
        # Crear estructura de directorios
        echo 'Creando estructura de directorios Green...'
        mkdir -p ${GREEN_DIR}/{frontend/dist,backend,logs}
        
        # Descomprimir Frontend
        echo 'Desplegando Frontend en Green...'
        cd ${GREEN_DIR}/frontend/dist
        tar -xzf /tmp/frontend_bg_${TIMESTAMP}.tar.gz
        
        # Descomprimir Backend
        echo 'Desplegando Backend en Green...'
        cd ${GREEN_DIR}/backend
        tar -xzf /tmp/backend_bg_${TIMESTAMP}.tar.gz
        
        # Instalar dependencias de producción
        echo 'Instalando dependencias de producción...'
        npm ci --production
        
        # Configurar .env para Green (puerto temporal para testing)
        cat > .env << 'EOL'
NODE_ENV=production
HOST=0.0.0.0
PORT=${GREEN_TEST_PORT}

# Base de datos
DB_HOST=${DB_HOST}
DB_PORT=5432
DB_NAME=${DB_NAME}
DB_USER=${DB_USER}
DB_PASSWORD=${DB_PASSWORD}

# Tenant - CRÍTICO
TENANT_ID=1
DEFAULT_TENANT_ID=1

# JWT
JWT_SECRET=aristotest-qa-jwt-secret-2025
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2025
JWT_EXPIRES_IN=24h
JWT_REFRESH_EXPIRES_IN=7d

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos
MINIO_USE_SSL=false

# CORS
CORS_ORIGIN=http://52.55.189.120,http://ec2-52-55-189-120.compute-1.amazonaws.com
SOCKET_CORS_ORIGIN=http://52.55.189.120,http://ec2-52-55-189-120.compute-1.amazonaws.com

# AI
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw

# Session
SESSION_SECRET=aristotest-session-secret-2025
SESSION_MAX_AGE=86400000

# QR
QR_BASE_URL=http://52.55.189.120

# Rate Limiting
RATE_LIMIT_MAX_REQUESTS=100
RATE_LIMIT_WINDOW_MS=900000
EOL
        
        # Crear ecosystem.config.js para PM2 Green
        cat > ecosystem.config.js << 'EOL'
module.exports = {
  apps: [{
    name: '${GREEN_PM2_NAME}',
    script: './dist/server.js',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: ${GREEN_TEST_PORT},
      DB_HOST: '${DB_HOST}',
      DB_NAME: '${DB_NAME}',
      DB_USER: '${DB_USER}',
      DB_PASSWORD: '${DB_PASSWORD}',
      TENANT_ID: '1',
      DEFAULT_TENANT_ID: '1'
    },
    error_file: '../logs/backend-green-error.log',
    out_file: '../logs/backend-green-out.log',
    log_file: '../logs/backend-green-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOL
        
        echo 'Ambiente Green preparado exitosamente'
    "
    
    log SUCCESS "Ambiente GREEN preparado en ${GREEN_DIR}"
}

# =============================================================================
# 7. EJECUTAR MIGRACIONES EN GREEN
# =============================================================================

run_migrations_green() {
    log GREEN "=== Ejecutando Migraciones en GREEN ==="
    
    local GREEN_DIR=""
    if [ "$TARGET_ENV" = "green" ]; then
        GREEN_DIR="$GREEN_PATH"
    else
        GREEN_DIR="$BLUE_PATH"
    fi
    
    ssh_exec "
        cd ${GREEN_DIR}/backend
        
        # Ejecutar migraciones
        echo 'Ejecutando migraciones de base de datos...'
        NODE_ENV=production npx sequelize-cli db:migrate
        
        # Verificar usuario admin
        echo 'Verificando usuario admin...'
        PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} << 'EOSQL'
-- Asegurar usuario admin existe
DO \\\$\\\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@aristotest.com') THEN
        INSERT INTO users (
            id, email, password, name, role, tenant_id, created_at, updated_at
        ) VALUES (
            gen_random_uuid(),
            'admin@aristotest.com',
            '\\\$2b\\\$10\\\$3nXpQQBmYN8Q.UYBvDQwOuZyO3hVabPThCXNRkQ0F8PdqvQHfqoLa',
            'Admin User',
            'super_admin',
            1,
            NOW(),
            NOW()
        );
    END IF;
END\\\$\\\$;

-- Asegurar tenant por defecto
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES (1, 'Default Tenant', 'default', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOSQL
        
        echo 'Migraciones completadas'
    "
    
    log SUCCESS "Migraciones ejecutadas en GREEN"
}

# =============================================================================
# 8. INICIAR Y TESTEAR GREEN
# =============================================================================

start_and_test_green() {
    log GREEN "=== Iniciando y Testeando Ambiente GREEN ==="
    
    local GREEN_DIR=""
    local GREEN_PM2_NAME=""
    local GREEN_TEST_PORT=""
    
    if [ "$TARGET_ENV" = "green" ]; then
        GREEN_DIR="$GREEN_PATH"
        GREEN_PM2_NAME="aristotest-backend-green"
        GREEN_TEST_PORT="$GREEN_PORT"
    else
        GREEN_DIR="$BLUE_PATH"
        GREEN_PM2_NAME="aristotest-backend-blue"
        GREEN_TEST_PORT="$GREEN_PORT"
    fi
    
    # Iniciar Green con PM2
    log INFO "Iniciando servicio GREEN con PM2..."
    ssh_exec "
        cd ${GREEN_DIR}/backend
        pm2 start ecosystem.config.js
        sleep 5
        pm2 list
    "
    
    # Esperar a que el servicio esté listo
    log INFO "Esperando que GREEN esté listo..."
    local max_attempts=30
    local attempt=0
    local green_ready=false
    
    while [ $attempt -lt $max_attempts ]; do
        if curl -f -s "http://${SERVER_IP}:${GREEN_TEST_PORT}/api/v1/health" > /dev/null 2>&1; then
            green_ready=true
            break
        fi
        sleep 2
        ((attempt++))
        echo -n "."
    done
    echo ""
    
    if [ "$green_ready" = false ]; then
        log ERROR "GREEN no respondió después de $max_attempts intentos"
        
        # Mostrar logs para debugging
        log ERROR "Logs de GREEN:"
        ssh_exec "pm2 logs ${GREEN_PM2_NAME} --lines 30 --nostream"
        
        return 1
    fi
    
    log SUCCESS "GREEN está respondiendo en puerto ${GREEN_TEST_PORT}"
    
    # Ejecutar tests en Green
    log INFO "Ejecutando tests en ambiente GREEN..."
    
    # Test 1: Health Check
    if curl -f -s "http://${SERVER_IP}:${GREEN_TEST_PORT}/api/v1/health" > /dev/null 2>&1; then
        log SUCCESS "✅ GREEN Health Check: OK"
    else
        log ERROR "❌ GREEN Health Check: FALLO"
        return 1
    fi
    
    # Test 2: Login
    LOGIN_RESPONSE=$(curl -s -X POST "http://${SERVER_IP}:${GREEN_TEST_PORT}/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@aristotest.com","password":"admin123"}' 2>/dev/null)
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        log SUCCESS "✅ GREEN Login Test: OK"
    else
        log ERROR "❌ GREEN Login Test: FALLO"
        log ERROR "Response: $LOGIN_RESPONSE"
        return 1
    fi
    
    # Test 3: Database Connection
    DB_TEST=$(curl -s "http://${SERVER_IP}:${GREEN_TEST_PORT}/api/v1/health/db" 2>/dev/null || echo "no_endpoint")
    log INFO "GREEN Database Test: Verificado mediante login exitoso"
    
    log SUCCESS "Todos los tests de GREEN pasaron exitosamente"
    return 0
}

# =============================================================================
# 9. SWITCH BLUE-GREEN
# =============================================================================

switch_bluegreen() {
    log INFO "=== Ejecutando Switch Blue-Green ==="
    
    local BLUE_DIR="$BLUE_PATH"
    local GREEN_DIR="$GREEN_PATH"
    local OLD_PM2_NAME=""
    local NEW_PM2_NAME=""
    
    if [ "$TARGET_ENV" = "green" ]; then
        OLD_PM2_NAME="aristotest-backend"
        NEW_PM2_NAME="aristotest-backend-green"
        log BLUE "Switching de BLUE → GREEN"
    else
        OLD_PM2_NAME="aristotest-backend-green"
        NEW_PM2_NAME="aristotest-backend"
        GREEN_DIR="$BLUE_PATH"
        BLUE_DIR="$GREEN_PATH"
        log GREEN "Switching de GREEN → BLUE"
    fi
    
    ssh_exec "
        echo '🔄 Iniciando switch Blue-Green...'
        
        # Paso 1: Actualizar configuración de Nginx
        echo 'Actualizando configuración de Nginx...'
        
        if [ '${TARGET_ENV}' = 'green' ]; then
            TARGET_PATH='${GREEN_PATH}'
        else
            TARGET_PATH='${BLUE_PATH}'
        fi
        
        sudo tee /etc/nginx/sites-available/aristotest << 'EONGINX'
server {
    listen 80;
    server_name ${SERVER_IP} ${SERVER_HOST};
    
    # Frontend - apuntando al nuevo ambiente
    root \${TARGET_PATH}/frontend/dist;
    index index.html;
    
    # Logs
    access_log /var/log/nginx/aristotest-access.log;
    error_log /var/log/nginx/aristotest-error.log;
    
    # Frontend routes
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }
    
    # API proxy - temporal al puerto de testing
    location /api {
        proxy_pass http://localhost:${GREEN_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
        proxy_set_header X-Real-IP \\\$remote_addr;
        proxy_set_header X-Forwarded-For \\\$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \\\$scheme;
    }
    
    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:${GREEN_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EONGINX
        
        # Paso 2: Recargar Nginx
        echo 'Recargando Nginx...'
        sudo nginx -t && sudo systemctl reload nginx
        
        # Paso 3: Cambiar puerto de GREEN a producción (3001)
        echo 'Cambiando GREEN al puerto de producción...'
        cd \${TARGET_PATH}/backend
        sed -i 's/PORT=${GREEN_PORT}/PORT=${BLUE_PORT}/' .env
        pm2 delete ${NEW_PM2_NAME} 2>/dev/null || true
        
        # Actualizar ecosystem.config.js para puerto de producción
        sed -i 's/PORT: ${GREEN_PORT}/PORT: ${BLUE_PORT}/' ecosystem.config.js
        sed -i \"s/name: '${NEW_PM2_NAME}'/name: 'aristotest-backend'/\" ecosystem.config.js
        
        # Reiniciar con puerto de producción
        pm2 start ecosystem.config.js
        sleep 3
        
        # Paso 4: Detener ambiente anterior
        echo 'Deteniendo ambiente anterior...'
        pm2 delete ${OLD_PM2_NAME} 2>/dev/null || true
        
        # Paso 5: Actualizar symlink
        echo 'Actualizando symlink...'
        rm -f ${CURRENT_LINK}
        ln -s \${TARGET_PATH} ${CURRENT_LINK}
        
        # Paso 6: Actualizar Nginx para usar puerto de producción
        sudo sed -i 's/proxy_pass http:\\/\\/localhost:${GREEN_PORT}/proxy_pass http:\\/\\/localhost:${BLUE_PORT}/' /etc/nginx/sites-available/aristotest
        sudo nginx -t && sudo systemctl reload nginx
        
        # Paso 7: Guardar estado de PM2
        pm2 save
        
        echo '✅ Switch Blue-Green completado'
    "
    
    log SUCCESS "Switch Blue-Green ejecutado exitosamente"
}

# =============================================================================
# 10. VALIDACIÓN POST-SWITCH
# =============================================================================

validate_post_switch() {
    log INFO "=== Validación Post-Switch ==="
    
    local all_checks_passed=true
    
    # Esperar estabilización
    log INFO "Esperando estabilización del sistema..."
    sleep 5
    
    # Test 1: Frontend
    if curl -f -s "http://${SERVER_IP}" | grep -q "AristoTest" 2>/dev/null; then
        log SUCCESS "✅ Frontend (puerto 80): OK"
    else
        log ERROR "❌ Frontend: FALLO"
        all_checks_passed=false
    fi
    
    # Test 2: Backend API
    if curl -f -s "http://${SERVER_IP}:3001/api/v1/health" > /dev/null 2>&1; then
        log SUCCESS "✅ Backend API (puerto 3001): OK"
    else
        log ERROR "❌ Backend API: FALLO"
        all_checks_passed=false
    fi
    
    # Test 3: Login en producción
    LOGIN_PROD=$(curl -s -X POST "http://${SERVER_IP}:3001/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@aristotest.com","password":"admin123"}' 2>/dev/null | grep -c "token")
    
    if [ "$LOGIN_PROD" -gt 0 ]; then
        log SUCCESS "✅ Login en Producción: OK"
    else
        log ERROR "❌ Login en Producción: FALLO"
        all_checks_passed=false
    fi
    
    # Test 4: API a través de Nginx
    API_NGINX=$(curl -s "http://${SERVER_IP}/api/v1/health" 2>/dev/null | grep -c "ok")
    if [ "$API_NGINX" -gt 0 ]; then
        log SUCCESS "✅ API a través de Nginx: OK"
    else
        log WARNING "⚠️ API a través de Nginx: No verificado"
    fi
    
    # Test 5: Verificar PM2
    PM2_STATUS=$(ssh_exec "pm2 list | grep -c 'aristotest-backend.*online'")
    if [ "$PM2_STATUS" -gt 0 ]; then
        log SUCCESS "✅ PM2 Process: Online"
    else
        log ERROR "❌ PM2 Process: No está online"
        all_checks_passed=false
    fi
    
    # Resumen
    echo ""
    if [ "$all_checks_passed" = true ]; then
        log SUCCESS "========================================="
        log SUCCESS "BLUE-GREEN DEPLOYMENT EXITOSO ✅"
        log SUCCESS "========================================="
        if [ "$TARGET_ENV" = "green" ]; then
            log GREEN "Ambiente GREEN ahora en PRODUCCIÓN"
            log BLUE "Ambiente BLUE en standby para rollback"
        else
            log BLUE "Ambiente BLUE ahora en PRODUCCIÓN"
            log GREEN "Ambiente GREEN en standby para rollback"
        fi
        log SUCCESS "========================================="
        log INFO "Frontend: http://${SERVER_IP}"
        log INFO "Backend API: http://${SERVER_IP}:3001"
        log INFO "Usuario: admin@aristotest.com / admin123"
        log SUCCESS "========================================="
    else
        log ERROR "========================================="
        log ERROR "DEPLOYMENT CON ERRORES ⚠️"
        log ERROR "Considere ejecutar rollback"
        log ERROR "========================================="
    fi
    
    return $([ "$all_checks_passed" = true ] && echo 0 || echo 1)
}

# =============================================================================
# 11. ROLLBACK INSTANTÁNEO
# =============================================================================

instant_rollback() {
    log WARNING "=== Ejecutando Rollback Instantáneo ==="
    
    local ROLLBACK_TO=""
    if [ "$TARGET_ENV" = "green" ]; then
        ROLLBACK_TO="blue"
        log BLUE "Rollback a ambiente BLUE"
    else
        ROLLBACK_TO="green"
        log GREEN "Rollback a ambiente GREEN"
    fi
    
    ssh_exec "
        echo '⏮️ Iniciando rollback instantáneo...'
        
        # Determinar paths
        if [ '${ROLLBACK_TO}' = 'blue' ]; then
            ROLLBACK_PATH='${BLUE_PATH}'
            ROLLBACK_PM2='aristotest-backend'
            CURRENT_PM2='aristotest-backend-green'
        else
            ROLLBACK_PATH='${GREEN_PATH}'
            ROLLBACK_PM2='aristotest-backend-green'
            CURRENT_PM2='aristotest-backend'
        fi
        
        # Paso 1: Revertir Nginx
        echo 'Revirtiendo configuración de Nginx...'
        sudo sed -i \"s|root .*/frontend/dist|root \\\${ROLLBACK_PATH}/frontend/dist|\" /etc/nginx/sites-available/aristotest
        sudo nginx -t && sudo systemctl reload nginx
        
        # Paso 2: Iniciar ambiente anterior
        echo 'Iniciando ambiente anterior...'
        cd \\\${ROLLBACK_PATH}/backend
        pm2 start ecosystem.config.js 2>/dev/null || pm2 restart \\\${ROLLBACK_PM2}
        
        # Paso 3: Detener ambiente actual
        echo 'Deteniendo ambiente con problemas...'
        pm2 delete \\\${CURRENT_PM2} 2>/dev/null || true
        
        # Paso 4: Actualizar symlink
        rm -f ${CURRENT_LINK}
        ln -s \\\${ROLLBACK_PATH} ${CURRENT_LINK}
        
        # Paso 5: Guardar estado
        pm2 save
        
        echo '✅ Rollback instantáneo completado'
    "
    
    # Validar rollback
    sleep 3
    if curl -f -s "http://${SERVER_IP}:3001/api/v1/health" > /dev/null 2>&1; then
        log SUCCESS "Rollback exitoso - Sistema restaurado"
    else
        log ERROR "Rollback con problemas - Requiere intervención manual"
    fi
}

# =============================================================================
# 12. CLEANUP POST-DEPLOYMENT
# =============================================================================

cleanup_bluegreen() {
    log INFO "=== Limpieza Post-Deployment ==="
    
    # Limpiar archivos locales
    rm -f "${LOCAL_PROJECT_PATH}/frontend_bg_${TIMESTAMP}.tar.gz"
    rm -f "${LOCAL_PROJECT_PATH}/backend_bg_${TIMESTAMP}.tar.gz"
    
    # Limpiar en servidor
    ssh_exec "
        # Limpiar archivos temporales
        rm -f /tmp/*_bg_${TIMESTAMP}.tar.gz
        
        # Limpiar directorios .old si existen y tienen más de 3 días
        find /home/${SSH_USER} -maxdepth 1 -name 'aristoTEST*.old' -mtime +3 -exec rm -rf {} \; 2>/dev/null || true
        
        # Limpiar logs antiguos
        find ${BLUE_PATH}/logs ${GREEN_PATH}/logs -name '*.log' -mtime +7 -delete 2>/dev/null || true
        
        # Flush logs PM2 antiguos
        pm2 flush 2>/dev/null || true
    "
    
    log SUCCESS "Limpieza completada"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    clear
    echo "========================================="
    echo "   ARISTOTEST QA - BLUE-GREEN DEPLOYMENT"
    echo "   Opción 3: Zero-Downtime con Rollback"
    echo "========================================="
    echo ""
    
    log INFO "Iniciando Blue-Green Deployment en: $(date)"
    log INFO "Servidor: ${SERVER_HOST}"
    log INFO "Base de datos: ${DB_NAME}@${DB_HOST}"
    echo ""
    
    # Detectar ambiente actual
    detect_current_environment
    echo ""
    
    # Mostrar plan de deployment
    echo -e "${CYAN}📋 PLAN DE DEPLOYMENT:${NC}"
    echo "1. Build completo en local"
    echo "2. Preparar ambiente $TARGET_ENV"
    echo "3. Testear $TARGET_ENV en puerto $GREEN_PORT"
    echo "4. Switch de tráfico a $TARGET_ENV"
    echo "5. Mantener ambiente anterior para rollback"
    echo ""
    
    # Confirmar antes de proceder
    read -p "¿Desea continuar con el Blue-Green deployment? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log WARNING "Deployment cancelado por el usuario"
        exit 0
    fi
    
    # Ejecutar pasos
    pre_checks_bluegreen
    build_full
    
    # Transferir archivos
    log INFO "Transfiriendo archivos al servidor..."
    scp -i "$SSH_KEY" "${LOCAL_PROJECT_PATH}/frontend_bg_${TIMESTAMP}.tar.gz" "${SSH_USER}@${SERVER_HOST}:/tmp/"
    scp -i "$SSH_KEY" "${LOCAL_PROJECT_PATH}/backend_bg_${TIMESTAMP}.tar.gz" "${SSH_USER}@${SERVER_HOST}:/tmp/"
    
    prepare_green_environment
    run_migrations_green
    
    # Testear Green
    if start_and_test_green; then
        log SUCCESS "Tests de GREEN pasaron, procediendo con switch..."
        
        # Confirmar switch
        echo ""
        echo -e "${YELLOW}⚠️  PUNTO DE NO RETORNO${NC}"
        read -p "¿Desea proceder con el switch a producción? (s/n): " -n 1 -r
        echo ""
        
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            switch_bluegreen
            
            if validate_post_switch; then
                log SUCCESS "Blue-Green deployment completado exitosamente"
            else
                echo ""
                read -p "¿Desea ejecutar rollback automático? (s/n): " -n 1 -r
                echo ""
                if [[ $REPLY =~ ^[Ss]$ ]]; then
                    instant_rollback
                fi
            fi
        else
            log WARNING "Switch cancelado, limpiando ambiente GREEN..."
            ssh_exec "pm2 delete aristotest-backend-green 2>/dev/null || true"
        fi
    else
        log ERROR "Tests de GREEN fallaron, abortando deployment"
        ssh_exec "pm2 delete aristotest-backend-green 2>/dev/null || true"
    fi
    
    cleanup_bluegreen
    
    log INFO "Blue-Green deployment finalizado en: $(date)"
    log INFO "Log completo disponible en: $LOG_FILE"
}

# Ejecutar main
main "$@"