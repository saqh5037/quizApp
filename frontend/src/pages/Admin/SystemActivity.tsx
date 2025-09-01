import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  ArrowLeft, 
  Activity, 
  Users, 
  Building2, 
  GraduationCap, 
  FileText,
  Calendar,
  TrendingUp,
  Clock,
  AlertCircle,
  CheckCircle,
  XCircle
} from 'lucide-react';
import api from '../../services/api';

interface SystemStats {
  totalUsers: number;
  totalTenants: number;
  totalQuizzes: number;
  totalSessions: number;
  activeUsers: number;
  activeSessions: number;
  systemHealth: 'healthy' | 'warning' | 'critical';
}

interface ActivityLog {
  id: number;
  action: string;
  description: string;
  userId: number;
  userName: string;
  tenantId: number;
  tenantName: string;
  timestamp: string;
  level: 'info' | 'warning' | 'error';
}

const SystemActivity: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState<SystemStats | null>(null);
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [selectedLevel, setSelectedLevel] = useState<string>('all');

  useEffect(() => {
    fetchSystemData();
  }, []);

  const fetchSystemData = async () => {
    try {
      setLoading(true);
      const [statsResponse, activitiesResponse] = await Promise.all([
        api.get('/admin/system/stats'),
        api.get('/admin/system/activities')
      ]);

      if (statsResponse.success && statsResponse.data) {
        setStats(statsResponse.data);
      }

      if (activitiesResponse.success && activitiesResponse.data) {
        setActivities(activitiesResponse.data);
      }
    } catch (error: any) {
      console.error('Error fetching system data:', error);
      setError('Error al cargar los datos del sistema');
    } finally {
      setLoading(false);
    }
  };

  const getHealthColor = (health: string) => {
    switch (health) {
      case 'healthy': return 'text-green-600 bg-green-100 dark:bg-green-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'critical': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const getHealthIcon = (health: string) => {
    switch (health) {
      case 'healthy': return <CheckCircle className="h-5 w-5" />;
      case 'warning': return <AlertCircle className="h-5 w-5" />;
      case 'critical': return <XCircle className="h-5 w-5" />;
      default: return <Activity className="h-5 w-5" />;
    }
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'info': return 'text-blue-600 bg-blue-100 dark:bg-blue-900/20';
      case 'warning': return 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20';
      case 'error': return 'text-red-600 bg-red-100 dark:bg-red-900/20';
      default: return 'text-gray-600 bg-gray-100 dark:bg-gray-900/20';
    }
  };

  const filteredActivities = selectedLevel === 'all' 
    ? activities 
    : activities.filter(activity => activity.level === selectedLevel);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('es-ES', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Link
            to="/admin"
            className="p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Link to="/admin" className="text-gray-500 hover:text-gray-700">
                Administración
              </Link>
              <span className="text-gray-500">/</span>
              <span className="text-gray-900 dark:text-white">Actividad del Sistema</span>
            </div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Activity className="h-8 w-8" />
              Actividad del Sistema
            </h1>
            <p className="text-gray-600 dark:text-gray-400 mt-1">
              Monitor del estado y actividad del sistema
            </p>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 p-4 rounded-lg mb-6">
            {error}
          </div>
        )}

        {/* System Health & Stats */}
        {stats && (
          <div className="mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              {/* System Health */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Estado del Sistema</p>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium mt-2 ${getHealthColor(stats.systemHealth)}`}>
                      {getHealthIcon(stats.systemHealth)}
                      {stats.systemHealth === 'healthy' ? 'Saludable' : 
                       stats.systemHealth === 'warning' ? 'Advertencia' : 'Crítico'}
                    </div>
                  </div>
                </div>
              </div>

              {/* Active Users */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Usuarios Activos</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeUsers}</p>
                    <p className="text-sm text-gray-500">de {stats.totalUsers} total</p>
                  </div>
                  <Users className="h-8 w-8 text-blue-500" />
                </div>
              </div>

              {/* Active Sessions */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Sesiones Activas</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.activeSessions}</p>
                    <p className="text-sm text-gray-500">de {stats.totalSessions} total</p>
                  </div>
                  <TrendingUp className="h-8 w-8 text-green-500" />
                </div>
              </div>

              {/* Total Tenants */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Organizaciones</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalTenants}</p>
                    <p className="text-sm text-gray-500">tenants registrados</p>
                  </div>
                  <Building2 className="h-8 w-8 text-purple-500" />
                </div>
              </div>
            </div>

            {/* Additional Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Quizzes Creados</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">{stats.totalQuizzes}</p>
                    <p className="text-sm text-gray-500">contenido educativo</p>
                  </div>
                  <GraduationCap className="h-8 w-8 text-indigo-500" />
                </div>
              </div>

              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-400">Tiempo de Actividad</p>
                    <p className="text-3xl font-bold text-gray-900 dark:text-white">99.9%</p>
                    <p className="text-sm text-gray-500">uptime del sistema</p>
                  </div>
                  <Clock className="h-8 w-8 text-orange-500" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Activity Log */}
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Registro de Actividad
              </h2>
              <div className="flex items-center gap-4">
                <select
                  value={selectedLevel}
                  onChange={(e) => setSelectedLevel(e.target.value)}
                  className="px-3 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white text-sm"
                >
                  <option value="all">Todos los niveles</option>
                  <option value="info">Información</option>
                  <option value="warning">Advertencias</option>
                  <option value="error">Errores</option>
                </select>
                <button
                  onClick={fetchSystemData}
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded-lg text-sm transition-colors"
                >
                  Actualizar
                </button>
              </div>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto">
            {filteredActivities.length === 0 ? (
              <div className="p-8 text-center text-gray-500 dark:text-gray-400">
                <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No hay actividad registrada</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                {filteredActivities.map((activity) => (
                  <div key={activity.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700/50">
                    <div className="flex items-start gap-4">
                      <div className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs font-medium ${getLevelColor(activity.level)}`}>
                        {activity.level.toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {activity.action}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {formatDate(activity.timestamp)}
                          </p>
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                          {activity.description}
                        </p>
                        <div className="flex items-center gap-4 mt-2 text-xs text-gray-500 dark:text-gray-400">
                          <span>Usuario: {activity.userName}</span>
                          <span>•</span>
                          <span>Tenant: {activity.tenantName}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SystemActivity;