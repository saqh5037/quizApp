import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { apiConfig, buildApiUrl } from '../config/api.config';
import Card from '../components/common/Card';
import Button from '../components/common/Button';
import Input from '../components/common/Input';
import { 
  FiUser, 
  FiMail, 
  FiLock, 
  FiCalendar, 
  FiEdit2, 
  FiSave, 
  FiX,
  FiCamera,
  FiActivity,
  FiAward,
  FiBookOpen,
  FiUsers,
  FiTrendingUp,
  FiSettings,
  FiTrash2,
  FiShield,
  FiClock
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface UserStats {
  totalQuizzes: number;
  totalSessions: number;
  totalParticipations: number;
  averageScore: number;
  quizzesCreated: number;
  sessionsHosted: number;
  studentsReached: number;
  lastActivity: string;
}

interface ActivityItem {
  id: number;
  type: 'quiz_created' | 'session_hosted' | 'quiz_taken' | 'session_joined';
  title: string;
  description: string;
  timestamp: string;
  icon: JSX.Element;
}

export default function Profile() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const { user, accessToken, logout, updateUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [editMode, setEditMode] = useState(false);
  const [loading, setLoading] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [deletingAccount, setDeletingAccount] = useState(false);
  
  // Form states
  const [formData, setFormData] = useState({
    firstName: user?.firstName || '',
    lastName: user?.lastName || '',
    email: user?.email || '',
    phone: user?.phone || '',
    bio: user?.bio || '',
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });
  
  const [preferences, setPreferences] = useState({
    emailNotifications: true,
    smsNotifications: false,
    publicProfile: true,
    showActivity: true,
  });
  
  const [stats, setStats] = useState<UserStats>({
    totalQuizzes: 0,
    totalSessions: 0,
    totalParticipations: 0,
    averageScore: 0,
    quizzesCreated: 0,
    sessionsHosted: 0,
    studentsReached: 0,
    lastActivity: '',
  });
  
  const [activities, setActivities] = useState<ActivityItem[]>([]);
  const [loadingStats, setLoadingStats] = useState(true);

  useEffect(() => {
    if (user) {
      setFormData({
        firstName: user.firstName || '',
        lastName: user.lastName || '',
        email: user.email || '',
        phone: user.phone || '',
        bio: user.bio || '',
      });
      fetchUserStats();
      fetchRecentActivity();
    }
  }, [user]);

  const fetchUserStats = async () => {
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.users.stats), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setStats(data.data);
      }
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoadingStats(false);
    }
  };

  const fetchRecentActivity = async () => {
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.users.activity), {
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const formattedActivities = data.data.map((item: any) => ({
          ...item,
          icon: getActivityIcon(item.type),
        }));
        setActivities(formattedActivities);
      }
    } catch (error) {
      console.error('Error fetching activity:', error);
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'quiz_created':
        return <FiBookOpen className="text-blue-500" />;
      case 'session_hosted':
        return <FiUsers className="text-green-500" />;
      case 'quiz_taken':
        return <FiAward className="text-purple-500" />;
      case 'session_joined':
        return <FiActivity className="text-orange-500" />;
      default:
        return <FiActivity className="text-gray-500" />;
    }
  };

  const handleUpdateProfile = async () => {
    setLoading(true);
    try {
      const response = await fetch(buildApiUrl(apiConfig.endpoints.users.updateProfile), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        const data = await response.json();
        updateUser(data.data);
        toast.success(t('profile.profileUpdatedSuccess'));
        setEditMode(false);
      } else {
        toast.error(t('profile.profileUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      toast.error(t('profile.selectImageFile'));
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error(t('profile.imageSizeLimit'));
      return;
    }

    setUploadingAvatar(true);
    const formData = new FormData();
    formData.append('avatar', file);

    try {
      const response = await fetch(buildApiUrl('/users/avatar'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        updateUser({ ...user, avatar: data.data.avatarUrl });
        toast.success(t('profile.avatarUpdatedSuccess'));
      } else {
        toast.error(t('profile.avatarUploadFailed'));
      }
    } catch (error) {
      console.error('Error uploading avatar:', error);
      toast.error('Failed to upload avatar');
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handleChangePassword = async () => {
    if (passwordData.newPassword !== passwordData.confirmPassword) {
      toast.error(t('profile.passwordsDoNotMatch'));
      return;
    }

    if (passwordData.newPassword.length < 8) {
      toast.error(t('profile.passwordMinLength'));
      return;
    }

    setChangingPassword(true);
    try {
      const response = await fetch(buildApiUrl('/users/change-password'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: passwordData.currentPassword,
          newPassword: passwordData.newPassword,
        }),
      });

      if (response.ok) {
        toast.success(t('profile.passwordChangedSuccess'));
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: '',
        });
      } else {
        const data = await response.json();
        toast.error(data.message || t('profile.passwordChangeFailed'));
      }
    } catch (error) {
      console.error('Error changing password:', error);
      toast.error(t('profile.passwordChangeFailed'));
    } finally {
      setChangingPassword(false);
    }
  };

  const handleUpdatePreferences = async () => {
    try {
      const response = await fetch(buildApiUrl('/users/preferences'), {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(preferences),
      });

      if (response.ok) {
        toast.success(t('profile.preferencesUpdatedSuccess'));
      } else {
        toast.error(t('profile.preferencesUpdateFailed'));
      }
    } catch (error) {
      console.error('Error updating preferences:', error);
      toast.error('Failed to update preferences');
    }
  };

  const handleDeleteAccount = async () => {
    if (!window.confirm(t('profile.confirmDeleteAccount'))) {
      return;
    }

    setDeletingAccount(true);
    try {
      const response = await fetch(buildApiUrl('/users/account'), {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
        },
      });

      if (response.ok) {
        toast.success(t('profile.accountDeletedSuccess'));
        logout();
        navigate('/login');
      } else {
        toast.error(t('profile.accountDeleteFailed'));
      }
    } catch (error) {
      console.error('Error deleting account:', error);
      toast.error('Failed to delete account');
    } finally {
      setDeletingAccount(false);
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatRelativeTime = (date: string) => {
    const now = new Date();
    const past = new Date(date);
    const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
    
    if (diffInSeconds < 60) return t('profile.timeJustNow');
    if (diffInSeconds < 3600) return t('profile.timeMinutesAgo', { count: Math.floor(diffInSeconds / 60) });
    if (diffInSeconds < 86400) return t('profile.timeHoursAgo', { count: Math.floor(diffInSeconds / 3600) });
    if (diffInSeconds < 2592000) return t('profile.timeDaysAgo', { count: Math.floor(diffInSeconds / 86400) });
    return formatDate(date);
  };

  if (!user) {
    return (
      <div className="p-8 text-center">
        <p>{t('profile.pleaseLogin')}</p>
        <Button onClick={() => navigate('/login')} className="mt-4">
          {t('profile.goToLogin')}
        </Button>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">{t('profile.title')}</h1>
          <p className="text-gray-600 mt-1">{t('profile.subtitle')}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Profile Info */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Information */}
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold">{t('profile.personalInformation')}</h2>
              {!editMode ? (
                <Button
                  variant="outline"
                  size="sm"
                  leftIcon={<FiEdit2 />}
                  onClick={() => setEditMode(true)}
                >
                  {t('profile.edit')}
                </Button>
              ) : (
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    leftIcon={<FiX />}
                    onClick={() => {
                      setEditMode(false);
                      setFormData({
                        firstName: user.firstName || '',
                        lastName: user.lastName || '',
                        email: user.email || '',
                        phone: user.phone || '',
                        bio: user.bio || '',
                      });
                    }}
                  >
                    {t('profile.cancel')}
                  </Button>
                  <Button
                    variant="primary"
                    size="sm"
                    leftIcon={<FiSave />}
                    onClick={handleUpdateProfile}
                    loading={loading}
                  >
                    {t('profile.save')}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-start gap-6">
              {/* Avatar */}
              <div className="relative">
                <div className="w-24 h-24 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white text-2xl font-bold overflow-hidden">
                  {user.avatar ? (
                    <img src={user.avatar} alt={user.firstName} className="w-full h-full object-cover" />
                  ) : (
                    `${user.firstName?.[0] || ''}${user.lastName?.[0] || ''}`
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute bottom-0 right-0 bg-primary text-white rounded-full p-2 hover:bg-primary-dark transition-colors"
                  disabled={uploadingAvatar}
                >
                  <FiCamera size={14} />
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleAvatarUpload}
                  className="hidden"
                />
              </div>

              {/* Form Fields */}
              <div className="flex-1 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.firstName')}
                    </label>
                    <Input
                      value={formData.firstName}
                      onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                      disabled={!editMode}
                      leftIcon={<FiUser />}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      {t('profile.lastName')}
                    </label>
                    <Input
                      value={formData.lastName}
                      onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                      disabled={!editMode}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.email')}
                  </label>
                  <Input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    disabled={!editMode}
                    leftIcon={<FiMail />}
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.bio')}
                  </label>
                  <textarea
                    value={formData.bio}
                    onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                    disabled={!editMode}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary disabled:bg-gray-50"
                    placeholder={t('profile.bioPlaceholder')}
                  />
                </div>

                <div className="flex items-center gap-4 text-sm text-gray-600">
                  <div className="flex items-center gap-1">
                    <FiCalendar />
                    <span>{t('profile.joined')} {formatDate(user.createdAt || new Date().toISOString())}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <FiShield />
                    <span className="capitalize">{t(`profile.${user.role}Account`)}</span>
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Statistics */}
          {user.role === 'teacher' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('profile.teachingStatistics')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FiBookOpen className="text-blue-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.quizzesCreated}</p>
                  <p className="text-sm text-gray-600">{t('profile.quizzesCreated')}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <FiUsers className="text-green-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.sessionsHosted}</p>
                  <p className="text-sm text-gray-600">{t('profile.sessionsHosted')}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <FiTrendingUp className="text-purple-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.studentsReached}</p>
                  <p className="text-sm text-gray-600">{t('profile.studentsReached')}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <FiAward className="text-orange-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                  <p className="text-sm text-gray-600">{t('profile.avgScore')}</p>
                </div>
              </div>
            </Card>
          )}

          {user.role === 'student' && (
            <Card className="p-6">
              <h2 className="text-lg font-semibold mb-4">{t('profile.learningStatistics')}</h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="text-center p-4 bg-blue-50 rounded-lg">
                  <FiBookOpen className="text-blue-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.totalQuizzes}</p>
                  <p className="text-sm text-gray-600">{t('profile.quizzesTaken')}</p>
                </div>
                <div className="text-center p-4 bg-green-50 rounded-lg">
                  <FiActivity className="text-green-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.totalParticipations}</p>
                  <p className="text-sm text-gray-600">{t('profile.sessionsJoined')}</p>
                </div>
                <div className="text-center p-4 bg-purple-50 rounded-lg">
                  <FiAward className="text-purple-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">{stats.averageScore}%</p>
                  <p className="text-sm text-gray-600">{t('profile.averageScore')}</p>
                </div>
                <div className="text-center p-4 bg-orange-50 rounded-lg">
                  <FiTrendingUp className="text-orange-500 mx-auto mb-2" size={24} />
                  <p className="text-2xl font-bold text-gray-900">+5%</p>
                  <p className="text-sm text-gray-600">{t('profile.improvement')}</p>
                </div>
              </div>
            </Card>
          )}

          {/* Change Password */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('profile.security')}</h2>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.currentPassword')}
                  </label>
                  <Input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    leftIcon={<FiLock />}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.newPassword')}
                  </label>
                  <Input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    leftIcon={<FiLock />}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t('profile.confirmPassword')}
                  </label>
                  <Input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    leftIcon={<FiLock />}
                  />
                </div>
              </div>
              <Button
                variant="primary"
                onClick={handleChangePassword}
                loading={changingPassword}
                disabled={!passwordData.currentPassword || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                {t('profile.changePassword')}
              </Button>
            </div>
          </Card>
        </div>

        {/* Right Column - Activity & Settings */}
        <div className="space-y-6">
          {/* Recent Activity */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('profile.recentActivity')}</h2>
            {activities.length > 0 ? (
              <div className="space-y-3">
                {activities.slice(0, 5).map((activity) => (
                  <div key={activity.id} className="flex items-start gap-3">
                    <div className="mt-1">{activity.icon}</div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{activity.title}</p>
                      <p className="text-xs text-gray-500">{activity.description}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        <FiClock className="inline mr-1" size={10} />
                        {formatRelativeTime(activity.timestamp)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-500">{t('profile.noRecentActivity')}</p>
            )}
          </Card>

          {/* Preferences */}
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">{t('profile.preferences')}</h2>
            <div className="space-y-6">
              <div className="mb-6">
                <label className="block text-sm font-medium text-text-primary mb-2">
                  {t('profile.preferences.language')}
                </label>
                <p className="text-sm text-text-secondary mb-3">
                  {t('profile.preferences.languageLabel')}
                </p>
                <select
                  value={i18n.language}
                  onChange={(e) => i18n.changeLanguage(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                >
                  <option value="es">Español</option>
                  <option value="en">English</option>
                </select>
              </div>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('profile.emailNotifications')}</span>
                <input
                  type="checkbox"
                  checked={preferences.emailNotifications}
                  onChange={(e) => setPreferences({ ...preferences, emailNotifications: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('profile.smsNotifications')}</span>
                <input
                  type="checkbox"
                  checked={preferences.smsNotifications}
                  onChange={(e) => setPreferences({ ...preferences, smsNotifications: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('profile.publicProfile')}</span>
                <input
                  type="checkbox"
                  checked={preferences.publicProfile}
                  onChange={(e) => setPreferences({ ...preferences, publicProfile: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
              </label>
              <label className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">{t('profile.showActivity')}</span>
                <input
                  type="checkbox"
                  checked={preferences.showActivity}
                  onChange={(e) => setPreferences({ ...preferences, showActivity: e.target.checked })}
                  className="rounded text-primary focus:ring-primary"
                />
              </label>
              <Button
                variant="outline"
                size="sm"
                fullWidth
                onClick={handleUpdatePreferences}
                leftIcon={<FiSettings />}
              >
                {t('profile.updatePreferences')}
              </Button>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border-red-200">
            <h2 className="text-lg font-semibold text-red-600 mb-4">{t('profile.dangerZone')}</h2>
            <p className="text-sm text-gray-600 mb-4">
              {t('profile.deleteAccountWarning')}
            </p>
            <Button
              variant="outline"
              fullWidth
              onClick={handleDeleteAccount}
              loading={deletingAccount}
              leftIcon={<FiTrash2 />}
              className="border-red-500 text-red-500 hover:bg-red-50"
            >
              {t('profile.deleteAccount')}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}