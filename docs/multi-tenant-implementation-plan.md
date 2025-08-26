# Plan de Implementación Multi-Tenant - AristoTest MVP
**Estrategia:** Row-Level Security (Opción 1)  
**Contexto:** MVP controlado por equipo de soporte de Dynamtek

## 📌 Decisión Estratégica

### Enfoque Elegido
- **Row-Level Security** con `tenant_id` en todas las tablas
- **Un despliegue por cliente** si se requiere aislamiento total futuro
- **Control total por Soporte Dynamtek** - No es self-service

### Justificación
1. **MVP Rápido:** Menor complejidad = desarrollo más rápido
2. **Control Interno:** Soporte gestiona todos los clientes
3. **Objetivo Principal:** Capacitación en sistemas Dynamtek
4. **Escalabilidad Simple:** Si un cliente crece, se despliega instancia separada
5. **Costo Mínimo:** Una sola infraestructura inicial

## 🏗️ Arquitectura Propuesta

```
AristoTest MVP Multi-Tenant
│
├── TENANT: Dynamtek (ID: 1) [INTERNO]
│   ├── Capacitación empleados Dynamtek
│   ├── Onboarding nuevos empleados
│   └── Certificaciones internas
│
├── TENANT: Cliente A (ID: 2) [EXTERNO]
│   ├── Capacitación en Sistema X de Dynamtek
│   └── Controlado por Soporte Dynamtek
│
└── TENANT: Cliente B (ID: 3) [EXTERNO]
    ├── Capacitación en Sistema Y de Dynamtek
    └── Controlado por Soporte Dynamtek
```

## 🗂️ Estructura de Base de Datos

### Nuevas Tablas

```sql
-- 1. Tabla de Tenants (Organizaciones)
CREATE TABLE tenants (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  slug VARCHAR(100) UNIQUE NOT NULL,
  type VARCHAR(50) DEFAULT 'client', -- 'internal' or 'client'
  settings JSONB DEFAULT '{}',
  branding JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Tabla de Classrooms (Salones)
CREATE TABLE classrooms (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  name VARCHAR(255) NOT NULL,
  code VARCHAR(50) UNIQUE NOT NULL,
  description TEXT,
  instructor_id INTEGER REFERENCES users(id),
  max_capacity INTEGER DEFAULT 50,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_classroom_tenant (tenant_id)
);

-- 3. Tabla de Training Programs (Programas de Capacitación)
CREATE TABLE training_programs (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  objectives TEXT,
  duration_hours INTEGER,
  start_date DATE,
  end_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_program_tenant (tenant_id),
  INDEX idx_program_classroom (classroom_id)
);

-- 4. Tabla de Program Quizzes (Relación Programa-Quiz)
CREATE TABLE program_quizzes (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  program_id INTEGER NOT NULL REFERENCES training_programs(id),
  quiz_id INTEGER NOT NULL REFERENCES quizzes(id),
  sequence_order INTEGER NOT NULL,
  is_mandatory BOOLEAN DEFAULT true,
  passing_score INTEGER DEFAULT 70,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_program_quiz_tenant (tenant_id)
);

-- 5. Tabla de Classroom Enrollments (Inscripciones)
CREATE TABLE classroom_enrollments (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  classroom_id INTEGER NOT NULL REFERENCES classrooms(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  role VARCHAR(50) DEFAULT 'student', -- 'student', 'instructor', 'assistant'
  enrolled_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  status VARCHAR(50) DEFAULT 'active', -- 'active', 'completed', 'dropped'
  INDEX idx_enrollment_tenant (tenant_id),
  UNIQUE(classroom_id, user_id)
);

-- 6. Tabla de Certificates (Certificados)
CREATE TABLE certificates (
  id SERIAL PRIMARY KEY,
  tenant_id INTEGER NOT NULL REFERENCES tenants(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  certificate_type VARCHAR(50) NOT NULL, -- 'quiz', 'program', 'classroom', 'tenant'
  related_id INTEGER, -- ID del quiz/program/classroom según el tipo
  name VARCHAR(255) NOT NULL,
  verification_code VARCHAR(100) UNIQUE NOT NULL,
  issued_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  expiry_date TIMESTAMP,
  metadata JSONB DEFAULT '{}',
  pdf_url VARCHAR(500),
  INDEX idx_certificate_tenant (tenant_id),
  INDEX idx_certificate_user (tenant_id, user_id),
  INDEX idx_certificate_verification (verification_code)
);
```

### Modificaciones a Tablas Existentes

```sql
-- Agregar tenant_id a todas las tablas principales
ALTER TABLE users ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE quizzes ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE quiz_sessions ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE questions ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE videos ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);
ALTER TABLE manuals ADD COLUMN tenant_id INTEGER REFERENCES tenants(id);

-- Índices para performance
CREATE INDEX idx_users_tenant ON users(tenant_id);
CREATE INDEX idx_quizzes_tenant ON quizzes(tenant_id);
CREATE INDEX idx_sessions_tenant ON quiz_sessions(tenant_id);
CREATE INDEX idx_questions_tenant ON questions(tenant_id);
CREATE INDEX idx_videos_tenant ON videos(tenant_id);
CREATE INDEX idx_manuals_tenant ON manuals(tenant_id);
```

## 🔧 Implementación Backend

### 1. Middleware de Tenant Isolation

```typescript
// backend/src/middleware/tenant.middleware.ts
export const tenantMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    // Extraer tenant del token JWT
    const user = req.user;
    if (!user?.tenant_id) {
      return res.status(403).json({ error: 'Tenant not identified' });
    }
    
    // Agregar tenant_id al request
    req.tenantId = user.tenant_id;
    
    // Configurar Sequelize hooks para este request
    req.app.locals.currentTenantId = user.tenant_id;
    
    next();
  } catch (error) {
    res.status(500).json({ error: 'Tenant isolation failed' });
  }
};
```

### 2. Modelo Base con Tenant

```typescript
// backend/src/models/base/TenantModel.ts
export abstract class TenantModel extends Model {
  tenant_id!: number;
  
  static initWithTenant(sequelize: Sequelize, attributes: any) {
    this.init(
      {
        tenant_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: 'tenants',
            key: 'id'
          }
        },
        ...attributes
      },
      {
        sequelize,
        hooks: {
          beforeFind: (options: any) => {
            // Auto-filtrar por tenant_id
            const tenantId = sequelize.options.app?.locals?.currentTenantId;
            if (tenantId) {
              options.where = {
                ...options.where,
                tenant_id: tenantId
              };
            }
          },
          beforeCreate: (instance: any) => {
            // Auto-asignar tenant_id
            const tenantId = sequelize.options.app?.locals?.currentTenantId;
            if (tenantId && !instance.tenant_id) {
              instance.tenant_id = tenantId;
            }
          }
        }
      }
    );
  }
}
```

### 3. Roles y Permisos

```typescript
// backend/src/config/roles.ts
export const ROLES = {
  SUPER_ADMIN: 'super_admin',     // Dynamtek - Gestiona todos los tenants
  TENANT_ADMIN: 'tenant_admin',   // Admin del cliente
  INSTRUCTOR: 'instructor',       // Gestiona classrooms
  STUDENT: 'student'              // Toma quizzes
};

export const PERMISSIONS = {
  [ROLES.SUPER_ADMIN]: [
    'manage_all_tenants',
    'view_global_metrics',
    'create_tenants',
    'access_all_data'
  ],
  [ROLES.TENANT_ADMIN]: [
    'manage_own_tenant',
    'manage_classrooms',
    'manage_programs',
    'manage_users',
    'view_tenant_metrics'
  ],
  [ROLES.INSTRUCTOR]: [
    'manage_assigned_classrooms',
    'create_quizzes',
    'grade_students',
    'issue_certificates'
  ],
  [ROLES.STUDENT]: [
    'view_enrolled_classrooms',
    'take_quizzes',
    'view_own_certificates'
  ]
};
```

## 🎨 Implementación Frontend

### 1. Context de Tenant

```typescript
// frontend/src/contexts/TenantContext.tsx
export const TenantProvider: React.FC = ({ children }) => {
  const [currentTenant, setCurrentTenant] = useState<Tenant | null>(null);
  const [userRole, setUserRole] = useState<string>('');
  
  useEffect(() => {
    // Cargar tenant del usuario actual
    fetchCurrentTenant();
  }, []);
  
  return (
    <TenantContext.Provider value={{ 
      currentTenant, 
      userRole,
      isSuperAdmin: userRole === 'super_admin',
      isTenantAdmin: userRole === 'tenant_admin',
      isInstructor: userRole === 'instructor'
    }}>
      {children}
    </TenantContext.Provider>
  );
};
```

### 2. Navegación Jerárquica

```typescript
// frontend/src/components/Navigation/HierarchyBreadcrumb.tsx
export const HierarchyBreadcrumb: React.FC = () => {
  const { currentTenant } = useTenant();
  const location = useLocation();
  
  return (
    <nav className="flex items-center space-x-2 text-sm">
      <Link to="/" className="text-blue-600 hover:text-blue-800">
        {currentTenant?.name || 'AristoTest'}
      </Link>
      {location.pathname.includes('/classroom') && (
        <>
          <ChevronRight className="w-4 h-4" />
          <Link to="/classrooms">Salones</Link>
        </>
      )}
      {location.pathname.includes('/program') && (
        <>
          <ChevronRight className="w-4 h-4" />
          <Link to="/programs">Programas</Link>
        </>
      )}
    </nav>
  );
};
```

## 📊 Plan de Migración

### Fase 1: Crear Tenant Dynamtek (Día 1)
```sql
-- 1. Insertar tenant por defecto
INSERT INTO tenants (name, slug, type, settings) 
VALUES ('Dynamtek', 'dynamtek', 'internal', '{"default": true}');

-- 2. Actualizar usuarios existentes
UPDATE users SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 3. Actualizar quizzes existentes
UPDATE quizzes SET tenant_id = 1 WHERE tenant_id IS NULL;

-- 4. Crear classroom general
INSERT INTO classrooms (tenant_id, name, code) 
VALUES (1, 'General', 'DYN-GEN-001');
```

### Fase 2: Preparar para Clientes (Día 2-3)
- Implementar middleware de tenant
- Actualizar modelos con tenant_id
- Modificar controladores existentes

### Fase 3: UI Multi-Tenant (Día 4-5)
- Dashboard por tenant
- Selector de tenant para super-admin
- Filtros automáticos en listas

## 🚀 Ventajas del Enfoque

1. **Simplicidad para MVP**
   - Una sola base de datos
   - Un solo deployment inicial
   - Migración sencilla

2. **Control por Soporte**
   - No es self-service
   - Soporte crea usuarios de clientes
   - Soporte asigna programas

3. **Escalabilidad Futura**
   - Si Cliente A crece → Deploy separado
   - Si Cliente B es simple → Mantener en shared
   - Decisión caso por caso

4. **Foco en Capacitación Dynamtek**
   - Objetivo: Capacitar en sistemas Dynamtek
   - No es plataforma genérica
   - Control total del contenido

## ⚠️ Consideraciones Importantes

1. **Seguridad**
   - Validar tenant_id en CADA query
   - Nunca exponer datos entre tenants
   - Logs de auditoría por acción

2. **Performance**
   - Índices en tenant_id obligatorios
   - Monitorear queries lentas
   - Cache por tenant si necesario

3. **Despliegue por Cliente (Futuro)**
   ```bash
   # Si un cliente requiere instancia separada:
   docker run -e TENANT_ID=2 -e DB_NAME=aristotest_cliente_a
   ```

## 📈 Métricas de Éxito

- ✅ Dynamtek usando para capacitación interna
- ✅ Primer cliente externo capacitándose
- ✅ Cero filtración de datos entre tenants
- ✅ Certificados emitidos correctamente
- ✅ Soporte gestionando todo sin problemas

## 🎯 Próximos Pasos

1. **Semana 1:** Base de datos y migración
2. **Semana 2:** Backend con tenant isolation
3. **Semana 3:** Frontend adaptado
4. **Semana 4:** Testing y refinamiento
5. **Semana 5:** Deployment y documentación