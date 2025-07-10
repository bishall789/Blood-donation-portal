#!/bin/bash

echo "🩸 Blood Donation Platform - Docker Setup with Sample Data"
echo "=========================================================="

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🛑 Stopping and cleaning existing containers...${NC}"
docker-compose down -v

echo ""
echo -e "${BLUE}🏗️  Building and starting services with sample data...${NC}"
docker-compose up --build -d

echo ""
echo -e "${BLUE}⏳ Waiting for services to start and data to seed...${NC}"
sleep 15

echo ""
echo -e "${BLUE}🔍 Checking service status...${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}📊 Checking seeder logs...${NC}"
docker-compose logs seeder

echo ""
echo -e "${BLUE}🧪 Testing services...${NC}"

# Test backend health
echo -n "Backend health: "
if curl -s http://localhost:5000/api/health | grep -q "OK"; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test database
echo -n "Database test: "
if curl -s http://localhost:5000/api/test/db | grep -q "successful"; then
    echo -e "${GREEN}✅ Connected${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test frontend
echo -n "Frontend: "
if curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 | grep -q "200"; then
    echo -e "${GREEN}✅ Running${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup complete with sample data!${NC}"
echo ""
echo -e "${BLUE}📊 Sample Data Created:${NC}"
echo "   👥 8 Donors (various blood groups)"
echo "   🏥 6 Requesters (various blood groups)"
echo "   📋 6 Blood Requests (various urgency levels)"
echo ""
echo -e "${YELLOW}🔐 Login Credentials:${NC}"
echo "   Admin: username=admin, password=admin123"
echo "   Donors: password=donor123 (john_donor, sarah_donor, etc.)"
echo "   Requesters: password=requester123 (patient_1, patient_2, etc.)"
echo ""
echo -e "${BLUE}🚀 Ready to use:${NC}"
echo "   🌐 Frontend: http://localhost:3000"
echo "   🔧 Backend: http://localhost:5000"
echo ""
echo -e "${BLUE}📋 Test Workflow:${NC}"
echo "   1. Login as admin → View donors and requests"
echo "   2. Generate matches → Accept matches"
echo "   3. Login as donor/requester → Check notifications"
echo "   4. Test cancellation and re-entry features"
echo ""
