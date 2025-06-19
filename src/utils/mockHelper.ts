export function isMockMode(): boolean {
  return process.env.NEXT_PUBLIC_USE_MOCK === "TRUE";
}

export function logMockUsage(endpoint: string): void {
  if (isMockMode()) {
    console.log(`🎭 Mock mode enabled - using fake data for ${endpoint}`);
    console.log(`🔧 To use real APIs, set NEXT_PUBLIC_USE_MOCK=FALSE in .env.local`);
  }
}

export function validateMockEnvironment(): void {
  if (typeof window !== 'undefined') {
    // Client side
    console.log('🔍 Mock environment check (client):', {
      'NEXT_PUBLIC_USE_MOCK': process.env.NEXT_PUBLIC_USE_MOCK,
      'mockModeEnabled': isMockMode()
    });
  } else {
    // Server side
    console.log('🔍 Mock environment check (server):', {
      'NEXT_PUBLIC_USE_MOCK': process.env.NEXT_PUBLIC_USE_MOCK,
      'OPENAI_API_KEY': process.env.OPENAI_API_KEY ? 'SET' : 'NOT_SET',
      'mockModeEnabled': isMockMode()
    });
  }
} 