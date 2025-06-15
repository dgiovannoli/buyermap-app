'use client'

import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import BuyerMapInterface from './BuyerMapInterface'
import FileUploadStep from './steps/FileUploadStep'
import ResultsStep from './steps/ResultsStep'
import ExportStep from './steps/ExportStep'
import { BuyerMapData, UploadedFiles } from '@/types/buyer-map'
import { getOutcomeColor, getConfidenceColor, getScoreMessage } from '@/styles/theme'
import * as XLSX from 'xlsx'
import StepIndicator from './ui/StepIndicator'

export default function BuyerMapApp() {
  // State Management
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({ deck: null, interviews: [] })
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState<number>(0)
  const [activeTab, setActiveTab] = useState('all')
  const [showDetails, setShowDetails] = useState(false)
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [rejectedQuotes, setRejectedQuotes] = useState<Set<number>>(new Set())

  // Window resize handler
  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      const handleResize = () => setWindowWidth(window.innerWidth)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  // File upload handler
  const handleFileUpload = (type: 'deck' | 'interviews', files: FileList | null) => {
    console.log('📥 handleFileUpload called:', { type, files });
    console.log('📥 Files length:', files?.length);
    
    if (!files || files.length === 0) {
      console.log('❌ No files provided or empty FileList');
      return;
    }

    if (type === 'deck') {
      const file = files[0];
      console.log('📊 Setting deck file:', file);
      console.log('📊 File details:', { name: file.name, size: file.size, type: file.type });
      
      setUploadedFiles(prev => {
        const newState = { ...prev, deck: file };
        console.log('📊 New deck state:', newState);
        return newState;
      });
    } else if (type === 'interviews') {
      const fileArray = Array.from(files);
      console.log('🎤 Adding interview files:', fileArray);
      console.log('🎤 File details:', fileArray.map(f => ({ name: f.name, size: f.size })));
      
      setUploadedFiles(prev => {
        const newState = { 
          ...prev, 
          interviews: [...prev.interviews, ...fileArray].slice(0, 10) // Ensure max 10 files
        };
        console.log('🎤 New interviews state:', newState);
        return newState;
      });
    }
  };

  // File removal handler
  const removeFile = (type: 'deck' | 'interviews', index?: number) => {
    console.log('🗑️ removeFile called:', { type, index });
    
    if (type === 'deck') {
      setUploadedFiles(prev => {
        const newState = { ...prev, deck: null };
        console.log('🗑️ Removed deck, new state:', newState);
        return newState;
      });
    } else if (typeof index === 'number') {
      setUploadedFiles(prev => {
        const newState = {
          ...prev,
          interviews: prev.interviews.filter((_, i) => i !== index)
        };
        console.log('🗑️ Removed interview file, new state:', newState);
        return newState;
      });
    }
  };

  // Toggle row expansion
  const toggleRowExpansion = (id: number) => {
    setExpandedRows(prev => {
      const next = new Set(prev)
      if (next.has(id)) {
        next.delete(id)
      } else {
        next.add(id)
      }
      return next
    })
  }

  // Calculate overall score
  const calculateOverallScore = () => {
    if (buyerMapData.length === 0) return 0
    const totalScore = buyerMapData.reduce((sum, data) => sum + data.confidenceScore, 0)
    return Math.round(totalScore / buyerMapData.length)
  }

  // Reset state for new analysis
  const resetState = () => {
    setCurrentStep(1)
    setUploadedFiles({ deck: null, interviews: [] })
    setBuyerMapData([])
    setError(null)
    setActiveTab('all')
    setShowDetails(false)
    setExpandedRows(new Set())
    setRejectedQuotes(new Set())
  }

  // Quote rejection handler
  const handleQuoteRejection = (id: number) => {
    setRejectedQuotes(prev => {
      const next = new Set(prev)
      next.add(id)
      return next
    })
  }

  // Get effective confidence
  const getEffectiveConfidence = (item: BuyerMapData) => {
    return item.confidenceScore
  }

  // Get score message
  const getScoreMessage = (score: number) => {
    if (score >= 80) return 'Strong alignment with customer insights'
    if (score >= 60) return 'Moderate alignment with some areas for improvement'
    return 'Significant misalignment detected'
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-purple-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        <StepIndicator currentStep={currentStep} />

        <AnimatePresence mode="wait">
          {currentStep === 1 && (
            <motion.div
              key="step1"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="text-center mb-8">
                <h1 className="text-4xl font-bold text-gray-900 mb-4">Welcome to BuyerMap</h1>
                <p className="text-xl text-gray-600 mb-8">
                  Validate your ICP assumptions against real customer interview data
                </p>
                <button
                  onClick={() => setCurrentStep(2)}
                  className="bg-blue-600 text-white px-8 py-3 rounded-lg text-lg font-semibold hover:bg-blue-700 transition-colors"
                >
                  Start Analysis
                </button>
              </div>
            </motion.div>
          )}

          {currentStep === 2 && (
            <motion.div
              key="step2"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <FileUploadStep
                uploadedFiles={uploadedFiles}
                onFileUpload={handleFileUpload}
                onRemoveFile={removeFile}
                onNext={() => setCurrentStep(3)}
                isLoading={isLoading}
                error={error}
              />
            </motion.div>
          )}

          {currentStep === 3 && (
            <ResultsStep 
              buyerMapData={buyerMapData}
              overallScore={calculateOverallScore()}
              activeTab={activeTab}
              expandedRows={expandedRows}
              rejectedQuotes={rejectedQuotes}
              onTabChange={setActiveTab}
              onToggleRowExpansion={toggleRowExpansion}
              onQuoteRejection={handleQuoteRejection}
              getEffectiveConfidence={getEffectiveConfidence}
              onNext={() => setCurrentStep(4)}
              onBack={() => setCurrentStep(2)}
            />
          )}

          {currentStep === 4 && (
            <motion.div
              key="step4"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              <div className="bg-white rounded-xl shadow-lg overflow-hidden">
                <div className="p-8">
                  <div className="text-center mb-8">
                    <h2 className="text-2xl font-bold text-gray-900 mb-2">Export Your Results</h2>
                    <p className="text-gray-600">Save your analysis for future reference</p>
                  </div>

                  {/* Export Options */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    {[
                      {
                        id: 'excel',
                        title: 'Excel Export',
                        description: 'Download a detailed Excel report with all insights and quotes',
                        icon: '📊'
                      },
                      {
                        id: 'pdf',
                        title: 'PDF Report',
                        description: 'Get a beautifully formatted PDF report',
                        icon: '📄'
                      },
                      {
                        id: 'clipboard',
                        title: 'Copy to Clipboard',
                        description: 'Copy a summary to share with your team',
                        icon: '📋'
                      }
                    ].map(option => (
                      <button
                        key={option.id}
                        className="p-6 rounded-lg border-2 border-gray-200 hover:border-blue-300 text-left transition-all"
                      >
                        <div className="text-3xl mb-3">{option.icon}</div>
                        <h3 className="font-semibold mb-2">{option.title}</h3>
                        <p className="text-sm text-gray-600">{option.description}</p>
                      </button>
                    ))}
                  </div>

                  {/* Account Creation */}
                  <div className="border-t border-gray-200 pt-8">
                    <div className="text-center mb-6">
                      <h3 className="text-lg font-semibold text-gray-900 mb-2">Create an Account</h3>
                      <p className="text-gray-600">Save your results and get access to more features</p>
                    </div>

                    <form className="space-y-4">
                      <div>
                        <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                          Email
                        </label>
                        <input
                          type="email"
                          id="email"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="company" className="block text-sm font-medium text-gray-700">
                          Company
                        </label>
                        <input
                          type="text"
                          id="company"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div>
                        <label htmlFor="role" className="block text-sm font-medium text-gray-700">
                          Role
                        </label>
                        <input
                          type="text"
                          id="role"
                          className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>

                      <div className="flex justify-end">
                        <button
                          type="submit"
                          className="px-6 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
                        >
                          Create Account
                        </button>
                      </div>
                    </form>
                  </div>
                </div>
              </div>

              <div className="flex justify-between mt-8">
                <button
                  onClick={() => setCurrentStep(3)}
                  className="px-6 py-2 rounded-lg font-semibold text-gray-700 hover:bg-gray-100"
                >
                  Back
                </button>
                <button
                  onClick={resetState}
                  className="px-6 py-2 rounded-lg font-semibold bg-blue-600 text-white hover:bg-blue-700"
                >
                  Start New Analysis
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
} 