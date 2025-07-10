const mongoose = require("mongoose")
require("dotenv").config()

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

const createMatches = async () => {
  try {
    console.log("🔗 Creating blood donation matches...")

    // Connect to MongoDB
    const connectionStrings = [
      process.env.MONGODB_URI,
      "mongodb://127.0.0.1:27017/blooddonation",
      "mongodb://localhost:27017/blooddonation",
    ].filter(Boolean)

    let connected = false
    for (const connectionString of connectionStrings) {
      try {
        await mongoose.connect(connectionString, {
          useNewUrlParser: true,
          useUnifiedTopology: true,
        })
        console.log(`✅ Connected to: ${connectionString}`)
        connected = true
        break
      } catch (error) {
        console.log(`❌ Failed to connect to: ${connectionString}`)
        continue
      }
    }

    if (!connected) {
      console.error("🚨 Could not connect to MongoDB")
      process.exit(1)
    }

    // Define schemas
    const userSchema = new mongoose.Schema({
      username: String,
      email: String,
      password: String,
      role: String,
      bloodGroup: String,
      isAvailable: Boolean,
      matchStatus: String,
      isDonor: Boolean,
      isRequester: Boolean,
      createdAt: Date,
    })

    const requestSchema = new mongoose.Schema({
      requester: mongoose.Schema.Types.ObjectId,
      requesterName: String,
      bloodGroup: String,
      urgency: String,
      description: String,
      status: String,
      createdAt: Date,
    })

    const matchSchema = new mongoose.Schema({
      donor: mongoose.Schema.Types.ObjectId,
      requester: mongoose.Schema.Types.ObjectId,
      request: mongoose.Schema.Types.ObjectId,
      donorName: String,
      requesterName: String,
      bloodGroup: String,
      status: { type: String, default: "Pending" },
      createdAt: { type: Date, default: Date.now },
    })

    const User = mongoose.model("User", userSchema)
    const Request = mongoose.model("Request", requestSchema)
    const Match = mongoose.model("Match", matchSchema)

    // Get all pending requests
    const pendingRequests = await Request.find({ status: "Pending" })
    console.log(`📋 Found ${pendingRequests.length} pending requests`)

    let matchesCreated = 0

    for (const request of pendingRequests) {
      console.log(`\n🔍 Processing request for ${request.bloodGroup} blood (${request.urgency} urgency)`)

      // Find compatible donors
      const compatibleBloodGroups = getCompatibleBloodGroups(request.bloodGroup)
      console.log(`   Compatible blood groups: ${compatibleBloodGroups.join(", ")}`)

      const availableDonors = await User.find({
        role: "donor",
        bloodGroup: { $in: compatibleBloodGroups },
        isAvailable: true,
        matchStatus: "Available",
      })

      console.log(`   Found ${availableDonors.length} available compatible donors`)

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
          console.log(`   ✅ Created match: ${donor.username} (${donor.bloodGroup}) → ${request.requesterName}`)
        } else {
          console.log(`   ⚠️  Match already exists: ${donor.username} → ${request.requesterName}`)
        }
      }
    }

    // Display summary
    const totalMatches = await Match.countDocuments()
    const pendingMatches = await Match.countDocuments({ status: "Pending" })

    console.log("\n🎉 Match creation completed!")
    console.log("📊 Summary:")
    console.log(`   🔗 New matches created: ${matchesCreated}`)
    console.log(`   📋 Total matches in system: ${totalMatches}`)
    console.log(`   ⏳ Pending matches: ${pendingMatches}`)

    console.log("\n💡 Next steps:")
    console.log("   1. Login as admin (username: admin, password: admin123)")
    console.log("   2. Go to Admin Dashboard → Matches tab")
    console.log("   3. Review and accept matches")

    await mongoose.connection.close()
    console.log("\n👋 Database connection closed")
  } catch (error) {
    console.error("💥 Error creating matches:", error)
    process.exit(1)
  }
}

createMatches()
