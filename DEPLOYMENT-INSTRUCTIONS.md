# 📚 INSTRUCCIONES DE USO - SCRIPTS DE DEPLOYMENT ARISTOTEST QA

## 🚀 SCRIPTS DISPONIBLES

### 1️⃣ **deploy-option1-clean.sh** - Despliegue Limpio desde Cero
### 2️⃣ **deploy-option2-inplace.sh** - Actualización In-Place 
### 3️⃣ **deploy-option3-bluegreen.sh** - Blue-Green Deployment
### 🔍 **verify-deployment.sh** - Verificación y Health Checks

---

## 📋 PREPARACIÓN INICIAL

### 1. Dar permisos de ejecución a los scripts
```bash
cd /Users/samuelquiroz/Documents/proyectos/quiz-app
chmod +x deploy-option1-clean.sh
chmod +x deploy-option2-inplace.sh
chmod +x deploy-option3-bluegreen.sh
chmod +x verify-deployment.sh
```

### 2. Verificar requisitos locales
```bash
# Verificar Node.js
node --version  # Debe ser v18+

# Verificar npm
npm --version

# Verificar SSH key
ls -la /Users/samuelquiroz/Desktop/certificados/labsisapp.pem

# Verificar branch
git branch
# Debe estar en: aristoTest250830
```

### 3. Actualizar código local
```bash
git pull origin aristoTest250830
```

---

## 🎯 OPCIÓN 1: DESPLIEGUE LIMPIO

### ¿Cuándo usar?
- Primera instalación
- Después de problemas graves
- Cuando necesitas empezar desde cero
- Cambios mayores en arquitectura

### Comando
```bash
./deploy-option1-clean.sh
```

### Características
- ✅ Backup completo del deployment actual
- ✅ Limpieza total del directorio
- ✅ Build local completo
- ✅ Configuración nueva de servicios
- ✅ Rollback automático si falla
- ⏱️ Tiempo estimado: 10-15 minutos

### Proceso
1. Pre-checks (SSH, espacio, DB)
2. Backup completo a `/tmp/aristotest_backup_[timestamp]`
3. Build frontend y backend local
4. Transfer de archivos (~100MB)
5. Setup completo en servidor
6. Configuración de base de datos
7. Inicio de servicios (PM2, MinIO, Nginx)
8. Health checks exhaustivos

### Si algo falla
- El script hace rollback automático
- Revisa el log: `deployment_[timestamp].log`
- Puedes re-ejecutar sin problemas

---

## 🔄 OPCIÓN 2: ACTUALIZACIÓN IN-PLACE

### ¿Cuándo usar?
- Actualizaciones de código menores
- Hotfixes urgentes
- Cuando quieres preservar datos/uploads
- Actualizaciones frecuentes

### Comando
```bash
./deploy-option2-inplace.sh
```

### Características
- ✅ Sin downtime (hot reload)
- ✅ Preserva configuraciones (.env)
- ✅ Preserva uploads y storage
- ✅ Build optimizado (solo cambios)
- ✅ Rollback rápido disponible
- ⏱️ Tiempo estimado: 3-5 minutos

### Proceso
1. Detecta deployment existente
2. Backup incremental ligero
3. Build solo si hay cambios
4. Transfer incremental
5. Update sin borrar datos
6. Hot reload con PM2
7. Validación rápida

### Si algo falla
- Ejecuta rollback manual si lo pregunta
- Los backups se mantienen en `.backup.[timestamp]`
- Puedes revertir manualmente

---

## 🔵🟢 OPCIÓN 3: BLUE-GREEN DEPLOYMENT

### ¿Cuándo usar?
- Actualizaciones críticas
- Cuando necesitas rollback instantáneo
- Testing en producción antes de switch
- Máxima seguridad en deployment

### Comando
```bash
./deploy-option3-bluegreen.sh
```

### Características
- ✅ Zero downtime garantizado
- ✅ Testing completo antes de switch
- ✅ Rollback instantáneo (< 10 segundos)
- ✅ Mantiene 2 ambientes paralelos
- ✅ Switch atómico de tráfico
- ⏱️ Tiempo estimado: 8-12 minutos

### Proceso
1. Detecta ambiente actual (Blue o Green)
2. Prepara ambiente alternativo
3. Deploy completo en nuevo ambiente
4. Testing en puerto 3002
5. Confirmación manual para switch
6. Switch de Nginx (instantáneo)
7. Ambiente anterior queda en standby

### Estados posibles
```
BLUE (aristoTEST) ← Producción actual
GREEN (aristoTEST_new) ← Nueva versión

Después del switch:
BLUE (aristoTEST) ← Standby para rollback
GREEN (aristoTEST_new) ← Nueva producción
```

### Rollback instantáneo
Si algo sale mal después del switch:
```bash
# El script pregunta automáticamente, o ejecuta:
ssh -i labsisapp.pem dynamtek@52.55.189.120 "
  pm2 restart aristotest-backend
  sudo nginx -s reload
"
```

---

## 🔍 VERIFICACIÓN Y HEALTH CHECKS

### Comando
```bash
./verify-deployment.sh
```

### ¿Qué verifica?
1. **Infraestructura**: SSH, disco, memoria
2. **Servicios**: PM2, Nginx, MinIO, DB
3. **Endpoints básicos**: Frontend, API, Socket.io
4. **Autenticación**: Login, JWT, endpoints protegidos
5. **Endpoints críticos**: Quizzes, Sessions, Videos
6. **AI Features**: Servicios de AI si están activos
7. **Base de datos**: Tablas, usuario admin, tenant
8. **Performance**: Tiempo de respuesta, concurrencia
9. **Seguridad**: CORS, headers, SQL injection

### Output
```
✅ Tests exitosos: 45/50
⚠️ Advertencias: 3
❌ Tests fallidos: 2
📊 Tasa de éxito: 90%

Reporte guardado en: verification_report_[timestamp].txt
```

---

## 🆘 SOLUCIÓN DE PROBLEMAS COMUNES

### Error: "tenantId undefined"
```bash
# Ejecuta manualmente:
ssh -i /Users/samuelquiroz/Desktop/certificados/labsisapp.pem dynamtek@52.55.189.120
cd /home/dynamtek/aristoTEST/backend
echo "TENANT_ID=1" >> .env
echo "DEFAULT_TENANT_ID=1" >> .env
pm2 restart aristotest-backend --update-env
```

### Error: "Cannot connect to database"
```bash
# Verifica que use aristotest2, NO aristotest:
ssh -i labsisapp.pem dynamtek@52.55.189.120
cd /home/dynamtek/aristoTEST/backend
grep DB_NAME .env
# Debe mostrar: DB_NAME=aristotest2
```

### Error: Build con Babel falla
```bash
# El script automáticamente usa tsc como fallback
# Si falla manualmente:
cd backend
npm run build-tsc  # en lugar de npm run build
```

### Error: Puerto 3001 ocupado
```bash
# Verificar qué está usando el puerto:
ssh -i labsisapp.pem dynamtek@52.55.189.120
sudo lsof -i :3001
pm2 list
pm2 delete all
pm2 start ecosystem.config.js
```

### Videos no se reproducen
```bash
# Verificar MinIO:
ssh -i labsisapp.pem dynamtek@52.55.189.120
ps aux | grep minio
# Si no está corriendo:
cd /home/dynamtek/aristoTEST/backend
nohup minio server ./storage/minio-data --address :9000 --console-address :9001 &
```

---

## 📊 COMPARACIÓN DE OPCIONES

| Característica | Opción 1 (Clean) | Opción 2 (In-Place) | Opción 3 (Blue-Green) |
|---------------|------------------|---------------------|----------------------|
| **Downtime** | 5-10 min | < 1 min | 0 (zero) |
| **Riesgo** | Bajo (con backup) | Medio | Muy bajo |
| **Rollback** | 5 min (restaurar backup) | 1 min | < 10 seg |
| **Preserva datos** | No | Sí | Sí |
| **Complejidad** | Baja | Media | Alta |
| **Uso de disco** | Normal | Normal | Doble |
| **Ideal para** | Problemas graves | Actualizaciones rápidas | Cambios críticos |

---

## 🔐 INFORMACIÓN DE ACCESO

### SSH
```bash
ssh -i /Users/samuelquiroz/Desktop/certificados/labsisapp.pem \
    dynamtek@ec2-52-55-189-120.compute-1.amazonaws.com
```

### URLs de Servicios
- **Frontend**: http://52.55.189.120
- **Backend API**: http://52.55.189.120:3001
- **MinIO Console**: http://52.55.189.120:9001
  - Usuario: aristotest
  - Password: AristoTest2024!

### Base de Datos
- **Host**: ec2-3-91-26-178.compute-1.amazonaws.com
- **Database**: aristotest2 (¡NO aristotest!)
- **Usuario**: labsis
- **Password**: ,U8x=]N02SX4

### Usuario Admin Web
- **Email**: admin@aristotest.com
- **Password**: admin123

---

## 📝 LOGS Y MONITOREO

### Ver logs en tiempo real
```bash
# Logs de PM2
ssh -i labsisapp.pem dynamtek@52.55.189.120 "pm2 logs aristotest-backend"

# Logs de Nginx
ssh -i labsisapp.pem dynamtek@52.55.189.120 "sudo tail -f /var/log/nginx/error.log"

# Logs de deployment
cat deployment_*.log
cat verification_report_*.txt
```

### Monitoreo de servicios
```bash
# Estado de PM2
ssh -i labsisapp.pem dynamtek@52.55.189.120 "pm2 status"

# Uso de recursos
ssh -i labsisapp.pem dynamtek@52.55.189.120 "pm2 monit"

# Espacio en disco
ssh -i labsisapp.pem dynamtek@52.55.189.120 "df -h"

# Memoria
ssh -i labsisapp.pem dynamtek@52.55.189.120 "free -h"
```

---

## ✅ CHECKLIST PRE-DEPLOYMENT

- [ ] Código actualizado (`git pull`)
- [ ] Branch correcto (aristoTest250830)
- [ ] Tests locales pasan
- [ ] SSH key disponible
- [ ] Backup de datos importantes
- [ ] Ventana de mantenimiento coordinada
- [ ] Script con permisos de ejecución
- [ ] Espacio en disco suficiente (local y remoto)

---

## 🚨 CONTACTO DE EMERGENCIA

Si algo sale mal y necesitas ayuda:

1. **Primero**: Ejecuta `./verify-deployment.sh` para diagnóstico
2. **Segundo**: Revisa los logs del deployment
3. **Tercero**: Intenta rollback según la opción usada
4. **Cuarto**: Contacta al equipo DevOps

---

**Última actualización**: 31 de Agosto 2025  
**Versión de scripts**: 1.0.0  
**Ambiente**: QA (52.55.189.120)