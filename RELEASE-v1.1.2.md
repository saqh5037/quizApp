# RELEASE v1.1.2 - AristoTest

**Fecha:** 2026-01-21
**Commit:** 35d3202
**Tag:** v1.1.2
**GitHub Release:** https://github.com/saqh5037/quizApp/releases/tag/v1.1.2

---

## RESUMEN EJECUTIVO

Esta release incluye correcciones críticas que afectaban:
- **NUEVO v1.1.2:** Tiempo límite y porcentaje de aprobación no se guardaban en quizzes
- El sistema de build (Babel → tsc)
- El error "Quiz not found" (404) al crear/obtener quizzes
- La funcionalidad del dashboard para usuarios `super_admin`
- La generación de contenido con AI

**No requiere migraciones de base de datos.**

---

## CAMBIOS EN v1.1.2 (2026-01-21) - **CRÍTICO**

### Fix: Tiempo límite y porcentaje de aprobación no se guardaban

| Problema | Causa | Solución |
|----------|-------|----------|
| Al configurar `timeLimit` y `passPercentage` en un quiz, usaba valores por defecto | El INSERT/UPDATE en `quiz.simple.controller.ts` no incluía estos campos | Agregar `time_limit_minutes` y `pass_percentage` a las queries |

### Archivos Modificados en v1.1.2

```
backend/src/controllers/quiz.simple.controller.ts  # Agregar time_limit_minutes y pass_percentage
```

---

## CAMBIOS EN v1.1.1 (2026-01-20)

### Fix: "Quiz not found" (404) Error

| Problema | Causa | Solución |
|----------|-------|----------|
| Al crear un quiz y luego obtenerlo, devolvía 404 | La query SQL `WHERE tenant_id = :tenantId` fallaba con quizzes que tienen `tenant_id = NULL` | Cambiar a `(tenant_id = :tenantId OR tenant_id IS NULL)` |

### Fix: Sistema de Build

| Problema | Causa | Solución |
|----------|-------|----------|
| Babel no compilaba correctamente campos `declare` de TypeScript | Problema de configuración de presets | Cambiar a `tsc + scripts/fix-aliases.js` |

### Archivos Modificados en v1.1.1

```
backend/package.json                    # build: tsc + fix-aliases.js
backend/scripts/fix-aliases.js          # NUEVO: resuelve path aliases post-build
backend/src/controllers/quiz.controller.ts      # userId → creatorId
backend/src/controllers/quiz.simple.controller.ts # tenant_id NULL handling
```

---

## CAMBIOS INCLUIDOS

### Bug Fixes

| Issue | Descripción | Archivo |
|-------|-------------|---------|
| Dashboard stats = 0 | El dashboard mostraba 0 para usuarios `super_admin` | `dashboard.controller.ts` |
| title.trim() error | Error al generar resumen sin título | `ai-gemini.controller.ts` |

### Nuevas Funcionalidades

| Ruta | Método | Descripción |
|------|--------|-------------|
| `/api/v1/sessions` | GET | Lista todas las sesiones con paginación |
| `/api/v1/results/quiz/:quizId` | GET | Resultados de un quiz específico |

### Actualizaciones de AI

| Servicio | Cambio |
|----------|--------|
| `gemini.service.ts` | Modelo: `gemini-1.5-flash` → `gemini-2.5-flash` |
| `video-ai-analyzer.service.ts` | Modelo: `gemini-1.5-flash` → `gemini-2.5-flash` |
| `video-transcription.service.ts` | Modelo: `gemini-1.5-flash` → `gemini-2.5-flash` |

### Archivos Modificados (11 total)

```
backend/src/controllers/ai-gemini.controller.ts
backend/src/controllers/dashboard.controller.ts
backend/src/controllers/quiz.simple.controller.ts
backend/src/controllers/results.controller.ts
backend/src/controllers/session.controller.ts
backend/src/routes/results.routes.ts
backend/src/routes/session.routes.ts
backend/src/services/gemini.service.ts
backend/src/services/video-ai-analyzer.service.ts
backend/src/services/video-transcription.service.ts
docker-compose.infra.yml (nuevo)
```

---

## REQUISITOS DE INFRAESTRUCTURA

### Variables de Entorno (verificar en producción)

```bash
# CRÍTICO - Gemini AI
GEMINI_API_KEY=<clave_válida_de_google>
DEFAULT_AI_PROVIDER=gemini

# Base de datos (sin cambios)
DB_HOST=ec2-3-91-26-178.compute-1.amazonaws.com
DB_PORT=5432
DB_NAME=aristotest1
DB_USER=labsis
DB_PASSWORD=<contraseña_actual>

# MinIO (si usa videos)
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=<contraseña_actual>
MINIO_BUCKET_NAME=aristotest-videos
```

### Dependencias del Sistema

- Node.js 18+
- PostgreSQL 15
- Redis 7 (opcional)
- FFmpeg (`which ffmpeg` debe retornar `/usr/bin/ffmpeg`)

---

## MIGRACIONES DE BASE DE DATOS

**NO SE REQUIEREN MIGRACIONES**

Los cambios son solo en controladores y servicios. El schema de la base de datos no fue modificado.

---

## PROCEDIMIENTO DE DEPLOYMENT

### Paso 1: Conectar al servidor

```bash
ssh -i /path/to/labsisapp.pem dynamtek@52.55.189.120
```

### Paso 2: Pull de cambios

```bash
cd /home/dynamtek/aristoTEST
git fetch origin
git pull origin main
```

### Paso 3: Instalar dependencias y compilar

```bash
cd backend
npm install
npm run build
```

### Paso 4: Reiniciar aplicación

```bash
pm2 restart aristotest-backend
```

### Paso 5: Verificar logs

```bash
pm2 logs aristotest-backend --lines 50
```

---

## VERIFICACION POST-DEPLOYMENT

### 1. Health Check

```bash
curl http://localhost:3001/api/v1/
# Esperado: {"message":"AristoTest API","version":"1.0.0"...}
```

### 2. Obtener Token

```bash
TOKEN=$(curl -s -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@aristotest.com","password":"Admin1234"}' | jq -r '.data.accessToken')
echo $TOKEN
```

### 3. Crear Quiz con Tiempo y Porcentaje (CRÍTICO - fix principal v1.1.2)

```bash
# Crear quiz CON configuración de tiempo y porcentaje
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v1/quizzes \
  -d '{"title":"Test v1.1.2","timeLimitMinutes":30,"passPercentage":75,"isPublic":true}' | jq '{success, id: .data.id, time_limit: .data.time_limit_minutes, pass_pct: .data.pass_percentage}'
# Esperado: {success: true, id: <número>, time_limit: 30, pass_pct: 75}

# Obtener quiz (usar el ID del paso anterior)
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/quizzes/<ID> | jq '{success, time_limit: .data.time_limit_minutes, pass_pct: .data.pass_percentage}'
# Esperado: {success: true, time_limit: 30, pass_pct: 75} - NO valores por defecto!
```

### 4. Dashboard Stats (CRÍTICO - debe mostrar datos)

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/dashboard/stats | jq '.data | {totalQuizzes, totalSessions, totalParticipants}'
# Esperado: números > 0, NO todos en 0
```

### 4. Nueva Ruta: Sessions

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/sessions | jq '.pagination'
# Esperado: {page, limit, total, totalPages}
```

### 5. Nueva Ruta: Results por Quiz

```bash
curl -s -H "Authorization: Bearer $TOKEN" \
  http://localhost:3001/api/v1/results/quiz/1 | jq '.data.statistics'
# Esperado: {totalAttempts, uniqueParticipants, averageScore...}
```

### 6. Generar Resumen (probar fix de Gemini)

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v1/ai/manuals/5/generate-summary \
  -d '{"summaryType":"brief"}' | jq '{success, title: .data.title}'
# Esperado: {success: true, title: "Resumen de..."}
```

### 7. Chat con Manual (probar Gemini 2.5)

```bash
curl -s -X POST -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  http://localhost:3001/api/v1/ai/manuals/5/chat/start | jq '{success, sessionId: .data.sessionId}'
# Esperado: {success: true, sessionId: "uuid..."}
```

---

## CHECKLIST DE DEPLOYMENT

- [ ] SSH al servidor exitoso
- [ ] `git pull origin main` ejecutado
- [ ] `npm install` completado sin errores
- [ ] `npm run build` completado sin errores (nuevo build con tsc)
- [ ] `pm2 restart` ejecutado
- [ ] Health check responde correctamente
- [ ] Login funciona
- [ ] **CREAR QUIZ con timeLimit y passPercentage funciona** (fix v1.1.2)
- [ ] **Los valores de tiempo y porcentaje se guardan correctamente** (fix v1.1.2)
- [ ] **OBTENER QUIZ por ID funciona - NO 404** (fix v1.1.1)
- [ ] Dashboard stats muestra datos (NO todos 0)
- [ ] GET /sessions responde con paginación
- [ ] GET /results/quiz/:id responde con estadísticas
- [ ] Generación de resumen funciona sin error
- [ ] Chat con manual funciona
- [ ] Videos se reproducen (HLS streaming)

---

## ROLLBACK (si es necesario)

```bash
# En el servidor
cd /home/dynamtek/aristoTEST

# Volver al commit anterior (v1.1.1)
git checkout baef67b

# Reinstalar y recompilar
cd backend
npm install
npm run build

# Reiniciar
pm2 restart aristotest-backend

# Verificar
pm2 logs aristotest-backend --lines 20
```

---

## TROUBLESHOOTING

### Error: "Invalid credentials" en Gemini

```bash
# Verificar API key
grep GEMINI_API_KEY .env.production

# Probar API key manualmente
curl "https://generativelanguage.googleapis.com/v1beta/models?key=<TU_API_KEY>"
```

### Error: Dashboard sigue mostrando 0

```bash
# Verificar rol del usuario
psql -U labsis -d aristotest1 -c "SELECT id, email, role FROM users WHERE email='admin@aristotest.com';"
# El rol debe ser 'super_admin', 'admin', o 'teacher'
```

### Error: PM2 no inicia

```bash
# Ver estado
pm2 status

# Ver logs de error
pm2 logs aristotest-backend --err --lines 100

# Reiniciar forzado
pm2 delete aristotest-backend
pm2 start ecosystem.prod.config.js
```

---

## SOPORTE

- **Logs:** `pm2 logs aristotest-backend`
- **Estado:** `pm2 status`
- **Reiniciar:** `pm2 restart aristotest-backend`
- **Health:** `curl http://localhost:3001/api/v1/`

---

**Preparado por:** Claude Opus 4.5
**Fecha:** 2026-01-21
**Versión anterior:** v1.1.1 (baef67b)
