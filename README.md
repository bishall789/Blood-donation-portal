# Blood Donation Platform

A comprehensive full-stack blood donation platform that connects blood donors with requesters through an admin-managed matching system.

## Features

### User Authentication
- Separate signup/login for donors and requesters
- Admin panel with unique credentials (Username: `admin`, Password: `admin123`)
- JWT-based authentication with secure token management

### Donor Features
- Register with blood group and availability status
- Toggle availability to donate
- View donation history
- Receive match notifications when paired with requesters

### Requester Features
- Submit blood requests with urgency levels
- Specify required blood group and additional details
- Track request status and history
- Receive notifications when matched with donors

### Admin Features
- View all registered donors and their availability
- Monitor all blood requests with urgency indicators
- Generate matches based on blood compatibility
- Accept/manage matches to notify both parties
- Comprehensive dashboard with user management

### Blood Compatibility System
- Implements proper blood group compatibility logic
- O- universal donor compatibility
- Accurate matching based on medical standards

## Technology Stack

- **Frontend**: React 18 with TypeScript, React Router, Context API
- **Backend**: Node.js with Express.js
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT tokens with bcrypt password hashing
- **Containerization**: Docker and Docker Compose
- **Web Server**: Nginx for frontend serving

## Quick Start

### Prerequisites
- Docker and Docker Compose installed
- Git for cloning the repository

### Installation

1. Clone the repository:
\`\`\`bash
git clone <repository-url>
cd blood-donation-platform
\`\`\`

2. Start all services with Docker Compose:
\`\`\`bash
docker-compose up -d
\`\`\`

3. Access the application:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- MongoDB: localhost:27017

### Default Admin Credentials
- Username: `admin`
- Password: `admin123`

## Project Structure

\`\`\`
blood-donation-platform/
├── frontend/                 # React TypeScript application
│   ├── src/
│   │   ├── components/      # Reusable UI components
│   │   ├── contexts/        # React Context providers
│   │   ├── pages/           # Application pages/routes
│   │   └── App.tsx          # Main application component
│   ├── Dockerfile           # Frontend container configuration
│   └── nginx.conf           # Nginx server configuration
├── backend/                 # Node.js Express API
│   ├── server.js            # Main server file with all routes
│   ├── healthcheck.js       # Health check script
│   └── Dockerfile           # Backend container configuration
├── docker-compose.yml       # Multi-container orchestration
├── mongo-init.js           # MongoDB initialization script
└── README.md               # Project documentation
\`\`\`

## API Endpoints

### Authentication
- `POST /api/auth/signup` - User registration
- `POST /api/auth/login` - User login
- `GET /api/auth/profile` - Get user profile

### Donor Routes
- `PUT /api/donor/availability` - Update availability status
- `GET /api/donor/history` - Get donation history

### Requester Routes
- `POST /api/requester/request` - Create blood request
- `GET /api/requester/requests` - Get user's requests

### Admin Routes
- `GET /api/admin/donors` - Get all donors
- `GET /api/admin/requests` - Get all requests
- `GET /api/admin/matches` - Get all matches
- `POST /api/admin/create-matches` - Generate new matches
- `PUT /api/admin/matches/:id/accept` - Accept a match

## Blood Compatibility Logic

The platform implements medically accurate blood compatibility:

- **O-**: Universal donor (can donate to all blood types)
- **O+**: Can donate to O+, A+, B+, AB+
- **A-**: Can donate to A-, A+, AB-, AB+
- **A+**: Can donate to A+, AB+
- **B-**: Can donate to B-, B+, AB-, AB+
- **B+**: Can donate to B+, AB+
- **AB-**: Can donate to AB-, AB+
- **AB+**: Can donate to AB+ only

## Development

### Running in Development Mode

1. Start MongoDB:
\`\`\`bash
docker run -d -p 27017:27017 --name mongo mongo:7.0
\`\`\`

2. Start Backend:
\`\`\`bash
cd backend
npm install
npm run dev
\`\`\`

3. Start Frontend:
\`\`\`bash
cd frontend
npm install
npm start
\`\`\`

### Environment Variables

Backend environment variables (create `.env` file):
\`\`\`
MONGODB_URI=mongodb://localhost:27017/blooddonation
JWT_SECRET=your-secret-key
PORT=5000
NODE_ENV=development
\`\`\`

## Deployment

### Production Deployment

1. Update environment variables in `docker-compose.yml`
2. Build and deploy:
\`\`\`bash
docker-compose -f docker-compose.yml up -d --build
\`\`\`

### Cloud Deployment

The application is ready for deployment on:
- **Vercel** (Frontend)
- **Railway/Render** (Backend)
- **MongoDB Atlas** (Database)

Update the API endpoints in the frontend to match your deployed backend URL.

## Security Features

- Password hashing with bcrypt
- JWT token authentication
- CORS protection
- Input validation and sanitization
- Secure HTTP headers with Nginx
- Non-root Docker containers

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is licensed under the MIT License - see the LICENSE file for details.

## Support

For support and questions:
- Create an issue in the GitHub repository
- Check the documentation for common solutions
- Review the API endpoints for integration help

---

**Note**: This platform is designed for educational and demonstration purposes. For production medical applications, ensure compliance with healthcare regulations and implement additional security measures.
