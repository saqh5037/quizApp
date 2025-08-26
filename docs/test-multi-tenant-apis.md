# 🧪 Guía de Testing - Sistema Multi-Tenant AristoTest

## 🔐 Primero: Obtener Token de Autenticación

### Login
```bash
curl -X POST http://localhost:3001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@aristotest.com",
    "password": "admin123"
  }'
```

Guarda el `accessToken` de la respuesta para los siguientes requests.

## 🏢 APIs de Tenant

### Ver Información del Tenant Actual
```bash
curl http://localhost:3001/api/v1/tenants/current \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Ver Dashboard del Tenant
```bash
curl http://localhost:3001/api/v1/tenants/dashboard \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🏫 APIs de Salones (Classrooms)

### Listar Todos los Salones
```bash
curl http://localhost:3001/api/v1/classrooms \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Ver Detalle del Salón General
```bash
curl http://localhost:3001/api/v1/classrooms/1 \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Crear Nuevo Salón
```bash
curl -X POST http://localhost:3001/api/v1/classrooms \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Desarrollo Web",
    "description": "Salón para capacitación en tecnologías web",
    "max_capacity": 30
  }'
```

## 📚 APIs de Programas de Capacitación

### Listar Programas
```bash
curl http://localhost:3001/api/v1/programs \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Crear Programa de Capacitación
```bash
curl -X POST http://localhost:3001/api/v1/programs \
  -H "Authorization: Bearer TU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{
    "classroom_id": 1,
    "name": "Introducción a React",
    "description": "Programa de capacitación en React y ecosistema",
    "duration_hours": 40,
    "objectives": "Aprender los fundamentos de React"
  }'
```

## 🏆 APIs de Certificados

### Ver Mis Certificados
```bash
curl http://localhost:3001/api/v1/certificates \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

### Verificar Certificado (Público, sin auth)
```bash
curl http://localhost:3001/api/v1/certificates/verify/CODIGO_CERTIFICADO
```

### Ver Estadísticas de Certificados
```bash
curl http://localhost:3001/api/v1/certificates/stats \
  -H "Authorization: Bearer TU_TOKEN_AQUI"
```

## 🎯 Casos de Prueba Importantes

### 1. Aislamiento de Tenant
Todo lo que crees estará automáticamente asociado al tenant "Dynamtek" (ID: 1).

### 2. Jerarquía
- **Tenant**: Dynamtek
  - **Classroom**: General (DYN-GEN-001)
    - **Training Programs**: (puedes crear)
      - **Quizzes**: (usar existentes)

### 3. Permisos por Rol
- **admin@aristotest.com**: Acceso total
- **profesor@aristotest.com**: Puede crear salones y programas
- **alumno@aristotest.com**: Solo puede ver y participar

## 🧑‍💻 Usando Postman

1. Importa estas URLs en Postman
2. Crea una variable de entorno `{{token}}` 
3. Después del login, guarda el token en esa variable
4. Todas las requests usarán automáticamente el token

## 🔍 Verificación en Base de Datos

Si tienes acceso a PostgreSQL:

```sql
-- Ver tenants
SELECT * FROM tenants;

-- Ver salones
SELECT * FROM classrooms;

-- Ver usuarios con su tenant
SELECT id, email, role, tenant_id FROM users;

-- Ver programas de capacitación
SELECT * FROM training_programs;

-- Ver certificados emitidos
SELECT * FROM certificates;
```

## 📱 Testing desde Otro Dispositivo

Si quieres probar desde tu teléfono o tablet:
1. Asegúrate de estar en la misma red WiFi
2. Accede a: http://192.168.1.125:5173
3. El sistema detectará automáticamente la IP correcta para el backend

## ✅ Checklist de Verificación

- [ ] Login funciona y devuelve token con tenant_id
- [ ] Dashboard muestra "Dynamtek" como organización
- [ ] Página de Classrooms muestra salón "General"
- [ ] Puedo crear un nuevo salón (si soy admin/profesor)
- [ ] Los datos se filtran automáticamente por tenant
- [ ] No puedo ver datos de otros tenants (cuando se creen)
- [ ] Los certificados se pueden verificar públicamente

## 🐛 Troubleshooting

### Error: "Tenant not identified"
- El usuario no tiene tenant_id asignado
- Ejecuta el script de verificación para corregir

### Error: "Forbidden"
- No tienes permisos para esa acción
- Verifica tu rol de usuario

### Videos no cargan
- Asegúrate que MinIO esté corriendo (puerto 9000)
- Ejecuta: `./scripts/start-minio.sh`

## 🎉 Funcionalidades Destacadas

1. **Row-Level Security Automático**
   - Todo se filtra por tenant_id sin código adicional

2. **Jerarquía de 4 Niveles**
   - Tenant → Classroom → Program → Quiz

3. **Certificados Multinivel**
   - Por quiz, programa, salón o tenant completo

4. **Control por Soporte**
   - No es self-service
   - Soporte Dynamtek gestiona todo

5. **Preparado para Escalar**
   - Si un cliente crece, se puede separar a su propia instancia