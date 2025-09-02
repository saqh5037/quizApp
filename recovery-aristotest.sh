#!/bin/bash
# recovery-aristotest.sh
# Script de recuperación rápida para AristoTest

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuración
KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   SCRIPT DE RECUPERACIÓN DE ARISTOTEST${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

# Función para mostrar menú
show_menu() {
    echo -e "\n${YELLOW}Selecciona una opción:${NC}"
    echo "1) Restaurar backup anterior"
    echo "2) Reiniciar servicios"
    echo "3) Ver logs de error"
    echo "4) Limpiar y detener todo"
    echo "5) Verificar estado actual"
    echo "6) Salir"
}

# Función principal
main() {
    while true; do
        show_menu
        read -p "Opción: " choice
        
        case $choice in
            1)
                echo -e "\n${YELLOW}Restaurando backup anterior...${NC}"
                ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
set -e

# Detener servicios actuales
pm2 stop aristotest-backend 2>/dev/null || true
pm2 delete aristotest-backend 2>/dev/null || true

# Buscar y restaurar backup
if [ -d "/home/dynamtek/aristoTEST.old" ]; then
    echo "📦 Restaurando desde aristoTEST.old..."
    rm -rf /home/dynamtek/aristoTEST
    cp -r /home/dynamtek/aristoTEST.old /home/dynamtek/aristoTEST
    cd /home/dynamtek/aristoTEST/backend
    pm2 start ecosystem.config.js
    echo "✅ Backup restaurado y servicio iniciado"
else
    # Buscar en backups comprimidos
    LATEST_BACKUP=$(ls -t /home/dynamtek/backups/aristotest_backup_*.tar.gz 2>/dev/null | head -1)
    if [ -n "$LATEST_BACKUP" ]; then
        echo "📦 Restaurando desde $LATEST_BACKUP..."
        cd /home/dynamtek
        tar -xzf "$LATEST_BACKUP"
        cd /home/dynamtek/aristoTEST/backend
        pm2 start ecosystem.config.js
        echo "✅ Backup restaurado desde archivo"
    else
        echo "❌ No hay backups disponibles"
    fi
fi

pm2 status
ENDSSH
                ;;
                
            2)
                echo -e "\n${YELLOW}Reiniciando servicios...${NC}"
                ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
# Reiniciar PM2
pm2 restart aristotest-backend || {
    echo "⚠️ No se pudo reiniciar, intentando iniciar..."
    cd /home/dynamtek/aristoTEST/backend
    pm2 start ecosystem.config.js
}

# Reiniciar Nginx
sudo systemctl restart nginx

echo "✅ Servicios reiniciados"
pm2 status
ENDSSH
                ;;
                
            3)
                echo -e "\n${YELLOW}Mostrando últimos logs de error...${NC}"
                ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
echo "📋 Logs de PM2:"
pm2 logs aristotest-backend --lines 50 --nostream

echo -e "\n📋 Logs de error del backend:"
if [ -f "/home/dynamtek/aristoTEST/backend/logs/error.log" ]; then
    tail -50 /home/dynamtek/aristoTEST/backend/logs/error.log
fi

echo -e "\n📋 Logs de Nginx:"
sudo tail -20 /var/log/nginx/error.log
ENDSSH
                ;;
                
            4)
                echo -e "\n${YELLOW}Limpiando y deteniendo todo...${NC}"
                read -p "⚠️ Esto detendrá completamente AristoTest. ¿Continuar? (s/n): " confirm
                if [[ $confirm == "s" ]]; then
                    ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
# Detener PM2
pm2 stop aristotest-backend 2>/dev/null || true
pm2 delete aristotest-backend 2>/dev/null || true

# Limpiar puerto 3001
sudo fuser -k 3001/tcp 2>/dev/null || true

# Limpiar archivos temporales
rm -rf /home/dynamtek/aristoTEST.tmp
rm -rf /home/dynamtek/aristoTEST/backend/node_modules/.cache

echo "✅ Todo detenido y limpiado"
pm2 status
ENDSSH
                fi
                ;;
                
            5)
                echo -e "\n${YELLOW}Verificando estado actual...${NC}"
                ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
echo "📊 Estado de PM2:"
pm2 status

echo -e "\n🔍 Puerto 3001:"
sudo lsof -i :3001 || echo "Puerto 3001 libre"

echo -e "\n📁 Directorios de AristoTest:"
ls -la /home/dynamtek/ | grep -E "aristo|ARISTO" || echo "No hay directorios de AristoTest"

echo -e "\n❤️ Health Check:"
curl -s http://localhost:3001/api/v1/health || echo "API no responde"

echo -e "\n💾 Uso de disco:"
df -h | grep -E "Filesystem|/$"

echo -e "\n🧠 Uso de memoria:"
free -h

echo -e "\n📦 Backups disponibles:"
ls -la /home/dynamtek/backups/aristotest_backup_*.tar.gz 2>/dev/null | tail -5 || echo "No hay backups"
ENDSSH
                ;;
                
            6)
                echo -e "${GREEN}Saliendo...${NC}"
                exit 0
                ;;
                
            *)
                echo -e "${RED}Opción inválida${NC}"
                ;;
        esac
    done
}

# Ejecutar función principal
main