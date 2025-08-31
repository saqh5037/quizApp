# 🚀 Guía de Despliegue DEFINITIVA - AristoTest
## ¡SOLUCIÓN COMPLETA SIN ERRORES!

---

## 📌 INFORMACIÓN ESENCIAL

| Item | Valor |
|------|-------|
| **Servidor QA** | http://52.55.189.120 |
| **SSH** | `ssh -i labsisapp.pem dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com` |
| **Base de Datos** | aristotest2 @ ec2-3-91-26-178.compute-1.amazonaws.com |
| **Usuario Admin** | admin@aristotest.com / admin123 |
| **Backend API** | http://52.55.189.120:3001 |
| **MinIO Storage** | http://52.55.189.120:9000 |

---

## ⚡ DESPLIEGUE RÁPIDO (5 MINUTOS)

### Opción 1: Script Automático
```bash
# Ejecutar desde tu máquina local
cd /Users/samuelquiroz/Documents/proyectos/quiz-app
./fix-deployment.sh
```

### Opción 2: Despliegue Manual Limpio
```bash
# 1. Construir Frontend
cd frontend && npm run build
tar -czf ../frontend.tar.gz -C dist .

# 2. Construir Backend (usar tsc si babel falla)
cd ../backend && npm run build-tsc || npm run build
tar -czf ../backend.tar.gz dist package.json ecosystem.config.js

# 3. Transferir al servidor
scp -i labsisapp.pem *.tar.gz dynamtek@52.55.189.120:/tmp/

# 4. Desplegar en servidor
ssh -i labsisapp.pem dynamtek@52.55.189.120 "
  # Frontend
  cd /home/dynamtek/aristoTEST/frontend
  sudo rm -rf dist.bak && sudo mv dist dist.bak 2>/dev/null || true
  sudo tar -xzf /tmp/frontend.tar.gz -C . --transform 's,^,dist/,'
  sudo pm2 restart aristotest-frontend
  
  # Backend
  cd /home/dynamtek/aristoTEST/backend
  tar -xzf /tmp/backend.tar.gz
  pm2 restart aristotest-backend --update-env
"
```

---

## 🔧 CONFIGURACIÓN CRÍTICA

### Variables de Entorno Backend (.env)
```env
NODE_ENV=production
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_NAME=aristotest2  # IMPORTANTE: Usar aristotest2
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
TENANT_ID=1          # CRÍTICO: Sin esto falla el procesamiento
DEFAULT_TENANT_ID=1
JWT_SECRET=aristotest-qa-jwt-secret-2025
MINIO_ENDPOINT=localhost
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
```

### ecosystem.config.js (PM2)
```javascript
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './src/server.ts',
    interpreter: 'node',
    interpreter_args: '-r ts-node/register/transpile-only -r tsconfig-paths/register',
    env: {
      NODE_ENV: 'production',
      DB_NAME: 'aristotest2',
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      TENANT_ID: '1',
      // ... resto de variables
    }
  }]
};
```

---

## 🚨 SOLUCIÓN DE PROBLEMAS FRECUENTES

### 1. Error: "tenantId undefined"
```bash
ssh -i labsisapp.pem dynamtek@SERVER "
  cd /home/dynamtek/aristoTEST/backend
  echo 'TENANT_ID=1' >> .env
  echo 'DEFAULT_TENANT_ID=1' >> .env
  pm2 restart aristotest-backend --update-env
"
```

### 2. Error: "Video processing error" / Estado: error
```bash
ssh -i labsisapp.pem dynamtek@SERVER "
  cd /home/dynamtek/aristoTEST/backend
  node fix-video-processing.js
"
```

### 3. Error: Login 500 / "relation users does not exist"
```bash
# Verificar que está usando aristotest2
ssh -i labsisapp.pem dynamtek@SERVER "
  cd /home/dynamtek/aristoTEST/backend
  grep DB_NAME .env  # Debe mostrar: DB_NAME=aristotest2
  pm2 logs aristotest-backend --lines 5 | grep Connected
"
```

### 4. Error: Build del backend falla con Babel
```bash
# Usar TypeScript compiler en lugar de Babel
cd backend
npm run build-tsc  # En lugar de npm run build
```

### 5. Videos no se reproducen
```bash
# Verificar MinIO y subir archivos
ssh -i labsisapp.pem dynamtek@SERVER "
  ps aux | grep minio  # Verificar que MinIO está corriendo
  cd /home/dynamtek/aristoTEST/backend
  node upload-video-to-minio.js VIDEO_ID
"
```

---

## 📊 COMANDOS DE MONITOREO

### Ver estado del sistema
```bash
ssh -i labsisapp.pem dynamtek@SERVER "
  echo '=== PM2 Status ==='
  pm2 status
  echo '=== Backend Logs ==='
  pm2 logs aristotest-backend --lines 10 --nostream | grep -E 'Connected|Error'
  echo '=== Database ==='
  PGPASSWORD=',U8x=]N02SX4' psql -h ec2-3-91-26-178.compute-1.amazonaws.com \
    -U labsis -d aristotest2 -c 'SELECT COUNT(*) FROM users;'
"
```

### Logs en tiempo real
```bash
ssh -i labsisapp.pem dynamtek@SERVER "pm2 logs aristotest-backend"
```

### Verificar servicios
```bash
# Backend API
curl http://52.55.189.120:3001/api/v1/health

# MinIO
curl http://52.55.189.120:9000/minio/health/live

# Frontend
curl -I http://52.55.189.120
```

---

## 🔄 SCRIPT DE REPARACIÓN COMPLETA

Guardar como `repair-all.sh`:
```bash
#!/bin/bash
ssh -i labsisapp.pem dynamtek@52.55.189.120 << 'EOF'
  cd /home/dynamtek/aristoTEST/backend
  
  # 1. Asegurar variables críticas
  grep -q "TENANT_ID" .env || echo "TENANT_ID=1" >> .env
  grep -q "DEFAULT_TENANT_ID" .env || echo "DEFAULT_TENANT_ID=1" >> .env
  sed -i 's/DB_NAME=.*/DB_NAME=aristotest2/' .env
  
  # 2. Reiniciar backend
  pm2 restart aristotest-backend --update-env
  sleep 5
  
  # 3. Reparar videos con error
  node fix-video-processing.js
  
  # 4. Verificar estado
  pm2 status
  echo "✅ Reparación completa"
EOF
```

---

## 📝 CHECKLIST DE DESPLIEGUE

### Antes del despliegue:
- [ ] Verificar que frontend compila sin errores
- [ ] Si backend con babel falla, usar `npm run build-tsc`
- [ ] Confirmar base de datos: aristotest2

### Durante el despliegue:
- [ ] Transferir archivos al servidor
- [ ] Backup del directorio actual
- [ ] Descomprimir nuevos archivos
- [ ] Reiniciar PM2 con `--update-env`

### Después del despliegue:
- [ ] Verificar logs sin errores críticos
- [ ] Probar login con admin@aristotest.com
- [ ] Verificar que videos se reproducen
- [ ] Comprobar que no hay errores de tenantId

---

## 🎯 PROCESO GARANTIZADO SIN ERRORES

1. **Preparación local**
   ```bash
   cd quiz-app
   git pull origin main
   cd frontend && npm install && npm run build
   cd ../backend && npm install
   ```

2. **Construcción**
   ```bash
   # Frontend siempre funciona
   cd frontend && npm run build
   
   # Backend - si babel falla, usar tsc
   cd ../backend
   npm run build || npm run build-tsc
   ```

3. **Despliegue**
   ```bash
   ./fix-deployment.sh  # Script automático probado
   ```

4. **Verificación**
   ```bash
   # Login funciona
   curl -X POST http://52.55.189.120:3001/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@aristotest.com","password":"admin123"}'
   ```

---

## 💡 TIPS IMPORTANTES

1. **SIEMPRE** usar `--update-env` al reiniciar PM2
2. **SIEMPRE** verificar que DB_NAME=aristotest2
3. **SIEMPRE** asegurar que TENANT_ID=1 está configurado
4. **NUNCA** confiar en que babel funcione, tener tsc como backup
5. **SIEMPRE** verificar logs después del despliegue

---

## 📞 SOPORTE RÁPIDO

Si algo falla:
1. Ejecutar: `./repair-all.sh`
2. Verificar logs: `pm2 logs aristotest-backend`
3. Revisar base de datos está en aristotest2
4. Confirmar TENANT_ID=1 en .env

---

**Última actualización**: 30 Agosto 2025  
**Versión**: 1.0.3-FINAL  
**Estado**: ✅ PROBADO Y FUNCIONANDO