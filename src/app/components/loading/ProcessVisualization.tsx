import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText, Users, Brain, Search, Target, TrendingUp, List } from 'lucide-react';

interface ProcessStep {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  status: 'pending' | 'processing' | 'completed' | 'error';
  duration?: number;
  valueCreated?: string;
}

interface ProcessVisualizationProps {
  phase: 'deck' | 'interview';
  currentStep?: string;
  progress?: number;
  stats?: {
    slidesProcessed?: number;
    totalSlides?: number;
    assumptionsFound?: number;
    quotesFound?: number;
    conversationsProcessed?: number;
    totalConversations?: number;
    currentAssumption?: string;
    uniqueSpeakers?: number;
    statisticalValidity?: 'strong' | 'moderate' | 'limited';
    // New fields for queue visualization
    totalFiles?: number;
    processingFiles?: number;
    queuedFiles?: number;
    currentBatch?: number;
    totalBatches?: number;
  };
  onComplete?: () => void;
}

// Time estimation functions based on real data
const estimateProcessingTime = (phase: 'deck' | 'interview', fileCount: number = 1): number => {
  if (phase === 'deck') {
    return 40; // ~40 seconds for deck processing (updated based on real timing: 38s average)
  } else {
    // Interview processing: ~78 seconds for 3 interviews, scales with batching
    const baseTimePerBatch = 78; // seconds for 3 interviews
    const maxConcurrent = 5;
    const batches = Math.ceil(fileCount / maxConcurrent);
    return batches * baseTimePerBatch;
  }
};

const formatTimeEstimate = (seconds: number): string => {
  if (seconds < 60) return `~${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (remainingSeconds === 0) return `~${minutes}m`;
  return `~${minutes}m ${remainingSeconds}s`;
};

// Queue visualization component
const QueueVisualization: React.FC<{
  totalFiles: number;
  processingFiles: number;
  queuedFiles: number;
  maxConcurrent: number;
}> = ({ totalFiles, processingFiles, queuedFiles, maxConcurrent }) => {
  const completedFiles = totalFiles - processingFiles - queuedFiles;
  
  return (
    <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 mb-4">
      <div className="flex items-center space-x-2 mb-3">
        <List className="w-4 h-4 text-white/70" />
        <span className="text-sm text-white/70">Processing Queue</span>
      </div>
      
      {/* Visual queue representation */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs text-white/60">
          <span>Processing ({processingFiles} of {maxConcurrent} slots)</span>
          <span>Queued: {queuedFiles}</span>
        </div>
        
        {/* Processing slots visualization */}
        <div className="flex space-x-1">
          {Array.from({ length: maxConcurrent }, (_, i) => (
            <div
              key={i}
              className={`h-6 w-8 rounded border ${
                i < processingFiles
                  ? 'bg-blue-500/30 border-blue-400/50 animate-pulse'
                  : 'bg-white/10 border-white/20'
              }`}
            />
          ))}
        </div>
        
        {/* File status breakdown */}
        <div className="grid grid-cols-3 gap-2 text-xs">
          <div className="text-center p-2 bg-green-500/10 rounded border border-green-500/20">
            <div className="font-medium text-green-400">{completedFiles}</div>
            <div className="text-green-300">Complete</div>
          </div>
          <div className="text-center p-2 bg-blue-500/10 rounded border border-blue-500/20">
            <div className="font-medium text-blue-400">{processingFiles}</div>
            <div className="text-blue-300">Processing</div>
          </div>
          <div className="text-center p-2 bg-gray-500/10 rounded border border-gray-500/20">
            <div className="font-medium text-gray-400">{queuedFiles}</div>
            <div className="text-gray-300">Queued</div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default function ProcessVisualization({ 
  phase, 
  currentStep, 
  progress = 0, 
  stats = {},
  onComplete 
}: ProcessVisualizationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);
  const [startTime] = useState(Date.now());
  const [elapsedTime, setElapsedTime] = useState(0);

  // Update elapsed time every second
  useEffect(() => {
    const interval = setInterval(() => {
      setElapsedTime(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);
    return () => clearInterval(interval);
  }, [startTime]);

  // Calculate time estimates
  const totalFiles = stats.totalConversations || stats.totalSlides || 1;
  const estimatedTotalTime = estimateProcessingTime(phase, totalFiles);
  const remainingTime = Math.max(0, estimatedTotalTime - elapsedTime);

  // Define process steps for each phase using useMemo to prevent infinite re-renders
  const steps = useMemo(() => {
    const deckSteps: ProcessStep[] = [
      {
        id: 'extracting',
        title: 'Extracting Content',
        description: 'Analyzing slides and extracting key statements',
        icon: <FileText className="w-5 h-5" />,
        status: 'pending',
        valueCreated: `${stats.slidesProcessed || 0}/${stats.totalSlides || 0} slides processed`
      },
      {
        id: 'categorizing',
        title: 'Identifying Assumptions',
        description: 'Finding buyer journey assumptions and value propositions',
        icon: <Search className="w-5 h-5" />,
        status: 'pending',
        valueCreated: `${stats.assumptionsFound || 0} assumptions identified`
      },
      {
        id: 'structuring',
        title: 'Structuring Insights',
        description: 'Organizing assumptions by buyer journey stage',
        icon: <Target className="w-5 h-5" />,
        status: 'pending',
        valueCreated: 'Ready for validation'
      }
    ];

    const interviewSteps: ProcessStep[] = [
      {
        id: 'connecting',
        title: 'Connecting to Database',
        description: 'Accessing customer interview repository',
        icon: <Users className="w-5 h-5" />,
        status: 'pending',
        valueCreated: `${stats.totalConversations || 0} conversations available`
      },
      {
        id: 'processing',
        title: 'Processing Conversations',
        description: stats.currentAssumption ? `Finding quotes for "${stats.currentAssumption}"` : 'Analyzing customer interviews',
        icon: <Brain className="w-5 h-5" />,
        status: 'pending',
        valueCreated: `${stats.conversationsProcessed || 0}/${stats.totalConversations || 0} conversations processed`
      },
      {
        id: 'extracting-quotes',
        title: 'Extracting Evidence',
        description: 'Finding relevant customer quotes and insights',
        icon: <Search className="w-5 h-5" />,
        status: 'pending',
        valueCreated: `${stats.quotesFound || 0} relevant quotes found`
      },
      {
        id: 'validating',
        title: 'Statistical Validation',
        description: 'Ensuring conversation coverage and quote quality',
        icon: <TrendingUp className="w-5 h-5" />,
        status: 'pending',
        valueCreated: `${stats.uniqueSpeakers || 0} unique speakers, ${stats.statisticalValidity || 'calculating'} validity`
      },
      {
        id: 'synthesizing',
        title: 'Synthesizing Insights',
        description: 'Creating evidence-based buyer map validation',
        icon: <CheckCircle className="w-5 h-5" />,
        status: 'pending',
        valueCreated: 'Buyer map ready'
      }
    ];

    return phase === 'deck' ? deckSteps : interviewSteps;
  }, [
    phase, 
    stats.slidesProcessed, 
    stats.totalSlides, 
    stats.assumptionsFound, 
    stats.totalConversations, 
    stats.currentAssumption, 
    stats.conversationsProcessed, 
    stats.quotesFound, 
    stats.uniqueSpeakers, 
    stats.statisticalValidity
  ]);

  // Update step progression based on progress - FIXED to prevent glitching
  useEffect(() => {
    const progressPerStep = 100 / steps.length;
    const currentIndex = Math.floor(progress / progressPerStep);
    
    // Only update if the index actually changed to prevent unnecessary re-renders
    setCurrentStepIndex(prevIndex => {
      const newIndex = Math.min(currentIndex, steps.length - 1);
      return newIndex !== prevIndex ? newIndex : prevIndex;
    });

    // Mark completed steps - only update if there are actual changes
    const newCompleted = steps.slice(0, currentIndex).map(step => step.id);
    setCompletedSteps(prevCompleted => {
      // Only update if the completed steps actually changed
      if (JSON.stringify(prevCompleted) !== JSON.stringify(newCompleted)) {
        return newCompleted;
      }
      return prevCompleted;
    });

    if (progress >= 100 && onComplete) {
      setTimeout(onComplete, 500);
    }
  }, [progress, steps.length, onComplete, steps]);

  // Get status for each step
  const getStepStatus = (stepIndex: number): ProcessStep['status'] => {
    if (completedSteps.includes(steps[stepIndex].id)) return 'completed';
    if (stepIndex === currentStepIndex) return 'processing';
    if (stepIndex < currentStepIndex) return 'completed';
    return 'pending';
  };

  const getStatusIcon = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-400" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-400" />;
      default:
        return <Clock className="w-5 h-5 text-white/40" />;
    }
  };

  const getStatusColor = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-500/20 border-green-400/30 text-green-300 backdrop-blur-sm';
      case 'processing':
        return 'bg-blue-500/20 border-blue-400/30 text-blue-300 backdrop-blur-sm';
      case 'error':
        return 'bg-red-500/20 border-red-400/30 text-red-300 backdrop-blur-sm';
      default:
        return 'bg-white/10 border-white/20 text-white/60 backdrop-blur-sm';
    }
  };

  // Calculate overall progress
  const overallProgress = Math.min(progress, 100);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white/10 backdrop-blur-xl rounded-lg shadow-lg border border-white/20 p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-white mb-2">
            {phase === 'deck' ? 'Analyzing Your Deck' : 'Validating with Interviews'}
          </h2>
          <p className="text-white/70">
            {phase === 'deck' 
              ? 'Extracting assumptions and value propositions from your sales materials'
              : 'Cross-referencing assumptions with customer interview evidence'
            }
          </p>
        </div>

        {/* Time Estimates */}
        <div className="bg-white/5 backdrop-blur-sm rounded-lg border border-white/10 p-4 mb-6">
          <div className="grid grid-cols-3 gap-4 text-center">
            <div>
              <div className="text-lg font-bold text-white">{elapsedTime}s</div>
              <div className="text-xs text-white/60">Elapsed</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{formatTimeEstimate(remainingTime)}</div>
              <div className="text-xs text-white/60">Remaining</div>
            </div>
            <div>
              <div className="text-lg font-bold text-white">{formatTimeEstimate(estimatedTotalTime)}</div>
              <div className="text-xs text-white/60">Total Est.</div>
            </div>
          </div>
        </div>

        {/* Queue Visualization for Interviews */}
        {phase === 'interview' && stats.totalConversations && stats.totalConversations > 5 && (
          <QueueVisualization
            totalFiles={stats.totalConversations}
            processingFiles={Math.min(stats.conversationsProcessed || 0, 5)}
            queuedFiles={Math.max(0, (stats.totalConversations - (stats.conversationsProcessed || 0)))}
            maxConcurrent={5}
          />
        )}

        {/* Processing Info for Large Batches */}
        {phase === 'interview' && stats.totalConversations && stats.totalConversations > 5 && (
          <div className="bg-blue-500/10 border border-blue-400/30 rounded-lg p-3 mb-4">
            <div className="flex items-center space-x-2 text-blue-300">
              <List className="w-4 h-4" />
              <span className="text-sm font-medium">
                Processing {stats.totalConversations} interviews in batches of 5 for optimal performance
              </span>
            </div>
          </div>
        )}

        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-white/70 mb-2">
            <span>Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-white/20 rounded-full h-2">
            <div 
              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-500 ease-out"
              style={{ width: `${overallProgress}%` }}
            />
          </div>
        </div>

        {/* Process Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            return (
              <div
                key={step.id}
                className={`p-4 rounded-lg border-2 transition-all duration-300 ${getStatusColor(status)}`}
              >
                <div className="flex items-start space-x-3">
                  <div className="flex-shrink-0 mt-0.5">
                    {getStatusIcon(status)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center space-x-2">
                      <div className="text-white/60">{step.icon}</div>
                      <h3 className="font-semibold text-white">{step.title}</h3>
                    </div>
                    <p className="text-sm mt-1 opacity-90 text-white/80">{step.description}</p>
                    {step.valueCreated && status !== 'pending' && (
                      <div className="mt-2 text-xs font-medium bg-white/20 backdrop-blur-sm rounded px-2 py-1 inline-block text-white">
                        ✓ {step.valueCreated}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Statistics Panel */}
        {phase === 'interview' && (stats.quotesFound || stats.conversationsProcessed) && (
          <div className="mt-6 p-4 bg-blue-500/20 rounded-lg border border-blue-400/30 backdrop-blur-sm">
            <h4 className="font-semibold text-blue-300 mb-2">Statistical Validity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-200">Conversations:</span>
                <span className="font-medium ml-2 text-white">{stats.conversationsProcessed}/{stats.totalConversations}</span>
              </div>
              <div>
                <span className="text-blue-200">Quotes Found:</span>
                <span className="font-medium ml-2 text-white">{stats.quotesFound}</span>
              </div>
              <div>
                <span className="text-blue-200">Unique Speakers:</span>
                <span className="font-medium ml-2 text-white">{stats.uniqueSpeakers || 0}</span>
              </div>
              <div>
                <span className="text-blue-200">Validity:</span>
                <span className={`font-medium ml-2 ${
                  stats.statisticalValidity === 'strong' ? 'text-green-400' :
                  stats.statisticalValidity === 'moderate' ? 'text-yellow-400' :
                  'text-red-400'
                }`}>
                  {stats.statisticalValidity || 'Calculating...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pro Tip */}
        <div className="mt-6 p-3 bg-white/10 rounded-lg border border-white/20 backdrop-blur-sm">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-400 mt-0.5">💡</div>
            <div className="text-sm text-white/80">
              <strong className="text-white">Pro Tip:</strong> {phase === 'deck' 
                ? 'Strong buyer maps typically identify 5-7 core assumptions across the buyer journey.'
                : stats.conversationsProcessed && stats.conversationsProcessed >= 4
                  ? 'Great statistical coverage! 4+ conversations provide strong validation confidence.'
                  : 'For strongest validation, aim for quotes from 4+ different customer conversations.'
              }
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 