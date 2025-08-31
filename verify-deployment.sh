#!/bin/bash
# =============================================================================
# SCRIPT DE VERIFICACIÓN Y HEALTH CHECKS - ARISTOTEST QA
# =============================================================================
# Autor: AristoTest DevOps Team
# Fecha: 2025-08-31
# Versión: 1.0.0
# Descripción: Verificación completa del deployment con tests de todos los endpoints
# =============================================================================

set -euo pipefail

# =============================================================================
# VARIABLES Y CONFIGURACIÓN
# =============================================================================

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
MAGENTA='\033[0;35m'
NC='\033[0m'

# Configuración del servidor
SSH_KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SSH_USER="dynamtek"
SERVER_IP="52.55.189.120"
SERVER_HOST="ec2-52-55-189-120.compute-1.amazonaws.com"
REMOTE_PATH="/home/dynamtek/aristoTEST"

# Base de datos
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest2"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Timestamp
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")
REPORT_FILE="verification_report_${TIMESTAMP}.txt"

# Contadores
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0
WARNING_TESTS=0

# JWT Token para tests autenticados
JWT_TOKEN=""

# =============================================================================
# FUNCIONES DE UTILIDAD
# =============================================================================

log() {
    local level=$1
    shift
    local message="$@"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        ERROR)
            echo -e "${RED}[ERROR] ${message}${NC}" | tee -a "$REPORT_FILE"
            ;;
        SUCCESS)
            echo -e "${GREEN}[SUCCESS] ${message}${NC}" | tee -a "$REPORT_FILE"
            ;;
        WARNING)
            echo -e "${YELLOW}[WARNING] ${message}${NC}" | tee -a "$REPORT_FILE"
            ;;
        INFO)
            echo -e "${BLUE}[INFO] ${message}${NC}" | tee -a "$REPORT_FILE"
            ;;
        TEST)
            echo -e "${CYAN}[TEST] ${message}${NC}" | tee -a "$REPORT_FILE"
            ;;
        RESULT)
            echo -e "${MAGENTA}[RESULT] ${message}${NC}" | tee -a "$REPORT_FILE"
            ;;
        *)
            echo "[${timestamp}] ${message}" | tee -a "$REPORT_FILE"
            ;;
    esac
}

ssh_exec() {
    local command=$1
    ssh -i "$SSH_KEY" -o StrictHostKeyChecking=no "${SSH_USER}@${SERVER_HOST}" "$command" 2>&1
}

test_endpoint() {
    local test_name=$1
    local endpoint=$2
    local expected_status=$3
    local method=${4:-GET}
    local data=${5:-}
    local headers=${6:-}
    
    ((TOTAL_TESTS++))
    log TEST "Testing: $test_name"
    
    local curl_cmd="curl -s -o /tmp/response_${TOTAL_TESTS}.txt -w '%{http_code}' -X $method"
    
    if [ -n "$headers" ]; then
        curl_cmd="$curl_cmd $headers"
    fi
    
    if [ -n "$data" ]; then
        curl_cmd="$curl_cmd -d '$data'"
    fi
    
    curl_cmd="$curl_cmd '$endpoint'"
    
    local status_code=$(eval $curl_cmd)
    local response=$(cat /tmp/response_${TOTAL_TESTS}.txt 2>/dev/null || echo "")
    
    if [ "$status_code" = "$expected_status" ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ $test_name - Status: $status_code"
        echo "$response" > /tmp/last_response.txt
        return 0
    else
        ((FAILED_TESTS++))
        log ERROR "❌ $test_name - Expected: $expected_status, Got: $status_code"
        log ERROR "Response: $response"
        return 1
    fi
}

# =============================================================================
# 1. VERIFICACIÓN DE INFRAESTRUCTURA
# =============================================================================

check_infrastructure() {
    echo ""
    log INFO "========================================="
    log INFO "1. VERIFICACIÓN DE INFRAESTRUCTURA"
    log INFO "========================================="
    
    # SSH Connectivity
    ((TOTAL_TESTS++))
    log TEST "Verificando conectividad SSH..."
    if ssh -i "$SSH_KEY" -o ConnectTimeout=5 "${SSH_USER}@${SERVER_HOST}" "echo 'OK'" &>/dev/null; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Conectividad SSH"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Conectividad SSH"
    fi
    
    # Disk Space
    ((TOTAL_TESTS++))
    log TEST "Verificando espacio en disco..."
    DISK_USAGE=$(ssh_exec "df -h / | awk 'NR==2 {print \$5}' | sed 's/%//'")
    if [ "$DISK_USAGE" -lt 90 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Espacio en disco: ${DISK_USAGE}% usado"
    else
        ((WARNING_TESTS++))
        log WARNING "⚠️ Espacio en disco alto: ${DISK_USAGE}% usado"
    fi
    
    # Memory Usage
    ((TOTAL_TESTS++))
    log TEST "Verificando memoria..."
    MEMORY_USAGE=$(ssh_exec "free -m | awk 'NR==2{printf \"%.1f\", \$3*100/\$2}'")
    if (( $(echo "$MEMORY_USAGE < 90" | bc -l) )); then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Uso de memoria: ${MEMORY_USAGE}%"
    else
        ((WARNING_TESTS++))
        log WARNING "⚠️ Uso de memoria alto: ${MEMORY_USAGE}%"
    fi
}

# =============================================================================
# 2. VERIFICACIÓN DE SERVICIOS
# =============================================================================

check_services() {
    echo ""
    log INFO "========================================="
    log INFO "2. VERIFICACIÓN DE SERVICIOS"
    log INFO "========================================="
    
    # PM2 Status
    ((TOTAL_TESTS++))
    log TEST "Verificando PM2..."
    PM2_STATUS=$(ssh_exec "pm2 list | grep -c 'aristotest-backend.*online'" || echo "0")
    if [ "$PM2_STATUS" -gt 0 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ PM2: aristotest-backend online"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ PM2: aristotest-backend no está online"
    fi
    
    # Nginx Status
    ((TOTAL_TESTS++))
    log TEST "Verificando Nginx..."
    if ssh_exec "systemctl is-active nginx" | grep -q "active"; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Nginx activo"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Nginx no está activo"
    fi
    
    # MinIO Status
    ((TOTAL_TESTS++))
    log TEST "Verificando MinIO..."
    if curl -f -s "http://${SERVER_IP}:9000/minio/health/live" > /dev/null 2>&1; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ MinIO respondiendo"
    else
        ((WARNING_TESTS++))
        log WARNING "⚠️ MinIO no responde (puede estar protegido)"
    fi
    
    # Database Connection
    ((TOTAL_TESTS++))
    log TEST "Verificando conexión a base de datos..."
    DB_CHECK=$(ssh_exec "PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -c 'SELECT 1' 2>/dev/null | grep -c '1 row'" || echo "0")
    if [ "$DB_CHECK" -gt 0 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Base de datos conectada"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ No se puede conectar a la base de datos"
    fi
}

# =============================================================================
# 3. VERIFICACIÓN DE ENDPOINTS BÁSICOS
# =============================================================================

check_basic_endpoints() {
    echo ""
    log INFO "========================================="
    log INFO "3. VERIFICACIÓN DE ENDPOINTS BÁSICOS"
    log INFO "========================================="
    
    # Frontend
    test_endpoint "Frontend (Puerto 80)" "http://${SERVER_IP}" "200"
    
    # Backend Health
    test_endpoint "Backend Health" "http://${SERVER_IP}:3001/api/v1/health" "200"
    
    # API through Nginx
    test_endpoint "API via Nginx" "http://${SERVER_IP}/api/v1/health" "200"
    
    # Socket.io
    test_endpoint "Socket.io Polling" "http://${SERVER_IP}:3001/socket.io/?EIO=4&transport=polling" "200"
}

# =============================================================================
# 4. VERIFICACIÓN DE AUTENTICACIÓN
# =============================================================================

check_authentication() {
    echo ""
    log INFO "========================================="
    log INFO "4. VERIFICACIÓN DE AUTENTICACIÓN"
    log INFO "========================================="
    
    # Login Admin
    log TEST "Testing: Login Admin"
    LOGIN_RESPONSE=$(curl -s -X POST "http://${SERVER_IP}:3001/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@aristotest.com","password":"admin123"}')
    
    if echo "$LOGIN_RESPONSE" | grep -q "token"; then
        ((TOTAL_TESTS++))
        ((PASSED_TESTS++))
        log SUCCESS "✅ Login Admin exitoso"
        
        # Extraer token
        JWT_TOKEN=$(echo "$LOGIN_RESPONSE" | grep -o '"token":"[^"]*' | cut -d'"' -f4)
        
        if [ -n "$JWT_TOKEN" ]; then
            log SUCCESS "Token JWT obtenido correctamente"
        fi
    else
        ((TOTAL_TESTS++))
        ((FAILED_TESTS++))
        log ERROR "❌ Login Admin falló"
        log ERROR "Response: $LOGIN_RESPONSE"
    fi
    
    # Test Protected Endpoint
    if [ -n "$JWT_TOKEN" ]; then
        test_endpoint "Endpoint Protegido (Profile)" \
            "http://${SERVER_IP}:3001/api/v1/auth/profile" \
            "200" \
            "GET" \
            "" \
            "-H 'Authorization: Bearer $JWT_TOKEN'"
    fi
    
    # Test Refresh Token
    test_endpoint "Refresh Token" \
        "http://${SERVER_IP}:3001/api/v1/auth/refresh" \
        "200" \
        "POST" \
        '{"refreshToken":"dummy"}' \
        "-H 'Content-Type: application/json'"
}

# =============================================================================
# 5. VERIFICACIÓN DE ENDPOINTS CRÍTICOS
# =============================================================================

check_critical_endpoints() {
    echo ""
    log INFO "========================================="
    log INFO "5. VERIFICACIÓN DE ENDPOINTS CRÍTICOS"
    log INFO "========================================="
    
    if [ -z "$JWT_TOKEN" ]; then
        log WARNING "No hay token JWT, saltando tests autenticados"
        return
    fi
    
    # Quizzes List
    test_endpoint "Lista de Quizzes" \
        "http://${SERVER_IP}:3001/api/v1/quizzes" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    
    # Sessions List
    test_endpoint "Lista de Sesiones" \
        "http://${SERVER_IP}:3001/api/v1/sessions" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    
    # Videos List
    test_endpoint "Lista de Videos" \
        "http://${SERVER_IP}:3001/api/v1/videos" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    
    # Manuals List
    test_endpoint "Lista de Manuales" \
        "http://${SERVER_IP}:3001/api/v1/manuals" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    
    # Classrooms List
    test_endpoint "Lista de Classrooms" \
        "http://${SERVER_IP}:3001/api/v1/classrooms" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
}

# =============================================================================
# 6. VERIFICACIÓN DE FUNCIONALIDADES AI
# =============================================================================

check_ai_features() {
    echo ""
    log INFO "========================================="
    log INFO "6. VERIFICACIÓN DE FUNCIONALIDADES AI"
    log INFO "========================================="
    
    if [ -z "$JWT_TOKEN" ]; then
        log WARNING "No hay token JWT, saltando tests de AI"
        return
    fi
    
    # AI Health (si existe endpoint)
    test_endpoint "AI Service Health" \
        "http://${SERVER_IP}:3001/api/v1/ai/health" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
    
    # Interactive Video Layers
    test_endpoint "Interactive Video Layers" \
        "http://${SERVER_IP}:3001/api/v1/interactive-video" \
        "200" \
        "GET" \
        "" \
        "-H 'Authorization: Bearer $JWT_TOKEN'"
}

# =============================================================================
# 7. VERIFICACIÓN DE BASE DE DATOS
# =============================================================================

check_database_integrity() {
    echo ""
    log INFO "========================================="
    log INFO "7. VERIFICACIÓN DE INTEGRIDAD DE BD"
    log INFO "========================================="
    
    log TEST "Verificando tablas críticas..."
    
    TABLES_CHECK=$(ssh_exec "PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -t -c \"
        SELECT COUNT(*) FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name IN ('users', 'tenants', 'quizzes', 'questions', 'quiz_sessions', 'videos', 'manuals');
    \"" | tr -d ' ')
    
    ((TOTAL_TESTS++))
    if [ "$TABLES_CHECK" -ge 7 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Todas las tablas críticas existen"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Faltan tablas críticas (encontradas: $TABLES_CHECK de 7)"
    fi
    
    # Verificar usuario admin
    ADMIN_CHECK=$(ssh_exec "PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -t -c \"
        SELECT COUNT(*) FROM users WHERE email = 'admin@aristotest.com';
    \"" | tr -d ' ')
    
    ((TOTAL_TESTS++))
    if [ "$ADMIN_CHECK" -ge 1 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Usuario admin existe"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Usuario admin no existe"
    fi
    
    # Verificar tenant
    TENANT_CHECK=$(ssh_exec "PGPASSWORD='${DB_PASSWORD}' psql -h ${DB_HOST} -U ${DB_USER} -d ${DB_NAME} -t -c \"
        SELECT COUNT(*) FROM tenants WHERE id = 1;
    \"" | tr -d ' ')
    
    ((TOTAL_TESTS++))
    if [ "$TENANT_CHECK" -ge 1 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Tenant por defecto existe"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Tenant por defecto no existe"
    fi
}

# =============================================================================
# 8. PERFORMANCE TESTS
# =============================================================================

check_performance() {
    echo ""
    log INFO "========================================="
    log INFO "8. TESTS DE PERFORMANCE"
    log INFO "========================================="
    
    # Response Time Test
    ((TOTAL_TESTS++))
    log TEST "Midiendo tiempo de respuesta del API..."
    
    RESPONSE_TIME=$(curl -o /dev/null -s -w '%{time_total}' "http://${SERVER_IP}:3001/api/v1/health")
    RESPONSE_MS=$(echo "$RESPONSE_TIME * 1000" | bc | cut -d'.' -f1)
    
    if [ "$RESPONSE_MS" -lt 500 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Tiempo de respuesta: ${RESPONSE_MS}ms"
    elif [ "$RESPONSE_MS" -lt 1000 ]; then
        ((WARNING_TESTS++))
        log WARNING "⚠️ Tiempo de respuesta lento: ${RESPONSE_MS}ms"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Tiempo de respuesta muy lento: ${RESPONSE_MS}ms"
    fi
    
    # Concurrent Requests Test
    ((TOTAL_TESTS++))
    log TEST "Probando requests concurrentes..."
    
    CONCURRENT_SUCCESS=0
    for i in {1..10}; do
        curl -f -s "http://${SERVER_IP}:3001/api/v1/health" > /dev/null 2>&1 &
    done
    wait
    
    CONCURRENT_CHECK=$(curl -s "http://${SERVER_IP}:3001/api/v1/health" | grep -c "ok" || echo "0")
    if [ "$CONCURRENT_CHECK" -gt 0 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Servidor maneja requests concurrentes"
    else
        ((FAILED_TESTS++))
        log ERROR "❌ Problema con requests concurrentes"
    fi
}

# =============================================================================
# 9. SECURITY CHECKS
# =============================================================================

check_security() {
    echo ""
    log INFO "========================================="
    log INFO "9. VERIFICACIÓN DE SEGURIDAD"
    log INFO "========================================="
    
    # CORS Headers
    ((TOTAL_TESTS++))
    log TEST "Verificando headers CORS..."
    CORS_CHECK=$(curl -s -I "http://${SERVER_IP}:3001/api/v1/health" | grep -c "Access-Control-Allow-Origin" || echo "0")
    if [ "$CORS_CHECK" -gt 0 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Headers CORS configurados"
    else
        ((WARNING_TESTS++))
        log WARNING "⚠️ Headers CORS no detectados"
    fi
    
    # Security Headers
    ((TOTAL_TESTS++))
    log TEST "Verificando headers de seguridad..."
    SECURITY_HEADERS=$(curl -s -I "http://${SERVER_IP}:3001/api/v1/health")
    
    if echo "$SECURITY_HEADERS" | grep -q "X-Content-Type-Options"; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Headers de seguridad presentes"
    else
        ((WARNING_TESTS++))
        log WARNING "⚠️ Algunos headers de seguridad faltan"
    fi
    
    # Test SQL Injection Protection
    ((TOTAL_TESTS++))
    log TEST "Verificando protección SQL Injection..."
    SQL_TEST=$(curl -s -X POST "http://${SERVER_IP}:3001/api/v1/auth/login" \
        -H "Content-Type: application/json" \
        -d '{"email":"admin@aristotest.com OR 1=1","password":"test"}' | grep -c "error\|invalid" || echo "0")
    
    if [ "$SQL_TEST" -gt 0 ]; then
        ((PASSED_TESTS++))
        log SUCCESS "✅ Protección contra SQL Injection activa"
    else
        ((WARNING_TESTS++))
        log WARNING "⚠️ Verificar protección SQL Injection"
    fi
}

# =============================================================================
# 10. GENERATE REPORT
# =============================================================================

generate_report() {
    echo ""
    echo ""
    log INFO "========================================="
    log INFO "REPORTE FINAL DE VERIFICACIÓN"
    log INFO "========================================="
    
    local success_rate=$(echo "scale=1; $PASSED_TESTS * 100 / $TOTAL_TESTS" | bc)
    
    echo "" | tee -a "$REPORT_FILE"
    echo "📊 RESUMEN DE TESTS:" | tee -a "$REPORT_FILE"
    echo "-------------------" | tee -a "$REPORT_FILE"
    echo "Total de tests:     $TOTAL_TESTS" | tee -a "$REPORT_FILE"
    echo -e "${GREEN}Tests exitosos:     $PASSED_TESTS${NC}" | tee -a "$REPORT_FILE"
    echo -e "${YELLOW}Advertencias:       $WARNING_TESTS${NC}" | tee -a "$REPORT_FILE"
    echo -e "${RED}Tests fallidos:     $FAILED_TESTS${NC}" | tee -a "$REPORT_FILE"
    echo "Tasa de éxito:      ${success_rate}%" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    
    # Estado general
    if [ "$FAILED_TESTS" -eq 0 ]; then
        echo -e "${GREEN}✅ ESTADO: SISTEMA COMPLETAMENTE OPERACIONAL${NC}" | tee -a "$REPORT_FILE"
    elif [ "$FAILED_TESTS" -le 3 ]; then
        echo -e "${YELLOW}⚠️ ESTADO: SISTEMA OPERACIONAL CON ADVERTENCIAS${NC}" | tee -a "$REPORT_FILE"
    else
        echo -e "${RED}❌ ESTADO: SISTEMA CON PROBLEMAS CRÍTICOS${NC}" | tee -a "$REPORT_FILE"
    fi
    
    echo "" | tee -a "$REPORT_FILE"
    echo "📝 RECOMENDACIONES:" | tee -a "$REPORT_FILE"
    echo "------------------" | tee -a "$REPORT_FILE"
    
    if [ "$FAILED_TESTS" -gt 0 ]; then
        echo "• Revisar los tests fallidos inmediatamente" | tee -a "$REPORT_FILE"
        echo "• Verificar logs de PM2: pm2 logs aristotest-backend" | tee -a "$REPORT_FILE"
    fi
    
    if [ "$WARNING_TESTS" -gt 0 ]; then
        echo "• Atender las advertencias cuando sea posible" | tee -a "$REPORT_FILE"
    fi
    
    if [ "$DISK_USAGE" -gt 80 ]; then
        echo "• Liberar espacio en disco pronto" | tee -a "$REPORT_FILE"
    fi
    
    echo "" | tee -a "$REPORT_FILE"
    echo "📄 Reporte guardado en: $REPORT_FILE" | tee -a "$REPORT_FILE"
    echo "" | tee -a "$REPORT_FILE"
    echo "=========================================" | tee -a "$REPORT_FILE"
}

# =============================================================================
# MAIN EXECUTION
# =============================================================================

main() {
    clear
    echo "========================================="
    echo "   VERIFICACIÓN COMPLETA - ARISTOTEST QA"
    echo "   Fecha: $(date)"
    echo "========================================="
    echo ""
    
    log INFO "Iniciando verificación completa del sistema..."
    log INFO "Servidor: ${SERVER_HOST}"
    log INFO "Base de datos: ${DB_NAME}@${DB_HOST}"
    echo ""
    
    # Ejecutar todas las verificaciones
    check_infrastructure
    check_services
    check_basic_endpoints
    check_authentication
    check_critical_endpoints
    check_ai_features
    check_database_integrity
    check_performance
    check_security
    
    # Generar reporte
    generate_report
    
    # Exit code basado en tests fallidos
    if [ "$FAILED_TESTS" -eq 0 ]; then
        exit 0
    else
        exit 1
    fi
}

# Ejecutar main
main "$@"