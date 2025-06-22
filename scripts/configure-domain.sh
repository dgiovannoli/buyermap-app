#!/bin/bash

# 🌐 Domain Configuration Script for Fider
# Helps configure custom domain and SSL for your Fider deployment

echo "🌐 Fider Domain Configuration Helper"
echo "===================================="

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

print_status() { echo -e "${GREEN}✅ $1${NC}"; }
print_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
print_error() { echo -e "${RED}❌ $1${NC}"; }
print_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }

# Check if running on VPS
if [ ! -f "/etc/os-release" ] || ! grep -q "Ubuntu\|Debian" /etc/os-release; then
    print_error "This script should be run on your VPS, not locally"
    exit 1
fi

# Get current IP
VPS_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
print_info "Current VPS IP: $VPS_IP"

# Ask for domain
echo ""
read -p "Enter your domain (e.g., feedback.yourdomain.com): " DOMAIN

if [ -z "$DOMAIN" ]; then
    print_error "Domain is required"
    exit 1
fi

print_info "Configuring domain: $DOMAIN"

# Check if domain points to this server
print_info "Checking DNS configuration..."
DOMAIN_IP=$(dig +short $DOMAIN | tail -n1)

if [ "$DOMAIN_IP" = "$VPS_IP" ]; then
    print_status "DNS is correctly configured"
else
    print_warning "DNS may not be configured correctly"
    print_info "Domain $DOMAIN points to: $DOMAIN_IP"
    print_info "Expected IP: $VPS_IP"
    echo ""
    print_info "Please update your DNS records:"
    echo "  Type: A"
    echo "  Name: $(echo $DOMAIN | cut -d'.' -f1)"
    echo "  Value: $VPS_IP"
    echo ""
    read -p "Press Enter when DNS is updated, or Ctrl+C to exit..."
fi

# Update fider.env
print_info "Updating fider.env configuration..."

if [ -f "fider.env" ]; then
    # Backup original
    cp fider.env fider.env.backup
    
    # Update domain settings
    sed -i "s|BASE_URL=.*|BASE_URL=https://$DOMAIN|g" fider.env
    sed -i "s|HOST_DOMAIN=.*|HOST_DOMAIN=$DOMAIN|g" fider.env
    
    print_status "Updated fider.env with domain configuration"
else
    print_error "fider.env not found. Please run from project directory."
    exit 1
fi

# Install Certbot if not present
if ! command -v certbot &> /dev/null; then
    print_info "Installing Certbot for SSL certificates..."
    sudo apt update
    sudo apt install -y certbot
fi

# Stop Fider temporarily for SSL setup
print_info "Stopping Fider temporarily for SSL setup..."
docker-compose down

# Get SSL certificate
print_info "Obtaining SSL certificate for $DOMAIN..."
sudo certbot certonly --standalone -d $DOMAIN --non-interactive --agree-tos --email admin@$DOMAIN

if [ $? -eq 0 ]; then
    print_status "SSL certificate obtained successfully"
    
    # Update docker-compose for SSL
    print_info "Configuring SSL in docker-compose..."
    
    # Create SSL-enabled docker-compose override
    cat > docker-compose.ssl.yml << EOF
version: '3.8'
services:
  fider:
    ports:
      - "443:443"
    volumes:
      - /etc/letsencrypt:/etc/letsencrypt:ro
    environment:
      - SSL_CERT=/etc/letsencrypt/live/$DOMAIN/fullchain.pem
      - SSL_KEY=/etc/letsencrypt/live/$DOMAIN/privkey.pem
EOF
    
    print_status "SSL configuration created"
else
    print_error "Failed to obtain SSL certificate"
    print_info "Continuing with HTTP configuration..."
fi

# Update firewall for HTTPS
print_info "Updating firewall for HTTPS..."
sudo ufw allow 443/tcp

# Restart Fider with new configuration
print_info "Starting Fider with new domain configuration..."
if [ -f "docker-compose.ssl.yml" ]; then
    docker-compose -f docker-compose.yml -f docker-compose.ssl.yml --profile production up -d
else
    docker-compose --profile production up -d
fi

# Wait for startup
sleep 10

# Test the configuration
print_info "Testing configuration..."
if curl -s -o /dev/null -w "%{http_code}" https://$DOMAIN | grep -q "200\|301\|302"; then
    print_status "HTTPS configuration successful!"
    echo ""
    print_info "🎉 Your Fider is now accessible at: https://$DOMAIN"
elif curl -s -o /dev/null -w "%{http_code}" http://$DOMAIN:3000 | grep -q "200"; then
    print_status "HTTP configuration successful!"
    echo ""
    print_info "🎉 Your Fider is now accessible at: http://$DOMAIN:3000"
else
    print_warning "Configuration may need adjustment. Check logs with: docker-compose logs fider"
fi

# Setup auto-renewal for SSL
if [ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ]; then
    print_info "Setting up SSL certificate auto-renewal..."
    
    # Add cron job for renewal
    (crontab -l 2>/dev/null; echo "0 12 * * * /usr/bin/certbot renew --quiet --post-hook 'docker-compose restart fider'") | crontab -
    
    print_status "SSL auto-renewal configured"
fi

echo ""
print_status "🎉 Domain configuration complete!"
echo ""
print_info "📋 Summary:"
echo "  • Domain: $DOMAIN"
echo "  • SSL: $([ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && echo "Enabled" || echo "Not configured")"
echo "  • Access URL: $([ -f "/etc/letsencrypt/live/$DOMAIN/fullchain.pem" ] && echo "https://$DOMAIN" || echo "http://$DOMAIN:3000")"
echo ""
print_info "🔧 Next steps:"
echo "1. Update your BuyerMap feedback buttons to use the new domain"
echo "2. Test the feedback system end-to-end"
echo "3. Configure SMTP settings in fider.env if not already done" 