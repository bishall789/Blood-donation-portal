#!/bin/bash

echo "🩸 Blood Donation Platform - Docker Setup"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}🐳 Checking Docker installation...${NC}"

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not found. Please install Docker first.${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}❌ Docker Compose not found. Please install Docker Compose first.${NC}"
    exit 1
fi

echo -e "${GREEN}✅ Docker and Docker Compose found${NC}"

echo ""
echo -e "${BLUE}🛑 Stopping existing containers...${NC}"
docker-compose down -v

echo ""
echo -e "${BLUE}🏗️  Building and starting services...${NC}"
docker-compose up --build -d

echo ""
echo -e "${BLUE}⏳ Waiting for services to start...${NC}"
sleep 10

echo ""
echo -e "${BLUE}🔍 Checking service status...${NC}"
docker-compose ps

echo ""
echo -e "${BLUE}🧪 Testing services...${NC}"

# Test backend health
echo -n "Backend health check: "
if curl -s http://localhost:5000/api/health > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

# Test frontend
echo -n "Frontend check: "
if curl -s http://localhost:3000 > /dev/null; then
    echo -e "${GREEN}✅ OK${NC}"
else
    echo -e "${RED}❌ Failed${NC}"
fi

echo ""
echo -e "${GREEN}🎉 Setup complete!${NC}"
echo -e "${BLUE}📊 Service URLs:${NC}"
echo "   Frontend: http://localhost:3000"
echo "   Backend:  http://localhost:5000"
echo "   Health:   http://localhost:5000/api/health"
echo ""
echo -e "${YELLOW}🔐 Default Admin Credentials:${NC}"
echo "   Username: admin"
echo "   Password: admin123"
echo ""
echo -e "${BLUE}📋 Useful Commands:${NC}"
echo "   View logs:     docker-compose logs -f"
echo "   Stop services: docker-compose down"
echo "   Restart:       docker-compose restart"
echo ""
