import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { FiBook, FiPlay, FiUsers, FiBarChart2, FiSettings, FiDatabase, FiCheckCircle, FiAlertCircle, FiCopy } from 'react-icons/fi';
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
      status: 'partial'
    },
    {
      id: 'quizzes',
      title: i18n.language === 'es' ? 'Evaluaciones' : 'Assessments',
      description: i18n.language === 'es'
        ? 'Crear y gestionar evaluaciones con diferentes tipos de preguntas.'
        : 'Create and manage assessments with different question types.',
      icon: <FiBook className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Lista de evaluaciones con datos mock',
        'Crear nueva evaluación (formulario básico)',
        'Editar evaluación existente',
        'Duplicar evaluación',
        'Eliminar evaluación',
        'Filtros por estado y búsqueda'
      ] : [
        'Assessment list with mock data',
        'Create new assessment (basic form)',
        'Edit existing assessment',
        'Duplicate assessment',
        'Delete assessment',
        'Filters by status and search'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Evaluaciones',
        '2. Observa la lista (usa datos mock)',
        '3. Prueba los filtros (Todos/Público/Privado)',
        '4. Intenta crear una nueva evaluación',
        '5. Prueba editar/duplicar/eliminar'
      ] : [
        '1. Go to Assessments',
        '2. Check the list (uses mock data)',
        '3. Test filters (All/Public/Private)',
        '4. Try creating a new assessment',
        '5. Test edit/duplicate/delete'
      ],
      testData: {
        title: i18n.language === 'es' ? 'Evaluación de Ejemplo' : 'Sample Assessment',
        data: {
          title: i18n.language === 'es' ? 'Matemáticas Básicas' : 'Basic Mathematics',
          description: i18n.language === 'es' 
            ? 'Evaluación de conceptos matemáticos fundamentales'
            : 'Assessment of fundamental mathematical concepts',
          category: i18n.language === 'es' ? 'Matemáticas' : 'Mathematics',
          difficulty: 'medium',
          timeLimit: 30,
          questions: [
            {
              question: '2 + 2 = ?',
              type: 'multiple_choice',
              options: ['3', '4', '5', '6'],
              correctAnswer: '4'
            }
          ]
        }
      },
      status: 'partial'
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
      status: 'error'
    },
    {
      id: 'results',
      title: i18n.language === 'es' ? 'Resultados' : 'Results',
      description: i18n.language === 'es'
        ? 'Análisis detallado de resultados de evaluaciones.'
        : 'Detailed analysis of assessment results.',
      icon: <FiBarChart2 className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'Vista de resultados por sesión',
        'Estadísticas detalladas',
        'Análisis por pregunta',
        'Exportar a PDF',
        'Exportar a Excel',
        'Enviar por correo'
      ] : [
        'Session results view',
        'Detailed statistics',
        'Question analysis',
        'Export to PDF',
        'Export to Excel',
        'Send by email'
      ],
      testSteps: i18n.language === 'es' ? [
        '1. Ve a Resultados',
        '2. Verás "No hay resultados disponibles"',
        '3. Esto es normal sin sesiones completadas',
        '4. Las funciones de exportación están preparadas',
        '5. Se activarán con datos reales'
      ] : [
        '1. Go to Results',
        '2. You\'ll see "No results available"',
        '3. This is normal without completed sessions',
        '4. Export functions are ready',
        '5. They\'ll activate with real data'
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
      id: 'database',
      title: i18n.language === 'es' ? 'Base de Datos' : 'Database',
      description: i18n.language === 'es'
        ? 'Estado actual de las tablas y problemas conocidos.'
        : 'Current status of tables and known issues.',
      icon: <FiDatabase className="w-5 h-5" />,
      features: i18n.language === 'es' ? [
        'PostgreSQL configurado',
        'Tabla users funcional',
        'Tabla quizzes funcional',
        'Tabla quiz_sessions funcional',
        'Tabla session_participants FALTANTE',
        'Tabla participants problemática'
      ] : [
        'PostgreSQL configured',
        'Users table functional',
        'Quizzes table functional',
        'Quiz_sessions table functional',
        'Session_participants table MISSING',
        'Participants table problematic'
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
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-primary">
            {i18n.language === 'es' ? 'Documentación y Pruebas' : 'Documentation & Testing'}
          </h1>
          <p className="text-text-secondary mt-2">
            {i18n.language === 'es' 
              ? 'Guía completa para probar todos los módulos de AristoTest'
              : 'Complete guide to test all AristoTest modules'}
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Sidebar */}
          <div className="lg:col-span-1">
            <Card className="p-4">
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
                        ? 'bg-primary text-white'
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
            <Card className="p-4 mt-4">
              <h3 className="font-semibold mb-4">
                {i18n.language === 'es' ? 'Estado General' : 'Overall Status'}
              </h3>
              <div className="space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-green-500">● {i18n.language === 'es' ? 'Funcionando' : 'Working'}</span>
                  <span>3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-yellow-500">● {i18n.language === 'es' ? 'Parcial' : 'Partial'}</span>
                  <span>3</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-red-500">● {i18n.language === 'es' ? 'Con errores' : 'With errors'}</span>
                  <span>2</span>
                </div>
              </div>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3 space-y-6">
            {/* Module Header */}
            <Card className="p-6">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-3 bg-primary/10 rounded-lg text-primary">
                    {currentModule.icon}
                  </div>
                  <div>
                    <h2 className="text-2xl font-bold">{currentModule.title}</h2>
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
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {i18n.language === 'es' ? 'Características' : 'Features'}
              </h3>
              <ul className="space-y-2">
                {currentModule.features.map((feature, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <FiCheckCircle className="w-5 h-5 text-primary mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>
            </Card>

            {/* Test Steps */}
            <Card className="p-6">
              <h3 className="text-lg font-semibold mb-4">
                {i18n.language === 'es' ? 'Pasos de Prueba' : 'Test Steps'}
              </h3>
              <ol className="space-y-3">
                {currentModule.testSteps.map((step, index) => (
                  <li key={index} className="flex items-start gap-3">
                    <div className="flex-shrink-0 w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center text-sm">
                      {/^\d/.test(step) ? step.charAt(0) : index + 1}
                    </div>
                    <span>{step.replace(/^\d\.\s*/, '')}</span>
                  </li>
                ))}
              </ol>
            </Card>

            {/* Test Data */}
            {currentModule.testData && (
              <Card className="p-6">
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
              <Card className="p-6 border-yellow-200 bg-yellow-50">
                <h3 className="text-lg font-semibold mb-4 text-yellow-800">
                  {i18n.language === 'es' ? '⚠️ Problemas Conocidos' : '⚠️ Known Issues'}
                </h3>
                <div className="text-yellow-700">
                  {currentModule.id === 'dashboard' && (
                    <ul className="list-disc list-inside space-y-1">
                      <li>{i18n.language === 'es' ? 'Error 500 en estadísticas por tabla session_participants faltante' : '500 error in statistics due to missing session_participants table'}</li>
                      <li>{i18n.language === 'es' ? 'Las actividades recientes no cargan' : 'Recent activities don\'t load'}</li>
                      <li>{i18n.language === 'es' ? 'Próximas sesiones da error por columna scheduled_for' : 'Upcoming sessions error due to scheduled_for column'}</li>
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