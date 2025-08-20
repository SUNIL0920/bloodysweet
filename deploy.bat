@echo off
echo 🚀 Starting Blood Alert App Deployment...

REM Check if Docker is running
docker info >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker is not running. Please start Docker first.
    pause
    exit /b 1
)

REM Check if Docker Compose is available
docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo ❌ Docker Compose is not available. Please install it first.
    pause
    exit /b 1
)

echo 📦 Building and starting services...

REM Build and start all services
docker-compose up --build -d

echo ⏳ Waiting for services to start...

REM Wait for MongoDB to be ready
echo 🔄 Waiting for MongoDB...
timeout /t 10 /nobreak >nul

REM Wait for backend to be ready
echo 🔄 Waiting for Backend...
timeout /t 15 /nobreak >nul

REM Wait for frontend to be ready
echo 🔄 Waiting for Frontend...
timeout /t 10 /nobreak >nul

echo ✅ Deployment completed!
echo.
echo 🌐 Services are now running:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    MongoDB:  localhost:27017
echo    Redis:    localhost:6379
echo.
echo 📊 To view logs:
echo    docker-compose logs -f
echo.
echo 🛑 To stop services:
echo    docker-compose down
echo.
echo 🔄 To restart services:
echo    docker-compose restart
echo.
pause
