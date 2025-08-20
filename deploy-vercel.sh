#!/bin/bash

echo "🚀 Deploying Blood Alert App to Vercel..."

# Check if Vercel CLI is installed
if ! command -v vercel &> /dev/null; then
    echo "❌ Vercel CLI not found. Installing..."
    npm install -g vercel
fi

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "⚠️  .env file not found. Creating from template..."
    cp env.production .env
    echo "📝 Please edit .env file with your actual values before continuing."
    echo "   Required variables:"
    echo "   - MONGO_URI (MongoDB Atlas connection string)"
    echo "   - JWT_SECRET (32+ character secret)"
    echo "   - CORS_ORIGIN (your frontend URL)"
    echo "   - FROM_EMAIL (your email)"
    echo ""
    read -p "Press Enter after editing .env file..."
fi

# Check if .env has placeholder values
if grep -q "<username>" .env || grep -q "your_" .env; then
    echo "❌ Please update .env file with actual values before deploying."
    exit 1
fi

echo "📦 Building frontend..."
cd client
npm run build
cd ..

echo "🔧 Checking for required files..."
if [ ! -f "vercel.json" ]; then
    echo "❌ vercel.json not found. Please ensure it exists in the root directory."
    exit 1
fi

echo "🌐 Deploying to Vercel..."
vercel --prod

echo ""
echo "✅ Deployment completed!"
echo ""
echo "🔗 Your app is now available at the URL shown above."
echo ""
echo "📋 Next steps:"
echo "1. Set environment variables in Vercel dashboard"
echo "2. Deploy frontend separately or use Vercel for both"
echo "3. Test all features"
echo ""
echo "�� Happy deploying!"
