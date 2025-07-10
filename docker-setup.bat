@echo off
echo 🩸 Blood Donation Platform - Docker Setup
echo ========================================

echo.
echo 🐳 Checking Docker installation...

:: Check if Docker is installed
docker --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker not found. Please install Docker Desktop first.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Docker Compose not found. Please install Docker Compose first.
    pause
    exit /b 1
)

echo ✅ Docker and Docker Compose found

echo.
echo 🛑 Stopping existing containers...
docker-compose down -v

echo.
echo 🏗️  Building and starting services...
docker-compose up --build -d

echo.
echo ⏳ Waiting for services to start...
timeout /t 10 >nul

echo.
echo 🔍 Checking service status...
docker-compose ps

echo.
echo 🧪 Testing services...

:: Test backend health
echo | set /p="Backend health check: "
curl -s http://localhost:5000/api/health >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ OK
) else (
    echo ❌ Failed
)

:: Test frontend
echo | set /p="Frontend check: "
curl -s http://localhost:3000 >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ OK
) else (
    echo ❌ Failed
)

echo.
echo 🎉 Setup complete!
echo 📊 Service URLs:
echo    Frontend: http://localhost:3000
echo    Backend:  http://localhost:5000
echo    Health:   http://localhost:5000/api/health
echo.
echo 🔐 Default Admin Credentials:
echo    Username: admin
echo    Password: admin123
echo.
echo 📋 Useful Commands:
echo    View logs:     docker-compose logs -f
echo    Stop services: docker-compose down
echo    Restart:       docker-compose restart
echo.
pause
