#!/bin/bash
# fix-backend-final.sh
# Script definitivo para arreglar el backend con alias resolution

set -e

# Configuración
KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"

echo "🔧 Arreglando backend definitivamente..."

ssh -i "$KEY" "$USER@$SERVER" << 'EOF'
cd /home/dynamtek/aristoTEST/backend

# Detener PM2
pm2 stop aristotest-backend 2>/dev/null || true
pm2 delete aristotest-backend 2>/dev/null || true

echo "📦 Instalando dependencias necesarias..."
npm install --save module-alias
npm install --save-dev babel-plugin-module-resolver

# Crear configuración de Babel con resolución de alias
cat > .babelrc << 'BABEL'
{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "node": "14"
      }
    }],
    "@babel/preset-typescript"
  ],
  "plugins": [
    ["module-resolver", {
      "root": ["./src"],
      "alias": {
        "@config": "./src/config",
        "@controllers": "./src/controllers",
        "@models": "./src/models",
        "@routes": "./src/routes",
        "@middleware": "./src/middleware",
        "@services": "./src/services",
        "@utils": "./src/utils",
        "@types": "./src/types",
        "@socket": "./src/socket"
      }
    }]
  ]
}
BABEL

echo "🔨 Recompilando con Babel y alias resolution..."
rm -rf dist
npx babel src --out-dir dist --extensions ".ts,.js" --source-maps inline --copy-files

# Crear script de inicio con module-alias
cat > start-production.js << 'STARTSCRIPT'
#!/usr/bin/env node

// Configure module alias for production
require('module-alias/register');

// Load environment variables
require('dotenv').config();

// Set module aliases
const moduleAlias = require('module-alias');
moduleAlias.addAliases({
  '@config': __dirname + '/dist/config',
  '@controllers': __dirname + '/dist/controllers',
  '@models': __dirname + '/dist/models',
  '@routes': __dirname + '/dist/routes',
  '@middleware': __dirname + '/dist/middleware',
  '@services': __dirname + '/dist/services',
  '@utils': __dirname + '/dist/utils',
  '@types': __dirname + '/dist/types',
  '@socket': __dirname + '/dist/socket'
});

// Set environment defaults
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.PORT = process.env.PORT || '3001';

// Start server
try {
  require('./dist/server.js');
} catch (error) {
  console.error('Error starting server:', error);
  process.exit(1);
}
STARTSCRIPT

chmod +x start-production.js

# Actualizar package.json para incluir _moduleAliases
cat > update-package.js << 'PKGUPDATE'
const fs = require('fs');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));

pkg._moduleAliases = {
  "@config": "dist/config",
  "@controllers": "dist/controllers",
  "@models": "dist/models",
  "@routes": "dist/routes",
  "@middleware": "dist/middleware",
  "@services": "dist/services",
  "@utils": "dist/utils",
  "@types": "dist/types",
  "@socket": "dist/socket"
};

fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
console.log('✅ Package.json actualizado con alias');
PKGUPDATE

node update-package.js
rm update-package.js

# Crear ecosystem.config.js actualizado
cat > ecosystem.config.js << 'ECOEOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './start-production.js',
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
    merge_logs: true,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
ECOEOF

echo "🚀 Iniciando con PM2..."
pm2 start ecosystem.config.js
pm2 save

sleep 5

echo -e "\n📊 Estado:"
pm2 status

echo -e "\n📋 Logs:"
pm2 logs aristotest-backend --lines 20 --nostream

echo -e "\n❤️ Health check:"
curl -s http://localhost:3001/api/v1/health || echo "API iniciando..."

echo "✅ Proceso completado"
EOF

echo -e "\n🔍 Verificando desde local..."
sleep 3
if curl -s -o /dev/null -w "%{http_code}" http://52.55.189.120:3001/api/v1/health | grep -q "200"; then
    echo "✅ API funcionando correctamente"
else
    echo "⚠️ API aún iniciando, verificar en unos segundos..."
fi