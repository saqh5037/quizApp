#!/bin/bash

# Script para sincronizar código del backup verificado
# Uso: ./scripts/sync-from-backup.sh

echo "🚀 Sincronización de código desde backup verificado"
echo "=================================================="

BACKUP_DIR="/Users/samuelquiroz/Documents/proyectos/quiz-app-backup-20250828-104847"
CURRENT_DIR="/Users/samuelquiroz/Documents/proyectos/quiz-app"

# Verificar que el backup existe
if [ ! -d "$BACKUP_DIR" ]; then
    echo "❌ Error: No se encuentra el directorio de backup"
    exit 1
fi

# Crear backup del estado actual
echo "📦 Creando backup del estado actual..."
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
SAFETY_BACKUP="../quiz-app-safety-backup-$TIMESTAMP"
cp -r "$CURRENT_DIR" "$SAFETY_BACKUP"
echo "✅ Backup creado en: $SAFETY_BACKUP"

# Preguntar confirmación
echo ""
echo "⚠️  ADVERTENCIA: Este proceso sobrescribirá los archivos actuales"
echo "   Se ha creado un backup de seguridad en: $SAFETY_BACKUP"
read -p "¿Deseas continuar? (y/n): " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "❌ Operación cancelada"
    exit 1
fi

echo ""
echo "📂 Sincronizando archivos del backend..."
rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='logs' \
    --exclude='storage/minio-data' \
    --exclude='storage/processed' \
    --exclude='storage/uploads' \
    --exclude='uploads' \
    --exclude='.env' \
    --exclude='*.log' \
    --exclude='database.sqlite' \
    "$BACKUP_DIR/backend/" "$CURRENT_DIR/backend/"

echo ""
echo "📂 Sincronizando archivos del frontend..."
rsync -av --delete \
    --exclude='.git' \
    --exclude='node_modules' \
    --exclude='dist' \
    --exclude='.env' \
    --exclude='.env.local' \
    "$BACKUP_DIR/frontend/" "$CURRENT_DIR/frontend/"

echo ""
echo "📂 Sincronizando scripts..."
rsync -av \
    --exclude='sync-from-backup.sh' \
    "$BACKUP_DIR/scripts/" "$CURRENT_DIR/scripts/"

echo ""
echo "📂 Sincronizando documentación..."
cp -f "$BACKUP_DIR/README.md" "$CURRENT_DIR/README.md" 2>/dev/null || true
cp -f "$BACKUP_DIR/CHANGELOG.md" "$CURRENT_DIR/CHANGELOG.md" 2>/dev/null || true
cp -f "$BACKUP_DIR/LICENSE" "$CURRENT_DIR/LICENSE" 2>/dev/null || true

echo ""
echo "📋 Creando archivos de configuración de ejemplo..."

# Crear .env.example para backend si no existe
if [ ! -f "$CURRENT_DIR/backend/.env.example" ]; then
    cat > "$CURRENT_DIR/backend/.env.example" << 'EOF'
# Server Configuration
NODE_ENV=development
PORT=3001
HOST=0.0.0.0

# Database Configuration
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=your_db_user
DB_PASSWORD=your_db_password

# JWT Configuration
JWT_SECRET=your-jwt-secret
JWT_REFRESH_SECRET=your-refresh-secret

# AI Configuration
GEMINI_API_KEY=your-gemini-api-key

# MinIO Configuration
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=your-minio-secret
EOF
fi

# Crear .env.example para frontend si no existe
if [ ! -f "$CURRENT_DIR/frontend/.env.example" ]; then
    cat > "$CURRENT_DIR/frontend/.env.example" << 'EOF'
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
EOF
fi

echo ""
echo "🔍 Verificando estado de git..."
cd "$CURRENT_DIR"
git status --short

echo ""
echo "✅ Sincronización completada!"
echo ""
echo "📝 Próximos pasos recomendados:"
echo "   1. Revisar los cambios: git status"
echo "   2. Revisar diferencias: git diff"
echo "   3. Agregar cambios: git add -p (para revisar cada cambio)"
echo "   4. Hacer commit: git commit -m 'sync: Actualizar con versión estable'"
echo "   5. Push a GitHub: git push origin [branch]"
echo ""
echo "💡 Tip: Si algo salió mal, puedes restaurar desde: $SAFETY_BACKUP"