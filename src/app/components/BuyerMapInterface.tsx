'use client'

import { useState, useEffect } from 'react'
import { BuyerMapData } from '@/types/buyermap'
import { content } from '@/content/copy'
import { getOutcomeColor, getConfidenceColor, getScoreMessage } from '@/styles/theme'
import * as XLSX from 'xlsx'
import BuyerMapHome from './BuyerMapHome'

interface BuyerMapInterfaceProps {
  onStartFlow: () => void
}

export default function BuyerMapInterface({ onStartFlow }: BuyerMapInterfaceProps) {
  const [currentStep, setCurrentStep] = useState(1)
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [windowWidth, setWindowWidth] = useState<number>(0)
  const [activeTab, setActiveTab] = useState('allResults')
  const [showDetails, setShowDetails] = useState(false)

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setWindowWidth(window.innerWidth)
      const handleResize = () => setWindowWidth(window.innerWidth)
      window.addEventListener('resize', handleResize)
      return () => window.removeEventListener('resize', handleResize)
    }
  }, [])

  const handleFileUpload = async (file: File) => {
    setIsLoading(true)
    setError(null)
    
    try {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const data = e.target?.result
          const workbook = XLSX.read(data, { type: 'binary' })
          const sheetName = workbook.SheetNames[0]
          const worksheet = workbook.Sheets[sheetName]
          const jsonData = XLSX.utils.sheet_to_json(worksheet)
          
          // TODO: Process the data into BuyerMapData format
          // For now, we'll just set a mock data
          setBuyerMapData({
            id: '1',
            icpAttribute: 'Enterprise Decision Maker',
            icpTheme: 'Digital Transformation',
            v1Assumption: 'They care about ROI',
            whyAssumption: 'Based on market research',
            evidenceFromDeck: 'Slide 5 shows ROI metrics',
            realityFromInterviews: 'They care more about implementation time',
            comparisonOutcome: 'Misaligned',
            waysToAdjustMessaging: 'Focus on time-to-value instead of ROI',
            confidenceScore: 85,
            confidenceExplanation: 'Multiple interviews confirm this insight',
            quotes: [
              {
                id: '1',
                text: 'ROI is important, but we need to get this done quickly',
                speaker: 'John Doe',
                role: 'CTO',
                source: 'Interview #3',
                rejected: false
              }
            ]
          })
          
          setCurrentStep(3)
        } catch (err) {
          setError('Error processing file. Please ensure it\'s in the correct format.')
        }
      }
      
      reader.onerror = () => {
        setError('Error reading file')
      }
      
      reader.readAsBinaryString(file)
    } catch (err) {
      setError('Error uploading file')
    } finally {
      setIsLoading(false)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BuyerMapHome onStartFlow={() => setCurrentStep(2)} />
      case 2:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50">
            <h1 className="text-4xl font-bold mb-8 text-center">Upload Your Data</h1>
            <div className="w-full max-w-md">
              <div className="bg-white p-8 rounded-lg shadow-lg">
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  className="w-full p-4 border-2 border-dashed border-gray-300 rounded-lg hover:border-blue-500 transition-colors"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    if (file) handleFileUpload(file)
                  }}
                />
                {isLoading && (
                  <div className="mt-4 text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                    <p className="mt-2 text-gray-600">Processing your file...</p>
                  </div>
                )}
                {error && (
                  <div className="mt-4 p-4 bg-red-50 text-red-600 rounded-lg">
                    {error}
                  </div>
                )}
              </div>
            </div>
          </div>
        )
      case 3:
        return (
          <div className="flex flex-col items-center justify-center min-h-screen p-8 bg-gradient-to-br from-blue-50 to-purple-50">
            <h1 className="text-4xl font-bold mb-8 text-center">Your BuyerMap Results</h1>
            {buyerMapData ? (
              <div className="w-full max-w-4xl bg-white rounded-lg shadow-lg p-8">
                <div className="mb-8">
                  <h2 className="text-2xl font-bold mb-4">Overall Alignment Score</h2>
                  <div className="flex items-center gap-4">
                    <div className={`w-16 h-16 rounded-full ${getConfidenceColor(buyerMapData.confidenceScore)} flex items-center justify-center text-white font-bold text-xl`}>
                      {buyerMapData.confidenceScore}%
                    </div>
                    <div>
                      <p className="text-lg font-semibold">{getScoreMessage(buyerMapData.confidenceScore)}</p>
                      <p className="text-gray-600">{buyerMapData.confidenceExplanation}</p>
                    </div>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className={`p-6 rounded-lg border ${getOutcomeColor(buyerMapData.comparisonOutcome)}`}>
                    <h3 className="text-xl font-bold mb-4">ICP Attribute Analysis</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div>
                        <h4 className="font-semibold mb-2">Your Assumption</h4>
                        <p className="text-gray-700">{buyerMapData.v1Assumption}</p>
                        <p className="text-sm text-gray-500 mt-1">{buyerMapData.whyAssumption}</p>
                      </div>
                      <div>
                        <h4 className="font-semibold mb-2">Reality from Interviews</h4>
                        <p className="text-gray-700">{buyerMapData.realityFromInterviews}</p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 p-6 rounded-lg">
                    <h3 className="text-xl font-bold mb-4">Recommended Adjustments</h3>
                    <p className="text-gray-700">{buyerMapData.waysToAdjustMessaging}</p>
                  </div>

                  {buyerMapData.quotes.length > 0 && (
                    <div className="bg-gray-50 p-6 rounded-lg">
                      <h3 className="text-xl font-bold mb-4">Supporting Quotes</h3>
                      <div className="space-y-4">
                        {buyerMapData.quotes.map((quote) => (
                          <div key={quote.id} className="bg-white p-4 rounded-lg shadow-sm">
                            <p className="text-gray-700 italic">"{quote.text}"</p>
                            <p className="text-sm text-gray-500 mt-2">
                              — {quote.speaker}, {quote.role}
                            </p>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading results...</p>
              </div>
            )}
          </div>
        )
      default:
        return null
    }
  }

  // Debug check for onStartFlow
  if (!onStartFlow) {
    console.error('❌ onStartFlow prop is missing!')
    return <div>Error: onStartFlow prop not provided</div>
  }

  if (typeof onStartFlow !== 'function') {
    console.error('❌ onStartFlow is not a function:', typeof onStartFlow)
    return <div>Error: onStartFlow must be a function</div>
  }

  console.log('✅ onStartFlow prop received correctly')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-gray-900 to-black text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-purple-500 rounded-full mix-blend-multiply filter blur-xl opacity-70 animate-pulse"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-60 h-60 bg-indigo-500 rounded-full mix-blend-multiply filter blur-xl opacity-50 animate-pulse"></div>
      </div>

      {/* Hero Section - Two Column Layout */}
      <div 
        className="main-container grid gap-8 md:gap-10 lg:gap-16 px-4 md:px-8 lg:px-16 py-8 md:py-16 relative z-10"
        style={{
          gridTemplateColumns: '1fr',
          ...(windowWidth >= 768 && windowWidth < 1024 ? { gridTemplateColumns: '1fr 1fr' } : {}),
          ...(windowWidth >= 1024 ? { gridTemplateColumns: '2fr 3fr' } : {})
        }}
      >
        {/* Left Panel */}
        <div 
          className="left-panel flex flex-col justify-center space-y-4 md:space-y-6 lg:space-y-8 w-full md:w-auto"
          style={{
            maxWidth: '480px',
            margin: '0 auto',
            gap: '1rem',
            padding: '1.5rem 0',
          }}
        >
          <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold leading-tight mb-2 md:mb-3 lg:mb-4 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
            {content.headline}
          </h1>
          <p className="text-base md:text-lg lg:text-xl text-gray-400 mb-2 md:mb-3 lg:mb-4 leading-snug">
            {content.description}
          </p>
          <button
            onClick={() => {
              console.log('🔥 Button clicked - calling onStartFlow')
              if (onStartFlow && typeof onStartFlow === 'function') {
                onStartFlow()
              } else {
                console.error('onStartFlow not available')
                alert('Navigation error - check console')
              }
            }}
            className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-3 md:px-10 md:py-4 rounded-xl text-lg font-semibold hover:from-blue-700 hover:to-purple-700 shadow-2xl hover:shadow-3xl transition-all duration-200 mb-2"
            style={{ minHeight: 48 }}
          >
            {content.ctaButton}
          </button>
          <p className="text-sm text-gray-400">{content.freeTrialNotice}</p>
        </div>

        {/* Right Panel - Demo Preview */}
        <div className="right-panel flex flex-col space-y-6">
          {/* Score Section */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20">
            <div className="text-center bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white p-8">
              <div className="relative">
                {/* Badge in top-right */}
                <div className="absolute -top-4 -right-4">
                  <span className="bg-orange-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    4 misalignments found
                  </span>
                </div>
                <h3 className="text-sm font-medium mb-2 opacity-90">Overall Alignment Score</h3>
                <div className="text-5xl font-bold mb-3">92%</div>
                <p className="text-sm opacity-90">Highly aligned with buyer reality</p>
                <div className="absolute bottom-4 left-4">
                  <span className="bg-green-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                    ✓ 3 insights validated
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Tabs and Content */}
          <div className="bg-white/10 backdrop-blur-lg rounded-2xl overflow-hidden border border-white/20">
            {/* Tab Navigation */}
            <div className="border-b border-white/10 px-6 py-2">
              <nav className="-mb-px flex space-x-6">
                <div className="py-3 border-b-2 border-white/50 text-sm font-medium text-white">
                  All Results (8)
                </div>
                <div className="py-3 text-sm text-gray-400 hover:text-gray-300 cursor-pointer">
                  Misalignments (4)
                </div>
                <div className="py-3 text-sm text-gray-400 hover:text-gray-300 cursor-pointer">
                  New Insights (3)
                </div>
                <div className="py-3 text-sm text-gray-400 hover:text-gray-300 cursor-pointer">
                  Validated (1)
                </div>
              </nav>
            </div>

            {/* Content Area */}
            <div className="p-6">
              <div className="grid grid-cols-2 gap-8 items-start">
                {/* Left Column */}
                <div className="space-y-3">
                  <div className="text-xs text-blue-300 font-medium">COMPETITIVE POSITIONING</div>
                  <h4 className="text-lg font-bold text-white">Speed vs Security Messaging</h4>
                  <p className="text-sm text-gray-300">
                    Customers choose us primarily for faster deployment (3x faster than competitors)
                  </p>
                  <div className="bg-blue-500/20 border-l-4 border-blue-400 rounded-r-lg p-3 mt-4">
                    <h5 className="font-semibold text-blue-200 mb-1 text-xs flex items-center">
                      💡 Messaging Recommendation:
                    </h5>
                    <p className="text-xs text-blue-300">
                      Lead with enterprise security first, position speed as efficiency benefit for implementation
                    </p>
                  </div>
                </div>

                {/* Right Column */}
                <div className="space-y-4">
                  <p className="text-sm text-gray-300">
                    Security and compliance are the #1 decision factor, speed is nice-to-have
                  </p>
                  <div className="flex items-center justify-between">
                    <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-500/30 text-blue-200">
                      Misaligned
                    </span>
                    <div className="flex items-center space-x-2">
                      <div className="w-12 bg-white/20 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full bg-green-400" style={{ width: '92%' }}></div>
                      </div>
                      <span className="text-sm font-bold text-white">92%</span>
                    </div>
                  </div>
                  <button 
                    onClick={() => setShowDetails(!showDetails)}
                    className="text-blue-300 text-sm font-medium hover:text-blue-200 transition-colors"
                  >
                    {showDetails ? 'Hide Details ▲' : 'Show Details ▼'}
                  </button>
                </div>
              </div>

              {/* Supporting Evidence Section */}
              {showDetails && (
                <div className="mt-6 pt-4 border-t border-white/10">
                  <h5 className="font-semibold text-white mb-3 text-sm">Supporting Evidence:</h5>
                  <div className="bg-white/5 rounded-lg p-3">
                    <p className="text-sm text-gray-300 italic mb-2">
                      "Speed doesn't matter if we can't pass SOC 2 audit"
                    </p>
                    <p className="text-xs text-gray-400">
                      <strong>Sarah Chen</strong>, IT Director • Interview #4
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* How It Works Section */}
      <div className="relative z-10 px-4 md:px-8 lg:px-16 py-16">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-12 bg-gradient-to-r from-white via-blue-100 to-purple-200 bg-clip-text text-transparent">
          How It Works
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {[
            {
              title: 'Upload Your Data',
              description: 'Import your sales deck and customer interview transcripts'
            },
            {
              title: 'AI Analysis',
              description: 'Our AI compares your messaging against real customer feedback'
            },
            {
              title: 'Get Insights',
              description: 'Receive actionable recommendations to improve your messaging'
            }
          ].map((step, index) => (
            <div key={index} className="text-center group cursor-pointer">
              <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-blue-600 text-white rounded-2xl flex items-center justify-center font-bold text-2xl mx-auto mb-6 shadow-lg group-hover:shadow-xl group-hover:scale-105 transition-all duration-200">
                {index + 1}
              </div>
              <h3 className="text-xl font-semibold mb-2">{step.title}</h3>
              <p className="text-gray-400">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}