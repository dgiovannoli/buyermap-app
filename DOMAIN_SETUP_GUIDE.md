# 🌐 BuyerMap Fider Domain Integration Guide

## 📋 Step 1: DNS Configuration

### 1.1 Add DNS Record
In your domain provider (where you manage buyermap.com):

```
Type: A Record
Name: feedback
Value: 5.78.154.110
TTL: 300 (5 minutes)
```

**Result**: `feedback.buyermap.com` → `5.78.154.110`

### 1.2 Verify DNS Propagation
```bash
# Test from your local machine:
nslookup feedback.buyermap.com
# Should return: 5.78.154.110
```

---

## 🔧 Step 2: Update Fider Configuration

### 2.1 Update VPS Configuration
SSH into your VPS and update the configuration:

```bash
cd /opt/fider
nano docker-compose.yml
```

### 2.2 Update BASE_URL
Change this line:
```yaml
# FROM:
- BASE_URL=http://5.78.154.110:3000

# TO:
- BASE_URL=https://feedback.buyermap.com
```

### 2.3 Add SSL/HTTPS Support
```yaml
version: '3.8'

services:
  nginx:
    image: nginx:alpine
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
      - ./ssl:/etc/nginx/ssl
    depends_on:
      - fider
    restart: unless-stopped

  fider:
    image: getfider/fider:stable
    container_name: fider
    ports:
      - "3000:3000"  # Internal only now
    environment:
      - DATABASE_URL=sqlite:///data/fider.db
      - JWT_SECRET=your-super-secret-jwt-key-change-this
      - EMAIL_SMTP_HOST=smtp.gmail.com
      - EMAIL_SMTP_PORT=587
      - EMAIL_SMTP_USERNAME=your-email@gmail.com
      - EMAIL_SMTP_PASSWORD=your-app-password
      - BASE_URL=https://feedback.buyermap.com
    volumes:
      - fider_data:/app/data
    restart: unless-stopped

volumes:
  fider_data:
```

### 2.4 Create Nginx Configuration
```bash
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream fider {
        server fider:3000;
    }

    server {
        listen 80;
        server_name feedback.buyermap.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl http2;
        server_name feedback.buyermap.com;

        ssl_certificate /etc/nginx/ssl/cert.pem;
        ssl_certificate_key /etc/nginx/ssl/key.pem;

        location / {
            proxy_pass http://fider;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
            proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
            proxy_set_header X-Forwarded-Proto $scheme;
        }
    }
}
EOF
```

### 2.5 Generate SSL Certificate (Let's Encrypt)
```bash
# Install certbot
apt update && apt install certbot

# Generate certificate
certbot certonly --standalone -d feedback.buyermap.com

# Copy certificates
mkdir -p ssl
cp /etc/letsencrypt/live/feedback.buyermap.com/fullchain.pem ssl/cert.pem
cp /etc/letsencrypt/live/feedback.buyermap.com/privkey.pem ssl/key.pem

# Restart services
docker-compose down
docker-compose up -d
```

---

## 🎨 Step 3: Visual Integration with BuyerMap

### 3.1 Fider Customization
Access your Fider admin panel at `https://feedback.buyermap.com` and:

1. **Upload BuyerMap Logo**
   - Go to Settings → General
   - Upload your BuyerMap logo
   - Set site name to "BuyerMap Feedback"

2. **Brand Colors**
   - Primary: Match your BuyerMap blue
   - Secondary: Match your accent colors
   - Background: Match your site theme

3. **Custom CSS** (Settings → Advanced)
```css
/* Match BuyerMap styling */
:root {
  --color-primary: #your-primary-color;
  --color-secondary: #your-secondary-color;
}

.header {
  background-color: var(--color-primary);
}

.btn-primary {
  background-color: var(--color-primary);
  border-color: var(--color-primary);
}
```

---

## 🔗 Step 4: BuyerMap Navigation Integration

### 4.1 Update Main Navigation
Add feedback link to your main navigation component.

### 4.2 Add Feedback Categories
Set up categories in Fider:
- Feature Requests
- Bug Reports  
- General Feedback
- Interview Library Feedback
- RAG System Feedback

### 4.3 Deep Linking
Use these URLs for specific sections:
- `https://feedback.buyermap.com/posts?category=feature-requests`
- `https://feedback.buyermap.com/posts?category=bug-reports`

---

## 📱 Step 5: User Experience Flow

### 5.1 Seamless Login
Configure Fider to accept users from BuyerMap:
- Enable email authentication
- Match user experience
- Return links to main app

### 5.2 Context-Aware Feedback
Add feedback buttons throughout BuyerMap:
- "Feedback on this feature" buttons
- "Report issue" links
- "Suggest improvement" prompts

---

## ✅ Testing Checklist

- [ ] DNS resolves to correct IP
- [ ] HTTPS certificate works
- [ ] Fider loads at feedback.buyermap.com
- [ ] Visual styling matches BuyerMap
- [ ] Navigation links work
- [ ] Email notifications work
- [ ] Mobile responsive

---

## 🚀 Go Live Process

1. **Test thoroughly** on staging
2. **Update all links** in BuyerMap
3. **Announce to users** via email/in-app
4. **Monitor feedback** and iterate

Your feedback system is now professionally integrated with BuyerMap! 🎉 