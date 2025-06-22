# 🚀 VPS Deployment Guide for BuyerMap Fider

Complete step-by-step guide to deploy your Fider feedback system on a Hetzner VPS.

## 📋 Quick Overview

**Total Time**: ~20 minutes  
**Cost**: ~$5/month  
**Result**: Production-ready feedback system accessible worldwide

## 🎯 Step 1: Create Hetzner VPS

### 1.1 Sign Up for Hetzner Cloud
1. Go to [Hetzner Cloud Signup](https://accounts.hetzner.com/signUp)
2. Create account (ID verification may be required)
3. Enable 2-factor authentication
4. Access the Cloud Console

### 1.2 Create Your Server
**Recommended Configuration**:
- **Image**: Ubuntu 22.04 LTS
- **Type**: CX22 (Shared vCPU Intel®)
  - 2 vCPU, 4GB RAM, 40GB SSD
  - **Cost**: €3.79/month (~$4.10/month)
- **Location**: Choose closest to your users
- **Networking**: 
  - Create a firewall first (see below)
  - Keep default network settings

### 1.3 Create Firewall (Required)
Before creating server, set up firewall:

1. Go to **Firewalls** → **Create Firewall**
2. **Name**: `fider-firewall`
3. **Inbound Rules**:
   - SSH (Port 22) - Keep default
   - HTTP (Port 80) - Add this
   - HTTPS (Port 443) - Add this  
   - Custom (Port 3000) - Add for Fider
   - ICMP - Keep default
4. Click **Create Firewall**

### 1.4 Deploy Server
1. **Server Name**: `buyermap-fider`
2. **Image**: Ubuntu 22.04 LTS
3. **Type**: CX22
4. **Firewall**: Select your `fider-firewall`
5. Click **Create and Buy**

🎉 **You'll receive an email with your server IP and root password!**

## 🔧 Step 2: Connect to Your VPS

### 2.1 SSH Connection
```bash
ssh root@YOUR_VPS_IP
```
- Use the password from your email
- You'll be prompted to change the password immediately

### 2.2 Alternative: Web Console
- In Hetzner Console, click your server
- Click the **>_** (console) button
- Login with emailed credentials

## 📦 Step 3: Deploy Your Project

### 3.1 Upload Your Project
**Option A: Git Clone (Recommended)**
```bash
# Install git
apt update && apt install -y git

# Clone your repository
git clone https://github.com/yourusername/buyermap-app.git
cd buyermap-app
```

**Option B: File Transfer**
```bash
# From your local machine
scp -r /path/to/buyermap-app root@YOUR_VPS_IP:/root/
```

### 3.2 Run Deployment Script
```bash
# Make script executable (if needed)
chmod +x scripts/vps-setup.sh

# Run the deployment script
./scripts/vps-setup.sh
```

The script will automatically:
- ✅ Install Docker and Docker Compose
- ✅ Configure firewall rules
- ✅ Set up environment variables
- ✅ Start Fider in production mode
- ✅ Display access information

## 🌐 Step 4: Access Your Fider

After deployment completes:

1. **Access URL**: `http://YOUR_VPS_IP:3000`
2. **First Visit**: Create your admin account
3. **Setup**: Configure your feedback board

## 🎨 Step 5: Update BuyerMap Integration

Update your feedback button URLs to point to your VPS:

```typescript
// In your FeedbackButton component
const FIDER_URL = 'http://YOUR_VPS_IP:3000';
```

## 🛡️ Step 6: Security & Production Setup

### 6.1 Domain Setup (Optional but Recommended)
1. **Buy a domain** or use a subdomain: `feedback.yourdomain.com`
2. **Point DNS** to your VPS IP
3. **Update environment**: Change `BASE_URL` in `fider.env`

### 6.2 SSL Certificate (Recommended)
```bash
# Install Certbot
sudo apt install -y certbot

# Get SSL certificate
sudo certbot certonly --standalone -d feedback.yourdomain.com
```

### 6.3 SMTP Configuration
Edit `fider.env` on your VPS:
```bash
nano fider.env
```

Add your email settings:
```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USERNAME=your-email@gmail.com
EMAIL_SMTP_PASSWORD=your-app-password
```

## 🔧 Management Commands

### On Your VPS:
```bash
# View logs
docker-compose logs -f fider

# Stop Fider
docker-compose down

# Restart Fider
docker-compose restart fider

# Update Fider
docker-compose pull && docker-compose up -d

# Check status
docker-compose ps
```

### From Your Local Machine:
```bash
# Deploy updates
npm run vps:deploy

# View remote logs
ssh root@YOUR_VPS_IP "cd buyermap-app && docker-compose logs -f fider"
```

## 💰 Cost Breakdown

| Item | Cost/Month |
|------|------------|
| Hetzner CX22 VPS | €3.79 ($4.10) |
| Domain (optional) | ~$1.00 |
| SSL Certificate | Free (Let's Encrypt) |
| **Total** | **~$5/month** |

## 🚨 Troubleshooting

### Common Issues:

**1. Can't connect to VPS**
```bash
# Check if server is running in Hetzner Console
# Verify firewall allows SSH (port 22)
```

**2. Fider not accessible**
```bash
# Check if Fider is running
docker-compose ps

# Check logs
docker-compose logs fider

# Verify firewall allows port 3000
sudo ufw status
```

**3. SMTP not working**
- Verify Gmail app password (not regular password)
- Check Gmail security settings
- Test with: `docker-compose logs fider | grep -i smtp`

**4. SSL issues**
```bash
# Renew certificate
sudo certbot renew

# Check certificate status
sudo certbot certificates
```

## 🔄 Updates & Maintenance

### Regular Maintenance:
```bash
# Update system packages
sudo apt update && sudo apt upgrade -y

# Update Docker images
docker-compose pull && docker-compose up -d

# Backup data
docker run --rm -v buyermap-app_fider_data:/data -v $(pwd):/backup alpine tar czf /backup/fider-backup-$(date +%Y%m%d).tar.gz -C /data .
```

## 📊 Monitoring

### Check System Resources:
```bash
# CPU and memory usage
htop

# Disk usage
df -h

# Docker stats
docker stats
```

### Health Checks:
```bash
# Test Fider endpoint
curl -I http://YOUR_VPS_IP:3000

# Check container health
docker-compose ps
```

## 🎉 Success Metrics

After deployment, you should have:

✅ **Fider accessible** at `http://YOUR_VPS_IP:3000`  
✅ **Admin account created** and configured  
✅ **Feedback buttons** in BuyerMap pointing to VPS  
✅ **Email notifications** working (if SMTP configured)  
✅ **Firewall configured** for security  
✅ **Monitoring setup** for maintenance  

## 📞 Support

If you encounter issues:

1. **Check logs**: `docker-compose logs fider`
2. **Verify firewall**: `sudo ufw status`
3. **Test connectivity**: `curl -I http://YOUR_VPS_IP:3000`
4. **Hetzner Support**: Available through their console
5. **Community**: Fider GitHub issues for application-specific problems

---

**🚀 Ready to collect valuable feedback from your BuyerMap users!** 