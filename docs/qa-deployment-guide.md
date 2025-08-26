# Guía de Despliegue QA - AristoTest v1.0.2

## 📋 Información del Servidor QA

**Servidor:** `ec2-52-55-189-120.compute-1.amazonaws.com`  
**Usuario:** `dynamtek`  
**Directorio:** `/home/dynamtek/proyectos/AristoTest`  
**Certificado SSH:** `/Users/samuelquiroz/Desktop/certificados/labsisapp.pem`  

## 🚀 Proceso de Despliegue

### 1. Conexión al Servidor
```bash
ssh -i "/Users/samuelquiroz/Desktop/certificados/labsisapp.pem" dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com
cd /home/dynamtek/proyectos/AristoTest
```

### 2. Verificación de Puertos Disponibles
```bash
# Verificar puertos en uso
sudo netstat -tlnp | grep :300
sudo lsof -i :3000
sudo lsof -i :3001
sudo lsof -i :5173

# Puertos sugeridos para QA:
# Frontend: 3010
# Backend: 3011
# Base de datos: 5433 (si es necesario nueva instancia)
```

### 3. Backup Actual (Importante)
```bash
# Backup de base de datos actual
pg_dump -h localhost -U aristotest -d aristotest > backup_pre_v1.0.2_$(date +%Y%m%d_%H%M%S).sql

# Backup de archivos estáticos
tar -czf backup_static_$(date +%Y%m%d_%H%M%S).tar.gz storage/ uploads/
```

### 4. Actualización de Código
```bash
git fetch origin
git checkout main
git pull origin main
git checkout v1.0.2-qa
```

### 5. Variables de Entorno

**Backend (.env):**
```bash
# Base de datos
DB_HOST=localhost
DB_PORT=5432
DB_USER=aristotest
DB_PASSWORD=AristoTest2024
DB_NAME=aristotest

# JWT
JWT_SECRET=aristotest-qa-secret-2025
JWT_REFRESH_SECRET=aristotest-qa-refresh-secret-2025

# Gemini API
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw

# MinIO
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=aristotest123

# Server
PORT=3011
NODE_ENV=production

# CORS
CORS_ORIGIN=http://ec2-52-55-189-120.compute-1.amazonaws.com:3010
```

**Frontend (.env):**
```bash
VITE_API_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3011
VITE_SOCKET_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3011
```

### 6. Instalación de Dependencias
```bash
# Backend
cd backend
npm install
npm run build

# Frontend
cd ../frontend
npm install
npm run build
```

### 7. Migraciones de Base de Datos
```bash
cd backend
npm run migrate

# Verificar que las tablas se crearon correctamente
psql -h localhost -U aristotest -d aristotest -c "\dt"
```

### 8. Iniciar Servicios

**MinIO (si no está corriendo):**
```bash
cd backend
chmod +x scripts/start-minio.sh
./scripts/start-minio.sh
```

**Backend:**
```bash
cd backend
PM2_HOME=/home/dynamtek/.pm2 pm2 start dist/server.js --name "aristotest-qa-backend" --env production
```

**Frontend:**
```bash
cd frontend
PM2_HOME=/home/dynamtek/.pm2 pm2 start --name "aristotest-qa-frontend" -- npx serve -s dist -l 3010
```

### 9. Configuración de Nginx (Opcional)
```bash
# Si se requiere configurar nginx
sudo nano /etc/nginx/sites-available/aristotest-qa

# Contenido sugerido:
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    location /qa/ {
        proxy_pass http://localhost:3010;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /qa/api/ {
        proxy_pass http://localhost:3011/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## 🧪 Verificación Post-Despliegue

### 1. Health Check
```bash
# Backend health check
curl http://localhost:3011/api/v1/health
curl http://localhost:3011/api/v1/

# Frontend accessibility
curl http://localhost:3010
```

### 2. Verificar Funcionalidades Clave

**Base de Datos:**
```sql
-- Verificar tenants
SELECT * FROM tenants;

-- Verificar usuarios
SELECT id, email, role, tenant_id FROM users LIMIT 5;

-- Verificar videos
SELECT id, title, status FROM videos LIMIT 5;

-- Verificar interactive layers
SELECT id, video_id, processing_status FROM interactive_video_layers LIMIT 5;
```

**APIs Críticas:**
```bash
# Test authentication
curl -X POST http://localhost:3011/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@aristotest.com", "password": "admin123"}'

# Test videos endpoint
curl http://localhost:3011/api/v1/videos \
  -H "Authorization: Bearer YOUR_TOKEN"

# Test results endpoint
curl http://localhost:3011/api/v1/results \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### 3. Verificar Archivos Estáticos
```bash
# Verificar que MinIO está sirviendo archivos
curl http://localhost:9000/minio/health/live

# Verificar estructura de directorios
ls -la storage/
ls -la uploads/
```

## 🔍 URLs de Testing para QA

### Principales
- **Frontend:** `http://ec2-52-55-189-120.compute-1.amazonaws.com:3010`
- **API:** `http://ec2-52-55-189-120.compute-1.amazonaws.com:3011/api/v1`
- **MinIO Console:** `http://ec2-52-55-189-120.compute-1.amazonaws.com:9000`

### Páginas Específicas para Testing
```
# Dashboard
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/dashboard

# Videos
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/videos

# Videos Interactivos (reemplazar {id} con ID real)
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/videos/{id}/interactive

# QR Sharing - Página Pública (reemplazar {id} con ID real)
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/videos/{id}/public
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/videos/{id}/public-interactive

# Resultados Públicos
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/public-results

# Resultados Detallados
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/results/detail/quiz/{id}
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/results/detail/video/{id}

# Salones y Tenants
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/classrooms
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/tenant-settings

# Manuales
http://ec2-52-55-189-120.compute-1.amazonaws.com:3010/manuals
```

## 📋 Datos de Prueba

### Usuario Admin
- **Email:** `admin@aristotest.com`
- **Password:** `admin123`
- **Role:** `super_admin`

### Usuario de Prueba
- **Email:** `test@aristotest.com` 
- **Password:** `test123`
- **Role:** `instructor`

## 🚨 Troubleshooting

### Problemas Comunes

**Error de conexión a Base de Datos:**
```bash
# Verificar que PostgreSQL está corriendo
sudo systemctl status postgresql
sudo systemctl start postgresql

# Verificar conexión
psql -h localhost -U aristotest -d aristotest -c "SELECT 1;"
```

**Error de permisos de archivos:**
```bash
# Ajustar permisos
sudo chown -R dynamtek:dynamtek /home/dynamtek/proyectos/AristoTest
chmod +x backend/scripts/*.sh
```

**MinIO no accesible:**
```bash
# Reiniciar MinIO
pkill -f minio
cd backend && ./scripts/start-minio.sh
```

**Frontend no carga:**
```bash
# Verificar build
cd frontend && ls -la dist/
# Reinstalar dependencias si es necesario
rm -rf node_modules package-lock.json && npm install
```

### Logs Importantes
```bash
# Backend logs
PM2_HOME=/home/dynamtek/.pm2 pm2 logs aristotest-qa-backend

# Frontend logs  
PM2_HOME=/home/dynamtek/.pm2 pm2 logs aristotest-qa-frontend

# Sistema logs
tail -f /var/log/nginx/error.log
journalctl -u postgresql -f
```

## ✅ Checklist de Verificación QA

- [ ] Aplicación accesible en puerto 3010
- [ ] API responde en puerto 3011
- [ ] MinIO accesible en puerto 9000
- [ ] Login funcional con usuarios de prueba
- [ ] Videos se pueden subir y reproducir
- [ ] Videos interactivos generan preguntas automáticamente
- [ ] QR sharing funciona para acceso público
- [ ] Resultados se muestran correctamente (quiz y video)
- [ ] Multi-tenant isolation funciona
- [ ] Certificados se generan correctamente
- [ ] Responsive design funciona en móviles
- [ ] Error handling apropiado
- [ ] Performance aceptable con múltiples usuarios

---

**Contacto de Soporte:**  
En caso de problemas durante el despliegue, contactar al equipo de desarrollo.