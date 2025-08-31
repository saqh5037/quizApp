#!/bin/bash
# =============================================================================
# OPCIÓN 1: DESPLIEGUE LIMPIO DESDE CERO - ARISTOTEST QA
# =============================================================================
# Autor: AristoTest DevOps Team
# Fecha: 2025-08-31
# Versión: 1.0.0
# Descripción: Script completo para despliegue limpio con backup y rollback
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
NC='\033[0m' # No Color

# Configuración del servidor
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SSH_USER="dynamtek"
SERVER_IP="52.55.189.120"
SERVER_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
REMOTE_PATH="/home/dynamtek/aristoTEST"

# Configuración de la base de datos
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest2"  # CRÍTICO: NO cambiar a aristotest
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Paths locales
LOCAL_PROJECT_PATH="/Users/samuelquiroz/Documents/proyectos/quiz-app"
BACKEND_PATH="${LOCAL_PROJECT_PATH}/backend"
FRONTEND_PATH="${LOCAL_PROJECT_PATH}/frontend"

# Timestamp para backups
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
BACKUP_NAME="aristotest_backup_${TIMESTAMP}"

# Log file
LOG_FILE="${LOCAL_PROJECT_PATH}/deployment_${TIMESTAMP}.log"

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

# Función de rollback
rollback() {
    log WARNING "Iniciando proceso de rollback..."
    
    ssh_exec "
        if [ -d '${REMOTE_PATH}_backup_${TIMESTAMP}' ]; then
            echo 'Restaurando backup anterior...'
            sudo rm -rf ${REMOTE_PATH}
            sudo mv ${REMOTE_PATH}_backup_${TIMESTAMP} ${REMOTE_PATH}
            cd ${REMOTE_PATH}/backend
            pm2 delete all 2>/dev/null || true
            pm2 start ecosystem.config.js
            echo 'Rollback completado'
        else
            echo 'No se encontró backup para restaurar'
        fi
    "
    
    log ERROR "Deployment falló. Se ejecutó rollback."
    exit 1
}

# Trap para manejar errores
trap 'rollback' ERR

# =============================================================================
# 3. PRE-CHECKS
# =============================================================================

pre_checks() {
    log INFO "=== Iniciando Pre-Checks ==="
    
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
    
    # Verificar espacio en disco del servidor
    log INFO "Verificando espacio en disco..."
    DISK_USAGE=$(ssh_exec "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
    if [ "$DISK_USAGE" -gt 90 ]; then
        log ERROR "Espacio en disco insuficiente: ${DISK_USAGE}% usado"
        exit 1
    fi
    log SUCCESS "Espacio en disco OK: ${DISK_USAGE}% usado"
    
    # Verificar conectividad a base de datos
    log INFO "Verificando conectividad a base de datos..."
    ssh_exec "PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c '\\q' 2>/dev/null" &>/dev/null
    check_status "Base de datos accesible" "No se puede conectar a la base de datos"
    
    # Verificar que los directorios locales existen
    if [ ! -d "$BACKEND_PATH" ] || [ ! -d "$FRONTEND_PATH" ]; then
        log ERROR "Directorios del proyecto no encontrados"
        exit 1
    fi
    
    log SUCCESS "Pre-checks completados exitosamente"
}

# =============================================================================
# 4. BACKUP ACTUAL
# =============================================================================

backup_current() {
    log INFO "=== Creando Backup del Deployment Actual ==="
    
    ssh_exec "
        if [ -d '${REMOTE_PATH}' ]; then
            echo 'Creando backup de ${REMOTE_PATH}...'
            sudo cp -r ${REMOTE_PATH} ${REMOTE_PATH}_backup_${TIMESTAMP}
            echo 'Backup creado: ${REMOTE_PATH}_backup_${TIMESTAMP}'
            
            # Guardar estado de PM2
            cd ${REMOTE_PATH}/backend 2>/dev/null && pm2 save 2>/dev/null || true
        else
            echo 'No existe deployment previo, saltando backup'
        fi
    "
    
    log SUCCESS "Backup completado"
}

# =============================================================================
# 5. BUILD LOCAL
# =============================================================================

build_local() {
    log INFO "=== Iniciando Build Local ==="
    
    # Build Frontend
    log INFO "Construyendo Frontend..."
    cd "$FRONTEND_PATH"
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log INFO "Instalando dependencias del frontend..."
        npm install
    fi
    
    # Build
    npm run build
    check_status "Frontend construido exitosamente" "Error al construir frontend"
    
    # Crear tarball del frontend
    tar -czf "${LOCAL_PROJECT_PATH}/frontend_${TIMESTAMP}.tar.gz" -C dist .
    log SUCCESS "Frontend empaquetado: frontend_${TIMESTAMP}.tar.gz"
    
    # Build Backend
    log INFO "Construyendo Backend..."
    cd "$BACKEND_PATH"
    
    # Instalar dependencias si es necesario
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log INFO "Instalando dependencias del backend..."
        npm install
    fi
    
    # Intentar build con babel primero, si falla usar tsc
    log INFO "Intentando build con Babel..."
    if npm run build 2>/dev/null; then
        log SUCCESS "Backend construido con Babel"
    else
        log WARNING "Babel falló, intentando con TypeScript compiler..."
        npm run build-tsc
        check_status "Backend construido con TSC" "Error al construir backend"
    fi
    
    # Crear tarball del backend (incluir todo lo necesario)
    tar -czf "${LOCAL_PROJECT_PATH}/backend_${TIMESTAMP}.tar.gz" \
        dist \
        package.json \
        package-lock.json \
        migrations \
        seeders \
        .sequelizerc \
        ecosystem.config.js 2>/dev/null || true
    
    log SUCCESS "Backend empaquetado: backend_${TIMESTAMP}.tar.gz"
}

# =============================================================================
# 6. TRANSFER AL SERVIDOR
# =============================================================================

transfer_files() {
    log INFO "=== Transfiriendo Archivos al Servidor ==="
    
    # Transferir frontend
    log INFO "Transfiriendo frontend..."
    scp -i "$SSH_KEY" "${LOCAL_PROJECT_PATH}/frontend_${TIMESTAMP}.tar.gz" "${SSH_USER}@${SERVER_HOST}:/tmp/"
    check_status "Frontend transferido" "Error al transferir frontend"
    
    # Transferir backend
    log INFO "Transfiriendo backend..."
    scp -i "$SSH_KEY" "${LOCAL_PROJECT_PATH}/backend_${TIMESTAMP}.tar.gz" "${SSH_USER}@${SERVER_HOST}:/tmp/"
    check_status "Backend transferido" "Error al transferir backend"
    
    log SUCCESS "Archivos transferidos exitosamente"
}

# =============================================================================
# 7. SETUP EN SERVIDOR
# =============================================================================

setup_server() {
    log INFO "=== Configurando Servidor ==="
    
    ssh_exec "
        # Detener servicios actuales
        echo 'Deteniendo servicios actuales...'
        cd ${REMOTE_PATH}/backend 2>/dev/null && pm2 delete all 2>/dev/null || true
        
        # Limpiar directorio
        echo 'Limpiando directorio de deployment...'
        sudo rm -rf ${REMOTE_PATH}
        sudo mkdir -p ${REMOTE_PATH}/{frontend,backend,logs}
        sudo chown -R ${SSH_USER}:${SSH_USER} ${REMOTE_PATH}
        
        # Descomprimir Frontend
        echo 'Desplegando Frontend...'
        cd ${REMOTE_PATH}/frontend
        tar -xzf /tmp/frontend_${TIMESTAMP}.tar.gz
        mkdir -p dist
        mv * dist/ 2>/dev/null || true
        
        # Descomprimir Backend
        echo 'Desplegando Backend...'
        cd ${REMOTE_PATH}/backend
        tar -xzf /tmp/backend_${TIMESTAMP}.tar.gz
        
        # Instalar dependencias de producción
        echo 'Instalando dependencias de producción...'
        npm ci --production
        
        # Crear archivo .env con configuración crítica
        echo 'Configurando variables de entorno...'
        cat > .env << 'EOL'
NODE_ENV=production
HOST=0.0.0.0
PORT=3001

# Base de datos - CRÍTICO
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
CORS_ORIGIN=http://52.55.189.120,http://ec2-52-55-189-120.compute-1.amazonaws.com,http://localhost:5173
SOCKET_CORS_ORIGIN=http://52.55.189.120,http://ec2-52-55-189-120.compute-1.amazonaws.com

# AI Keys
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
        
        # Crear ecosystem.config.js para PM2
        cat > ecosystem.config.js << 'EOL'
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
      HOST: '0.0.0.0',
      PORT: 3001,
      DB_HOST: '${DB_HOST}',
      DB_NAME: '${DB_NAME}',
      DB_USER: '${DB_USER}',
      DB_PASSWORD: '${DB_PASSWORD}',
      TENANT_ID: '1',
      DEFAULT_TENANT_ID: '1'
    },
    error_file: '../logs/backend-error.log',
    out_file: '../logs/backend-out.log',
    log_file: '../logs/backend-combined.log',
    time: true,
    merge_logs: true,
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z'
  }]
};
EOL
        
        # Limpiar archivos temporales
        rm -f /tmp/frontend_${TIMESTAMP}.tar.gz /tmp/backend_${TIMESTAMP}.tar.gz
    "
    
    log SUCCESS "Servidor configurado exitosamente"
}

# =============================================================================
# 8. CONFIGURACIÓN DE BASE DE DATOS
# =============================================================================

setup_database() {
    log INFO "=== Configurando Base de Datos ==="
    
    ssh_exec "
        cd ${REMOTE_PATH}/backend
        
        # Ejecutar migraciones
        echo 'Ejecutando migraciones...'
        NODE_ENV=production npx sequelize-cli db:migrate
        
        # Crear usuario admin si no existe
        echo 'Verificando usuario admin...'
        PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} << 'EOSQL'
-- Verificar si existe el usuario admin
DO \\\$\\\$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM users WHERE email = 'admin@aristotest.com') THEN
        INSERT INTO users (
            id, 
            email, 
            password, 
            name, 
            role, 
            tenant_id,
            created_at, 
            updated_at
        ) VALUES (
            gen_random_uuid(),
            'admin@aristotest.com',
            '\\\$2b\\\$10\\\$3nXpQQBmYN8Q.UYBvDQwOuZyO3hVabPThCXNRkQ0F8PdqvQHfqoLa', -- admin123
            'Admin User',
            'super_admin',
            1,
            NOW(),
            NOW()
        );
        RAISE NOTICE 'Usuario admin creado exitosamente';
    ELSE
        -- Actualizar contraseña si ya existe
        UPDATE users 
        SET password = '\\\$2b\\\$10\\\$3nXpQQBmYN8Q.UYBvDQwOuZyO3hVabPThCXNRkQ0F8PdqvQHfqoLa',
            role = 'super_admin',
            tenant_id = 1
        WHERE email = 'admin@aristotest.com';
        RAISE NOTICE 'Usuario admin actualizado';
    END IF;
END\\\$\\\$;

-- Verificar tenant existe
INSERT INTO tenants (id, name, subdomain, created_at, updated_at)
VALUES (1, 'Default Tenant', 'default', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;
EOSQL
    "
    
    log SUCCESS "Base de datos configurada"
}

# =============================================================================
# 9. INICIAR SERVICIOS
# =============================================================================

start_services() {
    log INFO "=== Iniciando Servicios ==="
    
    # Iniciar MinIO
    log INFO "Iniciando MinIO..."
    ssh_exec "
        # Verificar si MinIO ya está corriendo
        if ! pgrep -f minio > /dev/null; then
            # Crear directorio de datos si no existe
            mkdir -p ${REMOTE_PATH}/backend/storage/minio-data
            
            # Iniciar MinIO en background
            cd ${REMOTE_PATH}/backend
            nohup minio server ./storage/minio-data \
                --address :9000 \
                --console-address :9001 \
                > ${REMOTE_PATH}/logs/minio.log 2>&1 &
            
            sleep 5
            echo 'MinIO iniciado'
        else
            echo 'MinIO ya está corriendo'
        fi
    "
    
    # Iniciar Backend con PM2
    log INFO "Iniciando Backend con PM2..."
    ssh_exec "
        cd ${REMOTE_PATH}/backend
        pm2 delete all 2>/dev/null || true
        pm2 start ecosystem.config.js
        pm2 save
        pm2 startup systemd -u ${SSH_USER} --hp /home/${SSH_USER} | tail -n 1 | sudo bash
    "
    
    # Configurar Nginx para Frontend
    log INFO "Configurando Nginx..."
    ssh_exec "
        sudo tee /etc/nginx/sites-available/aristotest << 'EONGINX'
server {
    listen 80;
    server_name ${SERVER_IP} ${SERVER_HOST};
    
    # Frontend
    root ${REMOTE_PATH}/frontend/dist;
    index index.html;
    
    # Logs
    access_log ${REMOTE_PATH}/logs/nginx-access.log;
    error_log ${REMOTE_PATH}/logs/nginx-error.log;
    
    # Frontend routes
    location / {
        try_files \\\$uri \\\$uri/ /index.html;
    }
    
    # API proxy
    location /api {
        proxy_pass http://localhost:3001;
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
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \\\$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \\\$host;
        proxy_cache_bypass \\\$http_upgrade;
    }
}
EONGINX
        
        # Activar sitio
        sudo ln -sf /etc/nginx/sites-available/aristotest /etc/nginx/sites-enabled/
        sudo nginx -t && sudo systemctl reload nginx
    "
    
    log SUCCESS "Todos los servicios iniciados"
}

# =============================================================================
# 10. HEALTH CHECKS
# =============================================================================

health_checks() {
    log INFO "=== Ejecutando Health Checks ==="
    
    local all_checks_passed=true
    
    # Check 1: Backend API
    log INFO "Verificando Backend API..."
    if curl -f -s "http://${SERVER_IP}:3001/api/v1/health" > /dev/null 2>&1; then
        log SUCCESS "Backend API: OK"
    else
        log ERROR "Backend API: FALLO"
        all_checks_passed=false
    fi
    
    # Check 2: Frontend
    log INFO "Verificando Frontend..."
    if curl -f -s "http://${SERVER_IP}" | grep -q "AristoTest" 2>/dev/null; then
        log SUCCESS "Frontend: OK"
    else
        log ERROR "Frontend: FALLO"
        all_checks_passed=false
    fi
    
    # Check 3: MinIO
    log INFO "Verificando MinIO..."
    if curl -f -s "http://${SERVER_IP}:9000/minio/health/live" > /dev/null 2>&1; then
        log SUCCESS "MinIO: OK"
    else
        log WARNING "MinIO: No responde (puede ser normal si está protegido)"
    fi
    
    # Check 4: Login con usuario admin
    log INFO "Verificando login de admin..."
    LOGIN_RESPONSE=$(curl -s -X POST "http://${SERVER_IP}:3001/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@aristotest.com","password":"admin123"}' 2>/dev/null)
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        log SUCCESS "Login Admin: OK"
    else
        log ERROR "Login Admin: FALLO"
        all_checks_passed=false
    fi
    
    # Check 5: Base de datos
    log INFO "Verificando conexión a base de datos..."
    ssh_exec "
        cd ${REMOTE_PATH}/backend
        PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT COUNT(*) FROM users;' 2>/dev/null | grep -q '1 row' && echo 'DB_OK' || echo 'DB_FAIL'
    " | grep -q "DB_OK"
    
    if [ $? -eq 0 ]; then
        log SUCCESS "Base de datos: OK"
    else
        log ERROR "Base de datos: FALLO"
        all_checks_passed=false
    fi
    
    # Check 6: PM2 Status
    log INFO "Verificando estado de PM2..."
    PM2_STATUS=$(ssh_exec "pm2 list | grep aristotest-backend | grep online | wc -l")
    if [ "$PM2_STATUS" -gt 0 ]; then
        log SUCCESS "PM2: Backend online"
    else
        log ERROR "PM2: Backend no está online"
        all_checks_passed=false
    fi
    
    # Resumen final
    echo ""
    if [ "$all_checks_passed" = true ]; then
        log SUCCESS "========================================="
        log SUCCESS "DEPLOYMENT COMPLETADO EXITOSAMENTE ✅"
        log SUCCESS "========================================="
        log SUCCESS "Frontend: http://${SERVER_IP}"
        log SUCCESS "Backend API: http://${SERVER_IP}:3001"
        log SUCCESS "MinIO Console: http://${SERVER_IP}:9001"
        log SUCCESS "Usuario: admin@aristotest.com / admin123"
        log SUCCESS "========================================="
    else
        log ERROR "========================================="
        log ERROR "DEPLOYMENT COMPLETADO CON ERRORES ⚠️"
        log ERROR "Revise los logs para más detalles"
        log ERROR "Log file: $LOG_FILE"
        log ERROR "========================================="
        
        # Mostrar últimas líneas de logs de PM2
        log WARNING "Últimas líneas del log de PM2:"
        ssh_exec "pm2 logs aristotest-backend --lines 20 --nostream"
    fi
}

# =============================================================================
# 11. LIMPIEZA
# =============================================================================

cleanup() {
    log INFO "=== Limpiando archivos temporales ==="
    
    # Limpiar archivos locales
    rm -f "${LOCAL_PROJECT_PATH}/frontend_${TIMESTAMP}.tar.gz"
    rm -f "${LOCAL_PROJECT_PATH}/backend_${TIMESTAMP}.tar.gz"
    
    log SUCCESS "Limpieza completada"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    clear
    echo "========================================="
    echo "   ARISTOTEST QA - DEPLOYMENT LIMPIO"
    echo "   Opción 1: Clean Deployment"
    echo "========================================="
    echo ""
    
    log INFO "Iniciando deployment en: $(date)"
    log INFO "Servidor: ${SERVER_HOST}"
    log INFO "Base de datos: ${DB_NAME}@${DB_HOST}"
    echo ""
    
    # Confirmar antes de proceder
    read -p "¿Desea continuar con el deployment limpio? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log WARNING "Deployment cancelado por el usuario"
        exit 0
    fi
    
    # Ejecutar pasos
    pre_checks
    backup_current
    build_local
    transfer_files
    setup_server
    setup_database
    start_services
    health_checks
    cleanup
    
    log INFO "Deployment finalizado en: $(date)"
    log INFO "Log completo disponible en: $LOG_FILE"
}

# Ejecutar main
main "$@"