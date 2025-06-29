import React, { useState, useEffect } from 'react';
import { useBuyerMapPersistence } from '../hooks/useBuyerMapPersistence';
import { BuyerMapSession } from '../lib/buyer-map-service';
import { 
  FolderOpen, 
  Plus, 
  Trash2, 
  Calendar, 
  BarChart3, 
  Clock,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react';

interface SessionManagerProps {
  onSessionSelect?: (sessionId: string) => void;
  onNewSession?: () => void;
  className?: string;
}

export default function SessionManager({ 
  onSessionSelect, 
  onNewSession,
  className = '' 
}: SessionManagerProps) {
  const {
    state,
    saveData,
    loadData,
    clearData,
    createSession,
    getSessions,
    deleteSession,
    isAuthenticated,
    isLoading,
    error,
    currentSessionId
  } = useBuyerMapPersistence();

  const [sessions, setSessions] = useState<BuyerMapSession[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newSessionName, setNewSessionName] = useState('');
  const [newSessionDescription, setNewSessionDescription] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  // Load sessions on mount
  useEffect(() => {
    if (isAuthenticated) {
      loadSessions();
    }
  }, [isAuthenticated]);

  const loadSessions = async () => {
    try {
      const userSessions = await getSessions();
      setSessions(userSessions);
    } catch (error) {
      console.error('Error loading sessions:', error);
    }
  };

  const handleCreateSession = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSessionName.trim()) return;

    setIsCreating(true);
    try {
      const sessionId = await createSession(newSessionName.trim(), newSessionDescription.trim());
      
      // Save current data to the new session
      if (state.buyerMapData.length > 0) {
        await saveData({
          buyerMapData: state.buyerMapData,
          score: state.score,
          scoreBreakdown: state.scoreBreakdown,
          outcomeWeights: state.outcomeWeights,
          summary: state.summary,
          currentStep: state.currentStep
        });
      }

      setNewSessionName('');
      setNewSessionDescription('');
      setShowCreateForm(false);
      
      // Reload sessions
      await loadSessions();
      
      // Notify parent
      if (onSessionSelect) {
        onSessionSelect(sessionId);
      }
    } catch (error) {
      console.error('Error creating session:', error);
    } finally {
      setIsCreating(false);
    }
  };

  const handleLoadSession = async (sessionId: string) => {
    try {
      await loadData(sessionId);
      if (onSessionSelect) {
        onSessionSelect(sessionId);
      }
    } catch (error) {
      console.error('Error loading session:', error);
    }
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this session? This action cannot be undone.')) {
      return;
    }

    try {
      await deleteSession(sessionId);
      await loadSessions();
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getSessionStatus = (session: BuyerMapSession) => {
    if (session.is_complete) {
      return { icon: CheckCircle, color: 'text-green-500', text: 'Complete' };
    } else if (session.total_assumptions > 0) {
      return { icon: AlertCircle, color: 'text-yellow-500', text: 'In Progress' };
    } else {
      return { icon: Clock, color: 'text-gray-500', text: 'New' };
    }
  };

  if (!isAuthenticated) {
    return (
      <div className={`bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 ${className}`}>
        <div className="text-center">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-white mb-2">Sign in to save sessions</h3>
          <p className="text-gray-300 text-sm">
            Create an account to save your BuyerMap sessions and access them from any device.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-6 ${className}`}>
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-white">Your Sessions</h3>
        <button
          onClick={() => setShowCreateForm(true)}
          className="inline-flex items-center px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Session
        </button>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
          <p className="text-red-300 text-sm">{error}</p>
        </div>
      )}

      {showCreateForm && (
        <div className="mb-6 p-4 bg-white/5 rounded-lg border border-white/10">
          <h4 className="text-white font-medium mb-3">Create New Session</h4>
          <form onSubmit={handleCreateSession}>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Session Name *
                </label>
                <input
                  type="text"
                  value={newSessionName}
                  onChange={(e) => setNewSessionName(e.target.value)}
                  placeholder="e.g., Q1 2024 ICP Validation"
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Description (optional)
                </label>
                <textarea
                  value={newSessionDescription}
                  onChange={(e) => setNewSessionDescription(e.target.value)}
                  placeholder="Brief description of this session..."
                  rows={2}
                  className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={isCreating || !newSessionName.trim()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isCreating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Session'
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm font-medium hover:bg-gray-700 transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
          <span className="ml-2 text-gray-300">Loading sessions...</span>
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-8">
          <FolderOpen className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-white font-medium mb-2">No sessions yet</h4>
          <p className="text-gray-300 text-sm mb-4">
            Create your first session to save your BuyerMap data.
          </p>
          <button
            onClick={() => setShowCreateForm(true)}
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            <Plus className="w-4 h-4 mr-2" />
            Create First Session
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map((session) => {
            const status = getSessionStatus(session);
            const StatusIcon = status.icon;
            
            return (
              <div
                key={session.id}
                onClick={() => handleLoadSession(session.id)}
                className={`p-4 rounded-lg border cursor-pointer transition-all hover:bg-white/5 ${
                  currentSessionId === session.id
                    ? 'border-blue-500 bg-blue-500/10'
                    : 'border-white/10 hover:border-white/20'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="text-white font-medium">{session.session_name}</h4>
                      <StatusIcon className={`w-4 h-4 ${status.color}`} />
                      <span className={`text-xs ${status.color}`}>{status.text}</span>
                    </div>
                    
                    {session.description && (
                      <p className="text-gray-300 text-sm mb-3">{session.description}</p>
                    )}
                    
                    <div className="flex items-center gap-4 text-xs text-gray-400">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {formatDate(session.updated_at)}
                      </div>
                      
                      {session.total_assumptions > 0 && (
                        <div className="flex items-center gap-1">
                          <BarChart3 className="w-3 h-3" />
                          {session.total_assumptions} assumptions
                        </div>
                      )}
                      
                      {session.overall_alignment_score !== null && (
                        <div className="flex items-center gap-1">
                          <span className="w-2 h-2 bg-blue-400 rounded-full"></span>
                          {session.overall_alignment_score}% aligned
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <button
                    onClick={(e) => handleDeleteSession(session.id, e)}
                    className="p-1 text-gray-400 hover:text-red-400 transition-colors"
                    title="Delete session"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
} 