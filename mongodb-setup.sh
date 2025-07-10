#!/bin/bash

echo "🩸 Blood Donation Platform - MongoDB Setup Script"
echo "================================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo ""
echo -e "${BLUE}📋 Checking MongoDB Installation...${NC}"

# Check if MongoDB is installed
if ! command -v mongosh &> /dev/null; then
    echo -e "${RED}❌ MongoDB Shell (mongosh) not found${NC}"
    echo -e "${YELLOW}📥 Please install MongoDB:${NC}"
    echo "   - macOS: brew install mongodb-community"
    echo "   - Ubuntu: sudo apt install mongodb"
    echo "   - Or download from: https://www.mongodb.com/try/download/community"
    exit 1
fi

echo -e "${GREEN}✅ MongoDB Shell found${NC}"

echo ""
echo -e "${BLUE}🔍 Checking MongoDB Service Status...${NC}"

# Check if MongoDB is running
if pgrep -x "mongod" > /dev/null; then
    echo -e "${GREEN}✅ MongoDB is already running${NC}"
elif brew services list | grep mongodb-community | grep started > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB service is running (Homebrew)${NC}"
else
    echo -e "${YELLOW}🔄 Starting MongoDB...${NC}"
    
    # Try different ways to start MongoDB
    if command -v brew &> /dev/null; then
        echo "Starting MongoDB with Homebrew..."
        brew services start mongodb-community
    elif command -v systemctl &> /dev/null; then
        echo "Starting MongoDB with systemctl..."
        sudo systemctl start mongod
    elif command -v service &> /dev/null; then
        echo "Starting MongoDB with service..."
        sudo service mongod start
    else
        echo "Starting MongoDB manually..."
        mongod --dbpath /usr/local/var/mongodb --logpath /usr/local/var/log/mongodb/mongo.log --fork
    fi
    
    # Wait for MongoDB to start
    sleep 3
fi

echo ""
echo -e "${BLUE}🧪 Testing MongoDB Connection...${NC}"

# Test connection
if mongosh --eval "db.runCommand({ping: 1})" --quiet > /dev/null 2>&1; then
    echo -e "${GREEN}✅ MongoDB connection successful!${NC}"
else
    echo -e "${RED}❌ Cannot connect to MongoDB${NC}"
    echo -e "${YELLOW}🔧 Troubleshooting steps:${NC}"
    echo "   1. Check if MongoDB is running: ps aux | grep mongod"
    echo "   2. Try connecting manually: mongosh"
    echo "   3. Check MongoDB logs for errors"
    echo "   4. Ensure port 27017 is not blocked"
    exit 1
fi

echo ""
echo -e "${BLUE}🗄️  Setting up Blood Donation Database...${NC}"

# Setup database and collections
mongosh --eval "
use blooddonation;
db.createCollection('users');
db.createCollection('requests');
db.createCollection('matches');
db.createCollection('histories');

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true });
db.users.createIndex({ email: 1 }, { unique: true });
db.users.createIndex({ role: 1 });
db.users.createIndex({ bloodGroup: 1 });

db.requests.createIndex({ requester: 1 });
db.requests.createIndex({ bloodGroup: 1 });
db.requests.createIndex({ status: 1 });

db.matches.createIndex({ donor: 1 });
db.matches.createIndex({ requester: 1 });
db.matches.createIndex({ status: 1 });

print('✅ Database and collections created successfully');
print('📊 Database: blooddonation');
print('📋 Collections: users, requests, matches, histories');
print('🔍 Indexes created for optimal performance');
" --quiet

echo ""
echo -e "${GREEN}🎉 MongoDB Setup Complete!${NC}"
echo -e "${BLUE}📊 Database: blooddonation${NC}"
echo -e "${BLUE}🌐 Connection: mongodb://localhost:27017/blooddonation${NC}"
echo ""
echo -e "${YELLOW}🚀 You can now start your Blood Donation Platform:${NC}"
echo "   1. Backend: cd backend && npm start"
echo "   2. Frontend: cd frontend && npm start"
echo ""
