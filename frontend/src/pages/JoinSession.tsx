import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { buildApiUrl } from '../config/api.config';
import Button from '../components/common/Button';
import Card from '../components/common/Card';
import Input from '../components/common/Input';
import { FiLogIn, FiHash, FiUsers, FiActivity } from 'react-icons/fi';
import toast from 'react-hot-toast';

export default function JoinSession() {
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [sessionCode, setSessionCode] = useState('');
  const [nickname, setNickname] = useState(user?.firstName || '');
  const [loading, setLoading] = useState(false);
  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [checkingCode, setCheckingCode] = useState(false);

  const handleCodeChange = async (code: string) => {
    setSessionCode(code.toUpperCase());
    
    // Check session when code is complete (6 characters)
    if (code.length === 6) {
      setCheckingCode(true);
      try {
        const response = await fetch(buildApiUrl(`/sessions/${code}`), {
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setSessionInfo(data.data);
          
          if (data.data.status === 'completed') {
            toast.error('This session has already ended');
            setSessionInfo(null);
          }
        } else {
          setSessionInfo(null);
        }
      } catch (error) {
        console.error('Error checking session:', error);
        setSessionInfo(null);
      } finally {
        setCheckingCode(false);
      }
    } else {
      setSessionInfo(null);
    }
  };

  const handleJoinSession = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!sessionCode.trim()) {
      toast.error('Please enter a session code');
      return;
    }

    if (sessionCode.length !== 6) {
      toast.error('Session code must be 6 characters');
      return;
    }

    if (!nickname.trim()) {
      toast.error('Please enter your name');
      return;
    }

    setLoading(true);
    try {
      // First, get session by code
      const response = await fetch(buildApiUrl(`/sessions/${sessionCode}`), {
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
        const joinResponse = await fetch(buildApiUrl(`/sessions/${session.id}/join`), {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${useAuthStore.getState().accessToken}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ nickname }),
        });

        if (joinResponse.ok) {
          const joinData = await joinResponse.json();
          toast.success('Joined session successfully!');
          
          // Navigate to play page with session and participant info
          navigate(`/play?session=${session.id}&participant=${joinData.data.participantId}`);
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
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-md p-8">
        <div className="text-center mb-8">
          <img 
            src="/images/logoAristoTest.png" 
            alt="AristoTest" 
            className="h-16 mx-auto mb-4"
          />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Join Session</h1>
          <p className="text-text-secondary">Enter the code to join a live assessment</p>
        </div>

        <form onSubmit={handleJoinSession} className="space-y-6">
          {/* Session Code Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Session Code
            </label>
            <div className="relative">
              <Input
                type="text"
                placeholder="Enter 6-digit code"
                value={sessionCode}
                onChange={(e) => handleCodeChange(e.target.value)}
                maxLength={6}
                className="text-center font-mono text-2xl uppercase tracking-widest"
                leftIcon={<FiHash />}
                autoFocus
                disabled={loading}
              />
              {checkingCode && (
                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary"></div>
                </div>
              )}
            </div>
          </div>

          {/* Session Info (if found) */}
          {sessionInfo && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Quiz:</span>
                <span className="font-medium">{sessionInfo.quiz?.title}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Status:</span>
                <span className={`px-2 py-1 text-xs rounded-full ${
                  sessionInfo.status === 'waiting' 
                    ? 'bg-yellow-100 text-yellow-800' 
                    : sessionInfo.status === 'active'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-gray-100 text-gray-800'
                }`}>
                  <FiActivity className="inline mr-1" size={12} />
                  {sessionInfo.status.charAt(0).toUpperCase() + sessionInfo.status.slice(1)}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-600">Participants:</span>
                <span className="font-medium">{sessionInfo.participantsCount || 0}</span>
              </div>
            </div>
          )}

          {/* Nickname Input */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Your Name
            </label>
            <Input
              type="text"
              placeholder="Enter your name"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          {/* Join Button */}
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            loading={loading}
            leftIcon={<FiLogIn />}
            disabled={!sessionCode || sessionCode.length !== 6 || !nickname.trim()}
          >
            {loading ? 'Joining...' : 'Join Session'}
          </Button>
        </form>

        {/* Alternative Actions */}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <div className="text-center">
            <p className="text-sm text-gray-600 mb-3">Or</p>
            <div className="space-y-2">
              <Button
                variant="outline"
                fullWidth
                onClick={() => navigate('/sessions')}
              >
                Browse Active Sessions
              </Button>
              {(user?.role === 'teacher' || user?.role === 'admin') && (
                <Button
                  variant="ghost"
                  fullWidth
                  onClick={() => navigate('/sessions/host')}
                >
                  Host a Session Instead
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}