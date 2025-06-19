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

2. **Check the home page** - A mock test button will appear in development mode

3. **Test environment variables** - Click "Check Environment Variables" to verify setup

4. **Test API endpoints** - Click "Test Deck Analysis API" to verify mock responses

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

**To use mock data (development):**
```bash
NEXT_PUBLIC_USE_MOCK=TRUE
```

**To use real OpenAI APIs (production):**
```bash
NEXT_PUBLIC_USE_MOCK=FALSE
OPENAI_API_KEY=sk-your-real-openai-key
```

### 8. Troubleshooting

**Mock data not loading:**
- Check that `.env.local` exists and contains `NEXT_PUBLIC_USE_MOCK=TRUE`
- Restart the development server after changing environment variables
- Check browser console for mock-related logs

**Still getting OpenAI errors:**
- Verify environment variable is set correctly
- Make sure you restarted the dev server
- Check that the API routes are using the mock helper functions

### 9. Files Modified for Mock System

- **API Routes**: `src/app/api/analyze-deck/route.ts`, `src/app/api/analyze-interviews/route.ts`, `src/app/api/analyze-files/route.ts`
- **Mock Helper**: `src/utils/mockHelper.ts`
- **Mock Data**: `src/mocks/fixtures/*.json`
- **Test Component**: `src/components/MockTestButton.tsx`

## Ready to Test!

1. Set up your `.env.local` file
2. Start the dev server: `npm run dev`
3. Visit the home page and use the mock test button
4. Check console logs for mock confirmation messages 