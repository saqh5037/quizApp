# AristoTest - Documentación Completa del Proyecto

## 📌 Información General

**Nombre del Proyecto:** AristoTest  
**Versión:** 1.0.3  
**Fecha de Documentación:** 31 de Agosto de 2024  
**Estado:** Listo para QA Deployment  

## 🚀 Descripción del Sistema

AristoTest es una plataforma educativa interactiva multi-tenant que combina evaluaciones en tiempo real, gestión de contenido multimedia, procesamiento de documentos PDF con IA, y generación automática de recursos educativos. El sistema está diseñado para instituciones educativas que buscan digitalizar y mejorar sus procesos de enseñanza y evaluación.

## 🏗️ Arquitectura Técnica

### Stack Tecnológico

#### Backend
- **Framework:** Node.js + Express.js
- **Base de Datos:** PostgreSQL 14+
- **ORM:** Sequelize 6
- **Autenticación:** JWT (jsonwebtoken)
- **Tiempo Real:** Socket.io
- **IA:** Google Gemini AI (gemini-1.5-flash)
- **Almacenamiento:** MinIO (S3-compatible)
- **Procesamiento PDF:** pdf-parse
- **Video:** FFmpeg + HLS streaming

#### Frontend
- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite
- **Estado:** Zustand + React Query
- **Routing:** React Router v6
- **Estilos:** Tailwind CSS
- **Componentes:** Custom + Lucide Icons
- **Video Player:** Video.js
- **Animaciones:** Framer Motion
- **Gráficos:** Chart.js + Recharts

### Estructura del Proyecto

```
quiz-app/
├── backend/
│   ├── src/
│   │   ├── controllers/      # Lógica de negocio
│   │   ├── models/          # Modelos Sequelize
│   │   ├── routes/          # Endpoints API
│   │   ├── services/        # Servicios (Gemini AI, MinIO)
│   │   ├── middleware/      # Auth, tenant, validación
│   │   ├── socket/          # Handlers WebSocket
│   │   └── validators/      # Esquemas de validación
│   ├── migrations/          # Migraciones de BD
│   ├── scripts/            # Scripts de deployment
│   └── storage/            # Archivos y videos
│
├── frontend/
│   ├── src/
│   │   ├── components/      # Componentes reutilizables
│   │   ├── pages/          # Páginas de la aplicación
│   │   ├── services/       # Servicios API
│   │   ├── contexts/       # Contextos React
│   │   ├── hooks/          # Custom hooks
│   │   ├── stores/         # Zustand stores
│   │   └── utils/          # Utilidades
│   └── public/             # Assets estáticos
│
└── documentation/          # Documentación adicional
```

## 🎯 Módulos Principales

### 1. Sistema de Autenticación y Multi-Tenancy
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Login/Registro con JWT
  - Refresh tokens automáticos
  - Roles: super_admin, tenant_admin, instructor, student
  - Aislamiento completo por tenant
  - Gestión de sesiones segura

### 2. Gestión de Evaluaciones (Quizzes)
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Editor visual con indicadores verde/rojo
  - Tipos: Multiple Choice, True/False, Short Answer
  - Configuración de puntos y tiempo
  - Duplicación y templates
  - Persistencia correcta de respuestas

### 3. Sesiones en Tiempo Real
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Creación con código único y QR
  - Sala de espera para participantes
  - Control del host en tiempo real
  - Sincronización via WebSocket
  - Leaderboard en vivo

### 4. Sistema de Calificación Automática
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Calificación instantánea al completar
  - Algoritmos inteligentes por tipo de pregunta
  - Cálculo de porcentajes y aprobación
  - Almacenamiento en public_quiz_results
  - Generación de certificados PDF

### 5. Módulo de Videos Educativos
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Upload con validación MP4
  - Thumbnails automáticos
  - Streaming HLS adaptativo
  - Reproductor con controles avanzados
  - URLs dinámicas para red local
  - Seguimiento de progreso

### 6. Videos Interactivos con IA
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Generación automática de preguntas con Gemini AI
  - Pausas automáticas en timestamps
  - Evaluación en tiempo real
  - Modo fullscreen optimizado
  - Resultados y estadísticas

### 7. Gestión de Manuales PDF
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Upload y procesamiento de PDF
  - Extracción de texto con pdf-parse
  - Almacenamiento seguro
  - Búsqueda y filtrado
  - Gestión de permisos

### 8. Chat Inteligente con IA
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Chat contextual sobre manuales
  - Integración con Gemini AI
  - Historial persistente
  - Respuestas en español
  - Referencias al contenido

### 9. Centro de Recursos Educativos
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - **Resúmenes IA:**
    - Breve (2-3 párrafos)
    - Detallado (cobertura completa)
    - Puntos Clave (lista estructurada)
  - **Guías de Estudio:**
    - Niveles: Principiante, Intermedio, Avanzado
    - Objetivos de aprendizaje
    - Tiempo estimado
    - Contenido estructurado
  - **Tarjetas Interactivas:**
    - Sistema flip card
    - Navegación y progreso
    - Estadísticas de estudio
    - Categorización y tags
  - **Funcionalidades Generales:**
    - Generación asíncrona con IA
    - Almacenamiento persistente
    - Visualización completa
    - Filtros y búsqueda
    - Compartir público/privado

### 10. Aulas Virtuales (Classrooms)
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Creación con código de acceso
  - Gestión de estudiantes
  - Asignación de quizzes
  - Seguimiento de progreso
  - Reportes por aula

### 11. Resultados y Análisis
- **Estado:** ✅ Completamente Funcional
- **Características:**
  - Vista detallada por pregunta
  - Estadísticas y gráficos
  - Exportación CSV/Excel
  - Certificados PDF profesionales
  - Filtros avanzados

## 📊 Base de Datos

### Tablas Principales

```sql
-- Tablas Core
users                  -- Usuarios del sistema
tenants               -- Organizaciones multi-tenant
quizzes               -- Evaluaciones
questions             -- Preguntas de evaluaciones
quiz_sessions         -- Sesiones activas
session_participants  -- Participantes en sesiones
answers               -- Respuestas de participantes
public_quiz_results   -- Resultados públicos

-- Tablas de Contenido
manuals               -- Manuales PDF
manual_chats          -- Historial de chat IA
manual_summaries      -- Resúmenes generados
study_guides          -- Guías de estudio IA
flash_cards           -- Tarjetas interactivas
ai_generated_quizzes  -- Quizzes generados por IA

-- Tablas de Video
videos                      -- Videos educativos
interactive_video_layers    -- Capas interactivas IA
interactive_video_results   -- Resultados de videos

-- Tablas de Gestión
classrooms            -- Aulas virtuales
classroom_enrollments -- Inscripciones
training_programs     -- Programas de formación
certificates          -- Certificados generados
```

## 🔧 Configuración y Deployment

### Variables de Entorno Requeridas

#### Backend (.env)
```env
# Base de Datos
DB_HOST=localhost
DB_PORT=5432
DB_NAME=aristotest
DB_USER=aristotest
DB_PASSWORD=AristoTest2024

# JWT
JWT_SECRET=your-secret-key
JWT_REFRESH_SECRET=your-refresh-secret
JWT_EXPIRES_IN=1h
JWT_REFRESH_EXPIRES_IN=7d

# Gemini AI
GEMINI_API_KEY=your-gemini-api-key

# MinIO Storage
MINIO_ENDPOINT=localhost
MINIO_PORT=9000
MINIO_ACCESS_KEY=aristotest
MINIO_SECRET_KEY=AristoTest2024!
MINIO_BUCKET_NAME=aristotest-videos

# Server
PORT=3001
NODE_ENV=production
```

#### Frontend (.env)
```env
VITE_API_URL=http://localhost:3001
VITE_SOCKET_URL=http://localhost:3001
```

### Scripts de Deployment

#### 1. Crear Tablas de Recursos Educativos
```bash
cd backend
./deploy-educational-resources.sh
```

#### 2. Iniciar Servicios
```bash
# Backend
cd backend
npm run build
npm run start:prod

# Frontend
cd frontend
npm run build
npm run preview

# MinIO
./scripts/start-minio.sh
```

## 📝 Guía de Testing para QA

### 1. Flujo de Recursos Educativos

1. **Acceder a Manuales:**
   - Navegar a Manuales desde el menú
   - Seleccionar manual ID 6 (prueba)

2. **Generar Recursos:**
   - Click en "Generar Recursos IA"
   - Seleccionar tipo de recurso
   - Configurar opciones
   - Personalizar prompt (opcional)
   - Generar y esperar procesamiento

3. **Visualizar Recursos:**
   - Click en "Ver Recursos"
   - Filtrar por tipo o estado
   - Seleccionar recurso para ver detalle
   - Interactuar con contenido

4. **Tarjetas Interactivas:**
   - Voltear tarjetas con click
   - Navegar con botones
   - Marcar como correcta/incorrecta
   - Ver estadísticas de sesión

### 2. Flujo de Chat con IA

1. **Iniciar Chat:**
   - Desde manual, click en "Chat con IA"
   - Escribir pregunta sobre el contenido
   - Recibir respuesta contextual

2. **Historial:**
   - Ver conversaciones anteriores
   - Continuar conversación
   - Referencias al manual

### 3. Flujo de Evaluación Completo

1. **Crear Evaluación:**
   - Ir a Evaluaciones → Nueva
   - Agregar preguntas variadas
   - Marcar respuestas correctas (borde verde)
   - Guardar evaluación

2. **Iniciar Sesión:**
   - Desde detalle → "Iniciar Sesión"
   - Compartir código/QR
   - Esperar participantes
   - Controlar flujo

3. **Ver Resultados:**
   - Ir a Resultados
   - Filtrar y ordenar
   - Ver detalle individual
   - Descargar certificado PDF

## 🐛 Problemas Conocidos y Soluciones

### 1. Error: Tablas no existen en BD remota
**Solución:** Ejecutar script de migración
```bash
./deploy-educational-resources.sh
# Seleccionar opción 2 para BD remota
```

### 2. Error: Gemini API no responde
**Solución:** Verificar API key y cuota
```bash
# Verificar variable de entorno
echo $GEMINI_API_KEY
# Revisar logs
tail -f backend/logs/app.log | grep Gemini
```

### 3. Videos no cargan en red local
**Solución:** Verificar MinIO y URLs
```bash
# Verificar MinIO está corriendo
curl http://localhost:9000/minio/health/live
# Verificar IP de red
ifconfig | grep "inet "
```

## 🎨 Estándares de Código

### Convenciones

1. **TypeScript:**
   - Tipos explícitos para parámetros
   - Interfaces para objetos complejos
   - Enums para valores constantes

2. **React:**
   - Componentes funcionales con hooks
   - Props tipadas con interfaces
   - Lazy loading para rutas

3. **API:**
   - RESTful naming conventions
   - Validación con express-validator
   - Respuestas consistentes con wrapper

4. **Base de Datos:**
   - snake_case para nombres
   - Índices en foreign keys
   - Soft deletes donde aplique

## 📈 Métricas y Monitoreo

### KPIs del Sistema

- **Disponibilidad:** 99.9% uptime objetivo
- **Rendimiento:** < 200ms respuesta promedio
- **Concurrencia:** 100+ usuarios simultáneos
- **Almacenamiento:** 50GB videos, 10GB documentos
- **IA:** 10,000 requests/día Gemini API

### Logs Importantes

```bash
# Errores críticos
tail -f backend/logs/error.log

# Actividad de IA
tail -f backend/logs/app.log | grep "Gemini"

# Sesiones en tiempo real
tail -f backend/logs/app.log | grep "Socket"

# Acceso a recursos
tail -f backend/logs/access.log
```

## 🚀 Roadmap Futuro

### Q4 2024
- [ ] App móvil nativa (React Native)
- [ ] Exportación SCORM para LMS
- [ ] Analytics dashboard avanzado
- [ ] Integración con Google Classroom

### Q1 2025
- [ ] Modo offline con sincronización
- [ ] Gamificación completa
- [ ] API pública documentada
- [ ] Marketplace de recursos

## 👥 Equipo de Desarrollo

- **Arquitecto Principal:** Samuel Quiroz
- **IA Assistant:** Claude (Anthropic)
- **Stack:** PERN + Gemini AI
- **Versión:** 1.0.3-QA

## 📞 Soporte

Para soporte técnico o consultas:
- **Documentación:** `/docs` en la aplicación
- **Manual Técnico:** Este documento
- **Base de Conocimiento:** Chat con IA sobre manuales

---

**Última Actualización:** 31 de Agosto de 2024  
**Estado del Proyecto:** ✅ Listo para QA Deployment  
**Módulos Funcionales:** 11/12 (92%)  

© 2024 AristoTest - Sistema de Evaluación Educativa Inteligente