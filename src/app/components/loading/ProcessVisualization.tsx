import React, { useState, useEffect, useMemo } from 'react';
import { CheckCircle, Clock, AlertCircle, FileText, Users, Brain, Search, Target, TrendingUp } from 'lucide-react';

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
  };
  onComplete?: () => void;
}

export default function ProcessVisualization({ 
  phase, 
  currentStep, 
  progress = 0, 
  stats = {},
  onComplete 
}: ProcessVisualizationProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<string[]>([]);

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

  // Update step status based on progress
  useEffect(() => {
    const progressPerStep = 100 / steps.length;
    const currentIndex = Math.floor(progress / progressPerStep);
    setCurrentStepIndex(Math.min(currentIndex, steps.length - 1));

    // Mark completed steps
    const completed = steps.slice(0, currentIndex).map(step => step.id);
    setCompletedSteps(completed);

    if (progress >= 100 && onComplete) {
      setTimeout(onComplete, 500);
    }
  }, [progress, steps.length, onComplete]);

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
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'processing':
        return <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />;
      case 'error':
        return <AlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStatusColor = (status: ProcessStep['status']) => {
    switch (status) {
      case 'completed':
        return 'bg-green-50 border-green-200 text-green-800';
      case 'processing':
        return 'bg-blue-50 border-blue-200 text-blue-800';
      case 'error':
        return 'bg-red-50 border-red-200 text-red-800';
      default:
        return 'bg-gray-50 border-gray-200 text-gray-600';
    }
  };

  // Calculate overall progress
  const overallProgress = Math.min(progress, 100);

  return (
    <div className="max-w-2xl mx-auto p-6">
      <div className="bg-white rounded-lg shadow-lg p-6">
        {/* Header */}
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            {phase === 'deck' ? 'Analyzing Your Deck' : 'Validating with Interviews'}
          </h2>
          <p className="text-gray-600">
            {phase === 'deck' 
              ? 'Extracting assumptions and value propositions from your sales materials'
              : 'Cross-referencing assumptions with customer interview evidence'
            }
          </p>
        </div>

        {/* Overall Progress Bar */}
        <div className="mb-6">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <span>Progress</span>
            <span>{Math.round(overallProgress)}%</span>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div 
              className="bg-blue-600 h-2 rounded-full transition-all duration-500 ease-out"
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
                      <div className="text-gray-400">{step.icon}</div>
                      <h3 className="font-semibold">{step.title}</h3>
                    </div>
                    <p className="text-sm mt-1 opacity-90">{step.description}</p>
                    {step.valueCreated && status !== 'pending' && (
                      <div className="mt-2 text-xs font-medium bg-white bg-opacity-50 rounded px-2 py-1 inline-block">
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
          <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <h4 className="font-semibold text-blue-900 mb-2">Statistical Validity</h4>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-blue-700">Conversations:</span>
                <span className="font-medium ml-2">{stats.conversationsProcessed}/{stats.totalConversations}</span>
              </div>
              <div>
                <span className="text-blue-700">Quotes Found:</span>
                <span className="font-medium ml-2">{stats.quotesFound}</span>
              </div>
              <div>
                <span className="text-blue-700">Unique Speakers:</span>
                <span className="font-medium ml-2">{stats.uniqueSpeakers || 0}</span>
              </div>
              <div>
                <span className="text-blue-700">Validity:</span>
                <span className={`font-medium ml-2 ${
                  stats.statisticalValidity === 'strong' ? 'text-green-600' :
                  stats.statisticalValidity === 'moderate' ? 'text-yellow-600' :
                  'text-red-600'
                }`}>
                  {stats.statisticalValidity || 'Calculating...'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Pro Tip */}
        <div className="mt-6 p-3 bg-gray-50 rounded-lg border border-gray-200">
          <div className="flex items-start space-x-2">
            <div className="text-yellow-500 mt-0.5">💡</div>
            <div className="text-sm text-gray-700">
              <strong>Pro Tip:</strong> {phase === 'deck' 
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