# Blood Donation Platform - Complete Setup Guide

## 🚀 Step-by-Step Setup Instructions

### Prerequisites
- Node.js 18+ installed
- MongoDB running (you have MongoDB 8.0.11 Community on localhost:27017)
- Git installed
- Docker and Docker Compose (optional, for containerized setup)

## Method 1: Local Development Setup (Recommended for Development)

### Step 1: Clone and Setup Project Structure
\`\`\`bash
# Create project directory
mkdir blood-donation-platform
cd blood-donation-platform

# Create frontend and backend directories
mkdir frontend backend
\`\`\`

### Step 2: Setup Backend
\`\`\`bash
cd backend

# Initialize package.json and install dependencies
npm init -y
npm install express mongoose cors bcryptjs jsonwebtoken dotenv

# Create .env file
echo "MONGODB_URI=mongodb://localhost:27017/blooddonation
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production-2024
PORT=5000
FRONTEND_URL=http://localhost:3000
NODE_ENV=development" > .env

# Copy the server.js file from the code above
# Start the backend
npm start
\`\`\`

### Step 3: Setup Frontend
\`\`\`bash
cd ../frontend

# Create React app with TypeScript
npx create-react-app . --template typescript

# Install additional dependencies
npm install react-router-dom
npm install @types/react-router-dom

# Copy all frontend files from the code above
# Start the frontend
npm start
\`\`\`

### Step 4: Test the Application
1. Backend should be running on http://localhost:5000
2. Frontend should be running on http://localhost:3000
3. MongoDB should be accessible on localhost:27017

## Method 2: Docker Setup (Recommended for Production)

### Step 1: Create Project Structure
\`\`\`bash
mkdir blood-donation-platform
cd blood-donation-platform
mkdir frontend backend
\`\`\`

### Step 2: Copy All Files
Copy all the files from the code blocks above into their respective directories.

### Step 3: Build and Run with Docker
\`\`\`bash
# Build and start all services
docker-compose up --build -d

# Check if services are running
docker-compose ps

# View logs
docker-compose logs -f
\`\`\`

### Step 4: Access the Application
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

## 🔧 Troubleshooting Common Issues

### Issue 1: MongoDB Connection Error
**Problem**: Backend can't connect to MongoDB
**Solution**:
\`\`\`bash
# Check if MongoDB is running
sudo systemctl status mongod

# Start MongoDB if not running
sudo systemctl start mongod

# For Docker setup, check MongoDB container
docker-compose logs mongo
\`\`\`

### Issue 2: CORS Errors
**Problem**: Frontend can't connect to backend
**Solution**: Ensure backend .env has correct FRONTEND_URL:
\`\`\`
FRONTEND_URL=http://localhost:3000
\`\`\`

### Issue 3: Port Already in Use
**Problem**: Port 3000 or 5000 already in use
**Solution**:
\`\`\`bash
# Kill processes on port 3000
sudo lsof -t -i tcp:3000 | xargs kill -9

# Kill processes on port 5000
sudo lsof -t -i tcp:5000 | xargs kill -9
\`\`\`

### Issue 4: Docker Build Fails
**Problem**: Docker build errors
**Solution**:
\`\`\`bash
# Clean Docker cache
docker system prune -a

# Rebuild without cache
docker-compose build --no-cache
\`\`\`

## 🧪 Testing the Application

### Step 1: Test Backend API
\`\`\`bash
# Health check
curl http://localhost:5000/api/health

# Should return: {"status":"OK","message":"Blood Donation API is running"}
\`\`\`

### Step 2: Test Admin Login
1. Go to http://localhost:3000
2. Login with:
   - Username: `admin`
   - Password: `admin123`

### Step 3: Test User Registration
1. Click "Sign up"
2. Create a donor account
3. Create a requester account
4. Test the functionality

## 📁 Final Project Structure
\`\`\`
blood-donation-platform/
├── frontend/
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   ├── contexts/
│   │   ├── pages/
│   │   ├── App.tsx
│   │   ├── index.tsx
│   │   └── index.css
│   ├── package.json
│   ├── tsconfig.json
│   ├── Dockerfile
│   └── nginx.conf
├── backend/
│   ├── server.js
│   ├── package.json
│   ├── .env
│   └── Dockerfile
├── docker-compose.yml
└── README.md
\`\`\`

## 🔐 Default Credentials
- **Admin**: Username: `admin`, Password: `admin123`

## 🚀 Deployment Ready
The application is ready for deployment on:
- **Frontend**: Vercel, Netlify, or any static hosting
- **Backend**: Railway, Render, Heroku, or any Node.js hosting
- **Database**: MongoDB Atlas for cloud database

## 📞 Support
If you encounter any issues:
1. Check the logs: `docker-compose logs -f`
2. Verify all services are running: `docker-compose ps`
3. Test API endpoints manually with curl or Postman
4. Check MongoDB connection and data
