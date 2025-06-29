# BuyerMap App

AI-powered buyer persona validation tool that analyzes sales decks and customer interviews to validate business assumptions.

## 🚀 Quick Start

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Vercel account for deployment

### Installation

```bash
# Clone the repository
git clone [repository-url]
cd buyermap-app

# Install dependencies  
npm install

# Set up environment variables
cp env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Copy `env.example` to `.env.local` and configure:

```bash
# Required for production
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token
OPENAI_API_KEY=your_openai_api_key
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
BETA_ACCESS_PASSWORD=your_chosen_password

# Set to false for production
NEXT_PUBLIC_USE_MOCK=false
```

### Local Development with Blob Storage

For testing the full upload flow locally, you'll need to expose your localhost:

```bash
# Install ngrok (if not already installed)
npm install -g ngrok

# In terminal 1: Start your app
npm run dev

# In terminal 2: Expose localhost  
ngrok http 3000

# Use the ngrok URL for testing uploads
```

## Technology Stack

- **Frontend**: Next.js 15, React 18, TypeScript
- **Styling**: Tailwind CSS, Lucide React icons
- **Storage**: Vercel Blob (S3-backed, globally distributed)
- **AI**: OpenAI GPT-4 for content analysis
- **Database**: Supabase (PostgreSQL with real-time features)
- **Authentication**: Supabase Auth
- **Deployment**: Vercel (with automatic CI/CD)

## 🚀 Production Deployment

### Quick Deploy to Vercel

1. **Connect repository** to Vercel
2. **Configure environment variables** in Vercel dashboard (use `env.example` as reference)
3. **Create Blob storage** in Vercel dashboard under Storage tab
4. **Deploy** - automatic builds from main branch

### Production Checklist

See [PRODUCTION_CHECKLIST.md](./PRODUCTION_CHECKLIST.md) for a comprehensive deployment guide.

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🎯 Features

### Core Functionality
- **Deck Analysis**: Upload sales decks (PDF, PPTX) for AI-powered assumption extraction
- **Interview Validation**: Upload customer interviews to validate assumptions
- **Cumulative Analysis**: Build insights over time by adding more interviews
- **Interview Library**: Manage and organize uploaded interviews with status tracking

### Advanced Features
- **Duplicate Detection**: Smart file deduplication with content hashing
- **Quote Extraction**: AI-powered extraction of relevant customer quotes
- **Confidence Scoring**: Validation confidence with detailed breakdowns
- **Real-time Processing**: Live progress tracking during analysis

### User Experience
- **Beta Access Control**: Password-protected access for controlled rollout
- **Magic Link Authentication**: Secure, passwordless authentication via Supabase
- **Responsive Design**: Works seamlessly on desktop and mobile
- **Progress Tracking**: Visual feedback during file processing

## 📊 Performance

### Upload Performance
| File Size | Upload Strategy | Time | Speed |
|-----------|----------------|------|-------|
| <10MB     | Single upload  | 2-8 seconds | 5-15 MB/s |
| 10-50MB   | Multipart      | 8-15 seconds | 8-20 MB/s |
| 50-200MB  | Multipart + optimization | 12-30 seconds | 10-25 MB/s |
| 200MB+    | Full optimization | 30-60 seconds | 15-30 MB/s |

*Performance varies by network conditions and geographic location*

### Additional Optimization Tips

#### Network & Environment
1. **Use wired connection** instead of WiFi when possible
2. **Close bandwidth-heavy applications** during uploads
3. **Check network speed** - minimum 5 Mbps upload recommended
4. **Consider timing** - avoid peak internet usage hours

#### File Preparation
1. **Compress presentations** before upload (can reduce 30-70%)
2. **Remove embedded videos** or large images if not essential
3. **Use PDF format** - often 2-3x smaller than PowerPoint
4. **Split large presentations** into smaller sections

#### Browser Optimization
1. **Use Chrome or Edge** for best performance
2. **Clear browser cache** before large uploads
3. **Disable extensions** that might interfere with uploads
4. **Close other tabs** to free up memory

### Troubleshooting Slow Uploads

If uploads are taking longer than expected:

1. **Check console logs** for throughput metrics:
   ```
   Developer Tools → Console → Look for upload progress messages
   ```

2. **Test your connection**:
   ```bash
   # Test upload speed
   curl -X POST -F "file=@yourfile.pdf" httpbin.org/post
   ```

3. **Verify file size and type**:
   - Supported formats: PDF, PPTX, PPT, DOCX, DOC, TXT
   - Maximum size: 500MB per file

4. **Try different browsers** or incognito mode

5. **Check for errors** in the Network tab of Developer Tools

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │────│  Vercel Blob     │────│   OpenAI API    │
│  (Next.js)      │    │  (File Storage)  │    │  (AI Analysis)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                       │                       │
         │                       │                       │
         ▼                       ▼                       ▼
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Supabase      │    │   Pinecone       │    │   Vercel Edge   │
│  (Auth + DB)    │    │  (Vector DB)     │    │   Functions     │
└─────────────────┘    └──────────────────┘    └─────────────────┘
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run test         # Run tests
npm run test:watch   # Run tests in watch mode
```

### Mock Mode

For development without external APIs:

```bash
# Set in .env.local
NEXT_PUBLIC_USE_MOCK=true
```

See [MOCK_MODE_USAGE.md](./MOCK_MODE_USAGE.md) for details.

## 📚 Documentation

- [Production Deployment Guide](./PRODUCTION_CHECKLIST.md)
- [Supabase Auth Setup](./SUPABASE_AUTH_SETUP.md)
- [Mock Mode Usage](./MOCK_MODE_USAGE.md)
- [Database Migration Instructions](./DATABASE_MIGRATION_INSTRUCTIONS.md)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License.
