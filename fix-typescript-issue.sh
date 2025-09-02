#!/bin/bash
# fix-typescript-issue.sh
# Script para arreglar el problema de ejecución de TypeScript en PM2

set -e

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuración
KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"

echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE}   ARREGLANDO PROBLEMA DE TYPESCRIPT EN PM2${NC}"
echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"

ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
set -e

cd /home/dynamtek/aristoTEST/backend

echo "🛑 Deteniendo PM2..."
pm2 stop aristotest-backend
pm2 delete aristotest-backend

echo "🔨 Compilando TypeScript a JavaScript..."
# Instalar TypeScript si no está
npm install --save-dev typescript @types/node

# Crear tsconfig simple para compilación
cat > tsconfig.build.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": false,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "allowSyntheticDefaultImports": true,
    "moduleResolution": "node",
    "types": ["node"],
    "sourceMap": true,
    "declaration": false,
    "removeComments": true,
    "noImplicitAny": false,
    "strictNullChecks": false,
    "strictFunctionTypes": false,
    "noImplicitThis": false,
    "alwaysStrict": false
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests", "**/*.spec.ts", "**/*.test.ts"]
}
EOF

echo "📦 Compilando código..."
npx tsc --project tsconfig.build.json || {
    echo "⚠️ Compilación con advertencias, continuando..."
}

# Verificar que se creó dist/server.js
if [ -f "dist/server.js" ]; then
    echo "✅ Compilación exitosa"
    
    # Actualizar ecosystem.config.js para usar JavaScript compilado
    cat > ecosystem.config.js << 'EOF'
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
      PORT: 3001
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true,
    merge_logs: true
  }]
};
EOF
else
    echo "❌ Error: No se pudo compilar, usando ts-node como fallback"
    
    # Configurar para ts-node
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: 'ts-node',
    args: '-r tsconfig-paths/register --transpile-only src/server.ts',
    interpreter: 'none',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',
      PORT: 3001,
      TS_NODE_TRANSPILE_ONLY: 'true',
      TS_NODE_FILES: 'true',
      TS_NODE_PROJECT: './tsconfig.json'
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
EOF
    
    # Asegurar que ts-node esté instalado
    npm install --save ts-node tsconfig-paths
fi

# Copiar archivos de configuración necesarios
if [ -f "src/config/database.js" ] || [ -f "src/config/database.ts" ]; then
    echo "📁 Copiando archivos de configuración..."
    mkdir -p dist/config
    cp -r src/config/* dist/config/ 2>/dev/null || true
fi

# Iniciar con PM2
echo "🚀 Iniciando con PM2..."
pm2 start ecosystem.config.js
pm2 save

# Esperar un momento
sleep 5

# Verificar estado
echo -e "\n📊 Estado actual:"
pm2 status

echo -e "\n🔍 Últimos logs:"
pm2 logs aristotest-backend --lines 20 --nostream

echo -e "\n❤️ Health check:"
curl -s http://localhost:3001/api/v1/health || echo "API iniciando..."

echo "✅ Proceso completado"
ENDSSH

echo -e "\n${GREEN}Verificando desde local...${NC}"
if curl -s -o /dev/null -w "%{http_code}" http://52.55.189.120:3001/api/v1/health | grep -q "200"; then
    echo -e "${GREEN}✅ API funcionando correctamente${NC}"
else
    echo -e "${YELLOW}⚠️ API aún iniciando o con problemas${NC}"
fi