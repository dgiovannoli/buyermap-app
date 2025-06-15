'use client'

import { useState } from 'react'
import { BuyerMapData, UploadedFiles } from '@/types/buyer-map'
import BuyerMapInterface from './BuyerMapInterface'
import FileUploadStep from './steps/FileUploadStep'
import ResultsStep from './steps/ResultsStep'
import ExportStep from './steps/ExportStep'
import StepIndicator from './ui/StepIndicator'

export default function BuyerMapHome() {
  const [currentStep, setCurrentStep] = useState(1)
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFiles>({ deck: null, interviews: [] })
  const [buyerMapData, setBuyerMapData] = useState<BuyerMapData[]>([])
  const [overallScore, setOverallScore] = useState<number | null>(null)
  const [activeTab, setActiveTab] = useState('all')
  const [expandedRows, setExpandedRows] = useState<Set<number>>(new Set())
  const [rejectedQuotes, setRejectedQuotes] = useState<Set<number>>(new Set())
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Mock data (your existing data but in array format)
  const mockBuyerMapData: BuyerMapData[] = [
    {
      id: 1,
      icpAttribute: "Pain Points",
      icpTheme: "Evidence Review Burden", 
      v1Assumption: "Attorneys spend 87+ workdays/year on manual evidence review",
      whyAssumption: "Market research indicated high time investment in evidence processing",
      evidenceFromDeck: "Slide 4: '87 workdays wasted annually'",
      realityFromInterviews: "Attorneys actually spend 60-120 workdays depending on case complexity and firm size",
      comparisonOutcome: "New Data Added",
      waysToAdjustMessaging: "Segment messaging by firm size - small firms relate to 120+ days, large firms to 60 days",
      confidenceScore: 85,
      confidenceExplanation: "8 quotes from diverse attorney roles, consistent pattern across firm sizes",
      quotes: [
        { id: 1, text: "In complex cases, I easily spend 3-4 months just reviewing evidence", speaker: "Maria Santos", role: "Criminal Defense Attorney", source: "Interview #2", rejected: false },
        { id: 2, text: "For our firm size, 87 days sounds about right for major cases", speaker: "David Chen", role: "Managing Partner", source: "Interview #5", rejected: false }
      ]
    },
    {
      id: 2,
      icpAttribute: "Desired Outcomes",
      icpTheme: "Courtroom Advantage Priority",
      v1Assumption: "Primary goal is creating searchable, court-ready insights",
      whyAssumption: "Product positioning focused on trial preparation and courtroom success", 
      evidenceFromDeck: "Slide 7: 'Transform evidence into courtroom advantage'",
      realityFromInterviews: "Defense attorneys prioritize avoiding malpractice over gaining advantages",
      comparisonOutcome: "Misaligned",
      waysToAdjustMessaging: "Lead with risk mitigation and malpractice prevention, position advantages as secondary benefit",
      confidenceScore: 92,
      confidenceExplanation: "12 quotes across all interview types, unanimous sentiment on risk vs advantage",
      quotes: [
        { id: 3, text: "I just need to make sure I don't miss anything that could hurt my client", speaker: "Jennifer Park", role: "Solo Practitioner", source: "Interview #1", rejected: false },
        { id: 4, text: "It's not about gaining an edge - it's about not getting blindsided", speaker: "Robert Kim", role: "Senior Associate", source: "Interview #7", rejected: false }
      ]
    }
  ]

  const handleFileUpload = (type: 'deck' | 'interviews', files: FileList | null) => {
    if (!files) return

    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: files[0] }))
    } else {
      setUploadedFiles(prev => ({ 
        ...prev, 
        interviews: [...prev.interviews, ...Array.from(files)] 
      }))
    }
  }

  const removeFile = (type: 'deck' | 'interviews', index?: number) => {
    if (type === 'deck') {
      setUploadedFiles(prev => ({ ...prev, deck: null }))
    } else if (typeof index === 'number') {
      setUploadedFiles(prev => ({
        ...prev,
        interviews: prev.interviews.filter((_, i) => i !== index)
      }))
    }
  }

  const processFiles = () => {
    // Simulate processing
    setBuyerMapData(mockBuyerMapData)
    calculateOverallScore(mockBuyerMapData)
    setCurrentStep(3)
  }

  const calculateOverallScore = (data: BuyerMapData[]) => {
    const outcomeWeights: Record<string, number> = { 'Aligned': 2, 'New Data Added': 1, 'Misaligned': 0 }
    const totalWeighted = data.reduce((sum: number, item: BuyerMapData) => {
      return sum + (outcomeWeights[item.comparisonOutcome] * (item.confidenceScore / 100))
    }, 0)
    const maxPossible = data.length * 2
    const score = Math.round((totalWeighted / maxPossible) * 100)
    setOverallScore(score)
  }

  const getEffectiveConfidence = (item: BuyerMapData) => {
    const activeQuotes = item.quotes.filter(quote => !rejectedQuotes.has(quote.id))
    const rejectionPenalty = (item.quotes.length - activeQuotes.length) * 10
    return Math.max(item.confidenceScore - rejectionPenalty, 0)
  }

  const handleQuoteRejection = (quoteId: number) => {
    const newRejected = new Set(rejectedQuotes)
    newRejected.add(quoteId)
    setRejectedQuotes(newRejected)
    calculateOverallScore(buyerMapData)
  }

  const toggleRowExpansion = (id: number) => {
    const newExpanded = new Set(expandedRows)
    if (newExpanded.has(id)) {
      newExpanded.delete(id)
    } else {
      newExpanded.add(id)
    }
    setExpandedRows(newExpanded)
  }

  const getScoreMessage = (score: number) => {
    if (score >= 90) return 'Your messaging is highly aligned with buyer reality'
    if (score >= 70) return 'Generally aligned, with room for refinement'
    return 'Major adjustments to core messaging likely needed'
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1:
        return <BuyerMapInterface onStartFlow={() => setCurrentStep(2)} />
        
      case 2:
        return (
          <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <StepIndicator currentStep={currentStep} />
              <FileUploadStep 
                uploadedFiles={uploadedFiles}
                onFileUpload={handleFileUpload}
                onRemoveFile={removeFile}
                onNext={processFiles}
                onBackToHome={() => setCurrentStep(1)}
              />
            </div>
          </div>
        )
        
      case 3:
        return (
          <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <StepIndicator currentStep={currentStep} />
              <ResultsStep 
                buyerMapData={buyerMapData}
                overallScore={overallScore}
                activeTab={activeTab}
                expandedRows={expandedRows}
                rejectedQuotes={rejectedQuotes}
                onTabChange={setActiveTab}
                onToggleRowExpansion={toggleRowExpansion}
                onQuoteRejection={handleQuoteRejection}
                getEffectiveConfidence={getEffectiveConfidence}
                onNext={() => setCurrentStep(4)}
                onBack={() => setCurrentStep(2)}
                onBackToHome={() => setCurrentStep(1)}
              />
            </div>
          </div>
        )
        
      case 4:
        return (
          <div className="max-w-7xl mx-auto p-6 bg-gray-50 min-h-screen">
            <div className="bg-white rounded-lg shadow-sm p-8">
              <StepIndicator currentStep={currentStep} />
              {overallScore !== null && (
                <ExportStep 
                  overallScore={overallScore}
                  buyerMapData={buyerMapData}
                  onBack={() => setCurrentStep(3)}
                  onStartNew={() => {
                    setCurrentStep(1)
                    setUploadedFiles({ deck: null, interviews: [] })
                    setBuyerMapData([])
                    setOverallScore(null)
                    setRejectedQuotes(new Set())
                    setExpandedRows(new Set())
                    setActiveTab('all')
                  }}
                  onBackToHome={() => setCurrentStep(1)}
                />
              )}
            </div>
          </div>
        )
        
      default:
        return null
    }
  }

  return (
    <div className="min-h-screen">
      {renderStep()}
    </div>
  )
} 