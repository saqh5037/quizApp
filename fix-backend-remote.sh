#!/bin/bash

# Script para ejecutar en el servidor QA directamente
# Soluciona el problema de compilación TypeScript/Babel

echo "═══════════════════════════════════════════════"
echo "   FIX BACKEND COMPILATION - QA SERVER"
echo "═══════════════════════════════════════════════"

# Navegar al directorio del backend
cd /home/dynamtek/aristoTEST/backend || exit

echo "📋 1. Creando archivo de utilidades para sanitización de nombres..."
mkdir -p src/utils

cat > src/utils/filename.utils.ts << 'EOF'
/**
 * Utility functions for filename sanitization
 */

/**
 * Sanitize filename by removing accents and special characters
 * @param filename - Original filename
 * @returns Sanitized filename safe for HTTP headers
 */
export function sanitizeFilename(filename: string): string {
  // Normalize unicode characters and remove accents
  const normalized = filename.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  // Replace spaces and special characters with underscores
  const sanitized = normalized
    .replace(/[^a-zA-Z0-9.\-_]/g, '_')
    .replace(/_{2,}/g, '_') // Replace multiple underscores with single
    .replace(/^_|_$/g, ''); // Remove leading/trailing underscores
  
  return sanitized || 'file'; // Fallback if everything gets stripped
}

/**
 * Sanitize filename while preserving the extension
 * @param filename - Original filename with extension
 * @returns Sanitized filename with original extension preserved
 */
export function sanitizeFilenameWithExtension(filename: string): string {
  const lastDotIndex = filename.lastIndexOf('.');
  
  if (lastDotIndex === -1) {
    // No extension
    return sanitizeFilename(filename);
  }
  
  const name = filename.substring(0, lastDotIndex);
  const extension = filename.substring(lastDotIndex + 1);
  
  // Sanitize name but keep original extension (just remove accents)
  const sanitizedName = sanitizeFilename(name);
  const sanitizedExt = extension.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  
  return `${sanitizedName}.${sanitizedExt}`;
}
EOF

echo "✅ Archivo de utilidades creado"

echo "📋 2. Actualizando configuración de Babel..."
cat > .babelrc << 'EOF'
{
  "presets": [
    ["@babel/preset-env", {
      "targets": {
        "node": "18"
      }
    }],
    ["@babel/preset-typescript", {
      "allowDeclareFields": true,
      "onlyRemoveTypeImports": true
    }]
  ],
  "plugins": [
    ["@babel/plugin-proposal-decorators", { "legacy": true }],
    ["@babel/plugin-proposal-class-properties", { "loose": true }],
    "@babel/plugin-transform-runtime",
    [
      "module-resolver",
      {
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
      }
    ]
  ]
}
EOF

echo "📋 3. Intentando compilar con nueva configuración..."
rm -rf dist
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Compilación falló. Usando solución alternativa con ts-node..."
    
    echo "📋 4. Instalando ts-node y dependencias..."
    npm install --save-dev ts-node@latest tsconfig-paths@latest @types/node@latest
    
    echo "📋 5. Creando script de inicio con ts-node..."
    cat > start-with-ts-node.js << 'EOF'
const { spawn } = require('child_process');
const path = require('path');

// Configurar variables de entorno
process.env.NODE_ENV = 'production';
process.env.PORT = '3001';
process.env.DB_HOST = 'ec2-3-91-26-178.compute-1.amazonaws.com';
process.env.DB_PORT = '5432';
process.env.DB_NAME = 'aristotest';
process.env.DB_USER = 'labsis';
process.env.DB_PASSWORD = ',U8x=]N02SX4';

// Ejecutar ts-node con configuración adecuada
const tsNode = spawn('npx', [
  'ts-node',
  '-r', 'tsconfig-paths/register',
  '--transpile-only',
  '--ignore', 'false',
  path.join(__dirname, 'src/server.ts')
], {
  stdio: 'inherit',
  env: process.env
});

tsNode.on('error', (err) => {
  console.error('Error starting server:', err);
  process.exit(1);
});

tsNode.on('exit', (code) => {
  process.exit(code);
});
EOF

    echo "📋 6. Actualizando PM2 ecosystem..."
    cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './start-with-ts-node.js',
    instances: 1,
    exec_mode: 'fork',
    watch: false,
    max_memory_restart: '1G',
    env: {
      NODE_ENV: 'production'
    },
    error_file: './logs/backend-error.log',
    out_file: './logs/backend-out.log',
    log_file: './logs/backend-combined.log',
    time: true
  }]
}
EOF

    echo "📋 7. Reiniciando backend con ts-node..."
    pm2 delete aristotest-backend 2>/dev/null
    pm2 start ecosystem.config.js
    
else
    echo "✅ Compilación exitosa"
    
    echo "📋 4. Copiando archivo de utilidades a dist..."
    mkdir -p dist/utils
    cp src/utils/filename.utils.ts dist/utils/filename.utils.js 2>/dev/null || \
    npx babel src/utils/filename.utils.ts --out-file dist/utils/filename.utils.js --presets @babel/preset-typescript
    
    echo "📋 5. Reiniciando backend con código compilado..."
    pm2 restart aristotest-backend
fi

echo "📋 8. Verificando estado del servicio..."
sleep 5
pm2 status aristotest-backend

echo "📋 9. Mostrando últimos logs..."
pm2 logs aristotest-backend --lines 15 --nostream

echo "📋 10. Verificando endpoint de salud..."
curl -s -o /dev/null -w "Backend HTTP Status: %{http_code}\n" http://localhost:3001/api/v1/auth/login || echo "Backend no responde aún"

echo "═══════════════════════════════════════════════"
echo "   FIN DEL FIX"
echo "═══════════════════════════════════════════════"
echo ""
echo "⚠️  Si el backend sigue sin funcionar, ejecuta:"
echo "    pm2 logs aristotest-backend --lines 50"
echo "    para ver más detalles del error"