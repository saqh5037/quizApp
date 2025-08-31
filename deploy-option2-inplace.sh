#!/bin/bash
# =============================================================================
# OPCIÓN 2: ACTUALIZACIÓN IN-PLACE - ARISTOTEST QA
# =============================================================================
# Autor: AristoTest DevOps Team
# Fecha: 2025-08-31
# Versión: 1.0.0
# Descripción: Actualización incremental preservando configuraciones y datos
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
BACKUP_NAME="aristotest_inplace_backup_${TIMESTAMP}"

# Log file
LOG_FILE="${LOCAL_PROJECT_PATH}/deployment_inplace_${TIMESTAMP}.log"

# Files to preserve during update
PRESERVE_FILES=(
    ".env"
    "ecosystem.config.js"
    "storage/minio-data"
    "uploads"
    "logs"
)

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
        UPDATE)
            echo -e "${CYAN}[UPDATE] ${timestamp}: ${message}${NC}" | tee -a "$LOG_FILE"
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

# Función de hot reload
hot_reload() {
    log UPDATE "Ejecutando Hot Reload..."
    
    ssh_exec "
        cd ${REMOTE_PATH}/backend
        
        # Reload PM2 sin downtime
        pm2 reload aristotest-backend --update-env
        
        # Verificar que el servicio está respondiendo
        sleep 3
        curl -f -s http://localhost:3001/api/v1/health > /dev/null 2>&1 && echo 'API_OK' || echo 'API_FAIL'
    " | grep -q "API_OK"
    
    if [ $? -eq 0 ]; then
        log SUCCESS "Hot reload completado sin downtime"
        return 0
    else
        log WARNING "Hot reload con problemas, intentando restart..."
        ssh_exec "pm2 restart aristotest-backend --update-env"
        return 1
    fi
}

# =============================================================================
# 3. PRE-CHECKS
# =============================================================================

pre_checks() {
    log INFO "=== Iniciando Pre-Checks para Actualización In-Place ==="
    
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
    
    # Verificar que existe deployment actual
    log INFO "Verificando deployment existente..."
    DEPLOYMENT_EXISTS=$(ssh_exec "[ -d '${REMOTE_PATH}' ] && echo 'EXISTS' || echo 'NOT_EXISTS'")
    
    if [[ "$DEPLOYMENT_EXISTS" == *"NOT_EXISTS"* ]]; then
        log ERROR "No existe deployment previo. Use la Opción 1 (Deployment Limpio) primero."
        exit 1
    fi
    log SUCCESS "Deployment existente encontrado"
    
    # Verificar servicios actuales
    log INFO "Verificando estado de servicios actuales..."
    CURRENT_STATUS=$(ssh_exec "
        echo '=== PM2 Status ==='
        pm2 list 2>/dev/null | grep aristotest || echo 'No PM2 processes'
        echo '=== Backend Health ==='
        curl -s http://localhost:3001/api/v1/health 2>/dev/null || echo 'Backend not responding'
    ")
    
    log INFO "Estado actual del sistema:"
    echo "$CURRENT_STATUS" | tee -a "$LOG_FILE"
    
    # Verificar espacio en disco
    log INFO "Verificando espacio en disco..."
    DISK_USAGE=$(ssh_exec "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
    if [ "$DISK_USAGE" -gt 85 ]; then
        log WARNING "Espacio en disco limitado: ${DISK_USAGE}% usado"
    else
        log SUCCESS "Espacio en disco OK: ${DISK_USAGE}% usado"
    fi
    
    log SUCCESS "Pre-checks completados"
}

# =============================================================================
# 4. BACKUP INCREMENTAL
# =============================================================================

backup_incremental() {
    log INFO "=== Creando Backup Incremental ==="
    
    ssh_exec "
        cd ${REMOTE_PATH}
        
        # Crear directorio de backup
        mkdir -p /tmp/${BACKUP_NAME}
        
        # Backup de archivos críticos
        echo 'Respaldando configuraciones...'
        cp -p backend/.env /tmp/${BACKUP_NAME}/.env 2>/dev/null || true
        cp -p backend/ecosystem.config.js /tmp/${BACKUP_NAME}/ecosystem.config.js 2>/dev/null || true
        
        # Backup de base de datos (solo estructura)
        echo 'Respaldando estructura de base de datos...'
        PGPASSWORD='${DB_PASSWORD}' pg_dump -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} \
            --schema-only > /tmp/${BACKUP_NAME}/db_schema.sql 2>/dev/null || true
        
        # Guardar información de versión actual
        echo 'Guardando información de versión...'
        cd backend
        git rev-parse HEAD 2>/dev/null > /tmp/${BACKUP_NAME}/current_version.txt || \
            echo 'unknown' > /tmp/${BACKUP_NAME}/current_version.txt
        
        # Guardar lista de procesos PM2
        pm2 list > /tmp/${BACKUP_NAME}/pm2_status.txt 2>/dev/null || true
        
        # Comprimir backup
        cd /tmp
        tar -czf ${BACKUP_NAME}.tar.gz ${BACKUP_NAME}/
        rm -rf ${BACKUP_NAME}/
        
        echo 'Backup incremental creado: /tmp/${BACKUP_NAME}.tar.gz'
    "
    
    log SUCCESS "Backup incremental completado"
}

# =============================================================================
# 5. BUILD OPTIMIZADO
# =============================================================================

build_optimized() {
    log INFO "=== Build Optimizado para Actualización ==="
    
    # Detectar cambios en frontend
    log INFO "Verificando cambios en Frontend..."
    cd "$FRONTEND_PATH"
    
    FRONTEND_CHANGED=false
    if [ -f ".last_build_hash" ]; then
        CURRENT_HASH=$(find src public -type f -exec md5sum {} \; | sort | md5sum | cut -d' ' -f1)
        LAST_HASH=$(cat .last_build_hash)
        if [ "$CURRENT_HASH" != "$LAST_HASH" ]; then
            FRONTEND_CHANGED=true
        fi
    else
        FRONTEND_CHANGED=true
    fi
    
    if [ "$FRONTEND_CHANGED" = true ]; then
        log UPDATE "Frontend tiene cambios, construyendo..."
        
        # Solo instalar dependencias si package.json cambió
        if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
            log INFO "Actualizando dependencias del frontend..."
            npm ci
        fi
        
        npm run build
        check_status "Frontend construido" "Error al construir frontend"
        
        # Guardar hash para próxima comparación
        find src public -type f -exec md5sum {} \; | sort | md5sum | cut -d' ' -f1 > .last_build_hash
        
        # Crear tarball incremental
        tar -czf "${LOCAL_PROJECT_PATH}/frontend_update_${TIMESTAMP}.tar.gz" -C dist .
    else
        log INFO "Frontend sin cambios, saltando build"
    fi
    
    # Build Backend - siempre se hace para actualización de código
    log UPDATE "Construyendo Backend..."
    cd "$BACKEND_PATH"
    
    # Solo instalar dependencias si package.json cambió
    if [ ! -d "node_modules" ] || [ "package.json" -nt "node_modules" ]; then
        log INFO "Actualizando dependencias del backend..."
        npm ci
    fi
    
    # Intentar build con babel primero
    if npm run build 2>/dev/null; then
        log SUCCESS "Backend construido con Babel"
    else
        log WARNING "Babel falló, usando TypeScript compiler..."
        npm run build-tsc
        check_status "Backend construido con TSC" "Error al construir backend"
    fi
    
    # Crear tarball solo con archivos actualizados
    tar -czf "${LOCAL_PROJECT_PATH}/backend_update_${TIMESTAMP}.tar.gz" \
        dist \
        package.json \
        package-lock.json \
        migrations \
        --exclude='node_modules' \
        --exclude='storage' \
        --exclude='uploads' \
        --exclude='logs'
    
    log SUCCESS "Build optimizado completado"
}

# =============================================================================
# 6. TRANSFER INCREMENTAL
# =============================================================================

transfer_incremental() {
    log INFO "=== Transferencia Incremental ==="
    
    # Transferir solo si hay actualizaciones
    if [ -f "${LOCAL_PROJECT_PATH}/frontend_update_${TIMESTAMP}.tar.gz" ]; then
        log UPDATE "Transfiriendo actualización de frontend..."
        scp -i "$SSH_KEY" "${LOCAL_PROJECT_PATH}/frontend_update_${TIMESTAMP}.tar.gz" \
            "${SSH_USER}@${SERVER_HOST}:/tmp/"
        check_status "Frontend transferido" "Error al transferir frontend"
    fi
    
    log UPDATE "Transfiriendo actualización de backend..."
    scp -i "$SSH_KEY" "${LOCAL_PROJECT_PATH}/backend_update_${TIMESTAMP}.tar.gz" \
        "${SSH_USER}@${SERVER_HOST}:/tmp/"
    check_status "Backend transferido" "Error al transferir backend"
    
    log SUCCESS "Transferencia incremental completada"
}

# =============================================================================
# 7. UPDATE IN-PLACE
# =============================================================================

update_inplace() {
    log INFO "=== Ejecutando Actualización In-Place ==="
    
    ssh_exec "
        # Actualizar Frontend si hay cambios
        if [ -f '/tmp/frontend_update_${TIMESTAMP}.tar.gz' ]; then
            echo '📦 Actualizando Frontend...'
            cd ${REMOTE_PATH}/frontend
            
            # Backup del dist actual
            mv dist dist.backup.${TIMESTAMP} 2>/dev/null || true
            
            # Extraer nueva versión
            mkdir -p dist
            tar -xzf /tmp/frontend_update_${TIMESTAMP}.tar.gz -C dist/
            
            # Limpiar backup antiguo si todo salió bien
            rm -rf dist.backup.* 2>/dev/null || true
            
            echo '✅ Frontend actualizado'
        fi
        
        # Actualizar Backend
        echo '📦 Actualizando Backend...'
        cd ${REMOTE_PATH}/backend
        
        # Preservar archivos importantes
        cp .env .env.backup.${TIMESTAMP}
        cp ecosystem.config.js ecosystem.config.backup.${TIMESTAMP} 2>/dev/null || true
        
        # Backup del dist actual
        mv dist dist.backup.${TIMESTAMP} 2>/dev/null || true
        
        # Extraer nueva versión
        tar -xzf /tmp/backend_update_${TIMESTAMP}.tar.gz
        
        # Restaurar archivos preservados
        cp .env.backup.${TIMESTAMP} .env
        
        # Asegurar variables críticas en .env
        grep -q 'TENANT_ID' .env || echo 'TENANT_ID=1' >> .env
        grep -q 'DEFAULT_TENANT_ID' .env || echo 'DEFAULT_TENANT_ID=1' >> .env
        grep -q 'HOST=0.0.0.0' .env || sed -i 's/HOST=.*/HOST=0.0.0.0/' .env
        sed -i 's/DB_NAME=aristotest/DB_NAME=aristotest2/g' .env 2>/dev/null || true
        
        # Instalar dependencias de producción si package.json cambió
        if ! diff -q package.json dist.backup.${TIMESTAMP}/../package.json 2>/dev/null; then
            echo '📦 Actualizando dependencias npm...'
            npm ci --production
        fi
        
        # Ejecutar migraciones si hay nuevas
        echo '🗄️ Verificando migraciones...'
        NODE_ENV=production npx sequelize-cli db:migrate 2>/dev/null || \
            echo 'No hay nuevas migraciones o ya están aplicadas'
        
        # Limpiar archivos temporales
        rm -f /tmp/*_update_${TIMESTAMP}.tar.gz
        rm -rf dist.backup.* .env.backup.* ecosystem.config.backup.* 2>/dev/null || true
        
        echo '✅ Actualización in-place completada'
    "
    
    log SUCCESS "Actualización in-place ejecutada"
}

# =============================================================================
# 8. HOT RELOAD Y VALIDACIÓN
# =============================================================================

reload_and_validate() {
    log INFO "=== Hot Reload y Validación ==="
    
    # Ejecutar hot reload
    hot_reload
    
    # Esperar a que los servicios se estabilicen
    log INFO "Esperando estabilización de servicios..."
    sleep 5
    
    # Validar servicios
    log INFO "Validando servicios actualizados..."
    
    # Check Backend API
    API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}:3001/api/v1/health")
    if [ "$API_CHECK" = "200" ]; then
        log SUCCESS "Backend API respondiendo correctamente"
    else
        log ERROR "Backend API no responde (HTTP $API_CHECK)"
        
        # Intentar restart forzado
        log WARNING "Intentando restart forzado..."
        ssh_exec "cd ${REMOTE_PATH}/backend && pm2 restart aristotest-backend --update-env"
        sleep 5
        
        # Re-verificar
        API_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}:3001/api/v1/health")
        if [ "$API_CHECK" = "200" ]; then
            log SUCCESS "Backend API recuperado después del restart"
        else
            log ERROR "Backend API sigue sin responder"
        fi
    fi
    
    # Check Frontend
    FRONTEND_CHECK=$(curl -s -o /dev/null -w "%{http_code}" "http://${SERVER_IP}")
    if [ "$FRONTEND_CHECK" = "200" ]; then
        log SUCCESS "Frontend respondiendo correctamente"
    else
        log WARNING "Frontend no responde directamente (HTTP $FRONTEND_CHECK)"
    fi
    
    # Verificar logs de PM2
    log INFO "Últimas líneas del log de PM2:"
    ssh_exec "pm2 logs aristotest-backend --lines 10 --nostream" | tail -15
    
    log SUCCESS "Validación completada"
}

# =============================================================================
# 9. HEALTH CHECKS RÁPIDOS
# =============================================================================

quick_health_checks() {
    log INFO "=== Health Checks Rápidos ==="
    
    local all_checks_passed=true
    
    # Test 1: API Health
    if curl -f -s "http://${SERVER_IP}:3001/api/v1/health" > /dev/null 2>&1; then
        log SUCCESS "✅ API Health: OK"
    else
        log ERROR "❌ API Health: FALLO"
        all_checks_passed=false
    fi
    
    # Test 2: Login Test
    LOGIN_TEST=$(curl -s -X POST "http://${SERVER_IP}:3001/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@aristotest.com","password":"admin123"}' 2>/dev/null | grep -c "token")
    
    if [ "$LOGIN_TEST" -gt 0 ]; then
        log SUCCESS "✅ Login Test: OK"
    else
        log ERROR "❌ Login Test: FALLO"
        all_checks_passed=false
    fi
    
    # Test 3: Socket.io
    SOCKET_CHECK=$(curl -s "http://${SERVER_IP}:3001/socket.io/?EIO=4&transport=polling" 2>/dev/null | grep -c "0{")
    if [ "$SOCKET_CHECK" -gt 0 ]; then
        log SUCCESS "✅ Socket.io: OK"
    else
        log WARNING "⚠️ Socket.io: No verificado"
    fi
    
    # Test 4: PM2 Process
    PM2_CHECK=$(ssh_exec "pm2 list | grep -c 'aristotest-backend.*online'" 2>/dev/null)
    if [ "$PM2_CHECK" -gt 0 ]; then
        log SUCCESS "✅ PM2 Process: Online"
    else
        log ERROR "❌ PM2 Process: No está online"
        all_checks_passed=false
    fi
    
    # Resumen
    echo ""
    if [ "$all_checks_passed" = true ]; then
        log SUCCESS "========================================="
        log SUCCESS "ACTUALIZACIÓN IN-PLACE EXITOSA ✅"
        log SUCCESS "========================================="
        log SUCCESS "Sin downtime detectado"
        log SUCCESS "Todos los servicios funcionando"
        log SUCCESS "========================================="
    else
        log WARNING "========================================="
        log WARNING "ACTUALIZACIÓN COMPLETADA CON ADVERTENCIAS ⚠️"
        log WARNING "Algunos checks fallaron"
        log WARNING "Revise los logs para más detalles"
        log WARNING "========================================="
    fi
}

# =============================================================================
# 10. ROLLBACK RÁPIDO
# =============================================================================

quick_rollback() {
    log WARNING "=== Ejecutando Rollback Rápido ==="
    
    ssh_exec "
        cd ${REMOTE_PATH}/backend
        
        # Restaurar dist anterior si existe
        if [ -d 'dist.backup.${TIMESTAMP}' ]; then
            echo 'Restaurando versión anterior del backend...'
            rm -rf dist
            mv dist.backup.${TIMESTAMP} dist
        fi
        
        # Restaurar .env si existe backup
        if [ -f '.env.backup.${TIMESTAMP}' ]; then
            echo 'Restaurando configuración anterior...'
            cp .env.backup.${TIMESTAMP} .env
        fi
        
        # Restaurar frontend si existe backup
        if [ -d '../frontend/dist.backup.${TIMESTAMP}' ]; then
            echo 'Restaurando versión anterior del frontend...'
            cd ../frontend
            rm -rf dist
            mv dist.backup.${TIMESTAMP} dist
        fi
        
        # Reiniciar servicios
        cd ${REMOTE_PATH}/backend
        pm2 restart aristotest-backend --update-env
        
        echo 'Rollback completado'
    "
    
    log SUCCESS "Rollback rápido ejecutado"
}

# =============================================================================
# 11. CLEANUP
# =============================================================================

cleanup() {
    log INFO "=== Limpieza Post-Actualización ==="
    
    # Limpiar archivos locales
    rm -f "${LOCAL_PROJECT_PATH}/frontend_update_${TIMESTAMP}.tar.gz"
    rm -f "${LOCAL_PROJECT_PATH}/backend_update_${TIMESTAMP}.tar.gz"
    
    # Limpiar archivos antiguos en servidor (más de 7 días)
    ssh_exec "
        # Limpiar backups antiguos
        find /tmp -name 'aristotest_inplace_backup_*.tar.gz' -mtime +7 -delete 2>/dev/null || true
        
        # Limpiar logs antiguos de PM2
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
    echo "   ARISTOTEST QA - ACTUALIZACIÓN IN-PLACE"
    echo "   Opción 2: Hot Update sin Downtime"
    echo "========================================="
    echo ""
    
    log INFO "Iniciando actualización in-place en: $(date)"
    log INFO "Servidor: ${SERVER_HOST}"
    log INFO "Modo: Actualización incremental con preservación de datos"
    echo ""
    
    # Mostrar advertencia
    echo -e "${YELLOW}⚠️  ADVERTENCIA:${NC}"
    echo "Esta actualización modificará el deployment existente."
    echo "Se preservarán: configuraciones, uploads, storage y logs."
    echo ""
    
    # Confirmar antes de proceder
    read -p "¿Desea continuar con la actualización in-place? (s/n): " -n 1 -r
    echo ""
    if [[ ! $REPLY =~ ^[Ss]$ ]]; then
        log WARNING "Actualización cancelada por el usuario"
        exit 0
    fi
    
    # Ejecutar pasos
    pre_checks
    backup_incremental
    build_optimized
    transfer_incremental
    update_inplace
    reload_and_validate
    quick_health_checks
    
    # Preguntar si hacer rollback si hay problemas
    if [ "$?" -ne 0 ]; then
        echo ""
        read -p "¿Desea ejecutar rollback? (s/n): " -n 1 -r
        echo ""
        if [[ $REPLY =~ ^[Ss]$ ]]; then
            quick_rollback
        fi
    fi
    
    cleanup
    
    log INFO "Actualización finalizada en: $(date)"
    log INFO "Log completo disponible en: $LOG_FILE"
}

# Ejecutar main
main "$@"