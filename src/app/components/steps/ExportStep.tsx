'use client'

import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { BuyerMapData } from '@/types/buyer-map'
import * as XLSX from 'xlsx'
import { getScoreMessage } from '@/styles/theme'

interface ExportStepProps {
  overallScore: number
  buyerMapData: BuyerMapData[]
  onBack: () => void
  onStartNew: () => void
  onBackToHome: () => void
}

export default function ExportStep({ overallScore, buyerMapData, onBack, onStartNew, onBackToHome }: ExportStepProps) {
  const [exportFormat, setExportFormat] = useState<'excel' | 'pdf' | 'clipboard'>('excel')
  const [isExporting, setIsExporting] = useState(false)
  const [showAccountForm, setShowAccountForm] = useState(false)
  const [accountDetails, setAccountDetails] = useState({
    email: '',
    company: '',
    role: ''
  })

  const handleExport = async () => {
    setIsExporting(true)
    try {
      switch (exportFormat) {
        case 'excel':
          await exportToExcel()
          break
        case 'pdf':
          await exportToPDF()
          break
        case 'clipboard':
          await copyToClipboard()
          break
      }
    } catch (error) {
      console.error('Export failed:', error)
    } finally {
      setIsExporting(false)
    }
  }

  const exportToExcel = async () => {
    const workbook = XLSX.utils.book_new()
    // Summary Sheet
    const summaryData = [
      ['BuyerMap Analysis Summary'],
      [''],
      ['Overall Alignment Score', `${overallScore}%`],
      ['Score Interpretation', getScoreMessage(overallScore)],
      [''],
      ['Analysis Details'],
      ['Total Insights', buyerMapData.length],
      ['Misalignments', buyerMapData.filter(d => d.comparisonOutcome === 'Misaligned').length],
      ['New Insights', buyerMapData.filter(d => d.comparisonOutcome === 'New Data Added').length],
      ['Validated', buyerMapData.filter(d => d.comparisonOutcome === 'Aligned').length]
    ]
    const summarySheet = XLSX.utils.aoa_to_sheet(summaryData)
    XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary')
    // Details Sheet
    const detailsData = buyerMapData.map(data => ({
      'ICP Attribute': data.icpAttribute,
      'ICP Theme': data.icpTheme,
      'Your Assumption': data.v1Assumption,
      'Why Assumption': data.whyAssumption,
      'Evidence from Deck': data.evidenceFromDeck,
      'Reality from Interviews': data.realityFromInterviews,
      'Comparison Outcome': data.comparisonOutcome,
      'Recommended Adjustments': data.waysToAdjustMessaging,
      'Confidence Score': `${data.confidenceScore}%`,
      'Confidence Explanation': data.confidenceExplanation
    }))
    const detailsSheet = XLSX.utils.json_to_sheet(detailsData)
    XLSX.utils.book_append_sheet(workbook, detailsSheet, 'Details')
    // Quotes Sheet
    const quotesData = buyerMapData.flatMap(data =>
      data.quotes.map(quote => ({
        'ICP Attribute': data.icpAttribute,
        'Quote': quote.text,
        'Speaker': quote.speaker,
        'Role': quote.role,
        'Source': quote.source
      }))
    )
    const quotesSheet = XLSX.utils.json_to_sheet(quotesData)
    XLSX.utils.book_append_sheet(workbook, quotesSheet, 'Quotes')
    // Save the file
    XLSX.writeFile(workbook, 'buyermap-analysis.xlsx')
  }

  const exportToPDF = async () => {
    // TODO: Implement PDF export
    alert('PDF export not implemented yet')
  }

  const copyToClipboard = async () => {
    const summary = `BuyerMap Analysis Summary\n\n` +
      `Overall Alignment Score: ${overallScore}%\n` +
      `Score Interpretation: ${getScoreMessage(overallScore)}\n\n` +
      `Analysis Details:\n` +
      `- Total Insights: ${buyerMapData.length}\n` +
      `- Misalignments: ${buyerMapData.filter(d => d.comparisonOutcome === 'Misaligned').length}\n` +
      `- New Insights: ${buyerMapData.filter(d => d.comparisonOutcome === 'New Data Added').length}\n` +
      `- Validated: ${buyerMapData.filter(d => d.comparisonOutcome === 'Aligned').length}\n\n` +
      `View full analysis at: ${window.location.href}`
    await navigator.clipboard.writeText(summary)
    alert('Summary copied to clipboard!')
  }

  const handleAccountSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    // TODO: Implement account creation
    alert('Account creation not implemented yet')
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold mb-4">Export Your Analysis</h2>
        <p className="text-gray-600">Choose how you'd like to export your BuyerMap analysis results.</p>
      </div>
      {/* Export Options */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            onClick={() => setExportFormat(option.id as 'excel' | 'pdf' | 'clipboard')}
            className={`p-6 rounded-lg border-2 text-left transition-all ${
              exportFormat === option.id
                ? 'border-blue-500 bg-blue-50'
                : 'border-gray-200 hover:border-blue-300'
            }`}
          >
            <div className="text-3xl mb-3">{option.icon}</div>
            <h3 className="font-semibold mb-2">{option.title}</h3>
            <p className="text-sm text-gray-600">{option.description}</p>
          </button>
        ))}
      </div>
      {/* Export Button */}
      <div className="flex justify-end">
        <button
          onClick={handleExport}
          disabled={isExporting}
          className={`px-6 py-2 rounded-lg font-semibold ${
            isExporting
              ? 'bg-gray-300 cursor-not-allowed'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {isExporting ? 'Exporting...' : 'Export Now'}
        </button>
      </div>
      {/* Account Creation */}
      <div className="mt-12 pt-8 border-t border-gray-200">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h3 className="text-lg font-semibold">Create an Account</h3>
            <p className="text-gray-600">Save your analysis and get access to more features</p>
          </div>
          <button
            onClick={() => setShowAccountForm(!showAccountForm)}
            className="text-blue-600 hover:text-blue-700"
          >
            {showAccountForm ? 'Hide Form' : 'Show Form'}
          </button>
        </div>
        <AnimatePresence>
          {showAccountForm && (
            <motion.form
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              onSubmit={handleAccountSubmit}
              className="space-y-4"
            >
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email
                </label>
                <input
                  type="email"
                  id="email"
                  value={accountDetails.email}
                  onChange={e => setAccountDetails(prev => ({ ...prev, email: e.target.value }))}
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
                  value={accountDetails.company}
                  onChange={e => setAccountDetails(prev => ({ ...prev, company: e.target.value }))}
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
                  value={accountDetails.role}
                  onChange={e => setAccountDetails(prev => ({ ...prev, role: e.target.value }))}
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
            </motion.form>
          )}
        </AnimatePresence>
      </div>
      {/* Navigation */}
      <div className="flex flex-col md:flex-row justify-between gap-4 mt-8">
        <button 
          onClick={onBack}
          className="bg-gray-600 text-white px-8 py-3 rounded-lg"
        >
          Back to Step 3
        </button>
        <button 
          onClick={onStartNew}
          className="bg-blue-600 text-white px-8 py-3 rounded-lg"
        >
          Start New Analysis
        </button>
        <button 
          onClick={onBackToHome}
          className="bg-gray-400 text-white px-8 py-3 rounded-lg"
        >
          Back to Homepage
        </button>
      </div>
    </div>
  )
} 