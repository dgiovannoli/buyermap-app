# 🎯 BuyerMap Feedback System (Fider) Setup

This guide walks you through setting up the integrated feedback system for BuyerMap using Fider, a self-hosted product feedback board.

## 🚀 Quick Start

### 1. Start the Feedback System
```bash
npm run feedback:start
```
This will:
- Check Docker prerequisites
- Start Fider container
- Wait for service to be ready
- Display setup instructions

### 2. Initial Configuration
1. Visit [http://localhost:3001](http://localhost:3001)
2. Set up your admin account
3. Configure basic settings:
   - **Site Name**: BuyerMap Feedback
   - **Categories**: Feature Requests, Bug Reports, General Feedback
   - **Moderation**: Enable for quality control

### 3. Test Integration
- Look for feedback button in BuyerMap navigation (top right)
- Look for floating feedback button (bottom right)
- Both open Fider in a new tab

## 🛠 Configuration

### Environment Variables
Copy `fider.env.example` to `.env.local` and update:

```bash
# SMTP Configuration (for email notifications)
FIDER_SMTP_USERNAME=your-email@gmail.com
FIDER_SMTP_PASSWORD=your-gmail-app-password
FIDER_SMTP_FROM=feedback@buyermap.com

# Security
FIDER_JWT_SECRET=your-secure-jwt-secret-here

# URLs
FIDER_SITE_URL=http://localhost:3001
FEEDBACK_URL=http://localhost:3001
```

### SMTP Setup (Gmail Example)
1. Enable 2-factor authentication on your Gmail account
2. Generate an App Password:
   - Google Account → Security → App passwords
   - Select "Mail" and generate password
3. Use the generated password in `FIDER_SMTP_PASSWORD`

## 📋 Available Commands

| Command | Purpose |
|---------|---------|
| `npm run feedback:start` | Start Fider system |
| `npm run feedback:logs` | View real-time logs |
| `npm run feedback:stop` | Stop Fider system |
| `npm run feedback:restart` | Restart Fider service |

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   BuyerMap      │    │      Fider      │    │   Email/SMTP    │
│   (Port 3000)   │◄──►│   (Port 3001)   │◄──►│   Notifications │
│                 │    │                 │    │                 │
│ • Feedback btns │    │ • SQLite DB     │    │ • User alerts   │
│ • Navigation    │    │ • User mgmt     │    │ • Admin alerts  │
│ • Floating CTA  │    │ • Vote system   │    │ • Digests       │
└─────────────────┘    └─────────────────┘    └─────────────────┘
```

## 🎨 UI Integration

### Feedback Button Variants

1. **Floating Button** (Global)
   - Bottom-right corner of all pages
   - Expands on hover with "Share Feedback" text
   - Opens Fider in new tab

2. **Navigation Button** (Header)
   - Minimal icon in top navigation
   - Consistent with other nav elements
   - Always visible for quick access

3. **Inline Button** (Contextual)
   - Available for specific page integrations
   - Matches page styling
   - Can be customized per component

### Customization
```tsx
// Floating - bottom right (default)
<FeedbackButton variant="floating" position="bottom-right" />

// Minimal - for navigation
<FeedbackButton variant="minimal" />

// Inline - for specific contexts
<FeedbackButton variant="inline" className="custom-styles" />
```

## 📊 User Flow

1. **User Journey**:
   ```
   BuyerMap App → Feedback Button → Fider (New Tab) → Submit Feedback → Email Notification
   ```

2. **Admin Journey**:
   ```
   Email Alert → Fider Admin Panel → Review/Moderate → Respond → User Notification
   ```

## 🔒 Security Considerations

### Development
- Fider runs on `localhost:3001`
- No authentication required for feedback submission
- Admin access via initial setup

### Production (Future)
- Use reverse proxy (Nginx) with SSL
- Consider HTTP basic auth for additional protection
- Environment-specific JWT secrets
- Database backups for feedback data

## 🚀 Production Deployment

### Using Docker Compose Profiles
```bash
# Development (SQLite)
docker-compose up -d fider

# Production (with Nginx proxy)
docker-compose --profile production up -d
```

### Domain Setup
1. Point subdomain to your server: `feedback.yourdomain.com`
2. Update environment: `FIDER_SITE_URL=https://feedback.yourdomain.com`
3. Configure SSL with Let's Encrypt
4. Update BuyerMap: `NEXT_PUBLIC_FEEDBACK_URL=https://feedback.yourdomain.com`

## 📈 Analytics & Insights

### Feedback Categories
- **Feature Requests**: What users want to see next
- **Bug Reports**: Issues in the ICP analysis process
- **General Feedback**: Overall experience and suggestions

### Key Metrics to Track
- Feedback submission rate
- User engagement (votes, comments)
- Response time to feedback
- Feature request → implementation rate

## 🔧 Troubleshooting

### Common Issues

**Port 3001 already in use**
```bash
# Stop existing containers
docker-compose down

# Or find and kill process
lsof -i :3001
kill -9 <PID>
```

**SMTP not working**
- Verify Gmail app password
- Check firewall settings
- Test with simple SMTP service first

**Fider not starting**
```bash
# Check logs
docker-compose logs fider

# Verify Docker is running
docker info

# Check disk space
df -h
```

**Feedback button not appearing**
- Check `NEXT_PUBLIC_FEEDBACK_URL` in `.env.local`
- Verify component imports in navigation
- Check browser console for errors

## 🎯 Next Steps

### Phase 1 ✅
- [x] Docker setup with SQLite
- [x] UI integration with BuyerMap
- [x] Local development workflow

### Phase 2 (Soon)
- [ ] Production deployment scripts
- [ ] Custom branding and styling
- [ ] Email template customization
- [ ] Analytics dashboard

### Phase 3 (Future)
- [ ] SSO integration
- [ ] API webhooks for automation
- [ ] Advanced moderation features
- [ ] Feedback → feature pipeline

## 📞 Support

For issues with:
- **Fider setup**: Check [Fider Documentation](https://github.com/getfider/fider)
- **BuyerMap integration**: Review this guide or check component source
- **Docker issues**: Verify Docker installation and permissions

---

💡 **Pro Tip**: Start with the simple SQLite setup to validate user engagement before investing in production infrastructure. 