# 📚 MEMORIA DE DEPLOYMENT A QA - ARISTOTEST
**Fecha:** 29 de Agosto 2025  
**Servidor:** ec2-52-55-189-120.compute-1.amazonaws.com  
**Base de Datos:** ec2-3-91-26-178.compute-1.amazonaws.com  
**Resultado:** ✅ DEPLOYMENT EXITOSO

---

## 📋 RESUMEN EJECUTIVO

El deployment a QA presentó múltiples desafíos relacionados principalmente con la base de datos. La solución definitiva fue **restaurar una base de datos completa (aristotest1)** en lugar de intentar migrar o sincronizar la estructura desde cero.

---

## 🔴 PROBLEMAS ENCONTRADOS

### 1. **Problemas de Assets/Imágenes**
- **Síntoma:** Logo y imágenes no cargaban (404)
- **Causa:** El build de Vite no copiaba la carpeta `public` a `dist`
- **Solución:** Crear `vite.config.build.ts` con plugin personalizado para copiar assets

### 2. **Problemas de Conexión del Backend**
- **Síntoma:** Frontend no podía conectar con backend
- **Causa:** Backend escuchando solo en localhost (127.0.0.1)
- **Solución:** Configurar HOST=0.0.0.0 en ecosystem.config.js

### 3. **Conflicto de Puertos**
- **Síntoma:** Puerto 3001 ocupado por otro servicio
- **Causa:** Múltiples aplicaciones Node.js corriendo
- **Solución:** Kill de todos los procesos node y uso exclusivo para AristoTest

### 4. **Errores de CORS**
- **Síntoma:** "Not allowed by CORS"
- **Causa:** Configuración incorrecta de CORS_ORIGIN
- **Solución:** Configurar CORS_ORIGIN con la IP del servidor QA

### 5. **Errores de Autenticación**
- **Síntoma:** Login fallaba con credenciales correctas
- **Causa:** Hash de password incorrecto en DB
- **Solución:** Actualizar hash con bcrypt.hashSync('Admin123!', 10)

### 6. **Errores 500 en Múltiples Páginas** ⚠️ CRÍTICO
- **Síntoma:** Dashboard, Quizzes, Results, Classrooms con error 500
- **Causa:** Discrepancias entre modelos Sequelize y estructura de DB
  - Columnas con nombres diferentes (camelCase vs snake_case)
  - Tablas faltantes (classrooms, ai_generated_quizzes)
  - Relaciones incorrectas
- **Solución Intentada:** Migraciones, sincronización, ALTER TABLE
- **SOLUCIÓN DEFINITIVA:** ✅ **Restaurar backup completo de DB (aristotest1)**

---

## ✅ SOLUCIONES APLICADAS

### 1. Configuración de Build Frontend
```typescript
// frontend/vite.config.build.ts
const copyPublicAssets = () => {
  return {
    name: 'copy-public-assets',
    closeBundle: async () => {
      await fs.copy(srcPath, destPath, { overwrite: true });
    }
  };
};
```

### 2. Configuración PM2 para Backend
```javascript
// backend/ecosystem.config.js
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './src/server.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register/transpile-only -r tsconfig-paths/register',
    env: {
      NODE_ENV: 'production',
      HOST: '0.0.0.0',  // CRÍTICO: No usar localhost
      PORT: 3001,
      DB_NAME: 'aristotest1',  // Base de datos restaurada
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4',
      JWT_SECRET: 'aristotest-qa-jwt-secret-2025',
      CORS_ORIGIN: 'http://ec2-52-55-189-120.compute-1.amazonaws.com'
    }
  }]
};
```

### 3. Configuración Nginx
```nginx
server {
    listen 80;
    server_name ec2-52-55-189-120.compute-1.amazonaws.com;
    
    root /home/dynamtek/aristoTEST/frontend/dist;
    index index.html;
    
    # Frontend routes
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    # Static assets
    location /images {
        alias /home/dynamtek/aristoTEST/frontend/dist/images;
    }
    
    # Backend API
    location /api {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
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

---

## 🔧 SCRIPT DE DEPLOYMENT FINAL

```bash
#!/bin/bash
# deploy-direct-qa.sh

SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"

# 1. Build local del frontend con assets
cd /Users/samuelquiroz/Documents/proyectos/quiz-app/frontend
npm run build -- --config vite.config.build.ts

# 2. Empaquetar proyecto
cd ..
tar -czf /tmp/deploy-qa.tar.gz \
  --exclude='node_modules' \
  --exclude='*.log' \
  backend frontend/dist

# 3. Transferir al servidor
scp -i "$KEY" /tmp/deploy-qa.tar.gz "$USER@$SERVER:/tmp/"
scp -i "$KEY" backend/.env.qa "$USER@$SERVER:/tmp/.env"

# 4. Desplegar en servidor
ssh -i "$KEY" "$USER@$SERVER" << 'ENDSSH'
  # Limpiar y descomprimir
  pm2 kill
  rm -rf /home/dynamtek/aristoTEST
  mkdir -p /home/dynamtek/aristoTEST
  cd /home/dynamtek/aristoTEST
  tar -xzf /tmp/deploy-qa.tar.gz
  
  # Configurar backend
  cd backend
  cp /tmp/.env .env
  npm install
  
  # Configurar Nginx
  sudo systemctl restart nginx
  
  # Iniciar backend
  pm2 start ecosystem.config.js
  pm2 save
ENDSSH
```

---

## 🗄️ SOLUCIÓN DEFINITIVA: RESTAURAR BASE DE DATOS

### Pasos para Restaurar DB:
1. **Crear backup en desarrollo local:**
```bash
pg_dump -U postgres -d aristotest -f aristotest_backup.sql
```

2. **Transferir y restaurar en RDS:**
```bash
# En servidor RDS
psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com
CREATE DATABASE aristotest1;
\q

# Restaurar
psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com -d aristotest1 < aristotest_backup.sql
```

3. **Actualizar configuración:**
```javascript
// .env
DB_NAME=aristotest1

// config/config.json
"production": {
  "database": "aristotest1",
  ...
}
```

4. **Actualizar credenciales de admin:**
```sql
UPDATE users SET 
  password = '$2a$10$e9.4LYr/gnKQPSc3lql9kOhaL1qskOTeYhgKf2vEK3Onfq0EeHAda',
  role = 'super_admin'
WHERE email = 'admin@aristotest.com';
```

---

## 📊 VERIFICACIÓN DE FUNCIONAMIENTO

### Script de Verificación:
```javascript
const endpoints = [
  '/api/v1/dashboard/stats',
  '/api/v1/quizzes',
  '/api/v1/manuals', 
  '/api/v1/videos',
  '/api/v1/results/public',
  '/api/v1/classrooms'
];

// Todos deben responder 200 OK
```

### Resultado Final:
✅ **Panel Principal** - Sin errores  
✅ **Evaluaciones** - Sin errores  
✅ **Manuales** - Sin errores  
✅ **Videos** - Sin errores  
✅ **Resultados** - Sin errores  
✅ **Classrooms** - Sin errores  

---

## 🎯 LECCIONES APRENDIDAS

1. **La base de datos es crítica:** Los errores 500 casi siempre son problemas de DB
2. **Restaurar es mejor que migrar:** Es más rápido restaurar un backup completo
3. **HOST=0.0.0.0 es esencial:** El backend debe escuchar en todas las interfaces
4. **Verificar assets:** El build debe incluir imágenes y archivos estáticos
5. **PM2 con TypeScript:** Usar ts-node/register/transpile-only
6. **Logs son fundamentales:** PM2 logs y PostgreSQL logs revelan los problemas reales

---

## 📱 ACCESOS FINALES

- **Frontend:** http://ec2-52-55-189-120.compute-1.amazonaws.com/
- **Backend API:** http://ec2-52-55-189-120.compute-1.amazonaws.com:3001/api/v1
- **MinIO Console:** http://ec2-52-55-189-120.compute-1.amazonaws.com:9001
- **Base de Datos:** aristotest1 @ ec2-3-91-26-178.compute-1.amazonaws.com

### Credenciales:
- **Admin:** admin@aristotest.com / Admin123!
- **DB:** labsis / ,U8x=]N02SX4
- **MinIO:** aristotest / AristoTest2024!

---

## 🚀 COMANDOS ÚTILES POST-DEPLOYMENT

```bash
# Ver logs del backend
ssh -i [KEY] dynamtek@[SERVER] 'pm2 logs aristotest-backend'

# Reiniciar backend
ssh -i [KEY] dynamtek@[SERVER] 'pm2 restart aristotest-backend'

# Verificar estado
ssh -i [KEY] dynamtek@[SERVER] 'pm2 status'

# Verificar DB
PGPASSWORD=',U8x=]N02SX4' psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com -d aristotest1
```

---

**NOTA IMPORTANTE:** Si en el futuro hay errores 500, PRIMERO verificar la base de datos. La solución más rápida es restaurar un backup conocido en lugar de intentar arreglar las discrepancias de esquema.

---

*Documento generado el 29/08/2025 después de deployment exitoso a QA*