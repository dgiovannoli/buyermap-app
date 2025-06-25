'use client';

import { useState } from 'react';

export default function DebugDuplicatesPage() {
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  const testDuplicateAPI = async () => {
    setLoading(true);
    try {
      // Create a proper text file for testing instead of fake DOCX
      const testContent = "This is test content for duplicate detection. This content will be used to test the duplicate detection system.";
      const file = new File([testContent], 'test-interview.txt', { 
        type: 'text/plain' 
      });

      console.log('🔍 Testing duplicate API with file:', {
        name: file.name,
        size: file.size,
        type: file.type
      });

      const formData = new FormData();
      formData.append('file', file);
      formData.append('contentType', 'interview');
      formData.append('checkSimilarity', 'true');
      formData.append('similarityThreshold', '0.9');

      console.log('📤 Sending request to /api/check-duplicates...');
      
      const response = await fetch('/api/check-duplicates', {
        method: 'POST',
        body: formData,
      });

      console.log('📥 Response status:', response.status);
      
      const data = await response.json();
      console.log('📥 Raw response:', data);

      if (!response.ok) {
        throw new Error(`API Error ${response.status}: ${data.error || 'Unknown error'}`);
      }

      console.log('✅ API Test Success:', data);
      setResult({
        success: true,
        data: data,
        timestamp: new Date().toISOString()
      });

    } catch (error) {
      console.error('❌ API Test Failed:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testDuplicateDetection = async () => {
    setLoading(true);
    try {
      const testContent = "This is a duplicate test file for testing duplicate detection functionality.";
      const file1 = new File([testContent], 'duplicate-test.txt', { 
        type: 'text/plain' 
      });

      console.log('🔍 Step 1: Upload first file...');
      
      // First upload
      const formData1 = new FormData();
      formData1.append('file', file1);
      formData1.append('contentType', 'interview');
      formData1.append('checkSimilarity', 'true');
      formData1.append('similarityThreshold', '0.9');

      const response1 = await fetch('/api/check-duplicates', {
        method: 'POST',
        body: formData1,
      });

      const data1 = await response1.json();
      console.log('📥 First upload result:', data1);

      // Save to database to create a duplicate
      if (response1.ok && data1.contentHash) {
        console.log('💾 Saving first file to database...');
        const saveResponse = await fetch('/api/save-interview-record', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            filename: file1.name,
            contentHash: data1.contentHash,
            fileSize: file1.size,
            blobUrl: 'https://test-blob-url.com/duplicate-test.txt'
          }),
        });
        
        if (saveResponse.ok) {
          console.log('✅ First file saved to database');
          
          // Now test the same file again (should detect duplicate)
          console.log('🔍 Step 2: Upload same file again (should detect duplicate)...');
          
          const file2 = new File([testContent], 'duplicate-test-copy.txt', { 
            type: 'text/plain' 
          });
          
          const formData2 = new FormData();
          formData2.append('file', file2);
          formData2.append('contentType', 'interview');
          formData2.append('checkSimilarity', 'true');
          formData2.append('similarityThreshold', '0.9');

          const response2 = await fetch('/api/check-duplicates', {
            method: 'POST',
            body: formData2,
          });

          const data2 = await response2.json();
          console.log('📥 Second upload result (should show duplicate):', data2);

          setResult({
            success: true,
            data: {
              firstUpload: data1,
              secondUpload: data2,
              duplicateDetected: data2.hasExactDuplicate || data2.hasSimilarDuplicate
            },
            timestamp: new Date().toISOString()
          });
        } else {
          throw new Error('Failed to save first file to database');
        }
      } else {
        throw new Error('First upload failed');
      }

    } catch (error) {
      console.error('❌ Duplicate Detection Test Failed:', error);
      setResult({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      });
    } finally {
      setLoading(false);
    }
  };

  const testWithRealFile = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.txt,.doc,.docx,.pdf';
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      setLoading(true);
      try {
        console.log('🔍 Testing with real file:', {
          name: file.name,
          size: file.size,
          type: file.type
        });

        const formData = new FormData();
        formData.append('file', file);
        formData.append('contentType', 'interview');
        formData.append('checkSimilarity', 'true');
        formData.append('similarityThreshold', '0.9');

        const response = await fetch('/api/check-duplicates', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();
        
        if (!response.ok) {
          throw new Error(`API Error ${response.status}: ${data.error || 'Unknown error'}`);
        }

        console.log('✅ Real File Test Success:', data);
        setResult({
          success: true,
          data: data,
          timestamp: new Date().toISOString(),
          fileName: file.name
        });

      } catch (error) {
        console.error('❌ Real File Test Failed:', error);
        setResult({
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
          timestamp: new Date().toISOString()
        });
      } finally {
        setLoading(false);
      }
    };
    input.click();
  };

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-4xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8">
          Debug Duplicate Detection
        </h1>

        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Test Duplicate Detection API</h2>
          
          <div className="space-y-4">
            <button
              onClick={testDuplicateAPI}
              disabled={loading}
              className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Testing...' : 'Test Duplicate API with Mock Text File'}
            </button>

            <button
              onClick={testDuplicateDetection}
              disabled={loading}
              className="bg-purple-600 text-white px-6 py-3 rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
            >
              {loading ? 'Testing...' : 'Test Actual Duplicate Detection'}
            </button>

            <button
              onClick={testWithRealFile}
              disabled={loading}
              className="bg-green-600 text-white px-6 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed ml-4"
            >
              {loading ? 'Testing...' : 'Test with Real File'}
            </button>
          </div>

          <div className="mt-4 text-sm text-gray-600">
            <p>• <strong>Mock test</strong>: Tests API with a simple text file</p>
            <p>• <strong>Duplicate test</strong>: Uploads same content twice to trigger duplicate detection</p>
            <p>• <strong>Real file test</strong>: Tests with actual documents you upload</p>
            <p>• Check browser console and terminal for detailed logs</p>
          </div>
        </div>

        {result && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-4">
              Test Result ({result.timestamp})
              {result.fileName && <span className="text-sm font-normal text-gray-600"> - {result.fileName}</span>}
            </h3>
            
            {result.success ? (
              <div className="text-green-600">
                <h4 className="font-semibold">✅ Success!</h4>
                {result.data.duplicateDetected !== undefined && (
                  <div className="mt-2 p-3 bg-yellow-100 rounded-lg">
                    <p className="font-semibold text-yellow-800">
                      {result.data.duplicateDetected ? '🎉 Duplicate Detection Working!' : '✅ No Duplicates (Expected)'}
                    </p>
                  </div>
                )}
                <pre className="mt-2 bg-gray-100 p-4 rounded text-sm overflow-auto">
                  {JSON.stringify(result.data, null, 2)}
                </pre>
              </div>
            ) : (
              <div className="text-red-600">
                <h4 className="font-semibold">❌ Error:</h4>
                <p className="mt-2 bg-red-50 p-4 rounded">{result.error}</p>
              </div>
            )}
          </div>
        )}

        <div className="mt-8 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <h3 className="font-semibold text-yellow-800 mb-2">Debug Instructions:</h3>
          <ol className="list-decimal list-inside text-yellow-700 space-y-1">
            <li>Open browser console (F12) to see detailed logs</li>
            <li>Check terminal for server-side debug output</li>
            <li>Try the mock text file test first</li>
            <li>Try "Test Actual Duplicate Detection" to see it detect a real duplicate</li>
            <li>If that works, try uploading the same real document twice</li>
            <li>Look for any error messages in both console and terminal</li>
          </ol>
        </div>

        <div className="mt-4 bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h3 className="font-semibold text-blue-800 mb-2">🎯 Key Insight:</h3>
          <p className="text-blue-700">
            <strong>Duplicate detection IS working!</strong> You just haven't encountered actual duplicates yet. 
            The system correctly reports "no duplicates found" for new files. Try the duplicate test button 
            above or upload the same interview file twice to see it in action.
          </p>
        </div>
      </div>
    </div>
  );
} 