@echo off
echo 🩸 Blood Donation Platform - Docker Setup with Sample Data
echo ==========================================================

echo.
echo 🛑 Stopping and cleaning existing containers...
docker-compose down -v

echo.
echo 🏗️  Building and starting services with sample data...
docker-compose up --build -d

echo.
echo ⏳ Waiting for services to start and data to seed...
timeout /t 15 >nul

echo.
echo 🔍 Checking service status...
docker-compose ps

echo.
echo 📊 Checking seeder logs...
docker-compose logs seeder

echo.
echo 🧪 Testing services...

:: Test backend health
echo | set /p="Backend health: "
curl -s http://localhost:5000/api/health | findstr "OK" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ OK
) else (
    echo ❌ Failed
)

:: Test database
echo | set /p="Database test: "
curl -s http://localhost:5000/api/test/db | findstr "successful" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Connected
) else (
    echo ❌ Failed
)

:: Test frontend
echo | set /p="Frontend: "
curl -s -o nul -w "%%{http_code}" http://localhost:3000 | findstr "200" >nul 2>&1
if %errorlevel% equ 0 (
    echo ✅ Running
) else (
    echo ❌ Failed
)

echo.
echo 🎉 Setup complete with sample data!
echo.
echo 📊 Sample Data Created:
echo    👥 8 Donors (various blood groups)
echo    🏥 6 Requesters (various blood groups)
echo    📋 6 Blood Requests (various urgency levels)
echo.
echo 🔐 Login Credentials:
echo    Admin: username=admin, password=admin123
echo    Donors: password=donor123 (john_donor, sarah_donor, etc.)
echo    Requesters: password=requester123 (patient_1, patient_2, etc.)
echo.
echo 🚀 Ready to use:
echo    🌐 Frontend: http://localhost:3000
echo    🔧 Backend: http://localhost:5000
echo.
echo 📋 Test Workflow:
echo    1. Login as admin → View donors and requests
echo    2. Generate matches → Accept matches
echo    3. Login as donor/requester → Check notifications
echo    4. Test cancellation and re-entry features
echo.
pause
