#!/bin/bash

# Domain Setup Script for Fider
# Usage: ./scripts/setup-domain.sh <domain>

set -e

DOMAIN=$1
EMAIL="your-email@example.com"  # Change this to your email

if [ -z "$DOMAIN" ]; then
    echo "❌ Error: Please provide a domain name"
    echo "Usage: ./setup-domain.sh feedback.buyermap.com"
    exit 1
fi

echo "🚀 Setting up HTTPS for domain: $DOMAIN"

# Update system packages
echo "📦 Updating system packages..."
apt update -y

# Install Nginx and Certbot
echo "🔧 Installing Nginx and Certbot..."
apt install -y nginx certbot python3-certbot-nginx

# Create Nginx configuration
echo "📝 Creating Nginx configuration..."
cat > /etc/nginx/sites-available/fider << NGINXEOF
server {
    listen 80;
    server_name $DOMAIN;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }
}
NGINXEOF

# Enable the site
echo "🔗 Enabling Nginx site..."
ln -sf /etc/nginx/sites-available/fider /etc/nginx/sites-enabled/
rm -f /etc/nginx/sites-enabled/default

# Test Nginx configuration
echo "✅ Testing Nginx configuration..."
nginx -t

# Start and enable Nginx
echo "🚀 Starting Nginx..."
systemctl start nginx
systemctl enable nginx

# Update environment for production
echo "🔧 Updating environment for production..."
sed -i "s|BASE_URL=.*|BASE_URL=https://$DOMAIN|g" fider.env

# Update Docker Compose for production
echo "🐳 Updating Docker Compose for production..."
cat > docker-compose.prod.yml << DOCKEREOF
version: '3.8'

services:
  fider:
    image: getfider/fider:stable
    container_name: fider
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - fider_data:/app/data
    env_file:
      - fider.env
    environment:
      - GO_ENV=production
    healthcheck:
      test: ["CMD", "wget", "--quiet", "--tries=1", "--spider", "http://localhost:3000/api/status"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s

volumes:
  fider_data:
    driver: local
DOCKEREOF

# Restart Fider with production config
echo "🔄 Restarting Fider with production configuration..."
docker-compose down
docker-compose -f docker-compose.prod.yml up -d

# Wait for Fider to be ready
echo "⏳ Waiting for Fider to be ready..."
sleep 30

# Test if Fider is responding
if curl -f http://localhost:3000/api/status > /dev/null 2>&1; then
    echo "✅ Fider is running successfully"
else
    echo "❌ Warning: Fider may not be ready yet. Check with: docker logs fider"
fi

# Obtain SSL certificate
echo "🔒 Obtaining SSL certificate..."
certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email $EMAIL

# Set up auto-renewal
echo "🔄 Setting up SSL certificate auto-renewal..."
(crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet") | crontab -

echo ""
echo "🎉 Domain setup complete!"
echo ""
echo "✅ Your Fider feedback system is now available at:"
echo "   https://$DOMAIN"
echo ""
echo "🔧 Next steps:"
echo "   1. Visit https://$DOMAIN to complete Fider setup"
echo "   2. Create your admin account"
echo "   3. Customize your feedback board"
echo ""
echo "📊 Management commands:"
echo "   - View logs: docker logs fider"
echo "   - Restart: docker-compose -f docker-compose.prod.yml restart"
echo "   - Stop: docker-compose -f docker-compose.prod.yml down"
echo ""
