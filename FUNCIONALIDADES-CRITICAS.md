# FUNCIONALIDADES CRÍTICAS - VERIFICACIÓN

## 🔴 FUNCIONALIDADES QUE DEBEN FUNCIONAR

### 1. VIDEOS INTERACTIVOS
- ✅ Subir videos (MP4)
- ✅ Procesamiento a HLS (360p, 480p, 720p)
- ✅ Generación de capa interactiva con IA
- ✅ Preguntas automáticas con Gemini
- ✅ Evaluación pública sin autenticación
- ✅ Cálculo correcto de puntuaciones

### 2. EVALUACIONES/QUIZZES
- ✅ Crear/editar quizzes
- ✅ Sesiones en vivo con código QR
- ✅ Participación anónima
- ✅ Resultados en tiempo real

### 3. MANUALES PDF
- ✅ Subir y procesar PDFs
- ✅ Chat con IA sobre contenido
- ✅ Generación de quizzes desde PDFs

### 4. MULTI-TENANT
- ✅ Aislamiento por organización
- ✅ Gestión de usuarios por tenant

## 📍 URLs CRÍTICAS A VERIFICAR

### Frontend (puerto 5173)
- `/dashboard` - Dashboard principal
- `/videos` - Biblioteca de videos
- `/videos/:id/management` - Gestión video interactivo
- `/videos/:id/public-interactive` - Video público
- `/quizzes` - Gestión de evaluaciones
- `/manuals` - Manuales PDF

### Backend API (puerto 3001)
- `/api/v1/videos` - CRUD videos
- `/api/v1/interactive-video/*` - Videos interactivos
- `/api/v1/quizzes` - Evaluaciones
- `/api/v1/manuals` - Manuales
- `/api/v1/auth` - Autenticación

## 🔧 CONFIGURACIÓN LOCAL ACTUAL

### Variables de entorno requeridas:
```
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=aristotest
DB_PASSWORD=AristoTest2024

MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!

GEMINI_API_KEY=[tu-api-key]

JWT_SECRET=[secret]
JWT_REFRESH_SECRET=[refresh-secret]
```

### Servicios locales:
- PostgreSQL: puerto 5432
- MinIO: puerto 9000 (API), 9001 (Console)
- Backend: puerto 3001
- Frontend: puerto 5173

## ⚠️ PUNTOS DE ATENCIÓN

1. **Videos procesados**: Están en `backend/storage/processed/`
2. **MinIO data**: En `backend/storage/minio-data/`
3. **Base de datos**: PostgreSQL, NO SQLite
4. **Autenticación**: JWT con refresh tokens

## 🚀 COMANDOS DE VERIFICACIÓN

```bash
# Verificar backend
curl http://localhost:3001/api/v1/health

# Verificar videos
curl http://localhost:3001/api/v1/videos

# Verificar BD
PGPASSWORD=AristoTest2024 psql -U aristotest -d aristotest -h localhost -c "\dt"
```

Fecha backup: $(date +%Y-%m-%d)