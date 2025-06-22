# 🚀 Beginner-Friendly VPS Setup Guide

**No SSH knowledge required!** We'll use Hetzner's web-based terminal instead.

## 📋 Step 1: Create Your Hetzner VPS

### 1.1 Sign Up & Create Server
1. Go to [Hetzner Cloud](https://accounts.hetzner.com/signUp)
2. Create account and verify email
3. Click "Create Server"

### 1.2 Choose Settings (Copy these exactly):
```
✅ Location: Choose closest to you (e.g., "Ashburn, VA" for US East)
✅ Image: Ubuntu 22.04
✅ Type: CPX11 (2 vCPU, 2GB RAM, 40GB SSD) - $4.99/month
✅ Networking: Keep defaults (Public IPv4 ✅, IPv6 ✅)
✅ SSH Keys: SKIP THIS - we'll use web console instead
✅ Volumes: None needed
✅ Firewalls: None for now
✅ Backups: Optional ($1/month extra)
✅ Name: "buyermap-fider"
```

### 1.3 Create Server
- Click "Create & Buy Now"
- Wait 1-2 minutes for server to start
- You'll see a green "Running" status

---

## 🖥️ Step 2: Access Your Server (No SSH!)

### 2.1 Use Web Console (Much Easier!)
1. In Hetzner Cloud Console, click your server name
2. Click the "Console" tab at the top
3. Click "Open Console" - this opens a web terminal
4. Login as: `root` (no password needed initially)

### 2.2 Set Root Password (First Time Only)
```bash
# Type this command and press Enter:
passwd

# You'll be asked to enter a new password twice
# Choose something secure and write it down!
```

---

## 🚀 Step 3: Install Everything (Copy & Paste)

### 3.1 Update System
```bash
# Copy and paste this entire block:
apt update && apt upgrade -y
```

### 3.2 Install Docker
```bash
# Copy and paste this entire block:
curl -fsSL https://get.docker.com -o get-docker.sh
sh get-docker.sh
systemctl start docker
systemctl enable docker
```

### 3.3 Install Docker Compose
```bash
# Copy and paste this entire block:
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
```

### 3.4 Create Project Directory
```bash
# Copy and paste this:
mkdir -p /opt/fider
cd /opt/fider
```

---

## 📁 Step 4: Upload Your Files

### 4.1 Create docker-compose.yml
```bash
# Copy and paste this command:
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  fider:
    image: getfider/fider:stable
    container_name: fider
    ports:
      - "3000:3000"
    environment:
      - DATABASE_URL=sqlite:///data/fider.db
      - JWT_SECRET=your-super-secret-jwt-key-change-this
      - EMAIL_SMTP_HOST=smtp.gmail.com
      - EMAIL_SMTP_PORT=587
      - EMAIL_SMTP_USERNAME=your-email@gmail.com
      - EMAIL_SMTP_PASSWORD=your-app-password
      - BASE_URL=http://YOUR_SERVER_IP:3000
    volumes:
      - fider_data:/app/data
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

volumes:
  fider_data:
EOF
```

### 4.2 Get Your Server IP
```bash
# Copy and paste this to see your server's IP:
curl -s ifconfig.me
```
**Write down this IP address!** You'll need it next.

### 4.3 Update Configuration
```bash
# Replace YOUR_SERVER_IP with the IP from above:
# For example, if your IP is 123.45.67.89:
sed -i 's/YOUR_SERVER_IP/123.45.67.89/g' docker-compose.yml

# Replace with your Gmail settings:
sed -i 's/your-email@gmail.com/YOUR_ACTUAL_EMAIL/g' docker-compose.yml
sed -i 's/your-app-password/YOUR_GMAIL_APP_PASSWORD/g' docker-compose.yml
```

---

## 🎯 Step 5: Start Fider

### 5.1 Launch Fider
```bash
# Copy and paste this:
docker-compose up -d
```

### 5.2 Check if Running
```bash
# Copy and paste this to check status:
docker-compose ps
```

You should see Fider running!

---

## 🌐 Step 6: Access Your Fider

1. Open your web browser
2. Go to: `http://YOUR_SERVER_IP:3000`
3. You should see Fider's setup page!
4. Follow the setup wizard to create your admin account

---

## 📧 Gmail App Password Setup

To send emails, you need a Gmail App Password:

1. Go to [Google Account Settings](https://myaccount.google.com/)
2. Click "Security" → "2-Step Verification" (enable if not already)
3. Click "App passwords"
4. Generate password for "Mail"
5. Use this 16-character password in your configuration

---

## 🔧 Common Commands

### Check Logs
```bash
docker-compose logs -f fider
```

### Restart Fider
```bash
docker-compose restart
```

### Stop Fider
```bash
docker-compose down
```

### Update Fider
```bash
docker-compose pull
docker-compose up -d
```

---

## 🆘 Need Help?

If something goes wrong:

1. **Check if Docker is running:**
   ```bash
   docker --version
   ```

2. **Check if Fider is running:**
   ```bash
   docker ps
   ```

3. **View error logs:**
   ```bash
   docker-compose logs fider
   ```

4. **Restart everything:**
   ```bash
   docker-compose down
   docker-compose up -d
   ```

---

## 🎉 Success!

Once working, you can:
- Access Fider at `http://YOUR_SERVER_IP:3000`
- Create feedback categories
- Invite users to submit feedback
- Respond to feedback as admin

**Next Steps:**
- Set up a custom domain (optional)
- Configure SSL certificate (optional)
- Customize Fider appearance

---

## 💡 Pro Tips

- **Bookmark your Fider URL** for easy access
- **Save your server IP** somewhere safe
- **Keep your Gmail app password** secure
- **The Hetzner web console** stays open for easy server management

**No SSH knowledge needed!** 🎉 