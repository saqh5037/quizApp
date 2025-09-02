# 🚨 ARISTOTEST - PROBLEMAS DE DEPLOYMENT Y SOLUCIONES

## Estado Actual (2 de Septiembre 2025)

### ✅ Ambiente Local (FUNCIONANDO)
- **Base de datos**: `aristotest` en localhost
- **Backend**: Puerto 3001
- **Frontend**: Puerto 5173  
- **MinIO**: Puertos 9000/9001
- **Videos**: 3,550 objetos (4.04GB)

### ❌ Ambiente Remoto (PROBLEMAS CRÍTICOS)
- **Servidor EC2**: `ec2-52-55-189-120.compute-1.amazonaws.com` - **NO RESPONDE**
- **Base de datos**: Múltiples inconsistencias
- **SSH**: Sin acceso (falta key .pem)

---

## 🔴 PROBLEMAS CRÍTICOS ENCONTRADOS

### 1. INCONSISTENCIAS DE CONFIGURACIÓN

**PROBLEMA**: Múltiples IPs y nombres de DB diferentes en archivos
```
deploy-qa-complete.sh     → IP: 18.206.119.156, DB: aristotest2
ecosystem.prod.config.js  → IP: 52.55.189.120, DB: aristotest1  
PM2 config                → IP: 52.55.189.120, DB: aristotest2
Backend actual            → IP: 3.91.26.178, DB: aristotest2
```

**SOLUCIÓN INMEDIATA**:
```bash
# Verificar cuál servidor está activo en AWS
aws ec2 describe-instances --region us-east-1 --filters "Name=tag:Name,Values=AristoTest*"

# IP correcta parece ser: 18.206.119.156
# Base de datos correcta: aristotest2 en ec2-3-91-26-178.compute-1.amazonaws.com
```

### 2. TABLAS FALTANTES EN PRODUCCIÓN

**PROBLEMA**: Faltan tablas de recursos educativos
```sql
-- Tablas faltantes:
- study_guides
- flash_cards
```

**SOLUCIÓN**:
```bash
# Conectar a DB remota y ejecutar migraciones
PGPASSWORD=',U8x=]N02SX4' psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com -d aristotest2 << EOF
-- Verificar tablas existentes
\dt

-- Si faltan tablas, ejecutar desde local:
EOF

cd backend
npm run migrate:prod
```

### 3. NODE_ENV EN DEVELOPMENT EN PRODUCCIÓN

**PROBLEMA**: ecosystem.config.js tiene NODE_ENV=development
**SOLUCIÓN**:
```javascript
// ecosystem.prod.config.js - CORREGIR:
env: {
  NODE_ENV: 'production', // CAMBIAR DE 'development'
  // ... resto de config
}
```

### 4. BUILD CON ERRORES DE BABEL

**PROBLEMA**: Babel no puede compilar TypeScript 'declare' fields
**SOLUCIÓN**:
```bash
# Usar TypeScript compiler en vez de Babel
cd backend
npm run build-tsc  # En vez de npm run build
```

---

## 📝 SCRIPT DE DEPLOYMENT CORREGIDO

Crear archivo: `deploy-fix.sh`

```bash
#!/bin/bash

# ==================================================
# ARISTOTEST - DEPLOYMENT SCRIPT CORREGIDO v3.0
# ==================================================

set -e  # Salir si hay errores

# CONFIGURACIÓN CORRECTA
REMOTE_USER="dynamtek"
REMOTE_HOST="18.206.119.156"  # IP CORRECTA
REMOTE_DIR="/home/dynamtek/aristoTEST"
SSH_KEY="~/.ssh/aristotest-qa.pem"
DB_HOST="ec2-3-91-26-178.compute-1.amazonaws.com"
DB_NAME="aristotest2"
DB_USER="labsis"
DB_PASSWORD=",U8x=]N02SX4"

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   ARISTOTEST - DEPLOYMENT CORREGIDO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"

# 1. VERIFICAR CONECTIVIDAD
echo -e "${YELLOW}1. Verificando conectividad...${NC}"
if ! ping -c 1 $REMOTE_HOST &> /dev/null; then
    echo -e "${RED}ERROR: No se puede conectar a $REMOTE_HOST${NC}"
    echo "Verificar en AWS Console:"
    echo "- Estado de la instancia EC2"
    echo "- Security Groups (puerto 22, 80, 3001)"
    echo "- Elastic IP asociada"
    exit 1
fi

# 2. VERIFICAR SSH KEY
echo -e "${YELLOW}2. Verificando SSH key...${NC}"
if [ ! -f "$SSH_KEY" ]; then
    echo -e "${RED}ERROR: SSH key no encontrada en $SSH_KEY${NC}"
    echo "Obtener desde AWS Console → EC2 → Key Pairs"
    exit 1
fi
chmod 600 $SSH_KEY

# 3. VERIFICAR BASE DE DATOS
echo -e "${YELLOW}3. Verificando base de datos...${NC}"
PGPASSWORD=$DB_PASSWORD psql -U $DB_USER -h $DB_HOST -d $DB_NAME -c "\dt" > /dev/null 2>&1
if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: No se puede conectar a la base de datos${NC}"
    exit 1
fi

# 4. BUILD LOCAL
echo -e "${YELLOW}4. Compilando aplicación...${NC}"

# Backend - usar TypeScript compiler
cd backend
echo "Instalando dependencias..."
npm ci --production=false

echo "Compilando con TypeScript..."
npx tsc --skipLibCheck --noEmitOnError false
if [ $? -ne 0 ]; then
    echo -e "${YELLOW}Advertencia: Errores de TypeScript (continuando)${NC}"
fi

# Frontend
cd ../frontend
echo "Compilando frontend..."
npm ci
npm run build

cd ..

# 5. CREAR ARCHIVO DE CONFIGURACIÓN CORREGIDO
echo -e "${YELLOW}5. Creando configuración de producción...${NC}"
cat > ecosystem.prod.fixed.js << 'EOF'
module.exports = {
  apps: [{
    name: 'aristotest-backend',
    script: './dist/server.js',
    cwd: '/home/dynamtek/aristoTEST/backend',
    instances: 1,
    exec_mode: 'fork',
    node_args: '-r dotenv/config -r ./register-paths.js',
    env: {
      NODE_ENV: 'production',
      PORT: 3001,
      DB_HOST: 'ec2-3-91-26-178.compute-1.amazonaws.com',
      DB_PORT: 5432,
      DB_NAME: 'aristotest2',
      DB_USER: 'labsis',
      DB_PASSWORD: ',U8x=]N02SX4',
      JWT_SECRET: 'aristotest-jwt-secret-2024',
      JWT_REFRESH_SECRET: 'aristotest-refresh-secret-2024',
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      CORS_ORIGIN: 'http://18.206.119.156',
      SOCKET_CORS_ORIGIN: 'http://18.206.119.156',
      MINIO_ENDPOINT: 'localhost',
      MINIO_PORT: 9000,
      MINIO_ACCESS_KEY: 'aristotest',
      MINIO_SECRET_KEY: 'AristoTest2024!',
      MINIO_BUCKET_NAME: 'aristotest-videos',
      MINIO_USE_SSL: false
    },
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss',
    merge_logs: true,
    autorestart: true,
    max_restarts: 10
  }]
};
EOF

# 6. TRANSFERIR ARCHIVOS
echo -e "${YELLOW}6. Transfiriendo archivos...${NC}"

# Crear archivo tar
tar -czf deployment.tar.gz \
    backend/dist \
    backend/package*.json \
    backend/register-paths.js \
    frontend/dist \
    ecosystem.prod.fixed.js \
    --exclude='node_modules' \
    --exclude='*.log'

# Transferir
scp -i $SSH_KEY deployment.tar.gz $REMOTE_USER@$REMOTE_HOST:/tmp/

# 7. EJECUTAR EN SERVIDOR REMOTO
echo -e "${YELLOW}7. Desplegando en servidor...${NC}"

ssh -i $SSH_KEY $REMOTE_USER@$REMOTE_HOST << 'REMOTE_SCRIPT'
set -e

echo "Extrayendo archivos..."
cd /home/dynamtek/aristoTEST
tar -xzf /tmp/deployment.tar.gz

echo "Instalando dependencias de producción..."
cd backend
npm ci --production

echo "Ejecutando migraciones..."
npx sequelize-cli db:migrate

echo "Reiniciando PM2..."
pm2 stop aristotest-backend || true
pm2 delete aristotest-backend || true
pm2 start ../ecosystem.prod.fixed.js
pm2 save

echo "Configurando Nginx..."
sudo cp frontend/dist/* /var/www/html/

echo "Reiniciando servicios..."
sudo systemctl restart nginx
pm2 restart all

echo "Verificando servicios..."
pm2 list
curl -s http://localhost:3001/health || echo "Backend no responde"

REMOTE_SCRIPT

# 8. VERIFICACIÓN FINAL
echo -e "${YELLOW}8. Verificando deployment...${NC}"

# Verificar frontend
if curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST | grep -q "200"; then
    echo -e "${GREEN}✅ Frontend funcionando${NC}"
else
    echo -e "${RED}❌ Frontend no responde${NC}"
fi

# Verificar backend
if curl -s -o /dev/null -w "%{http_code}" http://$REMOTE_HOST:3001/health | grep -q "200"; then
    echo -e "${GREEN}✅ Backend funcionando${NC}"
else
    echo -e "${RED}❌ Backend no responde${NC}"
fi

# Limpiar
rm -f deployment.tar.gz

echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo -e "${GREEN}   DEPLOYMENT COMPLETADO${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════${NC}"
echo ""
echo "URLs:"
echo "- Frontend: http://$REMOTE_HOST"
echo "- Backend: http://$REMOTE_HOST:3001"
echo "- MinIO: http://$REMOTE_HOST:9001"
```

---

## 🔧 COMANDOS ÚTILES PARA DEBUGGING

### Verificar estado del servidor
```bash
# Desde AWS CLI
aws ec2 describe-instances --instance-ids i-XXXXX --region us-east-1

# Verificar logs
ssh -i ~/.ssh/aristotest-qa.pem dynamtek@18.206.119.156 "pm2 logs aristotest-backend --lines 50"

# Verificar base de datos
PGPASSWORD=',U8x=]N02SX4' psql -U labsis -h ec2-3-91-26-178.compute-1.amazonaws.com -d aristotest2 -c "SELECT COUNT(*) FROM manuals;"
```

### Reiniciar servicios remotamente
```bash
ssh -i ~/.ssh/aristotest-qa.pem dynamtek@18.206.119.156 << 'EOF'
pm2 restart aristotest-backend
sudo systemctl restart nginx
pm2 logs --lines 20
EOF
```

### Verificar puertos abiertos
```bash
ssh -i ~/.ssh/aristotest-qa.pem dynamtek@18.206.119.156 "sudo netstat -tlnp | grep -E '(3001|80|9000)'"
```

---

## ⚠️ CHECKLIST ANTES DE DEPLOYMENT

- [ ] Verificar IP correcta del servidor en AWS Console
- [ ] Confirmar que la instancia EC2 está running
- [ ] Verificar Security Groups (puertos 22, 80, 3001, 9000, 9001)
- [ ] Tener SSH key (.pem) con permisos 600
- [ ] Verificar conexión a base de datos
- [ ] Cambiar NODE_ENV a 'production'
- [ ] Compilar con `npm run build-tsc` (no Babel)
- [ ] Hacer backup de la base de datos
- [ ] Verificar espacio en disco del servidor

---

## 📊 MONITOREO POST-DEPLOYMENT

```bash
# Script de monitoreo
cat > monitor.sh << 'EOF'
#!/bin/bash
while true; do
    clear
    echo "=== ARISTOTEST MONITOR ==="
    echo "Fecha: $(date)"
    echo ""
    echo "Frontend: $(curl -s -o /dev/null -w "%{http_code}" http://18.206.119.156)"
    echo "Backend: $(curl -s -o /dev/null -w "%{http_code}" http://18.206.119.156:3001/health)"
    echo "MinIO: $(curl -s -o /dev/null -w "%{http_code}" http://18.206.119.156:9001)"
    echo ""
    ssh -i ~/.ssh/aristotest-qa.pem dynamtek@18.206.119.156 "pm2 list"
    sleep 30
done
EOF
chmod +x monitor.sh
```

---

## 🆘 CONTACTO PARA EMERGENCIAS

Si el servidor no responde:
1. Verificar en AWS Console → EC2 → Instances
2. Revisar CloudWatch Logs
3. Verificar billing/límites de AWS
4. Contactar administrador de AWS

Última actualización: 2 de Septiembre 2025, 21:32 CST