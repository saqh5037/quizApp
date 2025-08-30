#!/bin/bash

# 🔍 Script de Verificación Pre-Deployment
# Verifica que todo esté listo ANTES de intentar el deployment

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🔍 Verificación Pre-Deployment${NC}"
echo "========================================"

# Variables
ERRORS=0
WARNINGS=0

# 1. Verificar que estamos en el directorio correcto
echo -e "${YELLOW}1. Verificando directorio de trabajo...${NC}"
# Cambiar al directorio del proyecto
PROJECT_DIR="/Users/samuelquiroz/Documents/proyectos/quiz-app"
cd "$PROJECT_DIR"
if [ ! -f "package.json" ] || [ ! -d "backend" ] || [ ! -d "frontend" ]; then
    echo -e "${RED}❌ No se encuentra el proyecto en $PROJECT_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Directorio correcto: $PROJECT_DIR${NC}"

# 2. Verificar branch de Git
echo -e "${YELLOW}2. Verificando branch de Git...${NC}"
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "qa/release-1.1.0" ]; then
    echo -e "${RED}❌ No estás en el branch qa/release-1.1.0 (actual: $CURRENT_BRANCH)${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ Branch correcto: qa/release-1.1.0${NC}"
fi

# 3. Verificar que no hay cambios sin commitear
echo -e "${YELLOW}3. Verificando cambios sin commitear...${NC}"
if [ -n "$(git status --porcelain)" ]; then
    echo -e "${YELLOW}⚠️  Hay cambios sin commitear:${NC}"
    git status --short
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Repositorio limpio${NC}"
fi

# 4. Verificar archivos de configuración
echo -e "${YELLOW}4. Verificando archivos de configuración...${NC}"

# Backend .env.qa
if [ ! -f "backend/.env.qa" ]; then
    echo -e "${RED}❌ Falta archivo backend/.env.qa${NC}"
    ((ERRORS++))
else
    echo -e "${GREEN}✅ backend/.env.qa existe${NC}"
    # Verificar variables críticas
    for var in DB_HOST DB_USER DB_PASSWORD JWT_SECRET MINIO_ACCESS_KEY; do
        if ! grep -q "^$var=" backend/.env.qa; then
            echo -e "${RED}  ❌ Falta variable $var en .env.qa${NC}"
            ((ERRORS++))
        fi
    done
fi

# 5. Verificar archivos públicos
echo -e "${YELLOW}5. Verificando archivos públicos...${NC}"
if [ ! -d "frontend/public/images" ]; then
    echo -e "${RED}❌ Falta carpeta frontend/public/images${NC}"
    ((ERRORS++))
else
    IMAGE_COUNT=$(find frontend/public/images -type f \( -name "*.png" -o -name "*.jpg" -o -name "*.svg" \) | wc -l)
    echo -e "${GREEN}✅ Carpeta images existe con $IMAGE_COUNT imágenes${NC}"
fi

# 6. Verificar dependencias locales
echo -e "${YELLOW}6. Verificando dependencias...${NC}"

# Backend
if [ ! -d "backend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Faltan node_modules del backend${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Dependencias del backend instaladas${NC}"
fi

# Frontend
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}⚠️  Faltan node_modules del frontend${NC}"
    ((WARNINGS++))
else
    echo -e "${GREEN}✅ Dependencias del frontend instaladas${NC}"
fi

# 7. Verificar que podemos hacer build
echo -e "${YELLOW}7. Verificando build del frontend...${NC}"
cd frontend
if npm run build > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Build del frontend exitoso${NC}"
    # Verificar que se copiaron los assets
    if [ ! -d "dist/images" ]; then
        echo -e "${RED}❌ El build no incluyó la carpeta images${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${RED}❌ Error al hacer build del frontend${NC}"
    ((ERRORS++))
fi
cd ..

# 8. Verificar conectividad con el servidor
echo -e "${YELLOW}8. Verificando conectividad con el servidor...${NC}"
if ssh -i /Users/samuelquiroz/Desktop/certificados/labsisapp.pem \
   -o ConnectTimeout=5 \
   dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com \
   "echo 'Conexión exitosa'" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión con el servidor exitosa${NC}"
else
    echo -e "${RED}❌ No se puede conectar al servidor${NC}"
    ((ERRORS++))
fi

# 9. Verificar conectividad con la base de datos
echo -e "${YELLOW}9. Verificando conectividad con la base de datos...${NC}"
if PGPASSWORD=',U8x=]N02SX4' psql -U labsis \
   -h ec2-3-91-26-178.compute-1.amazonaws.com \
   -d aristotest -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Conexión con la base de datos exitosa${NC}"
else
    echo -e "${RED}❌ No se puede conectar a la base de datos${NC}"
    ((ERRORS++))
fi

# Resumen
echo ""
echo "========================================"
echo -e "${BLUE}📊 Resumen de Verificación${NC}"
echo "========================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}✅ TODO LISTO para deployment${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Hay $WARNINGS advertencias pero se puede continuar${NC}"
    echo "¿Deseas continuar? (y/n)"
    read -r response
    if [ "$response" != "y" ]; then
        exit 1
    fi
else
    echo -e "${RED}❌ Hay $ERRORS errores críticos${NC}"
    echo -e "${RED}El deployment NO puede continuar${NC}"
    exit 1
fi