#!/bin/bash

# 🧹 Script de Limpieza Completa del Servidor QA
# Elimina TODOS los procesos y archivos anteriores para un deployment limpio

set -e

# Configuración
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY_PATH="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🧹 Iniciando limpieza completa del servidor QA${NC}"
echo "========================================"

ssh -i "$KEY_PATH" "$USER@$SERVER" << 'ENDSSH'
set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}1. Deteniendo TODOS los procesos Node.js${NC}"
# Matar todos los procesos node
sudo killall -9 node 2>/dev/null || true
echo "✅ Procesos Node.js terminados"

echo -e "${YELLOW}2. Limpiando PM2${NC}"
# Detener y limpiar PM2
pm2 kill 2>/dev/null || true
rm -rf ~/.pm2 2>/dev/null || true
echo "✅ PM2 limpiado"

echo -e "${YELLOW}3. Deteniendo servicios relacionados${NC}"
# Detener nginx si está corriendo
sudo systemctl stop nginx 2>/dev/null || true
# Detener MinIO si está corriendo
sudo systemctl stop minio 2>/dev/null || true
echo "✅ Servicios detenidos"

echo -e "${YELLOW}4. Eliminando deployments anteriores${NC}"
# Eliminar carpetas de deployments anteriores
rm -rf /home/dynamtek/aristoTEST 2>/dev/null || true
rm -rf /home/dynamtek/quiz-app 2>/dev/null || true
rm -rf /home/ubuntu/quiz-app 2>/dev/null || true
echo "✅ Deployments anteriores eliminados"

echo -e "${YELLOW}5. Limpiando logs antiguos${NC}"
# Limpiar logs
rm -rf /home/dynamtek/logs 2>/dev/null || true
rm -rf /var/log/pm2-* 2>/dev/null || true
echo "✅ Logs limpiados"

echo -e "${YELLOW}6. Verificando puertos liberados${NC}"
# Verificar que los puertos estén libres
for port in 3000 3001 5173 8080 9000 9001; do
    if netstat -tuln | grep -q ":$port "; then
        echo -e "${RED}⚠️  Puerto $port aún en uso${NC}"
        # Intentar liberar el puerto
        sudo fuser -k $port/tcp 2>/dev/null || true
    else
        echo "✅ Puerto $port libre"
    fi
done

echo -e "${YELLOW}7. Liberando memoria${NC}"
# Limpiar caché del sistema
sync && echo 3 | sudo tee /proc/sys/vm/drop_caches > /dev/null
echo "✅ Memoria liberada"

echo -e "${GREEN}🎉 Limpieza completa terminada${NC}"
echo "========================================"
echo "Estado del sistema:"
echo "Memoria disponible: $(free -h | grep Mem | awk '{print $7}')"
echo "Espacio en disco: $(df -h / | tail -1 | awk '{print $4}') disponible"
echo "Procesos node activos: $(ps aux | grep -c node | grep -v grep || echo 0)"

ENDSSH

echo -e "${GREEN}✅ Servidor limpio y listo para nuevo deployment${NC}"