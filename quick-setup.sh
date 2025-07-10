#!/bin/bash

echo "🩸 Blood Donation Platform - Quick Setup with Sample Data"
echo "========================================================"

echo ""
echo "🛑 Stopping existing containers..."
docker-compose down -v

echo ""
echo "🏗️  Building and starting all services..."
docker-compose up --build -d

echo ""
echo "⏳ Waiting for services to initialize..."
sleep 20

echo ""
echo "📊 Checking seeder logs..."
docker-compose logs seeder

echo ""
echo "🔍 Service status:"
docker-compose ps

echo ""
echo "🧪 Testing services..."
curl -s http://localhost:5000/api/health | grep -q "OK" && echo "✅ Backend: OK" || echo "❌ Backend: Failed"
curl -s http://localhost:5000/api/test/db | grep -q "successful" && echo "✅ Database: OK" || echo "❌ Database: Failed"
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200" && echo "✅ Frontend: OK" || echo "❌ Frontend: Failed"

echo ""
echo "🎉 Setup complete!"
echo "🌐 Open: http://localhost:3000"
echo "🔐 Admin: username=admin, password=admin123"
echo "👥 Donors: password=donor123"
echo "🏥 Requesters: password=requester123"
