# BuyerMap Supabase Integration

This document outlines the Supabase integration for BuyerMap, providing long-term data persistence, cross-device access, and user authentication.

## Overview

The Supabase integration provides:

- **Long-term persistence** across browser sessions
- **Cross-device access** - users can access their data from any device
- **User authentication** - secure access to personal data
- **Backup and recovery** - data is safely stored in the cloud
- **Hybrid approach** - localStorage for immediate access, Supabase for long-term storage

## Architecture

### Data Flow

```
User Action → localStorage (immediate) → Supabase (persistent)
     ↓              ↓                        ↓
  UI Update    Instant Access         Cross-device Sync
```

### Components

1. **Database Schema** - Supabase tables for sessions, assumptions, quotes, and files
2. **API Endpoints** - RESTful APIs for CRUD operations
3. **Service Layer** - `buyerMapService` for database operations
4. **React Hook** - `useBuyerMapPersistence` for state management
5. **UI Components** - Session management interface

## Database Schema

### Tables

#### `buyer_map_sessions`
Stores session metadata and summary information.

```sql
CREATE TABLE buyer_map_sessions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  session_name TEXT NOT NULL,
  description TEXT,
  deck_filename TEXT,
  deck_blob_url TEXT,
  overall_alignment_score INTEGER,
  validated_count INTEGER DEFAULT 0,
  partially_validated_count INTEGER DEFAULT 0,
  pending_count INTEGER DEFAULT 0,
  total_assumptions INTEGER DEFAULT 0,
  score_breakdown JSONB,
  outcome_weights JSONB,
  summary_stats JSONB,
  current_step INTEGER DEFAULT 1,
  is_complete BOOLEAN DEFAULT FALSE,
  last_activity TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `buyer_map_assumptions`
Stores detailed assumption data with validation results.

```sql
CREATE TABLE buyer_map_assumptions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES buyer_map_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  icp_attribute TEXT NOT NULL,
  icp_theme TEXT NOT NULL,
  v1_assumption TEXT NOT NULL,
  why_assumption TEXT,
  evidence_from_deck TEXT,
  reality_from_interviews TEXT,
  reality TEXT,
  comparison_outcome TEXT CHECK (comparison_outcome IN ('Validated', 'Contradicted', 'Gap Identified', 'Insufficient Data', 'Aligned', 'Misaligned', 'New Data Added', 'Refined')),
  ways_to_adjust_messaging TEXT,
  confidence_score INTEGER DEFAULT 0,
  confidence_explanation TEXT DEFAULT '',
  confidence_breakdown JSONB,
  validation_status TEXT CHECK (validation_status IN ('pending', 'partial', 'validated', 'contradicted')) DEFAULT 'pending',
  display_outcome TEXT,
  display_reality TEXT,
  display_confidence INTEGER,
  quotes_count INTEGER DEFAULT 0,
  has_interview_data BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `buyer_map_quotes`
Stores customer quotes associated with assumptions.

```sql
CREATE TABLE buyer_map_quotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  assumption_id UUID REFERENCES buyer_map_assumptions(id) ON DELETE CASCADE NOT NULL,
  session_id UUID REFERENCES buyer_map_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  text TEXT NOT NULL,
  speaker TEXT,
  role TEXT,
  source TEXT NOT NULL,
  classification TEXT CHECK (classification IN ('RELEVANT', 'IRRELEVANT', 'ALIGNED', 'MISALIGNED', 'NEW_INSIGHT', 'NEUTRAL')),
  company_snapshot TEXT,
  rejected BOOLEAN DEFAULT FALSE,
  relevance_score INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### `buyer_map_files`
Stores file metadata for uploaded decks and interviews.

```sql
CREATE TABLE buyer_map_files (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  session_id UUID REFERENCES buyer_map_sessions(id) ON DELETE CASCADE NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  filename TEXT NOT NULL,
  file_type TEXT CHECK (file_type IN ('deck', 'interview')) NOT NULL,
  blob_url TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  content_hash TEXT,
  upload_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  processing_status TEXT CHECK (processing_status IN ('pending', 'processing', 'completed', 'failed')) DEFAULT 'pending',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### Row Level Security (RLS)

All tables have RLS enabled with policies that ensure users can only access their own data:

```sql
-- Example for buyer_map_sessions
CREATE POLICY "Users can view their own sessions" ON buyer_map_sessions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own sessions" ON buyer_map_sessions
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own sessions" ON buyer_map_sessions
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own sessions" ON buyer_map_sessions
  FOR DELETE USING (auth.uid() = user_id);
```

## Setup Instructions

### 1. Supabase Project Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Get your project URL and anon key from the project settings
3. Add environment variables to `.env.local`:

```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 2. Database Migration

Run the SQL migration to create the tables:

```bash
# Copy the contents of supabase-migration.sql and run it in your Supabase SQL editor
```

### 3. Authentication Setup

Configure authentication in your Supabase dashboard:

1. Go to Authentication > Settings
2. Configure your preferred auth providers (Email, Google, GitHub, etc.)
3. Set up redirect URLs for your application

### 4. Environment Configuration

Update your environment variables:

```bash
# .env.local
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

## Usage

### Basic Usage

```tsx
import { useBuyerMapPersistence } from '../hooks/useBuyerMapPersistence';

function MyComponent() {
  const {
    state,
    saveData,
    loadData,
    createSession,
    getSessions,
    isAuthenticated,
    isLoading,
    error
  } = useBuyerMapPersistence();

  // Save data (automatically saves to localStorage and Supabase if authenticated)
  const handleSave = async () => {
    await saveData({
      buyerMapData: myData,
      score: 85,
      currentStep: 3
    });
  };

  // Load data from a specific session
  const handleLoad = async (sessionId: string) => {
    await loadData(sessionId);
  };

  // Create a new session
  const handleCreateSession = async () => {
    const sessionId = await createSession('My New Session', 'Description');
    console.log('Created session:', sessionId);
  };

  return (
    <div>
      {isAuthenticated ? (
        <div>
          <p>Welcome! Your data will be saved to the cloud.</p>
          <button onClick={handleSave}>Save Data</button>
        </div>
      ) : (
        <p>Sign in to save your sessions to the cloud.</p>
      )}
    </div>
  );
}
```

### Session Management Component

```tsx
import SessionManager from '../components/SessionManager';

function App() {
  const handleSessionSelect = (sessionId: string) => {
    console.log('Selected session:', sessionId);
    // Load the selected session
  };

  return (
    <div>
      <SessionManager 
        onSessionSelect={handleSessionSelect}
        className="w-full max-w-md"
      />
    </div>
  );
}
```

### Service Layer Usage

```tsx
import { buyerMapService } from '../lib/buyer-map-service';

// Create a session
const session = await buyerMapService.createSession('My Session', 'Description');

// Save assumptions
const assumptions = await buyerMapService.saveAssumptions(session.id, buyerMapData);

// Load data
const data = await buyerMapService.loadFromSupabase(session.id);

// Update session
await buyerMapService.updateSession(session.id, {
  overall_alignment_score: 85,
  is_complete: true
});
```

## API Endpoints

### Sessions

- `GET /api/buyer-map-sessions` - List user sessions
- `POST /api/buyer-map-sessions` - Create new session
- `PUT /api/buyer-map-sessions` - Update session
- `DELETE /api/buyer-map-sessions?id=<session_id>` - Delete session

### Assumptions

- `GET /api/buyer-map-assumptions?session_id=<session_id>` - Get assumptions for session
- `POST /api/buyer-map-assumptions` - Create assumptions
- `PUT /api/buyer-map-assumptions` - Update assumptions

## Data Synchronization

### Hybrid Approach

The system uses a hybrid approach for optimal performance:

1. **localStorage** - Immediate persistence for instant access
2. **Supabase** - Long-term storage for cross-device access

### Sync Strategy

```typescript
// When saving data
const saveData = async (data) => {
  // 1. Update local state immediately
  setState(prev => ({ ...prev, ...data }));
  
  // 2. Save to localStorage for instant access
  saveToLocalStorage(data);
  
  // 3. If authenticated, save to Supabase for long-term storage
  if (isAuthenticated && currentSessionId) {
    await buyerMapService.saveToSupabase(currentSessionId, data);
  }
};
```

### Fallback Strategy

```typescript
// When loading data
const loadData = async (sessionId) => {
  try {
    if (sessionId && isAuthenticated) {
      // Try to load from Supabase
      const supabaseData = await buyerMapService.loadFromSupabase(sessionId);
      if (supabaseData) {
        setState(supabaseData);
        saveToLocalStorage(supabaseData); // Cache locally
        return;
      }
    }
  } catch (error) {
    console.error('Failed to load from Supabase:', error);
  }
  
  // Fallback to localStorage
  loadFromLocalStorage();
};
```

## Security Considerations

### Row Level Security (RLS)

All tables have RLS enabled to ensure data isolation:

- Users can only access their own data
- All queries are automatically filtered by `user_id`
- No data leakage between users

### Authentication

- Supabase Auth handles user authentication
- JWT tokens are automatically managed
- Session persistence across browser restarts

### Data Validation

- Input validation on all API endpoints
- Type checking with TypeScript
- SQL constraints for data integrity

## Performance Optimization

### Indexing

Key indexes for performance:

```sql
CREATE INDEX idx_buyer_map_sessions_user_id ON buyer_map_sessions(user_id);
CREATE INDEX idx_buyer_map_sessions_created_at ON buyer_map_sessions(created_at DESC);
CREATE INDEX idx_buyer_map_assumptions_session_id ON buyer_map_assumptions(session_id);
```

### Caching Strategy

- localStorage for immediate access
- Supabase for long-term storage
- Automatic cache invalidation on updates

### Batch Operations

For large datasets, use batch operations:

```typescript
// Batch insert assumptions
const assumptionsData = buyerMapData.map(assumption => ({
  session_id: sessionId,
  user_id: userId,
  // ... other fields
}));

await supabase
  .from('buyer_map_assumptions')
  .insert(assumptionsData);
```

## Troubleshooting

### Common Issues

1. **Authentication Errors**
   - Check environment variables
   - Verify Supabase project settings
   - Ensure user is properly authenticated

2. **RLS Policy Errors**
   - Verify user is authenticated
   - Check that `user_id` is properly set
   - Ensure policies are correctly configured

3. **Data Sync Issues**
   - Check network connectivity
   - Verify Supabase service status
   - Check browser console for errors

### Debug Mode

Enable debug logging:

```typescript
// In your component
const { state, saveData, error } = useBuyerMapPersistence();

// Check for errors
if (error) {
  console.error('Persistence error:', error);
}
```

## Migration from localStorage-only

If you're migrating from localStorage-only to Supabase:

1. **Backup existing data**
2. **Create Supabase project**
3. **Run database migration**
4. **Update environment variables**
5. **Test with existing data**

The system will automatically handle the transition and maintain backward compatibility.

## Future Enhancements

### Planned Features

1. **Real-time sync** - Live updates across devices
2. **Collaboration** - Share sessions with team members
3. **Versioning** - Track changes over time
4. **Export/Import** - Backup and restore functionality
5. **Analytics** - Usage statistics and insights

### Scalability Considerations

- Database partitioning for large datasets
- CDN integration for file storage
- Caching layers for improved performance
- Background job processing for heavy operations

## Support

For issues or questions:

1. Check the troubleshooting section
2. Review Supabase documentation
3. Check browser console for errors
4. Verify environment configuration

The integration is designed to be robust and handle edge cases gracefully while maintaining a smooth user experience. 