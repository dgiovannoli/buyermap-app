import { ProcessingProgress, ValidationProgress } from '../../types/buyer-map';
import { CheckCircleIcon, ExclamationCircleIcon, ClockIcon } from '@heroicons/react/24/outline';

interface ProgressTrackerProps {
  processingProgress: ProcessingProgress;
  validationProgress: ValidationProgress;
}

export default function ProgressTracker({
  processingProgress,
  validationProgress
}: ProgressTrackerProps) {
  const steps = [
    { id: 'home', label: 'Home' },
    { id: 'deck-upload', label: 'Upload Deck' },
    { id: 'deck-results', label: 'Analyze & Validate' },
    { id: 'results-complete', label: 'Export' }
  ];

  const getCurrentStepIndex = () => {
    switch (processingProgress.step) {
      case 'home':
        return 0;
      case 'deck-upload':
      case 'deck-processing':
        return 1;
      case 'deck-results':
      case 'interview-processing':
        return 2;
      case 'results-complete':
        return 3;
      default:
        return 0;
    }
  };

  const currentStepIndex = getCurrentStepIndex();

  return (
    <div className="bg-white border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="py-4">
          {/* Step Indicator */}
          <nav aria-label="Progress">
            <ol className="flex items-center">
              {steps.map((step, index) => (
                <li key={step.id} className={`relative ${index !== steps.length - 1 ? 'pr-8 sm:pr-20' : ''}`}>
                  {index < currentStepIndex ? (
                    // Completed step
                    <div className="flex items-center">
                      <span className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full bg-blue-600">
                        <CheckCircleIcon className="w-5 h-5 text-white" />
                      </span>
                      <span className="ml-3 text-sm font-medium text-gray-900">{step.label}</span>
                    </div>
                  ) : index === currentStepIndex ? (
                    // Current step
                    <div className="flex items-center">
                      <span className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-blue-600">
                        <span className="h-2.5 w-2.5 rounded-full bg-blue-600" />
                      </span>
                      <span className="ml-3 text-sm font-medium text-blue-600">{step.label}</span>
                    </div>
                  ) : (
                    // Upcoming step
                    <div className="flex items-center">
                      <span className="relative z-10 flex items-center justify-center w-8 h-8 rounded-full border-2 border-gray-300">
                        <span className="h-2.5 w-2.5 rounded-full bg-transparent" />
                      </span>
                      <span className="ml-3 text-sm font-medium text-gray-500">{step.label}</span>
                    </div>
                  )}
                  {index !== steps.length - 1 && (
                    <div className="absolute top-4 left-8 -ml-px h-0.5 w-full bg-gray-200">
                      <div
                        className="h-0.5 bg-blue-600"
                        style={{ width: index < currentStepIndex ? '100%' : '0%' }}
                      />
                    </div>
                  )}
                </li>
              ))}
            </ol>
          </nav>

          {/* Progress Bars */}
          <div className="mt-6 space-y-4">
            {/* Overall Progress */}
            <div>
              <div className="flex justify-between text-sm text-gray-600 mb-1">
                <span>Overall Progress</span>
                <span>{validationProgress.overallProgress}%</span>
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-500"
                  style={{ width: `${validationProgress.overallProgress}%` }}
                />
              </div>
            </div>

            {/* Current Phase Progress */}
            {processingProgress.status === 'processing' && (
              <div>
                <div className="flex justify-between text-sm text-gray-600 mb-1">
                  <span>Current Phase</span>
                  <span>{processingProgress.percentage}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-green-600 h-2 rounded-full transition-all duration-500"
                    style={{ width: `${processingProgress.percentage}%` }}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Validation Stats */}
          <div className="mt-4 grid grid-cols-3 gap-4">
            <div className="bg-green-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-green-800">
                {validationProgress.validatedCount} Validated
              </div>
            </div>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-yellow-800">
                {validationProgress.partialCount} Partial
              </div>
            </div>
            <div className="bg-gray-50 p-3 rounded-lg">
              <div className="text-sm font-medium text-gray-800">
                {validationProgress.pendingCount} Pending
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 