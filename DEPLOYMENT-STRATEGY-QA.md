# 🚀 Estrategia de Deployment a QA - AristoTest

## 📋 Estado Actual
- **Fecha**: 29 de Agosto 2025
- **Versión funcionando**: Backup del 28/08 con todas las funcionalidades
- **Branch actual**: feature/interactive-videos-v1
- **Repositorio**: https://github.com/saqh5037/quizApp/

## ✅ Funcionalidades Verificadas
1. ✅ Sistema de Quizzes interactivos
2. ✅ Manuales Inteligentes con IA (Google Gemini)
3. ✅ Videos con procesamiento HLS
4. ✅ Videos Interactivos con capas de IA
5. ✅ Multi-tenancy
6. ✅ Chat con documentos PDF
7. ✅ Generación automática de quizzes

## 🎯 Estrategia Recomendada

### Opción 1: Branch QA Limpio (RECOMENDADO)
```bash
# 1. Crear nuevo branch desde main
git checkout main
git pull origin main
git checkout -b qa/release-1.1.0

# 2. Copiar código del backup verificado
cp -r /Users/samuelquiroz/Documents/proyectos/quiz-app-backup-20250828-104847/* .

# 3. Excluir archivos no necesarios
git reset
git add --all --except backend/storage/minio-data
git add --all --except backend/node_modules
git add --all --except frontend/node_modules
git add --all --except backend/dist
git add --all --except frontend/dist

# 4. Commit organizado
git commit -m "feat: Release 1.1.0 - Sistema completo con IA integrada

- Manuales inteligentes con chat IA
- Videos interactivos con capas auto-evaluativas
- Procesamiento HLS para streaming
- Multi-tenancy implementado
- Generación automática de quizzes desde PDFs"

# 5. Push a GitHub
git push origin qa/release-1.1.0
```

### Opción 2: Sincronizar con Branch Actual
```bash
# 1. Guardar cambios actuales
git stash

# 2. Crear backup del estado actual
cp -r . ../quiz-app-current-backup

# 3. Sincronizar con el backup funcional
rsync -av --exclude='.git' --exclude='node_modules' --exclude='dist' \
  /Users/samuelquiroz/Documents/proyectos/quiz-app-backup-20250828-104847/ .

# 4. Revisar cambios
git status
git diff

# 5. Commit selectivo
git add -p  # Revisar cada cambio
git commit -m "sync: Actualizar con versión estable del 28/08"
```

## 📦 Preparación para QA

### 1. Archivos de Configuración
```bash
# Crear .env.qa en backend
cat > backend/.env.qa << EOF
NODE_ENV=production
PORT=3001
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_NAME=aristotest
DB_USER=labsis
DB_PASSWORD=,U8x=]N02SX4
JWT_SECRET=qa-jwt-secret-change-in-production
GEMINI_API_KEY=AIzaSyAGlwn2nDECzKnqRYqHo4hVUlNqGMsp1mw
MINIO_ENDPOINT=ec2-52-55-189-120.compute-1.amazonaws.com
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
EOF

# Crear .env.production en frontend
cat > frontend/.env.production << EOF
VITE_API_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
VITE_SOCKET_URL=http://ec2-52-55-189-120.compute-1.amazonaws.com:3001
EOF
```

### 2. Scripts de Deployment
```bash
# Script mejorado deploy-qa.sh
#!/bin/bash
SERVER="ec2-52-55-189-120.compute-1.amazonaws.com"
USER="dynamtek"
KEY="/Users/samuelquiroz/Desktop/certificados/labsisapp.pem"

# Build frontend
cd frontend && npm run build && cd ..

# Build backend
cd backend && npm run build && cd ..

# Deploy
rsync -avz --exclude='node_modules' --exclude='.git' \
  -e "ssh -i $KEY" \
  ./backend/ $USER@$SERVER:/home/dynamtek/aristotest-backend/

rsync -avz -e "ssh -i $KEY" \
  ./frontend/dist/ $USER@$SERVER:/var/www/aristotest/

# Restart services
ssh -i $KEY $USER@$SERVER "cd /home/dynamtek/aristotest-backend && npm install --production && pm2 restart aristotest-backend"
```

## 🔒 Consideraciones de Seguridad

### Antes de subir a GitHub:
1. ✅ Verificar que no hay API keys hardcodeadas
2. ✅ Excluir archivos .env del commit
3. ✅ Limpiar archivos de storage/minio-data
4. ✅ Remover logs y archivos temporales

### Archivos a excluir (.gitignore):
```
# Environment
.env
.env.*
!.env.example

# Storage
backend/storage/
backend/uploads/
backend/logs/
backend/dist/
frontend/dist/

# Dependencies
node_modules/
package-lock.json

# OS
.DS_Store
Thumbs.db

# MinIO Data
backend/storage/minio-data/
```

## 📝 Checklist Pre-Deployment

- [ ] Backup del código actual
- [ ] Tests locales pasando
- [ ] Variables de entorno configuradas
- [ ] Base de datos migrada
- [ ] MinIO configurado en servidor
- [ ] Nginx configurado correctamente
- [ ] PM2 ecosystem configurado
- [ ] CORS configurado para dominio QA
- [ ] SSL/HTTPS configurado (opcional para QA)

## 🚦 Proceso de Deployment

### Fase 1: Preparación Local
1. Crear branch QA
2. Sincronizar código del backup
3. Configurar variables de entorno
4. Hacer build de producción
5. Probar localmente con build

### Fase 2: Push a GitHub
1. Review de código
2. Commit organizado
3. Push a branch qa/release-1.1.0
4. Crear Pull Request (opcional)

### Fase 3: Deployment a Servidor
1. Conectar al servidor AWS
2. Pull del código desde GitHub
3. Instalar dependencias
4. Configurar PM2
5. Reiniciar servicios
6. Verificar funcionamiento

## 🔧 Comandos Útiles

```bash
# Ver diferencias entre directorios
diff -rq quiz-app/ quiz-app-backup-20250828-104847/

# Sincronizar excluyendo archivos
rsync -av --exclude='.git' --exclude='node_modules' source/ dest/

# Verificar servicios en servidor
ssh -i $KEY $USER@$SERVER "pm2 status"

# Ver logs en servidor
ssh -i $KEY $USER@$SERVER "pm2 logs aristotest-backend --lines 100"

# Restart con nueva configuración
ssh -i $KEY $USER@$SERVER "pm2 restart ecosystem.config.js --update-env"
```

## ⚠️ Problemas Conocidos

1. **CORS en QA**: Configurar para permitir dominio específico
2. **MinIO en servidor**: Verificar que esté instalado y configurado
3. **FFmpeg**: Necesario para procesamiento de videos
4. **PostgreSQL**: Verificar conexión desde servidor QA

## 📊 Métricas de Éxito

- [ ] Login funcionando
- [ ] Upload de manuales exitoso
- [ ] Chat con IA respondiendo
- [ ] Videos reproduciéndose con HLS
- [ ] Capas interactivas funcionando
- [ ] Generación de quizzes desde PDFs

## 🆘 Rollback Plan

Si algo sale mal:
```bash
# En servidor
pm2 stop aristotest-backend
cd /home/dynamtek/
mv aristotest-backend aristotest-backend-failed
mv aristotest-backend-backup aristotest-backend
pm2 start aristotest-backend
```

---

**Última actualización**: 29 de Agosto 2025
**Preparado por**: Claude AI Assistant