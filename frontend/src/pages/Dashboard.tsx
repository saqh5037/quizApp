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
  totalQuizzes: number;
  totalSessions: number;
  totalStudents: number;
  averageScore: number;
  completionRate: number;
  activeQuizzes: number;
  upcomingSessions: number;
  recentActivities: number;
  weeklyGrowth: number;
  monthlyGrowth: number;
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
    totalQuizzes: 0,
    totalSessions: 0,
    totalStudents: 0,
    averageScore: 0,
    completionRate: 0,
    activeQuizzes: 0,
    upcomingSessions: 0,
    recentActivities: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
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

  // Chart configurations
  const lineChartData = {
    labels: performanceData?.weeklyLabels || ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
    datasets: [
      {
        label: 'Sessions',
        data: performanceData?.weeklySessions || [12, 19, 15, 25, 22, 30, 28],
        borderColor: 'rgb(99, 102, 241)',
        backgroundColor: 'rgba(99, 102, 241, 0.1)',
        tension: 0.4,
        fill: true,
      },
      {
        label: 'Participants',
        data: performanceData?.weeklyParticipants || [65, 89, 76, 125, 110, 145, 132],
        borderColor: 'rgb(34, 197, 94)',
        backgroundColor: 'rgba(34, 197, 94, 0.1)',
        tension: 0.4,
        fill: true,
      },
    ],
  };

  const barChartData = {
    labels: performanceData?.quizLabels || ['Math', 'Science', 'History', 'English', 'Geography'],
    datasets: [
      {
        label: 'Average Score',
        data: performanceData?.quizScores || [85, 78, 92, 88, 75],
        backgroundColor: [
          'rgba(99, 102, 241, 0.8)',
          'rgba(34, 197, 94, 0.8)',
          'rgba(168, 85, 247, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(20, 184, 166, 0.8)',
        ],
      },
    ],
  };

  const doughnutChartData = {
    labels: ['Completed', 'In Progress', 'Not Started'],
    datasets: [
      {
        data: performanceData?.completionData || [65, 25, 10],
        backgroundColor: [
          'rgba(34, 197, 94, 0.8)',
          'rgba(251, 146, 60, 0.8)',
          'rgba(239, 68, 68, 0.8)',
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.totalQuizzes')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalQuizzes}</p>
              <div className="flex items-center mt-2">
                {stats.weeklyGrowth > 0 ? (
                  <FiArrowUp className="text-green-500 mr-1" />
                ) : (
                  <FiArrowDown className="text-red-500 mr-1" />
                )}
                <span className={`text-sm ${stats.weeklyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(stats.weeklyGrowth)}% {t('dashboard.thisWeek', { defaultValue: 'this week' })}
                </span>
              </div>
            </div>
            <div className="bg-blue-100 p-3 rounded-lg">
              <FiBookOpen className="text-blue-500" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.totalSessions', { defaultValue: 'Total Sessions' })}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalSessions}</p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500">{stats.upcomingSessions} {t('dashboard.upcoming', { defaultValue: 'upcoming' })}</span>
              </div>
            </div>
            <div className="bg-green-100 p-3 rounded-lg">
              <FiActivity className="text-green-500" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.totalStudents')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.totalStudents}</p>
              <div className="flex items-center mt-2">
                {stats.monthlyGrowth > 0 ? (
                  <FiArrowUp className="text-green-500 mr-1" />
                ) : (
                  <FiArrowDown className="text-red-500 mr-1" />
                )}
                <span className={`text-sm ${stats.monthlyGrowth > 0 ? 'text-green-500' : 'text-red-500'}`}>
                  {Math.abs(stats.monthlyGrowth)}% {t('dashboard.thisMonth', { defaultValue: 'this month' })}
                </span>
              </div>
            </div>
            <div className="bg-purple-100 p-3 rounded-lg">
              <FiUsers className="text-purple-500" size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">{t('dashboard.stats.averageScore')}</p>
              <p className="text-3xl font-bold text-gray-900 mt-2">{stats.averageScore}%</p>
              <div className="flex items-center mt-2">
                <span className="text-sm text-gray-500">{stats.completionRate}% {t('dashboard.completion', { defaultValue: 'completion' })}</span>
              </div>
            </div>
            <div className="bg-orange-100 p-3 rounded-lg">
              <FiAward className="text-orange-500" size={24} />
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
              <h2 className="text-lg font-semibold">{t('dashboard.weeklyPerformance', { defaultValue: 'Weekly Performance' })}</h2>
              <Button variant="ghost" size="sm">
                {t('dashboard.viewDetails', { defaultValue: 'View Details' })}
                <FiChevronRight className="ml-1" />
              </Button>
            </div>
            <div className="h-64">
              <Line data={lineChartData} options={chartOptions} />
            </div>
          </Card>

          {/* Quiz Scores by Category */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold">{t('dashboard.performanceByCategory', { defaultValue: 'Quiz Performance by Category' })}</h2>
              <Button variant="ghost" size="sm">
                {t('dashboard.viewAll', { defaultValue: 'View All' })}
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
          {/* Completion Overview */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('dashboard.completionOverview', { defaultValue: 'Completion Overview' })}</h2>
            <div className="h-48">
              <Doughnut data={doughnutChartData} options={chartOptions} />
            </div>
            <div className="mt-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-green-500 rounded-full mr-2"></span>
                  {t('dashboard.completed', { defaultValue: 'Completed' })}
                </span>
                <span className="font-medium">65%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-orange-500 rounded-full mr-2"></span>
                  {t('dashboard.inProgress', { defaultValue: 'In Progress' })}
                </span>
                <span className="font-medium">25%</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="flex items-center">
                  <span className="w-3 h-3 bg-red-500 rounded-full mr-2"></span>
                  {t('dashboard.notStarted', { defaultValue: 'Not Started' })}
                </span>
                <span className="font-medium">10%</span>
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

          {/* Quick Stats */}
          <Card className="p-6 bg-gradient-to-br from-primary to-secondary text-white">
            <h2 className="text-lg font-semibold mb-4">{t('dashboard.goalsTargets', { defaultValue: 'Goals & Targets' })}</h2>
            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{t('dashboard.weeklyTarget', { defaultValue: 'Weekly Target' })}</span>
                  <span>8/10 {t('sessions.title')}</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '80%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{t('dashboard.studentEngagement', { defaultValue: 'Student Engagement' })}</span>
                  <span>85%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '85%' }}></div>
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-sm mb-1">
                  <span>{t('dashboard.quizCompletion', { defaultValue: 'Quiz Completion' })}</span>
                  <span>92%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-2">
                  <div className="bg-white h-2 rounded-full" style={{ width: '92%' }}></div>
                </div>
              </div>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}