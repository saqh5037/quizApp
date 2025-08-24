import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuthStore } from '../stores/authStore';
import { apiConfig, buildApiUrl } from '../config/api.config';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import Modal from '../components/common/Modal';
import { 
  FiPlay, 
  FiUsers, 
  FiClock, 
  FiActivity,
  FiPlus,
  FiLogIn,
  FiRefreshCw,
  FiMonitor,
  FiUser,
  FiHash,
  FiBarChart
} from 'react-icons/fi';
import toast from 'react-hot-toast';

interface Session {
  id: number;
  code: string;
  name: string;
  status: 'waiting' | 'active' | 'paused' | 'completed';
  quiz: {
    id: number;
    title: string;
    questionsCount: number;
    timeLimit?: number;
  };
  participantsCount: number;
  currentQuestionIndex: number;
  startedAt?: string;
  endedAt?: string;
  isHost?: boolean;
}

export default function Sessions() {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [mySessions, setMySessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [joinModalOpen, setJoinModalOpen] = useState(false);
  const [sessionCode, setSessionCode] = useState('');
  const [joiningSession, setJoiningSession] = useState(false);
  const [activeTab, setActiveTab] = useState<'active' | 'my'>('active');

  useEffect(() => {
    fetchSessions();
    const interval = setInterval(fetchSessions, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchSessions = async () => {
    try {
      // Fetch active public sessions
      const activeResponse = await fetch(buildApiUrl(apiConfig.endpoints.sessions.active), {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (activeResponse.ok) {
        const data = await activeResponse.json();
        setSessions(data.data || []);
      }

      // Fetch user's hosted sessions
      if (user?.role === 'teacher' || user?.role === 'admin') {
        const myResponse = await fetch(buildApiUrl(apiConfig.endpoints.sessions.my), {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
          },
        });

        if (myResponse.ok) {
          const data = await myResponse.json();
          setMySessions(data.data || []);
        }
      }
    } catch (error) {
      console.error('Error fetching sessions:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleJoinSession = async () => {
    if (!sessionCode.trim()) {
      toast.error('Please enter a session code');
      return;
    }

    setJoiningSession(true);
    try {
      // First, get session by code
      const response = await fetch(buildApiUrl(apiConfig.endpoints.sessions.get(sessionCode)), {
        headers: {
          'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const session = data.data;
        
        if (session.status === 'completed') {
          toast.error('This session has already ended');
          return;
        }

        // Join as participant
        const joinResponse = await fetch(buildApiUrl(apiConfig.endpoints.sessions.join(session.id.toString())), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            nickname: user?.firstName || 'Player',
          }),
        });

        if (joinResponse.ok) {
          toast.success('Joined session successfully!');
          navigate(`/play?session=${session.id}`);
        } else {
          toast.error('Failed to join session');
        }
      } else {
        toast.error('Session not found');
      }
    } catch (error) {
      console.error('Error joining session:', error);
      toast.error('Failed to join session');
    } finally {
      setJoiningSession(false);
      setJoinModalOpen(false);
      setSessionCode('');
    }
  };

  const handleHostSession = () => {
    navigate('/sessions/host');
  };

  const handleResumeHosting = (sessionId: number) => {
    navigate(`/sessions/host?sessionId=${sessionId}`);
  };

  const handleViewResults = (sessionId: number) => {
    navigate(`/sessions/${sessionId}/results`);
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      waiting: 'bg-yellow-100 text-yellow-800',
      active: 'bg-green-100 text-green-800',
      paused: 'bg-orange-100 text-orange-800',
      completed: 'bg-gray-100 text-gray-800',
    };
    return badges[status as keyof typeof badges] || badges.completed;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'waiting':
        return <FiClock className="inline mr-1" size={14} />;
      case 'active':
        return <FiActivity className="inline mr-1" size={14} />;
      case 'paused':
        return <FiRefreshCw className="inline mr-1" size={14} />;
      default:
        return null;
    }
  };

  const canHostSession = user?.role === 'teacher' || user?.role === 'admin';

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-blue-600">{t('sessions.title')}</h1>
            <p className="text-text-secondary mt-2">
              {t('sessions.subtitle')}
            </p>
          </div>
          <div className="flex gap-3">
            <Button
              variant="outline"
              leftIcon={<FiLogIn />}
              onClick={() => setJoinModalOpen(true)}
            >
              {t('sessions.joinSession.joinButton')} {t('sessions.title')}
            </Button>
            {canHostSession && (
              <Button
                variant="primary"
                leftIcon={<FiPlus />}
                onClick={handleHostSession}
              >
                {t('sessions.hostSession', { defaultValue: 'Host Session' })}
              </Button>
            )}
          </div>
        </div>

        {/* Tabs */}
        {canHostSession && (
          <div className="flex gap-2 border-b border-gray-200">
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'active'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-text-secondary hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('active')}
            >
              {t('sessions.tabs.active')} {t('sessions.title')}
            </button>
            <button
              className={`px-4 py-2 font-medium transition-colors ${
                activeTab === 'my'
                  ? 'text-blue-600 border-b-2 border-blue-600'
                  : 'text-text-secondary hover:text-blue-600'
              }`}
              onClick={() => setActiveTab('my')}
            >
              {t('sessions.myTitle', { defaultValue: 'My Sessions' })}
            </button>
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">{t('sessions.activeNow', { defaultValue: 'Active Now' })}</p>
              <p className="text-2xl font-bold text-blue-600">
                {sessions.filter(s => s.status === 'active').length}
              </p>
            </div>
            <div className="text-success bg-success/10 p-3 rounded-lg">
              <FiActivity size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">{t('sessions.card.status.waiting')}</p>
              <p className="text-2xl font-bold text-blue-600">
                {sessions.filter(s => s.status === 'waiting').length}
              </p>
            </div>
            <div className="text-warning bg-warning/10 p-3 rounded-lg">
              <FiClock size={24} />
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-text-secondary text-sm">{t('sessions.totalParticipants', { defaultValue: 'Total Participants' })}</p>
              <p className="text-2xl font-bold text-blue-600">
                {sessions.reduce((acc, s) => acc + s.participantsCount, 0)}
              </p>
            </div>
            <div className="text-blue-600 bg-blue-600/10 p-3 rounded-lg">
              <FiUsers size={24} />
            </div>
          </div>
        </Card>

        {canHostSession && (
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-secondary text-sm">{t('sessions.myTitle', { defaultValue: 'My Sessions' })}</p>
                <p className="text-2xl font-bold text-blue-600">
                  {mySessions.length}
                </p>
              </div>
              <div className="text-error bg-error/10 p-3 rounded-lg">
                <FiMonitor size={24} />
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Sessions List */}
      {loading ? (
        <div className="text-center py-12">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
          <p className="mt-4 text-text-secondary">{t('sessions.loading', { defaultValue: 'Loading sessions...' })}</p>
        </div>
      ) : (
        <div>
          {activeTab === 'active' ? (
            // Active Sessions
            sessions.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiActivity size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('sessions.empty.active')}</h3>
                <p className="text-text-secondary mb-6">
                  {t('sessions.noLiveSessions', { defaultValue: 'There are no live sessions at the moment' })}
                </p>
                <div className="flex gap-3 justify-center">
                  <Button
                    variant="outline"
                    leftIcon={<FiLogIn />}
                    onClick={() => setJoinModalOpen(true)}
                  >
                    {t('sessions.joinWithCode', { defaultValue: 'Join with Code' })}
                  </Button>
                  {canHostSession && (
                    <Button
                      variant="primary"
                      leftIcon={<FiPlus />}
                      onClick={handleHostSession}
                    >
                      {t('sessions.hostNew', { defaultValue: 'Host New Session' })}
                    </Button>
                  )}
                </div>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {sessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      {/* Session Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-blue-600 mb-1">
                            {session.name}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {session.quiz.title}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(session.status)}`}>
                          {getStatusIcon(session.status)}
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                      </div>

                      {/* Session Code */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FiHash className="text-gray-400" />
                            <span className="font-mono font-bold text-lg">{session.code}</span>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              navigator.clipboard.writeText(session.code);
                              toast.success(t('success.copied'));
                            }}
                          >
                            Copy
                          </Button>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="space-y-2 text-sm text-text-secondary mb-4">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <FiUsers size={14} />
                            {t('sessions.card.participants')}
                          </span>
                          <span className="font-medium">{session.participantsCount}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-1">
                            <FiBarChart size={14} />
                            {t('sessions.progress', { defaultValue: 'Progress' })}
                          </span>
                          <span className="font-medium">
                            {session.currentQuestionIndex}/{session.quiz.questionsCount}
                          </span>
                        </div>
                        {session.quiz.timeLimit && (
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-1">
                              <FiClock size={14} />
                              {t('sessions.timeLimit', { defaultValue: 'Time Limit' })}
                            </span>
                            <span className="font-medium">{session.quiz.timeLimit} min</span>
                          </div>
                        )}
                      </div>

                      {/* Action Button */}
                      <Button
                        variant={session.status === 'waiting' ? 'primary' : 'outline'}
                        size="sm"
                        fullWidth
                        leftIcon={<FiPlay />}
                        onClick={() => {
                          setSessionCode(session.code);
                          handleJoinSession();
                        }}
                      >
                        {t('sessions.joinSession.joinButton')} {t('sessions.title')}
                      </Button>
                    </div>
                  </Card>
                ))}
              </div>
            )
          ) : (
            // My Sessions (for teachers)
            mySessions.length === 0 ? (
              <Card className="text-center py-12">
                <div className="text-gray-400 mb-4">
                  <FiMonitor size={48} className="mx-auto" />
                </div>
                <h3 className="text-xl font-semibold mb-2">{t('sessions.empty.hosted')}</h3>
                <p className="text-text-secondary mb-6">
                  {t('sessions.noHostedSessions', { defaultValue: "You haven't hosted any sessions" })}
                </p>
                <Button
                  variant="primary"
                  leftIcon={<FiPlus />}
                  onClick={handleHostSession}
                >
                  {t('sessions.hostFirst', { defaultValue: 'Host Your First Session' })}
                </Button>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {mySessions.map((session) => (
                  <Card key={session.id} className="hover:shadow-lg transition-shadow">
                    <div className="p-6">
                      {/* Session Header */}
                      <div className="flex justify-between items-start mb-4">
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-blue-600 mb-1">
                            {session.name}
                          </h3>
                          <p className="text-sm text-text-secondary">
                            {session.quiz.title}
                          </p>
                        </div>
                        <span className={`px-3 py-1 text-xs font-medium rounded-full ${getStatusBadge(session.status)}`}>
                          {getStatusIcon(session.status)}
                          {session.status.charAt(0).toUpperCase() + session.status.slice(1)}
                        </span>
                      </div>

                      {/* Session Code */}
                      <div className="bg-gray-50 rounded-lg p-3 mb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <FiHash className="text-gray-400" />
                            <span className="font-mono font-bold text-lg">{session.code}</span>
                          </div>
                          <span className="text-xs text-gray-500">
                            {session.participantsCount} joined
                          </span>
                        </div>
                      </div>

                      {/* Session Info */}
                      <div className="space-y-2 text-sm text-text-secondary mb-4">
                        {session.startedAt && (
                          <div className="flex items-center justify-between">
                            <span>{t('sessions.started', { defaultValue: 'Started' })}</span>
                            <span className="font-medium">
                              {new Date(session.startedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        {session.endedAt && (
                          <div className="flex items-center justify-between">
                            <span>{t('sessions.ended', { defaultValue: 'Ended' })}</span>
                            <span className="font-medium">
                              {new Date(session.endedAt).toLocaleTimeString()}
                            </span>
                          </div>
                        )}
                        <div className="flex items-center justify-between">
                          <span>{t('sessions.progress', { defaultValue: 'Progress' })}</span>
                          <span className="font-medium">
                            {session.currentQuestionIndex}/{session.quiz.questionsCount}
                          </span>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-2">
                        {session.status === 'completed' ? (
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            leftIcon={<FiBarChart />}
                            onClick={() => handleViewResults(session.id)}
                          >
                            {t('sessions.card.actions.results')}
                          </Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            fullWidth
                            leftIcon={<FiMonitor />}
                            onClick={() => handleResumeHosting(session.id)}
                          >
                            {t('sessions.resumeHosting', { defaultValue: 'Resume Hosting' })}
                          </Button>
                        )}
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )
          )}
        </div>
      )}

      {/* Join Session Modal */}
      <Modal
        isOpen={joinModalOpen}
        onClose={() => setJoinModalOpen(false)}
        title={t('sessions.joinSession.title')}
      >
        <div className="space-y-4">
          <p className="text-text-secondary">
            {t('sessions.enterCode', { defaultValue: 'Enter the session code provided by your teacher' })}
          </p>
          <Input
            type="text"
            label={t('sessions.sessionCode', { defaultValue: 'Session Code' })}
            placeholder={t('sessions.enterCodePlaceholder', { defaultValue: 'Enter 6-digit code' })}
            value={sessionCode}
            onChange={(e) => setSessionCode(e.target.value.toUpperCase())}
            maxLength={6}
            className="text-center font-mono text-2xl uppercase"
            autoFocus
          />
          <div className="flex gap-3">
            <Button
              variant="outline"
              onClick={() => {
                setJoinModalOpen(false);
                setSessionCode('');
              }}
              fullWidth
            >
              {t('common.cancel')}
            </Button>
            <Button
              variant="primary"
              onClick={handleJoinSession}
              loading={joiningSession}
              fullWidth
              leftIcon={<FiLogIn />}
            >
              {t('sessions.joinSession.joinButton')}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}