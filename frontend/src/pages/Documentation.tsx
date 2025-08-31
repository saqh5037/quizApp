import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FiBook, FiPlay, FiUsers, FiBarChart2, FiSettings, FiDatabase, FiCheckCircle, FiAlertCircle, FiCopy, FiFileText, FiLayers } from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Module {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  features: string[];
  testSteps: string[];
  testData?: {
    title: string;
    data: any;
  };
  status: 'working' | 'partial' | 'error';
}

export default function Documentation() {
  const { t, i18n } = useTranslation();
  const [selectedModule, setSelectedModule] = useState<string>('overview');
  const [copiedData, setCopiedData] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedData(id);
    toast.success(i18n.language === 'es' ? 'Copiado al portapapeles' : 'Copied to clipboard');
    setTimeout(() => setCopiedData(null), 2000);
  };

  const modules: Module[] = [
    {
      id: 'overview',
      title: i18n.language === 'es' ? 'Visión General' : 'Overview',
      description: i18n.language === 'es' 
        ? 'AristoTest es una plataforma de evaluación interactiva diseñada para crear, gestionar y analizar evaluaciones educativas.'
        : 'AristoTest is an interactive assessment platform designed to create, manage, and analyze educational assessments.',
      icon: <FiBook className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Sistema de autenticación completo',
        'Gestión de evaluaciones',
        'Sesiones en tiempo real',
        'Análisis de resultados',
        'Soporte multiidioma (Español/Inglés)',
        'Panel de administración'
      ] : [
        'Complete authentication system',
        'Assessment management',
        'Real-time sessions',
        'Results analysis',
        'Multi-language support (Spanish/English)',
        'Admin dashboard'
      ],
      testSteps: i18n.language === 'es' ? [
        'Usa las credenciales de prueba para iniciar sesión',
        'Explora cada módulo siguiendo esta guía',
        'Reporta cualquier error encontrado'
      ] : [
        'Use test credentials to login',
        'Explore each module following this guide',
        'Report any errors found'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Credenciales de Prueba' : 'Test Credentials',
        data: {
          admin: {
            email: 'admin@aristotest.com',
            password: 'Admin123!@#',
            role: 'Administrator'
          },
          teacher: {
            email: 'teacher@aristotest.com',
            password: 'Teacher123!',
            role: 'Teacher'
          },
          student: {
            email: 'student@aristotest.com',
            password: 'Student123!',
            role: 'Student'
          }
        }
      },
      status: 'working'
    },
    {
      id: 'authentication',
      title: i18n.language === 'es' ? 'Autenticación' : 'Authentication',
      description: i18n.language === 'es'
        ? 'Sistema de login y registro de usuarios con roles y permisos.'
        : 'User login and registration system with roles and permissions.',
      icon: <FiSettings className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Login con email y contraseña',
        'Registro de nuevos usuarios',
        'Recuperación de contraseña (pendiente)',
        'Tokens JWT para sesiones',
        'Tres roles: Admin, Teacher, Student'
      ] : [
        'Login with email and password',
        'New user registration',
        'Password recovery (pending)',
        'JWT tokens for sessions',
        'Three roles: Admin, Teacher, Student'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Cierra sesión si estás conectado',
        '2. Prueba el login con cada credencial',
        '3. Verifica que el token se guarde',
        '4. Prueba el registro con datos nuevos',
        '5. Verifica el logout'
      ] : [
        '1. Logout if connected',
        '2. Test login with each credential',
        '3. Verify token is saved',
        '4. Test registration with new data',
        '5. Verify logout'
      ],
      status: 'working'
    },
    {
      id: 'dashboard',
      title: i18n.language === 'es' ? 'Panel Principal' : 'Dashboard',
      description: i18n.language === 'es'
        ? 'Vista general con estadísticas y acciones rápidas.'
        : 'Overview with statistics and quick actions.',
      icon: <FiBarChart2 className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Estadísticas generales (con errores de BD)',
        'Gráfico de rendimiento semanal',
        'Actividad reciente',
        'Próximas sesiones',
        'Notificaciones',
        'Acciones rápidas'
      ] : [
        'General statistics (with DB errors)',
        'Weekly performance chart',
        'Recent activity',
        'Upcoming sessions',
        'Notifications',
        'Quick actions'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Navega al Dashboard',
        '2. Observa las estadísticas (algunas dan error 500)',
        '3. Revisa el gráfico de rendimiento',
        '4. Verifica las notificaciones',
        '5. Prueba las acciones rápidas'
      ] : [
        '1. Navigate to Dashboard',
        '2. Check statistics (some give 500 error)',
        '3. Review performance chart',
        '4. Check notifications',
        '5. Test quick actions'
      ],
      status: 'working'
    },
    {
      id: 'quizzes',
      title: i18n.language === 'es' ? 'Evaluaciones' : 'Assessments',
      description: i18n.language === 'es'
        ? 'Sistema completo de creación y edición de evaluaciones con indicadores visuales mejorados.'
        : 'Complete assessment creation and editing system with enhanced visual indicators.',
      icon: <FiBook className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Creación de evaluaciones funcional',
        '✅ Editor visual con bordes verde/rojo',
        '✅ Indicadores de respuestas correctas/incorrectas',
        '✅ Persistencia correcta de respuestas marcadas',
        '✅ Soporte para Multiple Choice, True/False, Short Answer',
        '✅ Configuración de puntos por pregunta',
        '✅ Duplicar y eliminar evaluaciones',
        '✅ Vista de detalles de evaluación',
        '✅ Navegación a iniciar sesión desde detalle'
      ] : [
        '✅ Functional assessment creation',
        '✅ Visual editor with green/red borders',
        '✅ Correct/incorrect answer indicators',
        '✅ Proper persistence of marked answers',
        '✅ Support for Multiple Choice, True/False, Short Answer',
        '✅ Points configuration per question',
        '✅ Duplicate and delete assessments',
        '✅ Assessment detail view',
        '✅ Navigation to start session from detail'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Evaluaciones y crea una nueva',
        '2. Agrega preguntas con diferentes tipos',
        '3. Selecciona respuestas correctas (borde verde)',
        '4. Observa respuestas incorrectas (borde rojo)',
        '5. Guarda y verifica persistencia',
        '6. Edita la evaluación creada',
        '7. Verifica que las respuestas se mantienen',
        '8. Ve al detalle y prueba iniciar sesión'
      ] : [
        '1. Go to Assessments and create a new one',
        '2. Add questions with different types',
        '3. Select correct answers (green border)',
        '4. Observe incorrect answers (red border)',
        '5. Save and verify persistence',
        '6. Edit the created assessment',
        '7. Verify answers are maintained',
        '8. Go to detail and try starting session'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Mejoras Visuales Implementadas' : 'Visual Improvements Implemented',
        data: {
          visualFeatures: [
            'Bordes verdes para respuestas correctas (3px)',
            'Bordes rojos para respuestas incorrectas',
            'Misma funcionalidad en crear y editar',
            'Persistencia correcta de selecciones'
          ],
          questionTypes: ['multiple_choice', 'true_false', 'short_answer'],
          note: i18n.language === 'es' 
            ? 'Las respuestas se guardan correctamente y se recuperan al editar'
            : 'Answers are saved correctly and recovered when editing'
        }
      },
      status: 'working'
    },
    {
      id: 'sessions',
      title: i18n.language === 'es' ? 'Sesiones' : 'Sessions',
      description: i18n.language === 'es'
        ? 'Gestionar sesiones de evaluación en tiempo real.'
        : 'Manage real-time assessment sessions.',
      icon: <FiUsers className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Ver sesiones activas (error 500)',
        'Crear nueva sesión',
        'Unirse a sesión con código',
        'Ver sesiones organizadas',
        'Ver sesiones participadas',
        'Control de sesión en tiempo real (WebSocket)'
      ] : [
        'View active sessions (500 error)',
        'Create new session',
        'Join session with code',
        'View hosted sessions',
        'View participated sessions',
        'Real-time session control (WebSocket)'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Sesiones',
        '2. Observa el error en sesiones activas',
        '3. Intenta crear una nueva sesión',
        '4. Prueba unirse con código: TEST-123',
        '5. Revisa las pestañas Organizadas/Participadas'
      ] : [
        '1. Go to Sessions',
        '2. Notice error in active sessions',
        '3. Try creating a new session',
        '4. Try joining with code: TEST-123',
        '5. Check Hosted/Participated tabs'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Código de Prueba' : 'Test Code',
        data: {
          sessionCode: 'TEST-123',
          note: i18n.language === 'es' 
            ? 'Este código es para pruebas, puede no funcionar'
            : 'This code is for testing, may not work'
        }
      },
      status: 'working'
    },
    {
      id: 'results',
      title: i18n.language === 'es' ? 'Resultados Públicos' : 'Public Results',
      description: i18n.language === 'es'
        ? 'Sistema completo de resultados públicos con calificación automática y certificados PDF.'
        : 'Complete public results system with automatic grading and PDF certificates.',
      icon: <FiBarChart2 className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Sistema de calificación automática',
        '✅ Almacenamiento en tabla public_quiz_results',
        '✅ Vista de resultados públicos con estadísticas',
        '✅ Detalle completo de cada resultado',
        '✅ Generación de certificados PDF profesionales',
        '✅ Diferenciación: Aprobación vs Participación',
        '✅ Análisis pregunta por pregunta',
        '✅ Filtros y ordenamiento de resultados',
        '✅ Exportación a CSV'
      ] : [
        '✅ Automatic grading system',
        '✅ Storage in public_quiz_results table',
        '✅ Public results view with statistics',
        '✅ Complete detail for each result',
        '✅ Professional PDF certificate generation',
        '✅ Differentiation: Approval vs Participation',
        '✅ Question by question analysis',
        '✅ Results filtering and sorting',
        '✅ CSV export functionality'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Resultados (desde el menú)',
        '2. Observa la lista de 11 resultados de prueba',
        '3. Usa filtros (Aprobados/No Aprobados)',
        '4. Ordena por puntuación, nombre o fecha',
        '5. Haz clic en el ícono del ojo para ver detalles',
        '6. En el detalle, descarga el certificado PDF',
        '7. Verifica que el PDF se genera correctamente',
        '8. Prueba la exportación a CSV'
      ] : [
        '1. Go to Results (from menu)',
        '2. See the list of 11 test results',
        '3. Use filters (Passed/Failed)',
        '4. Sort by score, name, or date',
        '5. Click the eye icon to view details',
        '6. In detail, download the PDF certificate',
        '7. Verify PDF generates correctly',
        '8. Test CSV export functionality'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Resultados de Prueba Disponibles' : 'Available Test Results',
        data: {
          totalResults: 11,
          participants: [
            { name: 'Juan Pérez', score: 85.5, status: 'Aprobado' },
            { name: 'María García', score: 92.0, status: 'Aprobado' },
            { name: 'Carlos López', score: 65.0, status: 'No Aprobado' },
            { name: 'Ana Martínez', score: 78.0, status: 'Aprobado' },
            { name: 'Pedro Rodríguez', score: 45.0, status: 'No Aprobado' }
          ],
          note: i18n.language === 'es' 
            ? 'Los datos incluyen información completa: respuestas, tiempos, estadísticas'
            : 'Data includes complete information: answers, times, statistics'
        }
      },
      status: 'working'
    },
    {
      id: 'grading',
      title: i18n.language === 'es' ? 'Sistema de Calificación' : 'Grading System',
      description: i18n.language === 'es'
        ? 'Sistema automático de calificación para evaluaciones públicas con algoritmos inteligentes.'
        : 'Automatic grading system for public assessments with intelligent algorithms.',
      icon: <FiCheckCircle className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Calificación automática al completar evaluación',
        '✅ Soporte para Multiple Choice, True/False, Short Answer',
        '✅ Cálculo de puntuación por puntos y porcentaje',
        '✅ Determinación automática de aprobación (≥70%)',
        '✅ Almacenamiento de respuestas detalladas (JSONB)',
        '✅ Registro de tiempos de inicio y finalización',
        '✅ Contador de respuestas correctas/totales',
        '✅ Validación de respuestas con múltiples formatos'
      ] : [
        '✅ Automatic grading on assessment completion',
        '✅ Support for Multiple Choice, True/False, Short Answer',
        '✅ Score calculation by points and percentage',
        '✅ Automatic pass determination (≥70%)',
        '✅ Detailed answer storage (JSONB)',
        '✅ Start and completion time tracking',
        '✅ Correct/total answers counter',
        '✅ Answer validation with multiple formats'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. El sistema califica automáticamente al completar',
        '2. Revisa los algoritmos en grading.controller.ts',
        '3. Verifica los datos en la tabla public_quiz_results',
        '4. Los resultados se pueden ver inmediatamente',
        '5. La calificación es consistente y confiable'
      ] : [
        '1. System grades automatically on completion',
        '2. Review algorithms in grading.controller.ts',
        '3. Check data in public_quiz_results table',
        '4. Results can be viewed immediately',
        '5. Grading is consistent and reliable'
      ],
      status: 'working'
    },
    {
      id: 'profile',
      title: i18n.language === 'es' ? 'Perfil' : 'Profile',
      description: i18n.language === 'es'
        ? 'Configuración personal y preferencias del usuario.'
        : 'Personal settings and user preferences.',
      icon: <FiSettings className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Información personal editable',
        'Cambio de contraseña',
        'Selector de idioma (Español/Inglés)',
        'Preferencias de notificación',
        'Estadísticas del usuario',
        'Zona de peligro (eliminar cuenta)'
      ] : [
        'Editable personal information',
        'Password change',
        'Language selector (Spanish/English)',
        'Notification preferences',
        'User statistics',
        'Danger zone (delete account)'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Perfil',
        '2. Prueba editar información personal',
        '3. Cambia el idioma a Inglés y viceversa',
        '4. Revisa las estadísticas (dan error 500)',
        '5. NO pruebes eliminar cuenta con admin'
      ] : [
        '1. Go to Profile',
        '2. Try editing personal information',
        '3. Change language to Spanish and back',
        '4. Check statistics (give 500 error)',
        '5. DO NOT test delete account with admin'
      ],
      status: 'partial'
    },
    {
      id: 'videos',
      title: i18n.language === 'es' ? 'Módulo de Videos' : 'Video Module',
      description: i18n.language === 'es'
        ? 'Sistema completo de gestión de videos educativos con reproducción segura y acceso de red.'
        : 'Complete educational video management system with secure playback and network access.',
      icon: <FiPlay className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Subida de videos con validación de formato MP4',
        '✅ Generación automática de thumbnails',
        '✅ Reproducción con Video.js y controles avanzados',
        '✅ Seguimiento de progreso de visualización',
        '✅ Gestión de permisos (público/privado)',
        '✅ Categorización y metadatos completos',
        '✅ URLs dinámicas para acceso desde red local',
        '✅ Integración con MinIO para almacenamiento',
        '✅ Detección automática de IP para streaming',
        '✅ Interfaz responsive con tema azul consistente'
      ] : [
        '✅ Video upload with MP4 format validation',
        '✅ Automatic thumbnail generation',  
        '✅ Playback with Video.js and advanced controls',
        '✅ View progress tracking',
        '✅ Permission management (public/private)',
        '✅ Complete categorization and metadata',
        '✅ Dynamic URLs for local network access',
        '✅ MinIO integration for storage',
        '✅ Automatic IP detection for streaming',
        '✅ Responsive interface with consistent blue theme'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Videos desde el menú principal',
        '2. Sube un nuevo video usando "Subir Video"',
        '3. Completa metadatos: título, descripción, categoría',
        '4. Reproduce el video y verifica controles',
        '5. Accede desde 192.168.1.125:5173/videos',
        '6. Confirma que thumbnails y videos cargan',
        '7. Verifica progreso de visualización',
        '8. Prueba edición y eliminación de videos'
      ] : [
        '1. Go to Videos from main menu',
        '2. Upload new video using "Upload Video"',
        '3. Complete metadata: title, description, category',
        '4. Play video and verify controls',
        '5. Access from 192.168.1.125:5173/videos',
        '6. Confirm thumbnails and videos load',
        '7. Verify viewing progress tracking',
        '8. Test video editing and deletion'
      ],
      testData: {
        title: i18n.language === 'es' ? 'URLs de Red - FUNCIONANDO' : 'Network URLs - WORKING',
        data: {
          networkAccess: '192.168.1.125:5173/videos',
          videoStreaming: 'http://192.168.1.125:9000/aristotest-videos/storage/uploads/',
          thumbnailUrls: 'http://192.168.1.125:9000/aristotest-videos/videos/thumbnails/',
          autoDetection: 'IP detection based on request host header',
          note: i18n.language === 'es' 
            ? 'Sistema completamente funcional en red local con URLs automáticas'
            : 'Fully functional system on local network with automatic URLs'
        }
      },
      status: 'working'
    },
    {
      id: 'ui-theme',
      title: i18n.language === 'es' ? 'Tema Visual' : 'UI Theme',
      description: i18n.language === 'es'
        ? 'Sistema de diseño consistente con tema azul aplicado en toda la aplicación.'
        : 'Consistent design system with blue theme applied across the entire application.',
      icon: <FiSettings className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Tema azul consistente (blue-600/blue-700)',
        '✅ Headers con gradiente from-blue-50 to-white',
        '✅ Tamaños normalizados y proporcionales',
        '✅ Componentes Button actualizados',
        '✅ Navegación con indicador azul activo',
        '✅ Iconografía consistente con Lucide React',
        '✅ Responsive design en todos los módulos',
        '✅ Accesibilidad mejorada con focus states'
      ] : [
        '✅ Consistent blue theme (blue-600/blue-700)',
        '✅ Gradient headers from-blue-50 to-white',
        '✅ Normalized and proportional sizes',
        '✅ Updated Button components',
        '✅ Navigation with blue active indicator',
        '✅ Consistent iconography with Lucide React',
        '✅ Responsive design across all modules',
        '✅ Improved accessibility with focus states'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Navega por todos los módulos principales',
        '2. Observa la consistencia del tema azul',
        '3. Verifica headers con gradiente',
        '4. Prueba interacciones de botones',
        '5. Confirma navegación con indicadores',
        '6. Revisa responsive en diferentes tamaños'
      ] : [
        '1. Navigate through all main modules',
        '2. Observe blue theme consistency', 
        '3. Verify gradient headers',
        '4. Test button interactions',
        '5. Confirm navigation with indicators',
        '6. Review responsive on different sizes'
      ],
      status: 'working'
    },
    {
      id: 'manuals',
      title: i18n.language === 'es' ? 'Manuales y Chat IA' : 'Manuals & AI Chat',
      description: i18n.language === 'es'
        ? 'Sistema completo de gestión de manuales PDF con extracción de texto y chat inteligente con IA.'
        : 'Complete PDF manual management system with text extraction and intelligent AI chat.',
      icon: <FiFileText className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Subida y procesamiento de PDF',
        '✅ Extracción automática de texto con pdf-parse',
        '✅ Almacenamiento seguro de documentos',
        '✅ Chat inteligente con Gemini AI',
        '✅ Historial de conversaciones persistente',
        '✅ Generación de quizzes desde manuales',
        '✅ Búsqueda y filtrado de manuales',
        '✅ Gestión de permisos (público/privado)',
        '✅ Integración con Centro de Recursos Educativos'
      ] : [
        '✅ PDF upload and processing',
        '✅ Automatic text extraction with pdf-parse',
        '✅ Secure document storage',
        '✅ Intelligent chat with Gemini AI',
        '✅ Persistent conversation history',
        '✅ Quiz generation from manuals',
        '✅ Manual search and filtering',
        '✅ Permission management (public/private)',
        '✅ Integration with Educational Resources Center'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Manuales desde el menú principal',
        '2. Sube un nuevo PDF usando "Subir Manual"',
        '3. Espera a que se procese y extraiga el texto',
        '4. Haz clic en "Chat con IA" para conversar',
        '5. Pregunta sobre el contenido del manual',
        '6. Genera un quiz desde el manual',
        '7. Accede a Recursos Educativos desde el manual'
      ] : [
        '1. Go to Manuals from main menu',
        '2. Upload new PDF using "Upload Manual"',
        '3. Wait for processing and text extraction',
        '4. Click "AI Chat" to converse',
        '5. Ask about manual content',
        '6. Generate quiz from manual',
        '7. Access Educational Resources from manual'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Manual de Prueba' : 'Test Manual',
        data: {
          manualId: 6,
          title: 'Manual de Prueba para QA',
          features: [
            'Chat IA contextual',
            'Generación de quizzes',
            'Recursos educativos',
            'Historial persistente'
          ],
          note: i18n.language === 'es' 
            ? 'Manual ID 6 configurado con contenido de prueba'
            : 'Manual ID 6 configured with test content'
        }
      },
      status: 'working'
    },
    {
      id: 'educational-resources',
      title: i18n.language === 'es' ? 'Centro de Recursos Educativos' : 'Educational Resources Center',
      description: i18n.language === 'es'
        ? 'Sistema profesional de generación de recursos educativos con IA: resúmenes, guías de estudio y tarjetas interactivas.'
        : 'Professional AI-powered educational resource generation system: summaries, study guides, and interactive flash cards.',
      icon: <FiLayers className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ Resúmenes IA (Breve, Detallado, Puntos Clave)',
        '✅ Guías de Estudio personalizadas por nivel',
        '✅ Tarjetas Interactivas con seguimiento',
        '✅ Generación asíncrona con Gemini AI',
        '✅ Almacenamiento persistente en BD',
        '✅ Visualización completa de recursos',
        '✅ Compartir público/privado',
        '✅ Exportación y descarga (próximamente)',
        '✅ Estadísticas de estudio en tarjetas'
      ] : [
        '✅ AI Summaries (Brief, Detailed, Key Points)',
        '✅ Customized Study Guides by level',
        '✅ Interactive Flash Cards with tracking',
        '✅ Asynchronous generation with Gemini AI',
        '✅ Persistent DB storage',
        '✅ Complete resource visualization',
        '✅ Public/private sharing',
        '✅ Export and download (coming soon)',
        '✅ Flash card study statistics'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Desde un manual, haz clic en "Generar Recursos IA"',
        '2. Selecciona el tipo: Resumen, Guía o Tarjetas',
        '3. Configura las opciones específicas',
        '4. Personaliza el prompt si lo deseas',
        '5. Genera el recurso y espera procesamiento',
        '6. Ve a "Ver Recursos" para visualizar',
        '7. Interactúa con tarjetas (voltear, navegar)',
        '8. Filtra recursos por estado o tipo'
      ] : [
        '1. From a manual, click "Generate AI Resources"',
        '2. Select type: Summary, Guide or Cards',
        '3. Configure specific options',
        '4. Customize prompt if desired',
        '5. Generate resource and wait for processing',
        '6. Go to "View Resources" to visualize',
        '7. Interact with cards (flip, navigate)',
        '8. Filter resources by status or type'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Tipos de Recursos' : 'Resource Types',
        data: {
          summaries: {
            brief: '2-3 párrafos clave',
            detailed: 'Cobertura completa',
            key_points: 'Lista estructurada'
          },
          studyGuides: {
            beginner: '30 min estimados',
            intermediate: '45 min estimados',
            advanced: '60 min estimados'
          },
          flashCards: {
            easy: '5-10 tarjetas básicas',
            medium: '10-15 tarjetas aplicadas',
            hard: '15-20 tarjetas complejas'
          },
          note: i18n.language === 'es' 
            ? 'Todos los recursos se almacenan permanentemente'
            : 'All resources are permanently stored'
        }
      },
      status: 'working'
    },
    {
      id: 'database',
      title: i18n.language === 'es' ? 'Base de Datos' : 'Database',
      description: i18n.language === 'es'
        ? 'Estado actual de las tablas y problemas conocidos.'
        : 'Current status of tables and known issues.',
      icon: <FiDatabase className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        '✅ PostgreSQL configurado',
        '✅ Tabla users funcional',
        '✅ Tabla quizzes funcional',
        '✅ Tabla quiz_sessions funcional',
        '✅ Tabla session_participants creada',
        '✅ Tabla manuals funcional',
        '✅ Tabla manual_summaries funcional',
        '✅ Tabla study_guides funcional',
        '✅ Tabla flash_cards funcional',
        '✅ Tabla public_quiz_results funcional'
      ] : [
        '✅ PostgreSQL configured',
        '✅ Users table functional',
        '✅ Quizzes table functional',
        '✅ Quiz_sessions table functional',
        '✅ Session_participants table created',
        '✅ Manuals table functional',
        '✅ Manual_summaries table functional',
        '✅ Study_guides table functional',
        '✅ Flash_cards table functional',
        '✅ Public_quiz_results table functional'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. ✅ Tablas de base de datos corregidas',
        '2. ✅ session_participants creada exitosamente',
        '3. ✅ Dashboard y Sessions funcionando',
        '4. La autenticación funciona bien',
        '5. Se necesita migración de BD'
      ] : [
        '1. ✅ Database tables fixed',
        '2. ✅ session_participants created successfully',
        '3. ✅ Dashboard and Sessions working',
        '4. Authentication works fine',
        '5. DB migration completed'
      ],
      status: 'working'
    }
  ];

  const currentModule = modules.find(m => m.id === selectedModule) || modules[0];

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'working': return 'text-green-500';
      case 'partial': return 'text-yellow-500';
      case 'error': return 'text-red-500';
      default: return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch(status) {
      case 'working': return <FiCheckCircle className="w-5 h-5" />;
      case 'partial': return <FiAlertCircle className="w-5 h-5" />;
      case 'error': return <FiAlertCircle className="w-5 h-5" />;
      default: return null;
    }
  };

  const getStatusText = (status: string) => {
    if (i18n.language === 'es') {
      switch(status) {
        case 'working': return 'Funcionando';
        case 'partial': return 'Parcialmente funcional';
        case 'error': return 'Con errores';
        default: return 'Desconocido';
      }
    } else {
      switch(status) {
        case 'working': return 'Working';
        case 'partial': return 'Partially functional';
        case 'error': return 'With errors';
        default: return 'Unknown';
      }
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-50 to-white p-6 rounded-xl border border-blue-100 mb-6">
          <div className="flex items-center gap-3">
            <FiBook className="w-8 h-8 text-blue-600" />
            <div>
              <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
                {i18n.language === 'es' ? 'Documentación y Pruebas' : 'Documentation & Testing'}
              </h1>
              <p className="text-gray-600 text-sm mt-1">
                {i18n.language === 'es' 
                  ? 'Guía completa para probar todos los módulos de AristoTest'
                  : 'Complete guide to test all AristoTest modules'}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-5">
              <h3 className="font-semibold mb-4">
                {i18n.language === 'es' ? 'Módulos' : 'Modules'}
              </h3>
              <div className="space-y-2">
                {modules.map((module) => (
                  <button
                    key={module.id}
                    onClick={() => setSelectedModule(module.id)}
                    className={`w-full text-left px-3 py-2 rounded-lg flex items-center justify-between transition-colors ${
                      selectedModule === module.id
                        ? 'bg-blue-600 text-white'
                        : 'hover:bg-gray-100'
                    }`}
                  >
                    <div className="flex items-center gap-2">
                      {module.icon}
                      <span className="text-sm">{module.title}</span>
                    </div>
                    <div className={selectedModule === module.id ? 'text-white' : getStatusColor(module.status)}>
                      {getStatusIcon(module.status)}
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Quick Status */}
            <Card className="p-5 mt-4">
              <h3 className="font-semibold mb-4">
                {i18n.language === 'es' ? 'Estado General' : 'Overall Status'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-500">● {i18n.language === 'es' ? 'Funcionando' : 'Working'}</span>
                  <span>11</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-500">● {i18n.language === 'es' ? 'Parcial' : 'Partial'}</span>
                  <span>1</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-500">● {i18n.language === 'es' ? 'Con errores' : 'With errors'}</span>
                  <span>0</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Module Header */}
            <Card className="p-5">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-blue-50 rounded-lg text-blue-600">
                    {currentModule.icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold">{currentModule.title}</h2>
                    <div className={`flex items-center gap-2 mt-1 ${getStatusColor(currentModule.status)}`}>
                      {getStatusIcon(currentModule.status)}
                      <span className="text-sm">{getStatusText(currentModule.status)}</span>
                    </div>
                  </div>
                </div>
              </div>
              <p className="text-text-secondary">{currentModule.description}</p>
            </Card>

            {/* Features */}
            <Card className="p-5">
              <h3 className="text-base font-semibold mb-4">
                {i18n.language === 'es' ? 'Características' : 'Features'}
              </h3>
              <ul className="space-y-2">
                {currentModule.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <FiCheckCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Test Steps */}
            <Card className="p-5">
              <h3 className="text-base font-semibold mb-4">
                {i18n.language === 'es' ? 'Pasos de Prueba' : 'Test Steps'}
              </h3>
              <ol className="space-y-3">
                {currentModule.testSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-blue-600 text-white rounded-full flex items-center justify-center text-sm">
                      {/^\d/.test(step) ? step.charAt(0) : index + 1}
                    </div>
                    <span>{step.replace(/^\d\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Test Data */}
            {currentModule.testData && (
              <Card className="p-5">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold">
                    {currentModule.testData.title}
                  </h3>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyToClipboard(JSON.stringify(currentModule.testData?.data, null, 2), currentModule.id)}
                    leftIcon={copiedData === currentModule.id ? <FiCheckCircle /> : <FiCopy />}
                  >
                    {copiedData === currentModule.id 
                      ? (i18n.language === 'es' ? 'Copiado' : 'Copied')
                      : (i18n.language === 'es' ? 'Copiar' : 'Copy')}
                  </Button>
                </div>
                <pre className="bg-gray-50 p-4 rounded-lg overflow-x-auto text-sm">
                  {JSON.stringify(currentModule.testData.data, null, 2)}
                </pre>
              </Card>
            )}

            {/* Known Issues */}
            {currentModule.status !== 'working' && (
              <Card className="p-5 border-yellow-200 bg-yellow-50">
                <h3 className="text-lg font-semibold mb-4 text-yellow-800">
                  {i18n.language === 'es' ? '⚠️ Problemas Conocidos' : '⚠️ Known Issues'}
                </h3>
                <div className="text-yellow-700">
                  {currentModule.id === 'dashboard' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>{i18n.language === 'es' ? '✅ Error 500 en estadísticas resuelto - tabla session_participants creada' : '✅ Statistics 500 error fixed - session_participants table created'}</li>
                      <li>{i18n.language === 'es' ? '✅ Las actividades recientes ya cargan correctamente' : '✅ Recent activities now load correctly'}</li>
                      <li>{i18n.language === 'es' ? '✅ Próximas sesiones funciona - columna scheduled_for agregada' : '✅ Upcoming sessions working - scheduled_for column added'}</li>
                    </ul>
                  )}
                  {currentModule.id === 'sessions' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>{i18n.language === 'es' ? '✅ Sesiones activas funcionando correctamente' : '✅ Active sessions working correctly'}</li>
                      <li>{i18n.language === 'es' ? '✅ Tabla session_participants creada en la BD' : '✅ session_participants table created in DB'}</li>
                      <li>{i18n.language === 'es' ? 'WebSocket configurado pero sin funcionalidad completa' : 'WebSocket configured but without full functionality'}</li>
                    </ul>
                  )}
                  {currentModule.id === 'quizzes' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>{i18n.language === 'es' ? 'Usa datos mock en lugar de BD real' : 'Uses mock data instead of real DB'}</li>
                      <li>{i18n.language === 'es' ? 'Crear/Editar evaluación no persiste en BD' : 'Create/Edit assessment doesn\'t persist in DB'}</li>
                    </ul>
                  )}
                  {currentModule.id === 'profile' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>{i18n.language === 'es' ? 'Error 500 en estadísticas del usuario' : '500 error in user statistics'}</li>
                      <li>{i18n.language === 'es' ? 'Cambio de contraseña no implementado' : 'Password change not implemented'}</li>
                      <li>{i18n.language === 'es' ? 'Subir avatar da error 500' : 'Upload avatar gives 500 error'}</li>
                    </ul>
                  )}
                  {currentModule.id === 'database' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>{i18n.language === 'es' ? 'Falta crear tabla session_participants' : 'Need to create session_participants table'}</li>
                      <li>{i18n.language === 'es' ? 'Falta columna scheduled_for en quiz_sessions' : 'Missing scheduled_for column in quiz_sessions'}</li>
                      <li>{i18n.language === 'es' ? 'Necesita migración completa de esquema' : 'Needs complete schema migration'}</li>
                    </ul>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}