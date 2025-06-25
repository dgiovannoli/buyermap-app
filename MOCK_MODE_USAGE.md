# Mock Mode Control

## Environment Variable Setup

Add this to your `.env.local` file (create if it doesn't exist):

```bash
# Mock mode control - set to 'true' for mock data, 'false' for live API/DB
NEXT_PUBLIC_USE_MOCK=false
```

## How It Works

### Mock Mode ON (`NEXT_PUBLIC_USE_MOCK=true`)
- ⚠️ Components show "Running in mock mode" warnings
- Uses cached/mock data instead of live API calls
- Faster development and testing
- No external API costs

### Live Mode OFF (`NEXT_PUBLIC_USE_MOCK=false`) 
- ✅ Components show "Running with live API + DB + vector storage"
- Full integration with OpenAI, Pinecone, Supabase
- Real duplicate detection and analysis
- Production-ready behavior

## Components Enhanced

1. **DeckUploadStage.tsx**
   - Mock mode logging on component mount
   - Conditional caching behavior in `fetchCachedResults()`

2. **modern-buyermap-landing.tsx** 
   - Mock mode detection on phase changes
   - Interview upload flow logging

3. **analyze-interviews API**
   - Mock vs live mode detection
   - Conditional API processing

## Console Output Examples

### Mock Mode
```
⚠️ Running in mock mode. Switch to live data by setting NEXT_PUBLIC_USE_MOCK=false
⚠️ Using mock cached results (NEXT_PUBLIC_USE_MOCK=true)
⚠️ Interview upload using mock mode (NEXT_PUBLIC_USE_MOCK=true)
```

### Live Mode  
```
✅ Running with live API + DB + vector storage
✅ Would fetch real cached results from database
✅ Interview upload using live API integration
```

## Quick Commands

```bash
# Enable mock mode
echo "NEXT_PUBLIC_USE_MOCK=true" >> .env.local

# Enable live mode  
echo "NEXT_PUBLIC_USE_MOCK=false" >> .env.local

# Restart dev server to apply changes
npm run dev
```
