@echo off
echo 🚀 Deploying Blood Alert App to Render...

REM Check if git is initialized
if not exist ".git" (
    echo ❌ Git repository not found. Please initialize git first:
    echo    git init
    echo    git add .
    echo    git commit -m "Initial commit"
    echo    git remote add origin ^<your-github-repo-url^>
    pause
    exit /b 1
)

REM Check if remote origin exists
git remote get-url origin >nul 2>&1
if errorlevel 1 (
    echo ❌ Git remote origin not found. Please add your GitHub repository:
    echo    git remote add origin ^<your-github-repo-url^>
    pause
    exit /b 1
)

REM Check if .env file exists
if not exist ".env" (
    echo ⚠️  .env file not found. Creating from template...
    copy env.production .env
    echo 📝 Please edit .env file with your actual values before continuing.
    echo    Required variables:
    echo    - MONGO_URI (MongoDB Atlas connection string)
    echo    - JWT_SECRET (32+ character secret)
    echo    - CORS_ORIGIN (your frontend URL)
    echo    - FROM_EMAIL (your email)
    echo.
    pause
)

REM Check if .env has placeholder values
findstr /C:"<username>" .env >nul 2>&1
if not errorlevel 1 (
    echo ❌ Please update .env file with actual values before deploying.
    pause
    exit /b 1
)

findstr /C:"your_" .env >nul 2>&1
if not errorlevel 1 (
    echo ❌ Please update .env file with actual values before deploying.
    pause
    exit /b 1
)

echo 📦 Building frontend...
cd client
call npm run build
cd ..

echo 🔧 Checking for required files...
if not exist "render.yaml" (
    echo ❌ render.yaml not found. Please ensure it exists in the root directory.
    pause
    exit /b 1
)

echo 📤 Pushing to GitHub...
git add .
git commit -m "Deploy to production - %date% %time%"
git push origin main

echo.
echo ✅ Code pushed to GitHub successfully!
echo.
echo 🌐 Next steps:
echo 1. Go to https://render.com
echo 2. Sign up/Login with GitHub
echo 3. Click 'New +' → 'Blueprint'
echo 4. Connect your GitHub repository
echo 5. Render will automatically detect render.yaml and deploy both services
echo.
echo 📋 After deployment, update your frontend environment variables:
echo    REACT_APP_API_URL=https://your-backend-name.onrender.com
echo.
echo 🔗 Your app will be available at:
echo    Frontend: https://blood-alert-frontend.onrender.com
echo    Backend:  https://blood-alert-backend.onrender.com
echo.
echo 🎉 Happy deploying!
pause
