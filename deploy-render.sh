#!/bin/bash

echo "🚀 Deploying Blood Alert App to Render..."

# Check if git is initialized
if [ ! -d ".git" ]; then
    echo "❌ Git repository not found. Please initialize git first:"
    echo "   git init"
    echo "   git add ."
    echo "   git commit -m 'Initial commit'"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
fi

# Check if remote origin exists
if ! git remote get-url origin > /dev/null 2>&1; then
    echo "❌ Git remote origin not found. Please add your GitHub repository:"
    echo "   git remote add origin <your-github-repo-url>"
    exit 1
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
if [ ! -f "render.yaml" ]; then
    echo "❌ render.yaml not found. Please ensure it exists in the root directory."
    exit 1
fi

echo "📤 Pushing to GitHub..."
git add .
git commit -m "Deploy to production - $(date)"
git push origin main

echo ""
echo "✅ Code pushed to GitHub successfully!"
echo ""
echo "🌐 Next steps:"
echo "1. Go to https://render.com"
echo "2. Sign up/Login with GitHub"
echo "3. Click 'New +' → 'Blueprint'"
echo "4. Connect your GitHub repository"
echo "5. Render will automatically detect render.yaml and deploy both services"
echo ""
echo "📋 After deployment, update your frontend environment variables:"
echo "   REACT_APP_API_URL=https://your-backend-name.onrender.com"
echo ""
echo "🔗 Your app will be available at:"
echo "   Frontend: https://blood-alert-frontend.onrender.com"
echo "   Backend:  https://blood-alert-backend.onrender.com"
echo ""
echo "�� Happy deploying!"
