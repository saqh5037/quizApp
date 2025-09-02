#!/bin/bash
# EJECUTAR ESTO EN EL SERVIDOR REMOTO

# Matar procesos Node.js huérfanos
pkill -f node || true
pkill -f "npm" || true

# Limpiar PM2
pm2 kill

# Ir al directorio
cd /home/dynamtek/aristoTEST/backend

# Reinstalar dependencias
npm ci --production

# Crear configuración mínima
cat > ecosystem.emergency.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_NAME: 'aristotest2',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4'
    }
  }]
};
EOF

# Iniciar con PM2
pm2 start ecosystem.emergency.js
pm2 save
pm2 logs
