# 📋 GUÍA DE DEPLOYMENT PARA QA

## PRE-REQUISITOS DEL SERVIDOR

### Software Requerido:
- Node.js 18+ y npm
- PostgreSQL 14+
- FFmpeg
- PM2 (para gestión de procesos)
- Git

### Puertos necesarios:
- 3001: Backend API
- 5173: Frontend (desarrollo) 
- 80/443: Nginx (producción)
- 5432: PostgreSQL
- 9000: MinIO API
- 9001: MinIO Console

## VARIABLES DE ENTORNO

### Backend (.env)
```bash
# Database
DB_HOST=tu-servidor-postgres
DB_PORT=5432
DB_NAME=aristotest
DB_USER=aristotest  
DB_PASSWORD=tu-password-seguro
DB_DIALECT=postgres  # IMPORTANTE: NO sqlite

# JWT
JWT_SECRET=genera-un-secret-seguro
JWT_REFRESH_SECRET=otro-secret-seguro

# MinIO Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=tu-secret-minio
MINIO_USE_SSL=false

# AI
GEMINI_API_KEY=tu-api-key-gemini

# Server
PORT=3001
NODE_ENV=production
```

### Frontend (.env.production)
```bash
VITE_API_URL=http://tu-servidor-qa:3001
VITE_SOCKET_URL=http://tu-servidor-qa:3001
```

## PASOS DE DEPLOYMENT

### 1. Clonar y preparar código
```bash
# En servidor QA
git clone https://github.com/tu-usuario/quiz-app.git
cd quiz-app
git checkout feature/interactive-videos-v1
```

### 2. Instalar dependencias
```bash
# Backend
cd backend
npm install
cp .env.example .env
# Editar .env con valores de QA

# Frontend  
cd ../frontend
npm install
cp .env.example .env.production
# Editar .env.production
```

### 3. Ejecutar migraciones
```bash
cd backend
npm run migrate
```

### 4. Build de producción
```bash
# Backend
npm run build

# Frontend
cd ../frontend
npm run build
```

### 5. Configurar PM2
```bash
# Crear ecosystem.config.js
cat > ecosystem.config.js << EOF
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './backend/dist/server.js',
    instances: 2,
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production'
    }
  }]
}
EOF

# Iniciar con PM2
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

### 6. Configurar Nginx
```nginx
server {
    listen 80;
    server_name tu-servidor-qa;

    # Frontend
    location / {
        root /path/to/quiz-app/frontend/dist;
        try_files $uri $uri/ /index.html;
    }

    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }

    # Socket.io
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## VERIFICACIÓN POST-DEPLOY

### 1. Health Check
```bash
curl http://localhost:3001/api/v1/health
```

### 2. Verificar servicios
```bash
# PostgreSQL
PGPASSWORD=tu-password psql -U aristotest -d aristotest -h localhost -c "\dt"

# PM2
pm2 status

# MinIO
curl http://localhost:9000/minio/health/live
```

### 3. Tests funcionales
- Login: http://tu-servidor-qa/login
- Videos: http://tu-servidor-qa/videos
- Upload video y generar capa interactiva
- Probar evaluación pública

## TROUBLESHOOTING

### Error: "Cannot connect to database"
- Verificar PostgreSQL está corriendo
- Verificar credenciales en .env
- NO debe usar SQLite

### Error: "Video processing failed"
- Verificar FFmpeg instalado: `ffmpeg -version`
- Verificar permisos de escritura en `backend/storage/`

### Error: "MinIO connection refused"
- Iniciar MinIO: `minio server /data --console-address :9001`
- Verificar credenciales MinIO en .env

## ROLLBACK

Si algo falla:
```bash
# Volver a versión anterior
git checkout main
npm install
pm2 restart all

# Restaurar BD si es necesario
psql -U aristotest -d aristotest < backup-anterior.sql
```

## CONTACTO SOPORTE

Para problemas críticos contactar al equipo de desarrollo.