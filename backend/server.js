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

// User Schema
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
    default: undefined,
    required: false,
    validate: {
      validator: (v) => {
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
  matchedWith: { type: mongoose.Schema.Types.ObjectId, ref: "User" }, // Track which donor matched
  matchedAt: { type: Date }, // When the match was confirmed
  createdAt: { type: Date, default: Date.now },
})

// Enhanced Match Schema for Peer-to-Peer System
const matchSchema = new mongoose.Schema({
  donor: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  request: { type: mongoose.Schema.Types.ObjectId, ref: "Request", required: true },
  donorName: { type: String, required: true },
  requesterName: { type: String, required: true },
  bloodGroup: { type: String, required: true },

  // Enhanced status tracking
  status: {
    type: String,
    default: "pending",
    enum: [
      "pending",
      "donor_accepted",
      "requester_accepted",
      "both_accepted",
      "donor_rejected",
      "requester_rejected",
      "expired",
    ],
  },

  // Individual responses
  donorResponse: { type: String, default: "pending", enum: ["pending", "accepted", "rejected"] },
  requesterResponse: { type: String, default: "pending", enum: ["pending", "accepted", "rejected"] },

  // Timing
  expiresAt: { type: Date, required: true },
  createdAt: { type: Date, default: Date.now },
  donorRespondedAt: { type: Date },
  requesterRespondedAt: { type: Date },

  // Contact information (only populated when both accept)
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
})

// Notification Schema
const notificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  type: { type: String, required: true }, // 'match_request', 'match_accepted', 'match_rejected', 'reminder'
  title: { type: String, required: true },
  message: { type: String, required: true },
  data: { type: mongoose.Schema.Types.Mixed }, // Additional data like match info
  read: { type: Boolean, default: false },
  matchId: { type: mongoose.Schema.Types.ObjectId, ref: "Match" }, // Reference to match
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
const createNotification = async (userId, type, title, message, data = {}, matchId = null) => {
  try {
    const notification = new Notification({
      userId,
      type,
      title,
      message,
      data,
      matchId,
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

// AUTOMATIC MATCH DETECTION SYSTEM
const findAndCreateMatches = async (requestId = null, donorId = null) => {
  try {
    console.log("🔍 Finding automatic matches...")

    let requests = []
    let donors = []

    if (requestId) {
      // New request created - find compatible donors
      const request = await Request.findById(requestId).populate("requester")
      if (request && request.status === "Pending") {
        requests = [request]
        const compatibleBloodGroups = getCompatibleBloodGroups(request.bloodGroup)
        donors = await User.find({
          role: "donor",
          bloodGroup: { $in: compatibleBloodGroups },
          isAvailable: true,
          matchStatus: "Available",
        })
      }
    } else if (donorId) {
      // Donor became available - find compatible requests
      const donor = await User.findById(donorId)
      if (donor && donor.isAvailable && donor.matchStatus === "Available") {
        donors = [donor]
        requests = await Request.find({
          status: "Pending",
          bloodGroup: { $in: getCompatibleBloodGroups(donor.bloodGroup) },
        }).populate("requester")
      }
    } else {
      // General match finding
      requests = await Request.find({ status: "Pending" }).populate("requester")
      donors = await User.find({
        role: "donor",
        isAvailable: true,
        matchStatus: "Available",
      })
    }

    let matchesCreated = 0

    for (const request of requests) {
      const compatibleBloodGroups = getCompatibleBloodGroups(request.bloodGroup)
      const compatibleDonors = donors.filter((donor) => compatibleBloodGroups.includes(donor.bloodGroup))

      for (const donor of compatibleDonors) {
        // Check if match already exists
        const existingMatch = await Match.findOne({
          donor: donor._id,
          request: request._id,
          status: { $in: ["pending", "donor_accepted", "requester_accepted", "both_accepted"] },
        })

        if (!existingMatch) {
          // Create new match with 12-hour expiry
          const expiresAt = new Date(Date.now() + 12 * 60 * 60 * 1000) // 12 hours from now

          const match = new Match({
            donor: donor._id,
            requester: request.requester._id,
            request: request._id,
            donorName: donor.username,
            requesterName: request.requesterName,
            bloodGroup: request.bloodGroup,
            expiresAt: expiresAt,
          })

          await match.save()
          matchesCreated++

          // Send notifications to both parties
          await createNotification(
            donor._id,
            "match_request",
            "New Blood Donation Request",
            `${request.requesterName} needs ${request.bloodGroup} blood (${request.urgency} urgency). Would you like to help?`,
            {
              matchId: match._id,
              requesterName: request.requesterName,
              bloodGroup: request.bloodGroup,
              urgency: request.urgency,
              description: request.description,
              expiresAt: expiresAt,
            },
            match._id,
          )

          await createNotification(
            request.requester._id,
            "match_request",
            "Potential Donor Found",
            `${donor.username} (${donor.bloodGroup}) might be able to help with your blood request. Waiting for their response.`,
            {
              matchId: match._id,
              donorName: donor.username,
              donorBloodGroup: donor.bloodGroup,
              expiresAt: expiresAt,
            },
            match._id,
          )

          console.log(`✅ Created match: ${donor.username} ↔ ${request.requesterName}`)
        }
      }
    }

    console.log(`🎉 Created ${matchesCreated} new matches`)
    return matchesCreated
  } catch (error) {
    console.error("Error in automatic match detection:", error)
    return 0
  }
}

// ENHANCED MATCH RESPONSE SYSTEM
const processMatchResponse = async (matchId, userId, response) => {
  try {
    const match = await Match.findById(matchId)
      .populate("donor", "username email phone location bloodGroup")
      .populate("requester", "username email phone location")
      .populate("request", "urgency description")

    if (!match || match.status === "expired" || match.status === "both_accepted") {
      return { success: false, message: "Match not found or already processed" }
    }

    // Check if match has expired
    if (new Date() > match.expiresAt) {
      await Match.findByIdAndUpdate(matchId, { status: "expired" })
      return { success: false, message: "Match has expired" }
    }

    const isDonor = match.donor._id.toString() === userId
    const isRequester = match.requester._id.toString() === userId

    if (!isDonor && !isRequester) {
      return { success: false, message: "Unauthorized to respond to this match" }
    }

    // Update the response
    const updateData = {}
    if (isDonor) {
      updateData.donorResponse = response
      updateData.donorRespondedAt = new Date()
      if (response === "accepted") {
        updateData.status = match.requesterResponse === "accepted" ? "both_accepted" : "donor_accepted"
      } else {
        updateData.status = "donor_rejected"
      }
    } else {
      updateData.requesterResponse = response
      updateData.requesterRespondedAt = new Date()
      if (response === "accepted") {
        updateData.status = match.donorResponse === "accepted" ? "both_accepted" : "requester_accepted"
      } else {
        updateData.status = "requester_rejected"
      }
    }

    const updatedMatch = await Match.findByIdAndUpdate(matchId, updateData, { new: true })

    // If either party rejected, notify the other party
    if (response === "rejected") {
      const otherUserId = isDonor ? match.requester._id : match.donor._id
      const otherUserName = isDonor ? match.requesterName : match.donorName
      const currentUserName = isDonor ? match.donorName : match.requesterName

      await createNotification(
        otherUserId,
        "match_rejected",
        "Match Request Declined",
        `${currentUserName} has declined the blood donation match.`,
        { matchId: match._id },
        match._id,
      )
    }

    // If both accepted, exchange contact information and update statuses
    if (updatedMatch.status === "both_accepted") {
      // Update match with contact information
      await Match.findByIdAndUpdate(matchId, {
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
      })

      // Update user statuses - Remove from available lists
      await User.findByIdAndUpdate(match.donor._id, {
        isAvailable: false,
        matchStatus: "Matched",
      })

      await User.findByIdAndUpdate(match.requester._id, {
        matchStatus: "Matched",
      })

      // 🔥 ENHANCED: Update request status and track the match
      await Request.findByIdAndUpdate(match.request._id, {
        status: "Matched",
        matchedWith: match.donor._id,
        matchedAt: new Date(),
      })

      // 🔥 ENHANCED: Cancel all other pending matches for this request
      const otherMatches = await Match.find({
        request: match.request._id,
        _id: { $ne: matchId },
        status: { $in: ["pending", "donor_accepted", "requester_accepted"] },
      }).populate("donor requester")

      for (const otherMatch of otherMatches) {
        await Match.findByIdAndUpdate(otherMatch._id, { status: "expired" })

        // Notify other donors that the request is no longer available
        await createNotification(
          otherMatch.donor._id,
          "request_fulfilled",
          "Blood Request Fulfilled",
          `The blood request from ${otherMatch.requesterName} has been fulfilled by another donor.`,
          { matchId: otherMatch._id },
          otherMatch._id,
        )
      }

      // Send success notifications with contact information
      await createNotification(
        match.donor._id,
        "match_accepted",
        "Blood Match Confirmed! 🩸",
        `Both you and ${match.requesterName} have accepted the match. Contact details have been shared.`,
        {
          matchId: match._id,
          requesterInfo: {
            email: match.requester.email,
            phone: match.requester.phone || "Not provided",
            location: match.requester.location || "Not provided",
            urgency: match.request.urgency,
            description: match.request.description || "No additional details",
          },
          bloodGroup: match.bloodGroup,
        },
        match._id,
      )

      await createNotification(
        match.requester._id,
        "match_accepted",
        "Donor Found! 🎉",
        `Both you and ${match.donorName} have accepted the match. Contact details have been shared. Your request has been fulfilled!`,
        {
          matchId: match._id,
          donorInfo: {
            email: match.donor.email,
            phone: match.donor.phone || "Not provided",
            location: match.donor.location || "Not provided",
          },
          bloodGroup: match.bloodGroup,
        },
        match._id,
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

      console.log(`🎉 Successful match: ${match.donorName} ↔ ${match.requesterName}`)
      console.log(`📋 Request ${match.request._id} marked as Matched and removed from active lists`)
    }

    return { success: true, message: "Response recorded successfully", match: updatedMatch }
  } catch (error) {
    console.error("Error processing match response:", error)
    return { success: false, message: "Server error" }
  }
}

// BACKGROUND JOBS
// Reminder notifications every 4 hours
const sendReminderNotifications = async () => {
  try {
    const now = new Date()
    const fourHoursAgo = new Date(now.getTime() - 4 * 60 * 60 * 1000)

    const pendingMatches = await Match.find({
      status: { $in: ["pending", "donor_accepted", "requester_accepted"] },
      expiresAt: { $gt: now },
      createdAt: { $lte: fourHoursAgo },
    }).populate("donor requester request")

    for (const match of pendingMatches) {
      const timeRemaining = Math.ceil((match.expiresAt - now) / (1000 * 60 * 60)) // hours

      if (match.donorResponse === "pending") {
        await createNotification(
          match.donor._id,
          "reminder",
          "Reminder: Blood Donation Request",
          `${match.requesterName} is still waiting for your response. ${timeRemaining} hours remaining.`,
          {
            matchId: match._id,
            timeRemaining: timeRemaining,
            requesterName: match.requesterName,
            bloodGroup: match.bloodGroup,
            urgency: match.request.urgency,
          },
          match._id,
        )
      }

      if (match.requesterResponse === "pending") {
        await createNotification(
          match.requester._id,
          "reminder",
          "Reminder: Donor Response Pending",
          `${match.donorName} is considering your blood request. ${timeRemaining} hours remaining.`,
          {
            matchId: match._id,
            timeRemaining: timeRemaining,
            donorName: match.donorName,
          },
          match._id,
        )
      }
    }

    console.log(`📢 Sent reminder notifications for ${pendingMatches.length} matches`)
  } catch (error) {
    console.error("Error sending reminder notifications:", error)
  }
}

// Expire old matches
const expireOldMatches = async () => {
  try {
    const now = new Date()
    const expiredMatches = await Match.find({
      status: { $in: ["pending", "donor_accepted", "requester_accepted"] },
      expiresAt: { $lte: now },
    })

    for (const match of expiredMatches) {
      await Match.findByIdAndUpdate(match._id, { status: "expired" })

      // Notify both parties about expiration
      await createNotification(
        match.donor,
        "match_expired",
        "Match Request Expired",
        `The match request with ${match.requesterName} has expired.`,
        { matchId: match._id },
        match._id,
      )

      await createNotification(
        match.requester,
        "match_expired",
        "Match Request Expired",
        `The match request with ${match.donorName} has expired.`,
        { matchId: match._id },
        match._id,
      )
    }

    console.log(`⏰ Expired ${expiredMatches.length} old matches`)
  } catch (error) {
    console.error("Error expiring old matches:", error)
  }
}

// Run background jobs every 4 hours
setInterval(
  () => {
    sendReminderNotifications()
    expireOldMatches()
  },
  4 * 60 * 60 * 1000,
) // 4 hours

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

    // Update donor availability and reset match status when becoming available
    const updateData = {
      isAvailable,
      matchStatus: isAvailable ? "Available" : "Unavailable",
    }

    await User.findByIdAndUpdate(req.user.userId, updateData)

    // If donor becomes available, trigger automatic match detection
    if (isAvailable) {
      console.log("✅ Donor became available, triggering match detection...")
      await findAndCreateMatches(null, req.user.userId)
    }

    res.json({
      message: "Availability updated successfully",
      status: isAvailable
        ? "You are now available for new blood donation matches"
        : "You are now unavailable for blood donation",
    })
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

    const savedRequest = await request.save()

    // Trigger automatic match detection for this new request
    console.log("🩸 New request created, triggering match detection...")
    await findAndCreateMatches(savedRequest._id)

    res.status(201).json({
      message: "Request created successfully. Looking for compatible donors...",
      requestId: savedRequest._id,
    })
  } catch (error) {
    console.error("Create request error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// 🔥 ENHANCED: Get requester requests - only show Pending and Cancelled, hide Matched
app.get("/api/requester/requests", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "requester") {
      return res.status(403).json({ message: "Only requesters can view their requests" })
    }

    // Only show Pending and Cancelled requests (hide Matched ones from active list)
    const requests = await Request.find({
      requester: req.user.userId,
      status: { $in: ["Pending", "Cancelled"] },
    }).sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get requests error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// 🔥 NEW: Get requester's matched requests (for records/history)
app.get("/api/requester/matched-requests", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "requester") {
      return res.status(403).json({ message: "Only requesters can view their matched requests" })
    }

    // Get matched requests with donor information
    const matchedRequests = await Request.find({
      requester: req.user.userId,
      status: "Matched",
    })
      .populate("matchedWith", "username email bloodGroup")
      .sort({ matchedAt: -1 })

    res.json(matchedRequests)
  } catch (error) {
    console.error("Get matched requests error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// 🔥 ENHANCED: Cancel blood request - only allow for Pending requests
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

    // 🔥 ENHANCED: Don't allow cancelling matched requests
    if (request.status === "Matched") {
      return res.status(400).json({
        message: "Cannot cancel a matched request. Contact the donor directly if needed.",
      })
    }

    // Update request status
    await Request.findByIdAndUpdate(requestId, { status: "Cancelled" })

    // Find and cancel any pending matches for this request
    const pendingMatches = await Match.find({
      request: requestId,
      status: { $in: ["pending", "donor_accepted", "requester_accepted"] },
    }).populate("donor")

    for (const match of pendingMatches) {
      // Cancel the match
      await Match.findByIdAndUpdate(match._id, { status: "requester_rejected" })

      // Notify the donor
      await createNotification(
        match.donor._id,
        "request_cancelled",
        "Blood Request Cancelled",
        `${match.requesterName} has cancelled their ${match.bloodGroup} blood request.`,
        { matchId: match._id, requesterName: match.requesterName },
        match._id,
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

// NEW PEER-TO-PEER MATCH ROUTES

// Get pending match requests for user
app.get("/api/matches/pending", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    const userId = req.user.userId
    const userRole = req.user.role

    let matches = []

    if (userRole === "donor") {
      matches = await Match.find({
        donor: userId,
        status: { $in: ["pending", "requester_accepted"] },
        expiresAt: { $gt: new Date() },
      })
        .populate("requester", "username email")
        .populate("request", "urgency description")
        .sort({ createdAt: -1 })
    } else if (userRole === "requester") {
      matches = await Match.find({
        requester: userId,
        status: { $in: ["pending", "donor_accepted"] },
        expiresAt: { $gt: new Date() },
      })
        .populate("donor", "username email bloodGroup")
        .sort({ createdAt: -1 })
    }

    res.json(matches)
  } catch (error) {
    console.error("Get pending matches error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Get active (successful) matches for user
app.get("/api/matches/active", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    const userId = req.user.userId
    const userRole = req.user.role

    const matches = await Match.find({
      $or: [{ donor: userId }, { requester: userId }],
      status: "both_accepted",
    })
      .populate("donor", "username email bloodGroup phone location")
      .populate("requester", "username email phone location")
      .populate("request", "urgency description")
      .sort({ createdAt: -1 })

    res.json(matches)
  } catch (error) {
    console.error("Get active matches error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Respond to match request
app.post("/api/matches/:matchId/respond", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    const { matchId } = req.params
    const { response } = req.body
    const userId = req.user.userId

    if (!["accepted", "rejected"].includes(response)) {
      return res.status(400).json({ message: "Response must be 'accepted' or 'rejected'" })
    }

    if (!mongoose.Types.ObjectId.isValid(matchId)) {
      return res.status(400).json({ message: "Invalid match ID" })
    }

    const result = await processMatchResponse(matchId, userId, response)

    if (result.success) {
      res.json({ message: result.message, match: result.match })
    } else {
      res.status(400).json({ message: result.message })
    }
  } catch (error) {
    console.error("Match response error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// ENHANCED Admin Routes
app.get("/api/admin/donors", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    // Show all donors with their current status
    const donors = await User.find({
      role: "donor",
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

    // Show all requests
    const requests = await Request.find({}).sort({ createdAt: -1 })

    res.json(requests)
  } catch (error) {
    console.error("Get requests error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin view of all matches
app.get("/api/admin/matches", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const matches = await Match.find({})
      .populate("donor", "username email bloodGroup")
      .populate("requester", "username email")
      .populate("request", "urgency description")
      .sort({ createdAt: -1 })

    res.json(matches)
  } catch (error) {
    console.error("Get matches error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Admin statistics
app.get("/api/admin/stats", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const stats = {
      totalUsers: await User.countDocuments(),
      totalDonors: await User.countDocuments({ role: "donor" }),
      totalRequesters: await User.countDocuments({ role: "requester" }),
      availableDonors: await User.countDocuments({ role: "donor", isAvailable: true, matchStatus: "Available" }),
      totalRequests: await Request.countDocuments(),
      pendingRequests: await Request.countDocuments({ status: "Pending" }),
      matchedRequests: await Request.countDocuments({ status: "Matched" }),
      totalMatches: await Match.countDocuments(),
      pendingMatches: await Match.countDocuments({
        status: { $in: ["pending", "donor_accepted", "requester_accepted"] },
      }),
      successfulMatches: await Match.countDocuments({ status: "both_accepted" }),
      expiredMatches: await Match.countDocuments({ status: "expired" }),
      rejectedMatches: await Match.countDocuments({ status: { $in: ["donor_rejected", "requester_rejected"] } }),
    }

    res.json(stats)
  } catch (error) {
    console.error("Get stats error:", error)
    res.status(500).json({ message: "Server error" })
  }
})

// Manual trigger for match detection (admin only)
app.post("/api/admin/trigger-matches", authenticateToken, checkDBConnection, async (req, res) => {
  try {
    if (req.user.role !== "admin") {
      return res.status(403).json({ message: "Admin access required" })
    }

    const matchesCreated = await findAndCreateMatches()
    res.json({ message: `${matchesCreated} matches created successfully` })
  } catch (error) {
    console.error("Trigger matches error:", error)
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
