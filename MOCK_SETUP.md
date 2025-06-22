# Mock System Setup

## Overview
The mock system allows you to test the BuyerMap application without making real OpenAI API calls during development.

## Setup Instructions

### 1. Environment Variables
Create a `.env.local` file in the root directory with:

```bash
NEXT_PUBLIC_USE_MOCK=TRUE
OPENAI_API_KEY=sk-mock-key-for-development
```

### 2. Available Mock Data
- **Deck Analysis**: `src/mocks/fixtures/deck-analysis.json`
- **Interview Results**: `src/mocks/fixtures/interview-results.json`
- **Validation Insights**: `src/mocks/fixtures/validationInsights.json`

### 3. How It Works

When `NEXT_PUBLIC_USE_MOCK=TRUE`, the following APIs return mock data instead of calling OpenAI:

- `/api/analyze-deck` → Returns deck analysis mock data instantly
- `/api/analyze-interviews` → Returns interview validation mock data
- `/api/analyze-files` → Returns combined analysis mock data

### 4. Testing the Mock System

1. **Start the development server:**
   ```bash
   npm run dev
   ```

2. **Test the application flow** - Upload files and verify mock responses are returned

3. **Check console logs** - Look for mock mode indicators in browser console

### 5. Expected Behavior

#### With Mocks Enabled (`NEXT_PUBLIC_USE_MOCK=TRUE`)
- ✅ API calls return instantly with mock data
- ✅ No OpenAI API key required
- ✅ Console shows "🎭 Mock mode enabled" messages
- ✅ No real AI processing occurs

#### With Mocks Disabled (`NEXT_PUBLIC_USE_MOCK=FALSE`)
- ⚠️ Requires valid OpenAI API key
- ⚠️ Makes real API calls to OpenAI
- ⚠️ Processing takes longer (30+ seconds)
- ⚠️ Costs money for OpenAI usage

### 6. Console Logs to Watch For

When mocks are working correctly, you should see:
```
🎭 Mock mode enabled - using fake data for deck analysis
🔧 To use real APIs, set NEXT_PUBLIC_USE_MOCK=FALSE in .env.local
```

### 7. Switching Between Mock and Real APIs

To switch to real APIs:
1. Set `NEXT_PUBLIC_USE_MOCK=FALSE` in `.env.local`
2. Add a valid OpenAI API key
3. Restart the development server

To switch back to mocks:
1. Set `NEXT_PUBLIC_USE_MOCK=TRUE` in `.env.local`
2. Restart the development server

## Mock Data Structure

The mock data follows the same structure as real API responses:
- Assumptions with ICP attributes
- Confidence scores and explanations
- Validation outcomes and quotes
- Overall alignment scores

This ensures seamless switching between mock and real data during development. 