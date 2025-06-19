'use client';

import { useState } from 'react';
import { validateMockEnvironment } from '../utils/mockHelper';

export function MockTestButton() {
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const testMockEnvironment = () => {
    validateMockEnvironment();
    console.log('🔍 Environment variables:', {
      'NEXT_PUBLIC_USE_MOCK': process.env.NEXT_PUBLIC_USE_MOCK,
      'mockMode': process.env.NEXT_PUBLIC_USE_MOCK === 'TRUE'
    });
  };

  const testDeckAnalysis = async () => {
    setIsLoading(true);
    try {
      // Create a dummy FormData to test the API
      const formData = new FormData();
      const dummyFile = new File(['dummy content'], 'test-deck.pdf', { type: 'application/pdf' });
      formData.append('deck', dummyFile);

      const response = await fetch('/api/analyze-deck', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      setResult(data);
      console.log('🧪 Test result:', data);
    } catch (error) {
      console.error('🚨 Test error:', error);
      setResult({ error: error instanceof Error ? error.message : 'Test failed' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-4 border rounded-lg bg-gray-50">
      <h3 className="text-lg font-semibold mb-3">🧪 Mock System Test</h3>
      
      <div className="space-y-2 mb-4">
        <button
          onClick={testMockEnvironment}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          Check Environment Variables
        </button>
        
        <button
          onClick={testDeckAnalysis}
          disabled={isLoading}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600 disabled:opacity-50"
        >
          {isLoading ? 'Testing...' : 'Test Deck Analysis API'}
        </button>
      </div>

      {result && (
        <div className="mt-4 p-3 bg-white border rounded">
          <h4 className="font-semibold">Test Result:</h4>
          <pre className="text-xs overflow-auto max-h-40">
            {JSON.stringify(result, null, 2)}
          </pre>
        </div>
      )}

      <div className="text-sm text-gray-600 mt-3">
        <p><strong>Expected behavior:</strong></p>
        <ul className="list-disc ml-5 space-y-1">
          <li>With <code>NEXT_PUBLIC_USE_MOCK=TRUE</code>: Should return mock data instantly</li>
          <li>With <code>NEXT_PUBLIC_USE_MOCK=FALSE</code>: Should attempt real OpenAI call</li>
          <li>Check browser console for detailed logs</li>
        </ul>
      </div>
    </div>
  );
} 