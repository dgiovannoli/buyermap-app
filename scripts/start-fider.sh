#!/bin/bash

# BuyerMap Fider Setup Script
echo "🚀 Starting BuyerMap Feedback System (Fider)..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if .env.local exists
if [ ! -f .env.local ]; then
    echo "⚠️  .env.local not found. Copying from example..."
    cp fider.env.example .env.local
    echo "✅ Created .env.local - please update with your SMTP credentials"
fi

# Check if port 3001 is available
if lsof -i :3001 > /dev/null 2>&1; then
    echo "⚠️  Port 3001 is in use. Stopping existing containers..."
    docker-compose down
fi

# Start Fider
echo "🐳 Starting Fider container..."
docker-compose up -d fider

# Wait for service to be ready
echo "⏳ Waiting for Fider to start..."
for i in {1..30}; do
    if curl -f http://localhost:3001/health > /dev/null 2>&1; then
        echo "✅ Fider is ready!"
        echo "🌐 Access your feedback board at: http://localhost:3001"
        echo "📝 First time? Visit the URL above to set up your admin account"
        break
    fi
    sleep 2
    echo "   ... still starting ($i/30)"
done

if [ $i -eq 30 ]; then
    echo "❌ Fider failed to start. Check logs with: docker-compose logs fider"
    exit 1
fi

echo ""
echo "🎉 Fider is running successfully!"
echo "📋 Next steps:"
echo "   1. Visit http://localhost:3001 to set up admin account"
echo "   2. Configure categories and settings"
echo "   3. Add feedback link to BuyerMap app"
echo ""
echo "🔧 Commands:"
echo "   View logs: docker-compose logs -f fider"
echo "   Stop: docker-compose down"
echo "   Restart: docker-compose restart fider" 