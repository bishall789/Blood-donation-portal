@echo off
echo 🩸 Blood Donation Platform - MongoDB Setup Script
echo ================================================

echo.
echo 📋 Checking MongoDB Installation...

:: Check if MongoDB is installed
mongosh --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ MongoDB Shell (mongosh) not found
    echo 📥 Please install MongoDB from: https://www.mongodb.com/try/download/community
    pause
    exit /b 1
)

echo ✅ MongoDB Shell found

:: Check if MongoDB service is running
echo.
echo 🔍 Checking MongoDB Service Status...
sc query MongoDB >nul 2>&1
if %errorlevel% neq 0 (
    echo ⚠️  MongoDB service not found, trying to start MongoDB manually...
    goto :start_manual
)

:: Check service status
for /f "tokens=3 delims=: " %%H in ('sc query MongoDB ^| findstr "STATE"') do (
    if /I "%%H" == "RUNNING" (
        echo ✅ MongoDB service is already running
        goto :test_connection
    )
)

echo 🔄 Starting MongoDB service...
net start MongoDB
if %errorlevel% neq 0 (
    echo ❌ Failed to start MongoDB service
    echo 🔧 Trying alternative startup methods...
    goto :start_manual
)

goto :test_connection

:start_manual
echo.
echo 🔧 Starting MongoDB manually...
echo 📁 Looking for MongoDB installation...

:: Common MongoDB installation paths
set MONGO_PATHS[0]="C:\Program Files\MongoDB\Server\8.0\bin\mongod.exe"
set MONGO_PATHS[1]="C:\Program Files\MongoDB\Server\7.0\bin\mongod.exe"
set MONGO_PATHS[2]="C:\Program Files\MongoDB\Server\6.0\bin\mongod.exe"
set MONGO_PATHS[3]="C:\mongodb\bin\mongod.exe"

for /L %%i in (0,1,3) do (
    call set "MONGO_PATH=%%MONGO_PATHS[%%i]%%"
    call set "MONGO_PATH=%%MONGO_PATH:"=%%"
    if exist "!MONGO_PATH!" (
        echo ✅ Found MongoDB at: !MONGO_PATH!
        echo 🚀 Starting MongoDB server...
        start "MongoDB Server" "!MONGO_PATH!" --dbpath "C:\data\db"
        timeout /t 3 >nul
        goto :test_connection
    )
)

echo ❌ MongoDB executable not found in common locations
echo 📋 Please ensure MongoDB is installed and add it to your PATH
echo 💡 Or start MongoDB manually before running the application
pause
exit /b 1

:test_connection
echo.
echo 🧪 Testing MongoDB Connection...
timeout /t 2 >nul

mongosh --eval "db.runCommand({ping: 1})" --quiet >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Cannot connect to MongoDB
    echo 🔧 Troubleshooting steps:
    echo    1. Check if MongoDB is running on port 27017
    echo    2. Try: mongosh --host 127.0.0.1:27017
    echo    3. Check Windows Firewall settings
    echo    4. Restart MongoDB service
    pause
    exit /b 1
)

echo ✅ MongoDB connection successful!

echo.
echo 🗄️  Setting up Blood Donation Database...
mongosh --eval "
use blooddonation;
db.createCollection('users');
db.createCollection('requests');
db.createCollection('matches');
db.createCollection('histories');
print('✅ Database and collections created successfully');
print('📊 Database: blooddonation');
print('📋 Collections: users, requests, matches, histories');
" --quiet

echo.
echo 🎉 MongoDB Setup Complete!
echo 📊 Database: blooddonation
echo 🌐 Connection: mongodb://localhost:27017/blooddonation
echo.
echo 🚀 You can now start your Blood Donation Platform:
echo    1. Backend: cd backend && npm start
echo    2. Frontend: cd frontend && npm start
echo.
pause
