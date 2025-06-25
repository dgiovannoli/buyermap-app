import { http, HttpResponse } from 'msw';
import insights from './fixtures/validationInsights.json';

export const handlers = [
  // Mock the analyze-deck endpoint with job response
  http.post('/api/analyze-deck', () => {
    return HttpResponse.json({
      jobId: 'mock-job-123',
      status: 'completed',
      assumptions: insights.assumptions || [],
      overallAlignmentScore: insights.overallAlignmentScore || 75,
      validatedCount: insights.validatedCount || 3,
      partiallyValidatedCount: insights.partiallyValidatedCount || 2,
      pendingCount: insights.pendingCount || 1,
      companyId: 'mock-company-123'
    });
  }),

  // Mock the analyze-interviews endpoint
  http.post('/api/analyze-interviews', () => {
    return HttpResponse.json({
      assumptions: insights.assumptions || [],
      overallAlignmentScore: insights.overallAlignmentScore || 75,
      validatedCount: insights.validatedCount || 3,
      partiallyValidatedCount: insights.partiallyValidatedCount || 2,
      pendingCount: insights.pendingCount || 1,
      companyId: 'mock-company-123'
    });
  }),

  // Mock the analyze-files endpoint
  http.post('/api/analyze-files', () => {
    return HttpResponse.json({
      assumptions: insights.assumptions || [],
      overallAlignmentScore: insights.overallAlignmentScore || 75,
      validatedCount: insights.validatedCount || 3,
      partiallyValidatedCount: insights.partiallyValidatedCount || 2,
      pendingCount: insights.pendingCount || 1,
      companyId: 'mock-company-123'
    });
  }),
]; 