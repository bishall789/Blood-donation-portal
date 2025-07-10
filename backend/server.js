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
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 45000,
  }

  // Try different MongoDB connection strings
  const connectionStrings = [
    process.env.MONGODB_URI,
    "mongodb://127.0.0.1:27017/blooddonation",
    "mongodb://localhost:27017/blooddonation",
    "mongodb://0.0.0.0:27017/blooddonation",
  ].filter(Boolean)

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
  process.exit(1)
}

// Connect to MongoDB
connectDB()

// User Schema - COMPLETELY FIXED to handle null roles properly
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  email: {
    type: String,
    required: true,
    unique: true,
    trim: true,
    lowercase: true,
  },
  password: {
    type: String,
    required: true,
    minlength: 6,
  },
  role: {
    type: String,
    enum: {
      values: ["donor", "requester", "admin"],
      message: "{VALUE} is not a valid role",
    },
    default: undefined, // Use undefined instead of null
    required: false,
    validate: {
      validator: (v) => {
        // Allow undefined, null, or valid enum values
        return v === undefined || v === null || ["donor", "requester", "admin"].includes(v)
      },
      message: "Role must be donor, requester, admin, or empty",
    },
  },
  bloodGroup: {
    type: String,
    required: true,
    enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"],
  },
  isAvailable: {
    type: Boolean,
    default: true,
  },
  matchStatus: {
    type: String,
    default: "Available",
  },
  isDonor: {
    type: Boolean,
    default: false,
  },
  isRequester: {
    type: Boolean,
    default: false,
  },
  // Contact information for matching
  phone: {
    type: String,
    trim: true,
  },
  location: {
    type: String,
    trim: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
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

// Match Schema - Enhanced with contact information
const matchSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },
  donorName: { type: String, required: true },
  requesterName: { type: String, required: true },
  bloodGroup: { type: String, required: true },
  status: { type: String, default: "Pending", enum: ["Pending", "Accepted", "Rejected", "Completed", "Cancelled"] },
  // Contact information shared after match acceptance
  donorInfo: {
    email: String,
    phone: String,
    location: String,
  },
  requesterInfo: {
    email: String,
    phone: String,
    location: String,
    urgency: String,
    description: String,
  },
  createdAt: { type: Date, default: Date.now },
})

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true }, // 'match_found', 'request_cancelled', 'donor_unavailable'
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // Additional data like contact info
  read: { type: Boolean, default: false },
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
const Notification = mongoose.model("Notification", notificationSchema)
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

// Helper function to create notifications
const createNotification = async (userId, type, title, message, data = {}) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
    })
    await notification.save()
    console.log(`📢 Notification created for user ${userId}: ${title}`)
  } catch (error) {
    console.error("Error creating notification:", error)
  }
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

// Enhanced validation middleware
const validateSignup = (req, res, next) => {
  const { username, email, password, bloodGroup } = req.body

  console.log("📝 Signup validation - Received data:", {
    username,
    email,
    bloodGroup,
    passwordLength: password?.length,
  })

  if (!username || !email || !password || !bloodGroup) {
    console.log("❌ Validation failed: Missing required fields")
    return res.status(400).json({ message: "Username, email, password, and blood group are required" })
  }

  if (username.trim().length < 3) {
    console.log("❌ Validation failed: Username too short")
    return res.status(400).json({ message: "Username must be at least 3 characters long" })
  }

  if (password.length < 6) {
    console.log("❌ Validation failed: Password too short")
    return res.status(400).json({ message: "Password must be at least 6 characters long" })
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!emailRegex.test(email)) {
    console.log("❌ Validation failed: Invalid email format")
    return res.status(400).json({ message: "Please enter a valid email address" })
  }

  if (!["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].includes(bloodGroup)) {
    console.log("❌ Validation failed: Invalid blood group")
    return res.status(400).json({ message: "Invalid blood group" })
  }

  console.log("✅ Validation passed")
  next()
}

// Auth Routes
app.post("/api/auth/signup", checkDBConnection, validateSignup, async (req, res) => {
  try {
    const { username, email, password, bloodGroup } = req.body

    console.log("🔐 Processing signup for:", { username, email, bloodGroup })

    // Check if user already exists
    const existingUser = await User.findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }],
    })

    if (existingUser) {
      const message = existingUser.username === username.trim() ? "Username already exists" : "Email already exists"
      console.log("❌ Signup failed:", message)
      return res.status(400).json({ message })
    }

    // Hash password
    console.log("🔒 Hashing password...")
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user data WITHOUT role field (let it be undefined)
    const userData = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashedPassword,
      bloodGroup,
      // Explicitly NOT setting role - it will be undefined
    }

    console.log("💾 Creating user in database...")
    const user = new User(userData)

    // Save user
    const savedUser = await user.save()
    console.log("✅ User created successfully:", savedUser._id)

    // Generate JWT token
    const token = jwt.sign(
      {
        userId: savedUser._id,
        username: savedUser.username,
        role: savedUser.role || null,
      },
      JWT_SECRET,
      { expiresIn: "24h" },
    )

    const responseUser = {
      id: savedUser._id,
      username: savedUser.username,
      email: savedUser.email,
      role: savedUser.role || null,
      bloodGroup: savedUser.bloodGroup,
      isAvailable: savedUser.isAvailable,
      matchStatus: savedUser.matchStatus,
      isDonor: savedUser.isDonor,
      isRequester: savedUser.isRequester,
    }

    console.log("🎉 Signup successful, sending response")
    res.status(201).json({
      token,
      user: responseUser,
    })
  } catch (error) {
    console.error("💥 Signup error:", error)

    if (error.code === 11000) {
      // Duplicate key error
      const field = Object.keys(error.keyPattern)[0]
      const message = `${field.charAt(0).toUpperCase() + field.slice(1)} already exists`
      return res.status(400).json({ message })
    }

    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((err) => err.message)
      console.log("❌ Validation error details:", messages)
      return res.status(400).json({ message: messages.join(", ") })
    }

    res.status(500).json({ message: "Server error during signup. Please try again." })
  }
})

app.post("/api/auth/login", checkDBConnection, async (req, res) => {
  try {
    const { username, password } = req.body

    console.log("🔑 Login attempt for:", username)

    if (!username || !password) {
      return res.status(400).json({ message: "Username and password are required" })
    }

    // Find user
    const user = await User.findOne({ username: username.trim() })
    if (!user) {
      console.log("❌ Login failed: User not found")
      return res.status(400).json({ message: "Invalid username or password" })
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      console.log("❌ Login failed: Invalid password")
      return res.status(400).json({ message: "Invalid username or password" })
    }

    console.log("✅ Login successful for:", username)

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
        role: user.role || null,
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
      role: user.role || null,
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

    console.log("🔄 Updating role for user:", req.user.userId, "to:", role)

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

    console.log("✅ Role updated successfully for:", user.username)

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

// Test route to check database operations
app.get("/api/test/db", checkDBConnection, async (req, res) => {
  try {
    const userCount = await User.countDocuments()
    const requestCount = await Request.countDocuments()
    const matchCount = await Match.countDocuments()

    res.json({
      message: "Database test successful",
      collections: {
        users: userCount,
        requests: requestCount,
        matches: matchCount,
      },
      timestamp: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Database test error:", error)
    res.status(500).json({ message: "Database test failed", error: error.message })
  }
})

// ENHANCED Donor Routes
app.put("/api/donor/availability", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can update availability" })
    }

    const { isAvailable } = req.body

    if (typeof isAvailable !== "boolean") {
      return res.status(400).json({ message: "isAvailable must be a boolean" })
    }

    // Update donor availability
    const updateData = {
      isAvailable,
      matchStatus: isAvailable ? "Available" : "Unavailable",
    }

    await User.findByIdAndUpdate(req.user.userId, updateData)

    // If donor becomes unavailable, cancel any pending matches
    if (!isAvailable) {
      console.log("🚫 Donor became unavailable, cancelling pending matches...")

      const pendingMatches = await Match.find({
        donor: req.user.userId,
        status: "Pending",
      }).populate("requester")

      for (const match of pendingMatches) {
        // Cancel the match
        await Match.findByIdAndUpdate(match._id, { status: "Cancelled" })

        // Notify the requester
        await createNotification(
          match.requester._id,
          "donor_unavailable",
          "Donor Unavailable",
          `The donor ${match.donorName} is no longer available for your ${match.bloodGroup} blood request.`,
          { matchId: match._id, donorName: match.donorName },
        )
      }
    }

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

// Get donor notifications
app.get("/api/donor/notifications", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "donor") {
      return res.status(403).json({ message: "Only donors can view notifications" })
    }

    const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50)

    res.json(notifications)
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ENHANCED Requester Routes
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

    res.status(201).json({
      message: "Request created successfully",
      requestId: request._id,
    })
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

// NEW: Cancel blood request
app.put("/api/requester/requests/:requestId/cancel", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "requester") {
      return res.status(403).json({ message: "Only requesters can cancel their requests" })
    }

    const { requestId } = req.params

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: "Invalid request ID" })
    }

    // Find the request
    const request = await Request.findOne({
      _id: requestId,
      requester: req.user.userId,
    })

    if (!request) {
      return res.status(404).json({ message: "Request not found" })
    }

    if (request.status === "Cancelled") {
      return res.status(400).json({ message: "Request is already cancelled" })
    }

    // Update request status
    await Request.findByIdAndUpdate(requestId, { status: "Cancelled" })

    // Find and cancel any pending matches for this request
    const pendingMatches = await Match.find({
      request: requestId,
      status: { $in: ["Pending", "Accepted"] },
    }).populate("donor")

    for (const match of pendingMatches) {
      // Cancel the match
      await Match.findByIdAndUpdate(match._id, { status: "Cancelled" })

      // Reset donor availability if they were matched
      if (match.status === "Accepted") {
        await User.findByIdAndUpdate(match.donor._id, {
          isAvailable: true,
          matchStatus: "Available",
        })
      }

      // Notify the donor
      await createNotification(
        match.donor._id,
        "request_cancelled",
        "Blood Request Cancelled",
        `The requester ${match.requesterName} has cancelled their ${match.bloodGroup} blood request.`,
        { matchId: match._id, requesterName: match.requesterName },
      )
    }

    res.json({ message: "Request cancelled successfully" })
  } catch (error) {
    console.error("Cancel request error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get requester notifications
app.get("/api/requester/notifications", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "requester") {
      return res.status(403).json({ message: "Only requesters can view notifications" })
    }

    const notifications = await Notification.find({ userId: req.user.userId }).sort({ createdAt: -1 }).limit(50)

    res.json(notifications)
  } catch (error) {
    console.error("Get notifications error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ENHANCED Admin Routes
app.get("/api/admin/donors", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    // Only show available donors (not matched or unavailable)
    const donors = await User.find({
      role: "donor",
      isAvailable: true,
      matchStatus: { $in: ["Available"] },
    })
      .select("-password")
      .sort({ createdAt: -1 })

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

    // Only show pending requests (not cancelled or completed)
    const requests = await Request.find({
      status: { $in: ["Pending", "Matched"] },
    }).sort({ createdAt: -1 })

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
      // Find compatible donors (only available ones)
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

// ENHANCED: Accept match with information exchange
app.put("/api/admin/matches/:matchId/accept", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const { matchId } = req.params

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" })
    }

    // Get match with populated user data
    const match = await Match.findById(matchId)
      .populate("donor", "username email phone location bloodGroup")
      .populate("requester", "username email phone location")
      .populate("request", "urgency description")

    if (!match) {
      return res.status(404).json({ message: "Match not found" })
    }

    // Update match status and add contact information
    const updatedMatch = await Match.findByIdAndUpdate(
      matchId,
      {
        status: "Accepted",
        donorInfo: {
          email: match.donor.email,
          phone: match.donor.phone || "Not provided",
          location: match.donor.location || "Not provided",
        },
        requesterInfo: {
          email: match.requester.email,
          phone: match.requester.phone || "Not provided",
          location: match.requester.location || "Not provided",
          urgency: match.request.urgency,
          description: match.request.description || "No additional details",
        },
      },
      { new: true },
    )

    // Update donor status to matched/unavailable
    await User.findByIdAndUpdate(match.donor._id, {
      isAvailable: false,
      matchStatus: "Matched",
    })

    // Update requester status
    await User.findByIdAndUpdate(match.requester._id, {
      matchStatus: "Matched",
    })

    // Update request status
    await Request.findByIdAndUpdate(match.request._id, {
      status: "Matched",
    })

    // Create notifications with contact information for both parties
    await createNotification(
      match.donor._id,
      "match_accepted",
      "Blood Match Confirmed!",
      `Your blood donation has been matched with ${match.requesterName}. Contact details have been shared.`,
      {
        matchId: match._id,
        requesterInfo: updatedMatch.requesterInfo,
        bloodGroup: match.bloodGroup,
        urgency: match.request.urgency,
      },
    )

    await createNotification(
      match.requester._id,
      "match_accepted",
      "Donor Found!",
      `A donor ${match.donorName} has been found for your ${match.bloodGroup} blood request. Contact details have been shared.`,
      {
        matchId: match._id,
        donorInfo: updatedMatch.donorInfo,
        bloodGroup: match.bloodGroup,
      },
    )

    // Create history record
    const history = new History({
      donor: match.donor._id,
      requester: match.requester._id,
      donorName: match.donorName,
      requesterName: match.requesterName,
      bloodGroup: match.bloodGroup,
      status: "Matched",
    })

    await history.save()

    res.json({
      message: "Match accepted successfully. Contact information has been shared with both parties.",
      match: updatedMatch,
    })
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
  console.error("💥 Unhandled error:", err.stack)
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
  console.log(`🧪 Database test: http://localhost:${PORT}/api/test/db`)
  console.log(`📊 MongoDB Status: ${mongoose.connection.readyState === 1 ? "✅ Connected" : "❌ Disconnected"}`)
})

module.exports = app
