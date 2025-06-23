# BuyerMap App

A Next.js application for analyzing sales decks and customer interviews to validate market assumptions using AI-powered analysis.

## Features

- **Deck Analysis**: Upload sales presentations (PDF, PowerPoint) to extract market assumptions
- **Interview Validation**: Upload customer interviews to validate extracted assumptions
- **Buyer Map Visualization**: Interactive visualization of assumption validation results
- **Real-time Progress**: Live progress tracking during file processing
- **Smart File Handling**: Conflict resolution for duplicate uploads
- **High-Performance Uploads**: Optimized for files up to 500MB

## ⚡ Performance Optimizations

### Upload Performance Improvements (30s → 5-15s)

We've implemented comprehensive optimizations to dramatically improve upload performance:

#### 🚀 **Multipart Upload Strategy**
- **Automatic detection**: Files >10MB automatically use parallel chunk uploads
- **Smart chunking**: Large files split and uploaded simultaneously  
- **Resume capability**: Failed chunks automatically retried
- **Real-time progress**: Live throughput and percentage tracking

#### 📊 **Performance Monitoring**
```javascript
// Example console output during upload:
🔄 Upload strategy: multipart for 32.45MB file
📈 Upload progress: 45% (14.50MB / 32.45MB)
✅ Upload completed in 8.2s (3.96 MB/s throughput)
```

#### 🔧 **Network Optimizations**
- **500MB file limit**: Increased from 50MB for large presentations
- **Global CDN**: Vercel Blob's worldwide edge network
- **Optimized caching**: 1-year cache headers for faster delivery
- **Smart routing**: Automatic region selection for lowest latency

### Performance Benchmarks

| File Size | Upload Strategy | Expected Time | Typical Throughput |
|-----------|----------------|---------------|-------------------|
| < 10MB    | Single upload  | 2-5 seconds   | 5-15 MB/s        |
| 10-50MB   | Multipart      | 5-12 seconds  | 8-20 MB/s        |
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

## Getting Started

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
cp .env.example .env.local
# Edit .env.local with your API keys

# Run development server
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

### Environment Variables

Create a `.env.local` file with:

```bash
# Vercel Blob Storage (for file uploads)
BLOB_READ_WRITE_TOKEN=your_vercel_blob_token

# OpenAI (for AI analysis)
OPENAI_API_KEY=your_openai_api_key

# Supabase (for authentication and data)
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
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

## Deployment

### Vercel Deployment (Recommended)

1. **Connect repository** to Vercel
2. **Configure environment variables** in Vercel dashboard
3. **Create Blob storage** in Vercel dashboard under Storage tab
4. **Deploy** - automatic builds from main branch

### Manual Deployment

```bash
# Build the application
npm run build

# Start production server
npm start
```

## Architecture

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│   Client App    │────│  Vercel Blob     │────│   OpenAI API    │
│  (Next.js)      │    │  (File Storage)  │    │  (AI Analysis)  │
└─────────────────┘    └──────────────────┘    └─────────────────┘
         │                                              │
         └──────────────────┐              ┌───────────┘
                           │              │
                  ┌─────────────────┐    ┌─────────────────┐
                  │   Supabase      │    │  Vercel Edge    │
                  │  (Database)     │    │  (CDN/Hosting)  │
                  └─────────────────┘    └─────────────────┘
```

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and test upload performance
4. Commit your changes: `git commit -m 'Add amazing feature'`
5. Push to the branch: `git push origin feature/amazing-feature`
6. Open a pull request

### Performance Testing

When contributing, please test upload performance:

```bash
# Test with different file sizes
# Small: <10MB, Medium: 10-50MB, Large: 50MB+

# Monitor console for performance metrics
# Ensure throughput is reasonable for your network
```

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review console logs for specific error messages  
3. Open an issue with performance metrics and browser details
