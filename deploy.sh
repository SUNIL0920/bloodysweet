#!/bin/bash

echo "🚀 Starting Blood Alert App Deployment..."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "❌ Docker is not running. Please start Docker first."
    exit 1
fi

# Check if Docker Compose is available
if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose is not available. Please install it first."
    exit 1
fi

echo "📦 Building and starting services..."

# Build and start all services
docker-compose up --build -d

echo "⏳ Waiting for services to start..."

# Wait for MongoDB to be ready
echo "🔄 Waiting for MongoDB..."
sleep 10

# Wait for backend to be ready
echo "🔄 Waiting for Backend..."
sleep 15

# Wait for frontend to be ready
echo "🔄 Waiting for Frontend..."
sleep 10

echo "✅ Deployment completed!"
echo ""
echo "🌐 Services are now running:"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   MongoDB:  localhost:27017"
echo "   Redis:    localhost:6379"
echo ""
echo "📊 To view logs:"
echo "   docker-compose logs -f"
echo ""
echo "🛑 To stop services:"
echo "   docker-compose down"
echo ""
echo "🔄 To restart services:"
echo "   docker-compose restart"
