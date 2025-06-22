#!/bin/bash

# 🚀 VPS Setup Script for BuyerMap Fider Deployment
# This script helps you set up Fider on a Hetzner VPS

set -e

echo "🚀 BuyerMap Fider VPS Deployment Script"
echo "======================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

# Check if we're running locally or on VPS
if [ -f "/etc/os-release" ] && grep -q "Ubuntu\|Debian" /etc/os-release; then
    ENVIRONMENT="vps"
    print_info "Detected VPS environment"
else
    ENVIRONMENT="local"
    print_info "Detected local environment"
fi

# Function to check prerequisites
check_prerequisites() {
    print_info "Checking prerequisites..."
    
    if [ "$ENVIRONMENT" = "local" ]; then
        # Local environment checks
        if ! command -v docker &> /dev/null; then
            print_error "Docker is not installed. Please install Docker first."
            exit 1
        fi
        
        if ! command -v docker-compose &> /dev/null; then
            print_error "Docker Compose is not installed. Please install Docker Compose first."
            exit 1
        fi
        
        print_status "Local prerequisites met"
    else
        # VPS environment checks
        print_info "Setting up VPS prerequisites..."
        
        # Update system
        sudo apt update && sudo apt upgrade -y
        
        # Install Docker
        if ! command -v docker &> /dev/null; then
            print_info "Installing Docker..."
            curl -fsSL https://get.docker.com -o get-docker.sh
            sudo sh get-docker.sh
            sudo usermod -aG docker $USER
            rm get-docker.sh
        fi
        
        # Install Docker Compose
        if ! command -v docker-compose &> /dev/null; then
            print_info "Installing Docker Compose..."
            sudo curl -L "https://github.com/docker/compose/releases/download/v2.24.1/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
            sudo chmod +x /usr/local/bin/docker-compose
        fi
        
        # Install other essentials
        sudo apt install -y curl wget git nano htop
        
        print_status "VPS prerequisites installed"
    fi
}

# Function to setup Fider environment
setup_fider_environment() {
    print_info "Setting up Fider environment..."
    
    # Create fider.env if it doesn't exist
    if [ ! -f "fider.env" ]; then
        if [ -f "fider.env.example" ]; then
            cp fider.env.example fider.env
            print_status "Created fider.env from example"
        else
            print_error "fider.env.example not found. Please ensure you're in the correct directory."
            exit 1
        fi
    fi
    
    # Set environment-specific variables
    if [ "$ENVIRONMENT" = "vps" ]; then
        # Get VPS IP address
        VPS_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
        
        print_info "Detected VPS IP: $VPS_IP"
        
        # Update fider.env with VPS-specific settings
        sed -i "s|BASE_URL=.*|BASE_URL=http://$VPS_IP:3000|g" fider.env
        sed -i "s|HOST_DOMAIN=.*|HOST_DOMAIN=$VPS_IP|g" fider.env
        
        print_status "Updated fider.env for VPS deployment"
    fi
}

# Function to start Fider
start_fider() {
    print_info "Starting Fider..."
    
    # Make sure we're in the right directory
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml not found. Please run this script from your project root."
        exit 1
    fi
    
    # Start Fider
    if [ "$ENVIRONMENT" = "vps" ]; then
        docker-compose --profile production up -d
        print_status "Fider started in production mode"
    else
        docker-compose --profile development up -d
        print_status "Fider started in development mode"
    fi
    
    # Wait for Fider to be ready
    print_info "Waiting for Fider to be ready..."
    sleep 10
    
    # Check if Fider is running
    if docker-compose ps | grep -q "fider.*Up"; then
        print_status "Fider is running successfully!"
        
        if [ "$ENVIRONMENT" = "vps" ]; then
            VPS_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
            print_info "🌐 Fider is accessible at: http://$VPS_IP:3000"
        else
            print_info "🌐 Fider is accessible at: http://localhost:3000"
        fi
    else
        print_error "Fider failed to start. Check logs with: docker-compose logs fider"
        exit 1
    fi
}

# Function to configure firewall (VPS only)
configure_firewall() {
    if [ "$ENVIRONMENT" = "vps" ]; then
        print_info "Configuring firewall..."
        
        # Install ufw if not present
        if ! command -v ufw &> /dev/null; then
            sudo apt install -y ufw
        fi
        
        # Configure firewall rules
        sudo ufw default deny incoming
        sudo ufw default allow outgoing
        sudo ufw allow ssh
        sudo ufw allow 3000/tcp
        sudo ufw allow 80/tcp
        sudo ufw allow 443/tcp
        
        # Enable firewall
        echo "y" | sudo ufw enable
        
        print_status "Firewall configured"
    fi
}

# Function to show post-deployment information
show_deployment_info() {
    print_status "🎉 Deployment Complete!"
    echo ""
    print_info "📋 Next Steps:"
    echo ""
    
    if [ "$ENVIRONMENT" = "vps" ]; then
        VPS_IP=$(curl -s ifconfig.me || curl -s ipinfo.io/ip || hostname -I | awk '{print $1}')
        echo "1. 🌐 Access Fider at: http://$VPS_IP:3000"
        echo "2. 👤 Create your admin account (first user becomes admin)"
        echo "3. 🎨 Customize your feedback board settings"
        echo "4. 🔗 Update your BuyerMap app to point to: http://$VPS_IP:3000"
        echo ""
        print_info "🔧 Management Commands:"
        echo "   • View logs: docker-compose logs -f fider"
        echo "   • Stop Fider: docker-compose down"
        echo "   • Restart: docker-compose restart fider"
        echo "   • Update: docker-compose pull && docker-compose up -d"
        echo ""
        print_info "🛡️  Security Notes:"
        echo "   • Consider setting up a domain name and SSL certificate"
        echo "   • Configure SMTP in fider.env for email notifications"
        echo "   • Regular backups of the fider_data volume"
    else
        echo "1. 🌐 Access Fider at: http://localhost:3000"
        echo "2. 👤 Create your admin account (first user becomes admin)"
        echo "3. 🎨 Test your feedback board setup"
        echo "4. 🚀 Deploy to VPS when ready"
    fi
    
    echo ""
    print_info "📚 Documentation: Check FIDER_SETUP.md for detailed guides"
}

# Main execution
main() {
    echo ""
    print_info "Starting deployment process..."
    echo ""
    
    check_prerequisites
    setup_fider_environment
    
    if [ "$ENVIRONMENT" = "vps" ]; then
        configure_firewall
    fi
    
    start_fider
    show_deployment_info
}

# Check if script is being run with sudo (we don't want that)
if [ "$EUID" -eq 0 ]; then
    print_error "Please don't run this script as root/sudo. It will ask for sudo when needed."
    exit 1
fi

# Run main function
main "$@" 