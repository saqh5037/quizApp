# claude.md - Reglas y Protocolo para Claude Code
## Sistema de Trabajo Persistente para AristoTest

### 🤖 PROTOCOLO DE INICIO DE SESIÓN

**IMPORTANTE:** Al inicio de CADA conversación, SIEMPRE debes:

1. **LEER los archivos del marco metodológico en este orden:**
   ```bash
   1. PRD.md      # Para entender el producto y objetivos
   2. planning.md # Para conocer la arquitectura y stack
   3. tasks.md    # Para ver el estado actual del proyecto
   4. CLAUDE.md   # Para recordar especificaciones técnicas
   ```

2. **VERIFICAR el estado actual:**
   - Revisar tareas pendientes en tasks.md
   - Identificar prioridades (🔴 críticas primero)
   - Verificar dependencias entre tareas
   - Consultar últimas actualizaciones

3. **ANUNCIAR tu plan de trabajo:**
   ```
   "He revisado el estado del proyecto. Voy a trabajar en:
   [Lista de tareas prioritarias]
   ¿Hay algún cambio de prioridad o tarea específica que prefieras?"
   ```

---

### 📋 REGLAS DE GESTIÓN DE TAREAS

#### Regla 1: Actualización Inmediata
- **MARCAR completada** inmediatamente al terminar una tarea
- **NO ACUMULAR** múltiples tareas antes de actualizar
- **AÑADIR** nuevas tareas descubiertas durante el desarrollo
- **DOCUMENTAR** bloqueos o impedimentos

#### Regla 2: Formato de Actualización
```markdown
## Tarea Completada:
- [x] 2025-09-20: [Descripción de la tarea]
  - Cambios realizados: [Lista de cambios]
  - Archivos modificados: [Lista de archivos]
  - Tests ejecutados: [Resultados]

## Nueva Tarea Descubierta:
- [ ] [Descripción clara y accionable]
  - Prioridad: 🔴/🟡/🟢
  - Dependencias: [Si existen]
  - Estimación: [Tiempo aproximado]
```

#### Regla 3: Priorización
1. **🔴 CRÍTICAS:** Bloquean funcionalidad core o producción
2. **🟡 IMPORTANTES:** Mejoran significativamente UX o performance
3. **🟢 MEJORAS:** Nice-to-have, optimizaciones, features adicionales

---

### 🛠️ STACK TÉCNICO Y CONVENCIONES

#### Backend (Node.js + TypeScript)
```typescript
// SIEMPRE usar TypeScript strict mode
// SIEMPRE definir tipos/interfaces explícitos
// NUNCA usar 'any' sin justificación

// Estructura de controlador estándar:
export const controllerName = async (req: Request, res: Response) => {
  try {
    // Validación con express-validator
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    // Lógica con tenant isolation
    const tenantId = req.tenantId;

    // Respuesta consistente
    res.json({
      success: true,
      data: result,
      message: 'Operación exitosa'
    });
  } catch (error) {
    // Manejo de errores centralizado
    next(error);
  }
};
```

#### Frontend (React + TypeScript)
```typescript
// SIEMPRE usar functional components con hooks
// SIEMPRE tipar props y state
// PREFERIR Zustand sobre Context para estado global

// Estructura de componente estándar:
interface ComponentProps {
  prop1: string;
  prop2?: number;
}

export const ComponentName: FC<ComponentProps> = ({ prop1, prop2 = 0 }) => {
  // Hooks al inicio
  const [state, setState] = useState<StateType>();
  const { user } = useAuthStore();

  // Effects después de hooks
  useEffect(() => {
    // Cleanup si necesario
    return () => {};
  }, [dependencies]);

  // Handlers
  const handleAction = useCallback(() => {
    // Lógica
  }, [dependencies]);

  // Render
  return (
    <div className="tailwind-classes">
      {/* JSX */}
    </div>
  );
};
```

#### Base de Datos (PostgreSQL + Sequelize)
```javascript
// SIEMPRE incluir tenant_id en modelos multi-tenant
// SIEMPRE usar migraciones para cambios de schema
// NUNCA modificar modelos sin migración correspondiente

// Modelo estándar con tenant isolation:
module.exports = (sequelize, DataTypes) => {
  const Model = sequelize.define('ModelName', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    tenant_id: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'tenants',
        key: 'id'
      }
    },
    // Otros campos...
  }, {
    hooks: {
      beforeFind: (options) => {
        // Auto-filter por tenant
        if (options.where && !options.where.tenant_id && global.currentTenantId) {
          options.where.tenant_id = global.currentTenantId;
        }
      }
    }
  });

  return Model;
};
```

---

### 🧪 PROTOCOLO DE TESTING

#### Antes de marcar CUALQUIER tarea como completada:

1. **Tests Unitarios:**
   ```bash
   cd backend && npm test -- path/to/test.spec.ts
   cd frontend && npm test -- path/to/test.tsx
   ```

2. **Linting:**
   ```bash
   cd backend && npm run lint
   cd frontend && npm run lint
   ```

3. **Type Checking:**
   ```bash
   cd backend && npm run build-tsc
   cd frontend && npm run build
   ```

4. **Tests Manuales:**
   - Verificar en navegador
   - Probar casos edge
   - Verificar responsive design
   - Confirmar multi-tenant isolation

5. **Documentación:**
   - Actualizar README si es necesario
   - Añadir comentarios en código complejo
   - Actualizar API docs si hay cambios

---

### 🔄 INTEGRACIÓN CON SERVICIOS

#### Google Gemini AI
```javascript
// SIEMPRE manejar rate limits
// SIEMPRE cachear respuestas cuando sea posible
// NUNCA exponer API key en frontend

import { GeminiService } from '@services/geminiService';

const generateContent = async (prompt: string) => {
  try {
    // Verificar cache primero
    const cached = await redis.get(`gemini:${hash(prompt)}`);
    if (cached) return JSON.parse(cached);

    // Llamar a Gemini con retry logic
    const result = await GeminiService.generate(prompt, {
      maxTokens: 2000,
      temperature: 0.7,
      retries: 3
    });

    // Cachear respuesta
    await redis.set(`gemini:${hash(prompt)}`, JSON.stringify(result), 'EX', 3600);

    return result;
  } catch (error) {
    logger.error('Gemini API error:', error);
    throw new AppError('AI service temporarily unavailable', 503);
  }
};
```

#### MinIO Storage
```javascript
// SIEMPRE validar tipos de archivo
// SIEMPRE comprimir imágenes
// NUNCA almacenar sin tenant namespace

import { MinioService } from '@services/minioService';

const uploadFile = async (file: Express.Multer.File, tenantId: string) => {
  // Validación
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf', 'video/mp4'];
  if (!allowedTypes.includes(file.mimetype)) {
    throw new AppError('Invalid file type', 400);
  }

  // Namespace por tenant
  const key = `${tenantId}/${Date.now()}-${file.originalname}`;

  // Upload con metadata
  return await MinioService.upload(file.buffer, key, {
    ContentType: file.mimetype,
    Metadata: {
      tenantId,
      uploadedBy: req.user.id,
      originalName: file.originalname
    }
  });
};
```

#### Socket.io Real-time
```javascript
// SIEMPRE autenticar sockets
// SIEMPRE usar rooms para tenant isolation
// NUNCA broadcast a todos los sockets

io.on('connection', (socket) => {
  // Autenticación
  const token = socket.handshake.auth.token;
  const user = verifyToken(token);

  if (!user) {
    socket.disconnect();
    return;
  }

  // Join tenant room
  socket.join(`tenant:${user.tenantId}`);

  // Eventos con namespace
  socket.on('quiz:answer', async (data) => {
    // Validar tenant
    if (data.tenantId !== user.tenantId) {
      socket.emit('error', 'Unauthorized');
      return;
    }

    // Procesar y emitir solo al tenant
    io.to(`tenant:${user.tenantId}`).emit('quiz:update', result);
  });
});
```

---

### 📊 MÉTRICAS Y LOGGING

#### Logging Obligatorio
```javascript
// SIEMPRE loggear:
logger.info('API_REQUEST', {
  method: req.method,
  path: req.path,
  user: req.user?.id,
  tenant: req.tenantId,
  ip: req.ip,
  userAgent: req.get('user-agent')
});

logger.error('ERROR', {
  error: error.message,
  stack: error.stack,
  user: req.user?.id,
  tenant: req.tenantId,
  timestamp: new Date().toISOString()
});

logger.warn('PERFORMANCE', {
  operation: 'database_query',
  duration: endTime - startTime,
  query: query.sql,
  tenant: tenantId
});
```

#### Métricas a Trackear
- Response time por endpoint
- Error rate por tenant
- Uso de storage por tenant
- Concurrent users
- AI API usage y costos
- Socket.io connections
- Database query performance

---

### 🚀 DEPLOYMENT Y CI/CD

#### Pre-deployment Checklist
- [ ] Todos los tests pasan
- [ ] No hay console.logs en producción
- [ ] Variables de entorno configuradas
- [ ] Migraciones de DB ejecutadas
- [ ] Build de producción optimizado
- [ ] Security headers configurados
- [ ] Rate limiting activo
- [ ] Monitoring configurado

#### Deployment Commands
```bash
# QA Environment
./deploy-qa-v2-option2-update.sh

# Production
./deploy-aristotest-from-github.sh

# Emergency Rollback
git checkout [last-stable-tag]
./emergency-restart.sh
```

---

### 📝 RESUMEN DE SESIÓN

#### Al FINALIZAR cada sesión, SIEMPRE generar:

```markdown
## 📅 Resumen de Sesión - [FECHA]

### ✅ Tareas Completadas
1. [Tarea 1] - [Breve descripción del resultado]
2. [Tarea 2] - [Breve descripción del resultado]

### 📁 Archivos Modificados
- `path/to/file1.ts` - [Qué se cambió]
- `path/to/file2.tsx` - [Qué se cambió]

### 🧪 Tests Ejecutados
- [x] Unit tests: X/Y passing
- [x] Linting: No errors
- [x] Type checking: Success

### 🔄 Estado del Proyecto
- **Funcionalidades operativas:** [Lista]
- **Issues conocidos:** [Lista]
- **Bloqueos:** [Si existen]

### 📋 Próximas Tareas Prioritarias
1. [Tarea prioritaria 1]
2. [Tarea prioritaria 2]

### 💡 Notas y Observaciones
- [Observaciones importantes para la siguiente sesión]
- [Decisiones técnicas tomadas]
- [Deuda técnica identificada]

### 🎯 Métricas de Progreso
- Tareas completadas hoy: X
- Tareas pendientes críticas: Y
- Cobertura de tests: Z%
- Performance score: A/100
```

---

### 🚨 ERRORES COMUNES A EVITAR

1. **NO modificar** modelos sin crear migración
2. **NO hardcodear** tenant_ids o user_ids
3. **NO usar** console.log en producción (usar logger)
4. **NO commitear** sin ejecutar tests
5. **NO ignorar** warnings de TypeScript
6. **NO crear** endpoints sin autenticación
7. **NO mezclar** datos entre tenants
8. **NO subir** archivos sin validación
9. **NO hacer** queries sin índices
10. **NO deployar** sin backup de DB

---

### 🎯 OBJETIVOS DE CALIDAD

#### Código
- **Coverage:** Mantener > 80%
- **Complejidad:** Ciclomática < 10
- **Duplicación:** < 3%
- **Deuda técnica:** < 5 días

#### Performance
- **Load time:** < 2s (P95)
- **API response:** < 200ms (P95)
- **Socket latency:** < 100ms
- **DB queries:** < 50ms

#### Seguridad
- **OWASP Top 10:** Compliant
- **Dependencies:** No vulnerabilities críticas
- **Secrets:** Nunca en código
- **Auth:** JWT con refresh tokens

---

### 🔗 REFERENCIAS RÁPIDAS

#### Documentación
- [PRD - Requisitos del Producto](./PRD.md)
- [Planning - Arquitectura](./planning.md)
- [Tasks - Lista de Tareas](./tasks.md)
- [CLAUDE.md - Especificaciones Técnicas](./CLAUDE.md)

#### Herramientas
- **GitHub:** https://github.com/saqh5037/quizApp
- **Jira:** https://dynamtek.atlassian.net/jira
- **Staging:** http://52.55.189.120
- **Production:** https://aristotest.com

#### Contactos
- **Tech Lead:** tech@aristotest.com
- **DevOps:** devops@aristotest.com
- **QA:** qa@aristotest.com

---

### ⚡ COMANDOS RÁPIDOS

```bash
# Desarrollo local
cd backend && npm run dev
cd frontend && npm run dev

# Testing
npm test
npm run test:watch
npm run test:coverage

# Build
npm run build
npm run build:prod

# Database
npm run migrate
npm run seed
npm run db:reset

# Deployment
./deploy-qa-v2-option2-update.sh
./deploy-aristotest-from-github.sh

# Monitoring
pm2 status
pm2 logs
pm2 monit

# Troubleshooting
./fix-backend-final.sh
./fix-typescript-issue.sh
./emergency-restart.sh
```

---

## 🎓 PRINCIPIOS FUNDAMENTALES

1. **Persistencia:** Siempre leer contexto al inicio
2. **Actualización:** Mantener tasks.md al día
3. **Calidad:** No comprometer tests por velocidad
4. **Seguridad:** Multi-tenant isolation es crítica
5. **Performance:** Optimizar para scale
6. **Documentación:** Código auto-documentado
7. **Colaboración:** Comunicar cambios importantes
8. **Iteración:** Mejora continua sobre perfección

---

*Este documento es tu guía maestra. Síguelo religiosamente para mantener consistencia y calidad en el desarrollo de AristoTest.*

**Última actualización:** 2025-09-20
**Versión:** 1.0.0