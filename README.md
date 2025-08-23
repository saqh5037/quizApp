# AristoTest - Interactive Learning Platform 🎓

Una aplicación de evaluaciones educativas interactivas desarrollada con tecnologías modernas para capacitaciones internas y externas.

## 🚀 Características Principales

- ✅ Creación y gestión de cuestionarios interactivos
- ✅ Sistema de sesiones en tiempo real con Socket.io
- ✅ Códigos QR para unirse fácilmente a las sesiones
- ✅ Tablero de líderes en tiempo real
- ✅ Múltiples tipos de preguntas (opción múltiple, verdadero/falso, respuesta corta)
- ✅ Sistema de puntos con bonificación por velocidad
- ✅ Exportación de resultados (Excel/PDF)
- ✅ Modo público y privado para cuestionarios
- ✅ Sistema de autenticación JWT con refresh tokens

## 🛠️ Stack Tecnológico

### Backend
- **Node.js 18+** con Express 4.18+ y TypeScript 5+
- **PostgreSQL 14+** como base de datos principal
- **Redis** para caché y sesiones
- **Socket.io 4.6+** para comunicación en tiempo real
- **Sequelize 6+** como ORM
- **JWT** para autenticación

### Frontend
- **React 18.2+** con Vite 4+ y TypeScript
- **Tailwind CSS 3.3+** para estilos
- **Zustand 4.4+** para gestión de estado
- **Socket.io-client** para real-time
- **React Query** para caché de datos
- **React Hook Form** para formularios

## 📋 Requisitos Previos

- Node.js 18+ y npm/yarn/pnpm
- PostgreSQL 14+ (o usar Docker)
- Redis (o usar Docker)
- Git

## 🔧 Instalación y Configuración

### Opción 1: Instalación con Docker (Recomendado)

1. **Clonar el repositorio**
```bash
git clone https://github.com/tu-usuario/quiz-app.git
cd quiz-app
```

2. **Configurar variables de entorno**
```bash
# Backend
cp backend/.env.example backend/.env.development

# Frontend
cp frontend/.env.example frontend/.env
```

3. **Levantar los servicios con Docker Compose**
```bash
docker-compose up -d
```

Esto levantará:
- PostgreSQL en puerto 5432
- Redis en puerto 6379
- Backend en puerto 3001
- Frontend en puerto 5173

### Opción 2: Instalación Manual

#### Backend

1. **Instalar dependencias**
```bash
cd backend
npm install
```

2. **Configurar base de datos**

Asegúrate de tener PostgreSQL corriendo y crea la base de datos:
```sql
CREATE DATABASE quiz_app;
```

3. **Configurar variables de entorno**
```bash
cp .env.example .env.development
```

Edita `.env.development` con tus configuraciones:
```env
DB_HOST=localhost
DB_PORT=5432
DB_NAME=quiz_app
DB_USER=tu_usuario
DB_PASSWORD=tu_password
```

4. **Ejecutar migraciones**
```bash
npm run migrate
```

5. **Iniciar el servidor**
```bash
npm run dev
```

El backend estará disponible en `http://localhost:3001`

#### Frontend

1. **Instalar dependencias**
```bash
cd frontend
npm install
```

2. **Configurar variables de entorno**
```bash
cp .env.example .env
```

3. **Iniciar el servidor de desarrollo**
```bash
npm run dev
```

El frontend estará disponible en `http://localhost:5173`

## 📱 Uso de la Aplicación

### Como Profesor/Host

1. **Registro e inicio de sesión**
   - Accede a `/register` para crear una cuenta
   - Inicia sesión en `/login`

2. **Crear un cuestionario**
   - Ve a la sección "Quizzes"
   - Click en "Create Quiz"
   - Añade preguntas con sus respectivas respuestas

3. **Iniciar una sesión**
   - Selecciona un quiz
   - Click en "Start Session"
   - Comparte el código de sesión o QR con los participantes

4. **Controlar la sesión**
   - Avanza entre preguntas
   - Pausa/reanuda cuando sea necesario
   - Visualiza el tablero de líderes en tiempo real

### Como Participante

1. **Unirse a una sesión**
   - Accede a `/join` o escanea el código QR
   - Ingresa el código de sesión
   - Elige un nickname

2. **Responder preguntas**
   - Selecciona tu respuesta antes de que termine el tiempo
   - Gana puntos extra por responder rápido
   - Ve tu posición en el tablero de líderes

## 🧪 Testing

### Backend
```bash
cd backend
npm test
npm run test:watch  # Modo watch
```

### Frontend
```bash
cd frontend
npm test
npm run test:ui  # UI de Vitest
```

## 📦 Build para Producción

### Backend
```bash
cd backend
npm run build
npm start  # Inicia el servidor de producción
```

### Frontend
```bash
cd frontend
npm run build
npm run preview  # Preview del build
```

## 🚀 Deployment

### Con PM2 (Backend)
```bash
cd backend
npm run build
npm install -g pm2
pm2 start ecosystem.config.js
```

### Con Nginx (Frontend)
```nginx
server {
    listen 80;
    server_name tu-dominio.com;
    
    root /var/www/quiz-app/dist;
    index index.html;
    
    location / {
        try_files $uri $uri/ /index.html;
    }
    
    location /api {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
    
    location /socket.io {
        proxy_pass http://localhost:3001;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
    }
}
```

## 📚 Estructura del Proyecto

```
quiz-app/
├── backend/
│   ├── src/
│   │   ├── config/        # Configuración (DB, constantes, env)
│   │   ├── controllers/   # Controladores de rutas
│   │   ├── middleware/    # Middleware (auth, error, validación)
│   │   ├── models/        # Modelos de Sequelize
│   │   ├── routes/        # Definición de rutas
│   │   ├── services/      # Lógica de negocio
│   │   ├── socket/        # Manejadores de Socket.io
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilidades
│   │   └── server.ts      # Punto de entrada
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── components/    # Componentes React
│   │   ├── pages/         # Páginas/vistas
│   │   ├── stores/        # Stores de Zustand
│   │   ├── hooks/         # Custom hooks
│   │   ├── services/      # Servicios API
│   │   ├── types/         # TypeScript types
│   │   ├── utils/         # Utilidades
│   │   └── App.tsx        # Componente principal
│   └── package.json
│
├── docker-compose.yml
└── README.md
```

## 🔐 Seguridad

- Autenticación JWT con refresh tokens
- Rate limiting en endpoints sensibles
- Validación de entrada con express-validator
- Sanitización de datos
- CORS configurado
- Helmet para headers de seguridad
- Bcrypt para hash de contraseñas

## 📈 Características Futuras

- [ ] Integración con Google/Microsoft para SSO
- [ ] Modo offline para participantes
- [ ] Grabación de sesiones
- [ ] Analytics avanzados
- [ ] Temas personalizables
- [ ] API pública para integraciones
- [ ] Aplicación móvil nativa

## 🤝 Contribuir

1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'Add some AmazingFeature'`)
4. Push al branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para más detalles.

## 👥 Equipo

- **Desarrollo**: Tu nombre
- **Consultoría**: Empresa de Consultoría
- **Producto Principal**: Labsis

## 📞 Soporte

Para soporte, envía un email a soporte@tuempresa.com o abre un issue en GitHub.

## 🙏 Agradecimientos

- [Socrative](https://socrative.com/) por la inspiración
- La comunidad de open source
- Todos los contribuidores

---

**Nota**: Este es un proyecto en desarrollo activo. Para la versión de producción, asegúrate de:
- Cambiar todas las contraseñas y secretos por defecto
- Configurar HTTPS
- Habilitar los respaldos de base de datos
- Configurar monitoreo y logging
- Revisar y ajustar los límites de rate limiting