import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { apiConfig, buildApiUrl } from '../config/api.config';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import { 
  FiBookOpen, 
  FiUsers, 
  FiActivity,
  FiAward,
  FiTrendingUp,
  FiClock,
  FiPlus,
  FiPlay,
  FiCalendar,
  FiChevronRight,
  FiTarget,
  FiZap,
  FiBell,
  FiBarChart2,
  FiPieChart,
  FiCheckCircle,
  FiXCircle,
  FiAlertCircle,
  FiArrowUp,
  FiArrowDown
} from 'react-icons/fi';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
} from 'chart.js';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

interface DashboardStats {
  // Quiz Metrics
  totalQuizzes: number;
  activeQuizzes: number;
  publicQuizzes: number;
  myQuizzes: number;
  
  // Session Metrics
  totalSessions: number;
  completedSessions: number;
  activeSessions: number;
  upcomingSessions: number;
  
  // Participation Metrics
  totalParticipants: number;
  totalResponses: number;
  passedResponses: number;
  failedResponses: number;
  
  // Performance Metrics
  averageScore: string;
  averageTotalPoints: string;
  highestScore: string;
  passRate: number;
  
  // Activity Metrics
  recentActivity: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
  
  // Category Data
  topCategories?: any[];
}

interface RecentActivity {
  id: number;
  type: 'quiz_created' | 'session_hosted' | 'quiz_taken' | 'session_joined' | 'student_joined';
  title: string;
  description: string;
  timestamp: string;
  icon: JSX.Element;
  color: string;
}

interface UpcomingSession {
  id: number;
  title: string;
  quizTitle: string;
  scheduledFor: string;
  participantsCount: number;
  status: 'scheduled' | 'starting_soon' | 'in_progress';
}

interface Notification {
  id: number;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
}

export default function Dashboard() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user, accessToken } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<DashboardStats>({
    // Quiz Metrics
    totalQuizzes: 0,
    activeQuizzes: 0,
    publicQuizzes: 0,
    myQuizzes: 0,
    
    // Session Metrics
    totalSessions: 0,
    completedSessions: 0,
    activeSessions: 0,
    upcomingSessions: 0,
    
    // Participation Metrics
    totalParticipants: 0,
    totalResponses: 0,
    passedResponses: 0,
    failedResponses: 0,
    
    // Performance Metrics
    averageScore: '0.0',
    averageTotalPoints: '0.0',
    highestScore: '0.0',
    passRate: 0,
    
    // Activity Metrics
    recentActivity: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    
    // Category Data
    topCategories: [],
  });
  const [recentActivities, setRecentActivities] = useState<RecentActivity[]>([]);
  const [upcomingSessions, setUpcomingSessions] = useState<UpcomingSession[]>([]);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [performanceData, setPerformanceData] = useState<any>(null);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsResponse = await fetch(buildApiUrl(apiConfig.endpoints.dashboard.stats), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData.data);
      }

      // Fetch recent activities
      const activitiesResponse = await fetch(buildApiUrl(apiConfig.endpoints.dashboard.activities), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (activitiesResponse.ok) {
        const activitiesData = await activitiesResponse.json();
        setRecentActivities(formatActivities(activitiesData.data));
      }

      // Fetch upcoming sessions
      const sessionsResponse = await fetch(buildApiUrl(apiConfig.endpoints.dashboard.upcomingSessions), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (sessionsResponse.ok) {
        const sessionsData = await sessionsResponse.json();
        setUpcomingSessions(sessionsData.data);
      }

      // Fetch notifications
      const notificationsResponse = await fetch(buildApiUrl('/dashboard/notifications'), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (notificationsResponse.ok) {
        const notificationsData = await notificationsResponse.json();
        setNotifications(notificationsData.data);
      }

      // Fetch performance data for charts
      const performanceResponse = await fetch(buildApiUrl('/dashboard/performance'), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (performanceResponse.ok) {
        const performanceData = await performanceResponse.json();
        setPerformanceData(performanceData.data);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatActivities = (activities: any[]): RecentActivity[] => {
    return activities.map(activity => ({
      ...activity,
      icon: getActivityIcon(activity.type),
      color: getActivityColor(activity.type),
    }));
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz_created':
        return <FiBookOpen size={20} />;
      case 'session_hosted':
        return <FiUsers size={20} />;
      case 'quiz_taken':
        return <FiAward size={20} />;
      case 'session_joined':
        return <FiActivity size={20} />;
      case 'student_joined':
        return <FiUsers size={20} />;
      default:
        return <FiActivity size={20} />;
    }
  };

  const getActivityColor = (type: string) => {
    switch (type) {
      case 'quiz_created':
        return 'text-blue-500';
      case 'session_hosted':
        return 'text-green-500';
      case 'quiz_taken':
        return 'text-purple-500';
      case 'session_joined':
        return 'text-orange-500';
      case 'student_joined':
        return 'text-teal-500';
      default:
        return 'text-gray-500';
    }
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return 'just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`;
    if (diffInSeconds < 2592000) return `${Math.floor(diffInSeconds / 86400)} days ago`;
    return past.toLocaleDateString();
  };

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'success':
        return <FiCheckCircle className="text-green-500" />;
      case 'warning':
        return <FiAlertCircle className="text-yellow-500" />;
      case 'error':
        return <FiXCircle className="text-red-500" />;
      default:
        return <FiBell className="text-blue-500" />;
    }
  };

  // Chart configurations with real data
  const lineChartData = {
    labels: performanceData?.weeklyLabels || ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'],
    datasets: [
      {
        label: 'Respuestas por Día',
        data: performanceData?.weeklyResponses || [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Participantes Únicos',
        data: performanceData?.weeklyParticipants || [0, 0, 0, 0, 0, 0, 0],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const barChartData = {
    labels: performanceData?.categoryLabels || ['General'],
    datasets: [
      {
        label: 'Puntuación Promedio',
        data: performanceData?.categoryScores || [0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(20, 184, 166, 0.8)',
        ],
      },
      {
        label: 'Total Intentos',
        data: performanceData?.categoryAttempts || [0],
        backgroundColor: [
          'rgba(99, 102, 241, 0.4)',
          'rgba(34, 197, 94, 0.4)',
          'rgba(168, 85, 247, 0.4)',
          'rgba(251, 146, 60, 0.4)',
          'rgba(20, 184, 166, 0.4)',
        ],
      },
    ],
  };

  const doughnutChartData = {
    labels: performanceData?.completionLabels || ['Aprobados', 'No Aprobados'],
    datasets: [
      {
        data: performanceData?.completionData || [0, 0],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',  // Green for passed
          'rgba(239, 68, 68, 0.8)',   // Red for failed
        ],
        borderWidth: 0,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        position: 'bottom' as const,
      },
    },
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {t('dashboard.welcome', { name: user?.firstName })}
        </h1>
        <p className="text-gray-600 mt-2">
          {t('dashboard.subtitle')}
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Button
          variant="primary"
          fullWidth
          leftIcon={<FiPlus />}
          onClick={() => navigate('/quizzes/create')}
          className="py-4"
        >
          {t('dashboard.quickActions.createQuiz')}
        </Button>
        <Button
          variant="outline"
          fullWidth
          leftIcon={<FiPlay />}
          onClick={() => navigate('/sessions/host')}
          className="py-4"
        >
          {t('common.start')} {t('sessions.title')}
        </Button>
        <Button
          variant="outline"
          fullWidth
          leftIcon={<FiUsers />}
          onClick={() => navigate('/join')}
          className="py-4"
        >
          {t('sessions.joinSession.joinButton')} {t('sessions.title')}
        </Button>
        <Button
          variant="outline"
          fullWidth
          leftIcon={<FiBarChart2 />}
          onClick={() => navigate('/results')}
          className="py-4"
        >
          {t('dashboard.quickActions.viewReports')}
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-8">
        {/* Total Quizzes */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Quizzes Creados</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalQuizzes}</p>
              <div className="flex items-center mt-1">
                <span className="text-xs text-green-600 mr-2">{stats.activeQuizzes} activos</span>
                <span className="text-xs text-blue-600">{stats.publicQuizzes} públicos</span>
              </div>
            </div>
            <div className="bg-blue-100 p-2 rounded-lg">
              <FiBookOpen className="text-blue-600" size={20} />
            </div>
          </div>
        </Card>

        {/* Total Responses */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Total Respuestas</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalResponses}</p>
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-500">{stats.recentActivity} esta semana</span>
              </div>
            </div>
            <div className="bg-green-100 p-2 rounded-lg">
              <FiActivity className="text-green-600" size={20} />
            </div>
          </div>
        </Card>

        {/* Participants */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Participantes Únicos</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.totalParticipants}</p>
              <div className="flex items-center mt-1">
                {stats.weeklyGrowth > 0 ? (
                  <FiArrowUp className="text-green-500 mr-1" size={12} />
                ) : (
                  <FiArrowDown className="text-red-500 mr-1" size={12} />
                )}
                <span className={`text-xs ${stats.weeklyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(stats.weeklyGrowth)} nuevos
                </span>
              </div>
            </div>
            <div className="bg-purple-100 p-2 rounded-lg">
              <FiUsers className="text-purple-600" size={20} />
            </div>
          </div>
        </Card>

        {/* Pass Rate */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Tasa de Aprobación</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{stats.passRate}%</p>
              <div className="flex items-center mt-1">
                <span className="text-xs text-green-600 mr-2">{stats.passedResponses} aprobados</span>
                <span className="text-xs text-red-600">{stats.failedResponses} reprobados</span>
              </div>
            </div>
            <div className="bg-emerald-100 p-2 rounded-lg">
              <FiTarget className="text-emerald-600" size={20} />
            </div>
          </div>
        </Card>

        {/* Average Score */}
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-gray-600">Puntuación Promedio</p>
              <p className="text-2xl font-bold text-gray-900 mt-1">{parseFloat(stats.averageScore).toFixed(0)}%</p>
              <div className="flex items-center mt-1">
                <span className="text-xs text-gray-500">Máx: {parseFloat(stats.highestScore).toFixed(0)}%</span>
              </div>
            </div>
            <div className="bg-orange-100 p-2 rounded-lg">
              <FiAward className="text-orange-600" size={20} />
            </div>
          </div>
        </Card>
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <Card className="p-4 bg-gradient-to-r from-blue-50 to-cyan-50 border-blue-200">
          <div className="flex items-center">
            <FiPlay className="text-blue-600 mr-3" size={20} />
            <div>
              <p className="text-sm font-semibold text-blue-900">Sesiones Activas</p>
              <p className="text-xl font-bold text-blue-600">{stats.activeSessions}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-green-50 to-emerald-50 border-green-200">
          <div className="flex items-center">
            <FiCheckCircle className="text-green-600 mr-3" size={20} />
            <div>
              <p className="text-sm font-semibold text-green-900">Sesiones Completadas</p>
              <p className="text-xl font-bold text-green-600">{stats.completedSessions}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-purple-50 to-pink-50 border-purple-200">
          <div className="flex items-center">
            <FiCalendar className="text-purple-600 mr-3" size={20} />
            <div>
              <p className="text-sm font-semibold text-purple-900">Próximas Sesiones</p>
              <p className="text-xl font-bold text-purple-600">{stats.upcomingSessions}</p>
            </div>
          </div>
        </Card>
        
        <Card className="p-4 bg-gradient-to-r from-orange-50 to-red-50 border-orange-200">
          <div className="flex items-center">
            <FiZap className="text-orange-600 mr-3" size={20} />
            <div>
              <p className="text-sm font-semibold text-orange-900">Actividad Reciente</p>
              <p className="text-xl font-bold text-orange-600">{stats.recentActivity}</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Charts */}
        <div className="lg:col-span-2 space-y-6">
          {/* Performance Chart */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Actividad Semanal</h2>
                <p className="text-sm text-gray-500">Respuestas y participantes por día</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/public-results')}>
                Ver Resultados
                <FiChevronRight className="ml-1" />
              </Button>
            </div>
            <div className="h-64">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </Card>

          {/* Quiz Performance by Category */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Rendimiento por Categoría</h2>
                <p className="text-sm text-gray-500">Puntuaciones promedio y total de intentos</p>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/quizzes')}>
                Ver Quizzes
                <FiChevronRight className="ml-1" />
              </Button>
            </div>
            <div className="h-64">
              <Bar data={barChartData} options={chartOptions} />
            </div>
          </Card>

          {/* Recent Activity */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.recentActivity.title')}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/activity')}>
                {t('dashboard.viewAll', { defaultValue: 'View All' })}
                <FiChevronRight className="ml-1" />
              </Button>
            </div>
            <div className="space-y-4">
              {recentActivities.length > 0 ? (
                recentActivities.slice(0, 5).map(activity => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className={`mt-1 ${activity.color}`}>
                      {activity.icon}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        <FiClock className="inline mr-1" size={10} />
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">{t('dashboard.recentActivity.noActivity')}</p>
              )}
            </div>
          </Card>
        </div>

        {/* Right Column - Sidebar */}
        <div className="space-y-6">
          {/* Pass/Fail Overview */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold">Resultados Generales</h2>
                <p className="text-sm text-gray-500">Distribución de aprobaciones</p>
              </div>
            </div>
            <div className="h-48">
              <Doughnut data={doughnutChartData} options={chartOptions} />
            </div>
            <div className="mt-4 space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  Aprobados
                </span>
                <div className="text-right">
                  <span className="font-medium">{stats.passedResponses}</span>
                  <p className="text-xs text-gray-500">{stats.passRate}%</p>
                </div>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  No Aprobados
                </span>
                <div className="text-right">
                  <span className="font-medium">{stats.failedResponses}</span>
                  <p className="text-xs text-gray-500">{100 - stats.passRate}%</p>
                </div>
              </div>
              <div className="border-t pt-2 mt-2">
                <div className="flex items-center justify-between text-sm font-medium">
                  <span>Total Respuestas</span>
                  <span>{stats.totalResponses}</span>
                </div>
              </div>
            </div>
          </Card>

          {/* Upcoming Sessions */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.upcomingSessions.title')}</h2>
              <Button variant="ghost" size="sm" onClick={() => navigate('/sessions')}>
                {t('dashboard.viewAll', { defaultValue: 'View All' })}
                <FiChevronRight className="ml-1" />
              </Button>
            </div>
            <div className="space-y-3">
              {upcomingSessions.length > 0 ? (
                upcomingSessions.slice(0, 3).map(session => (
                  <div key={session.id} className="border-l-4 border-primary pl-3 py-2">
                    <p className="text-sm font-medium text-gray-900">{session.title}</p>
                    <p className="text-xs text-gray-600">{session.quizTitle}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        <FiCalendar className="inline mr-1" size={10} />
                        {new Date(session.scheduledFor).toLocaleDateString()}
                      </span>
                      <span className={`text-xs px-2 py-1 rounded-full ${
                        session.status === 'starting_soon' 
                          ? 'bg-yellow-100 text-yellow-800'
                          : session.status === 'in_progress'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {session.status.replace('_', ' ')}
                      </span>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">{t('dashboard.upcomingSessions.noSessions')}</p>
              )}
            </div>
          </Card>

          {/* Notifications */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.notifications.title')}</h2>
              <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full">
                {notifications.filter(n => !n.read).length}
              </span>
            </div>
            <div className="space-y-3">
              {notifications.length > 0 ? (
                notifications.slice(0, 4).map(notification => (
                  <div key={notification.id} className={`flex items-start gap-3 ${!notification.read ? 'bg-blue-50 -mx-2 px-2 py-2 rounded' : ''}`}>
                    <div className="mt-1">
                      {getNotificationIcon(notification.type)}
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{notification.title}</p>
                      <p className="text-xs text-gray-500">{notification.message}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {formatRelativeTime(notification.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-gray-500">{t('dashboard.notifications.noNotifications')}</p>
              )}
            </div>
          </Card>

          {/* MVP Metrics for Quality Team */}
          <Card className="p-6 bg-gradient-to-br from-primary to-secondary text-white">
            <div className="flex items-center mb-4">
              <FiTarget className="mr-2" size={20} />
              <h2 className="text-lg font-semibold">Métricas MVP</h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Tasa de Éxito</span>
                  <span>{stats.passRate}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${Math.min(stats.passRate, 100)}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Quizzes Activos</span>
                  <span>{stats.activeQuizzes}/{stats.totalQuizzes}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div 
                    className="bg-white h-2 rounded-full transition-all duration-300" 
                    style={{ width: `${stats.totalQuizzes > 0 ? (stats.activeQuizzes / stats.totalQuizzes) * 100 : 0}%` }}
                  ></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>Participación Única</span>
                  <span>{stats.totalParticipants}</span>
                </div>
                <div className="text-xs opacity-80 mt-1">
                  {stats.totalResponses} respuestas totales
                </div>
              </div>
              <div className="pt-2 border-t border-white/20">
                <div className="grid grid-cols-2 gap-4 text-center">
                  <div>
                    <div className="text-2xl font-bold">{parseFloat(stats.averageScore).toFixed(0)}%</div>
                    <div className="text-xs opacity-80">Prom. General</div>
                  </div>
                  <div>
                    <div className="text-2xl font-bold">{stats.recentActivity}</div>
                    <div className="text-xs opacity-80">Esta Semana</div>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* System Status for MVP */}
          <Card className="p-6">
            <div className="flex items-center mb-4">
              <FiCheckCircle className="text-green-500 mr-2" size={20} />
              <h2 className="text-lg font-semibold">Estado del Sistema</h2>
            </div>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <FiCheckCircle className="text-green-500 mr-2" size={16} />
                  <span className="text-sm font-medium">Sistema de Calificación</span>
                </div>
                <span className="text-xs text-green-700 font-medium">ACTIVO</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <FiCheckCircle className="text-green-500 mr-2" size={16} />
                  <span className="text-sm font-medium">Resultados Públicos</span>
                </div>
                <span className="text-xs text-green-700 font-medium">ACTIVO</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                <div className="flex items-center">
                  <FiCheckCircle className="text-green-500 mr-2" size={16} />
                  <span className="text-sm font-medium">Generación PDF</span>
                </div>
                <span className="text-xs text-green-700 font-medium">ACTIVO</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center">
                  <FiActivity className="text-blue-500 mr-2" size={16} />
                  <span className="text-sm font-medium">Base de Datos</span>
                </div>
                <span className="text-xs text-blue-700 font-medium">PostgreSQL</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}