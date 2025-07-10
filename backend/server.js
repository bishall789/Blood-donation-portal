const express = require("express")
const mongoose = require("mongoose")
const cors = require("cors")
const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
require("dotenv").config()

const app = express()

// Middleware
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  }),
)
app.use(express.json({ limit: "10mb" }))
app.use(express.urlencoded({ extended: true, limit: "10mb" }))

// MongoDB connection with multiple fallback options
const connectDB = async () => {
  const mongoOptions = {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverSelectionTimeoutMS: 5000, // Timeout after 5s instead of 30s
    socketTimeoutMS: 45000, // Close sockets after 45s of inactivity
  }

  // Try different MongoDB connection strings
  const connectionStrings = [
    process.env.MONGODB_URI,
    "mongodb://127.0.0.1:27017/blooddonation", // IPv4 instead of localhost
    "mongodb://localhost:27017/blooddonation",
    "mongodb://0.0.0.0:27017/blooddonation",
  ].filter(Boolean) // Remove undefined values

  for (const connectionString of connectionStrings) {
    try {
      console.log(`Attempting to connect to: ${connectionString}`)
      const conn = await mongoose.connect(connectionString, mongoOptions)
      console.log(`✅ MongoDB Connected Successfully: ${conn.connection.host}:${conn.connection.port}`)
      console.log(`📊 Database: ${conn.connection.name}`)
      return conn
    } catch (error) {
      console.log(`❌ Failed to connect to: ${connectionString}`)
      console.log(`Error: ${error.message}`)
      continue
    }
  }

  console.error("🚨 Could not connect to MongoDB with any connection string")
  console.log("\n📋 Troubleshooting Steps:")
  console.log("1. Check if MongoDB is running: mongosh --eval 'db.runCommand({ping: 1})'")
  console.log("2. Start MongoDB service: net start MongoDB (Windows) or brew services start mongodb-community (Mac)")
  console.log("3. Check MongoDB status: mongosh --eval 'db.adminCommand({listCollections: 1})'")
  console.log("4. Verify MongoDB is listening on port 27017")

  // Don't exit the process, let it run without DB for now
  console.log("\n⚠️  Server will continue running without database connection")
  console.log("🔧 Fix MongoDB connection and restart the server")
}

// Connect to MongoDB
connectDB()

// User Schema - Updated to allow flexible roles
const userSchema = new mongoose.Schema({
  username: { type: String, required: true, unique: true, trim: true },
  email: { type: String, required: true, unique: true, trim: true, lowercase: true },
  password: { type: String, required: true, minlength: 6 },
  role: { type: String, enum: ["donor", "requester", "admin"], default: null },
  bloodGroup: { type: String, required: true, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
  isAvailable: { type: Boolean, default: true },
  matchStatus: { type: String, default: "Available" },
  isDonor: { type: Boolean, default: false },
  isRequester: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now },
})

// Blood Request Schema
const requestSchema = new mongoose.Schema({
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requesterName: { type: String, required: true },
  bloodGroup: { type: String, required: true, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
  urgency: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
  description: { type: String, trim: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Matched", "Completed", "Cancelled"] },
  createdAt: { type: Date, default: Date.now },
})

// Match Schema
const matchSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },
  donorName: { type: String, required: true },
  requesterName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Accepted", "Rejected", "Completed"] },
  createdAt: { type: Date, default: Date.now },
})

// History Schema
const historySchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  donorName: { type: String, required: true },
  requesterName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  status: { type: String, required: true },
  date: { type: Date, default: Date.now },
})

const User = mongoose.model("User", userSchema)
const Request = mongoose.model("Request", requestSchema)
const Match = mongoose.model("Match", matchSchema)
const History = mongoose.model("History", historySchema)

// JWT Secret
const JWT_SECRET = process.env.JWT_SECRET || "your-secret-key-change-this"

// Middleware to check database connection
const checkDBConnection = (req, res, next) => {
  if (mongoose.connection.readyState !== 1) {
    return res.status(503).json({
      message: "Database connection unavailable. Please check MongoDB service.",
      dbStatus: "disconnected",
    })
  }
  next()
}

// Middleware to verify JWT token
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers["authorization"]
  const token = authHeader && authHeader.split(" ")[1]

  if (!token) {
    return res.status(401).json({ message: "Access token required" })
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Invalid token" })
    }
    req.user = user
    next()
  })
}

// Blood compatibility logic
const getCompatibleBloodGroups = (requestedBloodGroup) => {
  const compatibility = {
    "A+": ["A+", "A-", "O+", "O-"],
    "A-": ["A-", "O-"],
    "B+": ["B+", "B-", "O+", "O-"],
    "B-": ["B-", "O-"],
    "AB+": ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
    "AB-": ["A-", "B-", "AB-", "O-"],
    "O+": ["O+", "O-"],
    "O-": ["O-"],
  }
  return compatibility[requestedBloodGroup] || []
}

// Create default admin user
const createDefaultAdmin = async () => {
  try {
    if (mongoose.connection.readyState !== 1) {
      console.log("⏳ Waiting for database connection to create admin user...")
      return
    }

    const adminExists = await User.findOne({ username: "admin" })
    if (!adminExists) {
      const hashedPassword = await bcrypt.hash("admin123", 12)
      const admin = new User({
        username: "admin",
        email: "admin@blooddonation.com",
        password: hashedPassword,
        role: "admin",
        bloodGroup: "O+",
      })
      await admin.save()
      console.log("✅ Default admin user created - Username: admin, Password: admin123")
    } else {
      console.log("ℹ️  Admin user already exists")
    }
  } catch (error) {
    console.error("❌ Error creating default admin:", error.message)
  }
}

// Initialize default admin when DB connects
mongoose.connection.on("connected", () => {
  console.log("🔗 Mongoose connected to MongoDB")
  createDefaultAdmin()
})

mongoose.connection.on("error", (err) => {
  console.error("❌ Mongoose connection error:", err.message)
})

mongoose.connection.on("disconnected", () => {
  console.log("🔌 Mongoose disconnected from MongoDB")
})

// Validation middleware
const validateSignup = (req, res, next) => {
  const { username, email, password, bloodGroup } = req.body

  if (!username || !email || !password || !bloodGroup) {
    return res.status(400).json({ message: "Username, email, password, and blood group are required" })
  }

  if (username.trim().length < 3) {
    return res.status(400).json({ message: "Username must be at least 3 characters long" })
  }

  if (password.length < 6) {
    return res.status(400).json({ message: "Password must be at least 6 characters long" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    return res.status(400).json({ message: "Please enter a valid email address" })
  }

  if (!["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)) {
    return res.status(400).json({ message: "Invalid blood group" })
  }

  next()
}

// Auth Routes
app.post("/api/auth/signup", checkDBConnection, validateSignup, async (req, res) => {
  try {
    const { username, email, password, bloodGroup } = req.body

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
    })

    if (existingUser) {
      return res.status(400).json({
        message: existingUser.username === username.trim() ? "Username already exists" : "Email already exists",
      })
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user without role initially
    const user = new User({
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      bloodGroup,
      role: null, // User will select role after signup
    })

    await user.save()

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    })

    res.status(201).json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        bloodGroup: user.bloodGroup,
        isAvailable: user.isAvailable,
        matchStatus: user.matchStatus,
        isDonor: user.isDonor,
        isRequester: user.isRequester,
      },
    })
  } catch (error) {
    console.error("Signup error:", error)
    if (error.code === 11000) {
      return res.status(400).json({ message: "Username or email already exists" })
    }
    res.status(500).json({ message: "Server error during signup" })
  }
})

app.post("/api/auth/login", checkDBConnection, async (req, res) => {
  try {
    const { username, password } = req.body

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" })
    }

    // Find user
    const user = await User.findOne({ username: username.trim() })
    if (!user) {
      return res.status(400).json({ message: "Invalid username or password" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid username or password" })
    }

    // Generate JWT token
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        bloodGroup: user.bloodGroup,
        isAvailable: user.isAvailable,
        matchStatus: user.matchStatus,
        isDonor: user.isDonor,
        isRequester: user.isRequester,
      },
    })
  } catch (error) {
    console.error("Login error:", error)
    res.status(500).json({ message: "Server error during login" })
  }
})

app.get("/api/auth/profile", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId).select("-password")
    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    res.json({
      id: user._id,
      username: user.username,
      email: user.email,
      role: user.role,
      bloodGroup: user.bloodGroup,
      isAvailable: user.isAvailable,
      matchStatus: user.matchStatus,
      isDonor: user.isDonor,
      isRequester: user.isRequester,
    })
  } catch (error) {
    console.error("Profile error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// New route to update user role
app.put("/api/auth/update-role", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    const { role, bloodGroup } = req.body

    if (!role || !["donor", "requester"].includes(role)) {
      return res.status(400).json({ message: "Valid role (donor or requester) is required" })
    }

    const updateData = { role }

    if (bloodGroup && ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)) {
      updateData.bloodGroup = bloodGroup
    }

    // Update role-specific flags
    if (role === "donor") {
      updateData.isDonor = true
    } else if (role === "requester") {
      updateData.isRequester = true
    }

    const user = await User.findByIdAndUpdate(req.user.userId, updateData, { new: true }).select("-password")

    if (!user) {
      return res.status(404).json({ message: "User not found" })
    }

    // Generate new token with updated role
    const token = jwt.sign({ userId: user._id, username: user.username, role: user.role }, JWT_SECRET, {
      expiresIn: "24h",
    })

    res.json({
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        role: user.role,
        bloodGroup: user.bloodGroup,
        isAvailable: user.isAvailable,
        matchStatus: user.matchStatus,
        isDonor: user.isDonor,
        isRequester: user.isRequester,
      },
    })
  } catch (error) {
    console.error("Update role error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Donor Routes
app.put("/api/donor/availability", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can update availability" })
    }

    const { isAvailable } = req.body

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be a boolean" })
    }

    await User.findByIdAndUpdate(req.user.userId, { isAvailable })

    res.json({ message: "Availability updated successfully" })
  } catch (error) {
    console.error("Update availability error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/donor/history", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view donation history" })
    }

    const history = await History.find({ donor: req.user.userId }).sort({ date: -1 })

    res.json(history)
  } catch (error) {
    console.error("Get history error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Requester Routes
app.post("/api/requester/request", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "requester") {
      return res.status(403).json({ message: "Only requesters can create blood requests" })
    }

    const { bloodGroup, urgency, description } = req.body

    if (!bloodGroup || !urgency) {
      return res.status(400).json({ message: "Blood group and urgency are required" })
    }

    if (!["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)) {
      return res.status(400).json({ message: "Invalid blood group" })
    }

    if (!["low", "medium", "high", "critical"].includes(urgency)) {
      return res.status(400).json({ message: "Invalid urgency level" })
    }

    const user = await User.findById(req.user.userId)

    const request = new Request({
      requester: req.user.userId,
      requesterName: user.username,
      bloodGroup,
      urgency,
      description: description?.trim() || "",
    })

    await request.save()

    res.status(201).json({ message: "Request created successfully" })
  } catch (error) {
    console.error("Create request error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/requester/requests", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "requester") {
      return res.status(403).json({ message: "Only requesters can view their requests" })
    }

    const requests = await Request.find({ requester: req.user.userId }).sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get requests error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin Routes
app.get("/api/admin/donors", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const donors = await User.find({ role: "donor" }).select("-password").sort({ createdAt: -1 })
    res.json(donors)
  } catch (error) {
    console.error("Get donors error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/admin/requests", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const requests = await Request.find().sort({ createdAt: -1 })
    res.json(requests)
  } catch (error) {
    console.error("Get requests error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.get("/api/admin/matches", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const matches = await Match.find().sort({ createdAt: -1 })
    res.json(matches)
  } catch (error) {
    console.error("Get matches error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.post("/api/admin/create-matches", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    // Get all pending requests
    const pendingRequests = await Request.find({ status: "Pending" })

    let matchesCreated = 0

    for (const request of pendingRequests) {
      // Find compatible donors
      const compatibleBloodGroups = getCompatibleBloodGroups(request.bloodGroup)

      const availableDonors = await User.find({
        role: "donor",
        bloodGroup: { $in: compatibleBloodGroups },
        isAvailable: true,
        matchStatus: "Available",
      })

      // Create matches for available donors
      for (const donor of availableDonors) {
        // Check if match already exists
        const existingMatch = await Match.findOne({
          donor: donor._id,
          request: request._id,
        })

        if (!existingMatch) {
          const match = new Match({
            donor: donor._id,
            requester: request.requester,
            request: request._id,
            donorName: donor.username,
            requesterName: request.requesterName,
            bloodGroup: request.bloodGroup,
          })

          await match.save()
          matchesCreated++
        }
      }
    }

    res.json({ message: `${matchesCreated} matches created successfully` })
  } catch (error) {
    console.error("Create matches error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

app.put("/api/admin/matches/:matchId/accept", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const { matchId } = req.params

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" })
    }

    // Update match status
    const match = await Match.findByIdAndUpdate(matchId, { status: "Accepted" }, { new: true })

    if (!match) {
      return res.status(404).json({ message: "Match not found" })
    }

    // Update user statuses
    await User.findByIdAndUpdate(match.donor, {
      matchStatus: "Blood group matched",
    })

    await User.findByIdAndUpdate(match.requester, {
      matchStatus: "Blood group matched",
    })

    // Update request status
    await Request.findByIdAndUpdate(match.request, {
      status: "Matched",
    })

    // Create history record
    const history = new History({
      donor: match.donor,
      requester: match.requester,
      donorName: match.donorName,
      requesterName: match.requesterName,
      bloodGroup: match.bloodGroup,
      status: "Matched",
    })

    await history.save()

    res.json({ message: "Match accepted successfully" })
  } catch (error) {
    console.error("Accept match error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Health check endpoint
app.get("/api/health", (req, res) => {
  const dbStatus = mongoose.connection.readyState
  const dbStatusText = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting",
  }

  res.json({
    status: "OK",
    message: "Blood Donation API is running",
    timestamp: new Date().toISOString(),
    mongodb: dbStatusText[dbStatus] || "unknown",
    dbReadyState: dbStatus,
    environment: process.env.NODE_ENV || "development",
  })
})

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack)
  res.status(500).json({ message: "Something went wrong!" })
})

// 404 handler
app.use("*", (req, res) => {
  res.status(404).json({ message: "Route not found" })
})

const PORT = process.env.PORT || 5000

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`)
  console.log(`🔍 Health check: http://localhost:${PORT}/api/health`)
  console.log(`🌐 API Base URL: http://localhost:${PORT}/api`)
  console.log(`📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? "✅ Connected" : "❌ Disconnected"}`)
})

module.exports = app
