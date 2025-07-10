const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")
require("dotenv").config()

// Sample data
const sampleDonors = [
  { username: "john_donor", email: "john@donor.com", bloodGroup: "O-", location: "New York" },
  { username: "sarah_donor", email: "sarah@donor.com", bloodGroup: "A+", location: "Los Angeles" },
  { username: "mike_donor", email: "mike@donor.com", bloodGroup: "B+", location: "Chicago" },
  { username: "emma_donor", email: "emma@donor.com", bloodGroup: "AB+", location: "Houston" },
  { username: "david_donor", email: "david@donor.com", bloodGroup: "O+", location: "Phoenix" },
  { username: "lisa_donor", email: "lisa@donor.com", bloodGroup: "A-", location: "Philadelphia" },
  { username: "tom_donor", email: "tom@donor.com", bloodGroup: "B-", location: "San Antonio" },
  { username: "anna_donor", email: "anna@donor.com", bloodGroup: "AB-", location: "San Diego" },
]

const sampleRequesters = [
  { username: "patient_1", email: "patient1@hospital.com", bloodGroup: "A+", location: "New York" },
  { username: "patient_2", email: "patient2@hospital.com", bloodGroup: "O-", location: "Los Angeles" },
  { username: "patient_3", email: "patient3@hospital.com", bloodGroup: "B+", location: "Chicago" },
  { username: "patient_4", email: "patient4@hospital.com", bloodGroup: "AB-", location: "Houston" },
  { username: "emergency_req", email: "emergency@hospital.com", bloodGroup: "O+", location: "Phoenix" },
]

const sampleRequests = [
  {
    bloodGroup: "A+",
    urgency: "high",
    description: "Urgent surgery required for car accident victim. Need 2 units of A+ blood.",
    requesterUsername: "patient_1",
  },
  {
    bloodGroup: "O-",
    urgency: "critical",
    description: "Emergency cesarean section. Universal donor blood needed immediately.",
    requesterUsername: "patient_2",
  },
  {
    bloodGroup: "B+",
    urgency: "medium",
    description: "Scheduled surgery for appendectomy. Need 1 unit of B+ blood.",
    requesterUsername: "patient_3",
  },
  {
    bloodGroup: "AB-",
    urgency: "high",
    description: "Cancer patient needs blood transfusion. AB- blood type required.",
    requesterUsername: "patient_4",
  },
  {
    bloodGroup: "O+",
    urgency: "low",
    description: "Routine blood replacement for anemia patient.",
    requesterUsername: "emergency_req",
  },
  {
    bloodGroup: "A-",
    urgency: "critical",
    description: "Trauma patient from motorcycle accident. A- blood needed urgently.",
    requesterUsername: "patient_1",
  },
]

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting database seeding...")

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

    // Define schemas (same as in server.js)
    const userSchema = new mongoose.Schema({
      username: { type: String, required: true, unique: true, trim: true },
      email: { type: String, required: true, unique: true, trim: true, lowercase: true },
      password: { type: String, required: true, minlength: 6 },
      role: {
        type: String,
        enum: { values: ["donor", "requester", "admin"], message: "{VALUE} is not a valid role" },
        default: undefined,
        required: false,
      },
      bloodGroup: { type: String, required: true, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      isAvailable: { type: Boolean, default: true },
      matchStatus: { type: String, default: "Available" },
      isDonor: { type: Boolean, default: false },
      isRequester: { type: Boolean, default: false },
      createdAt: { type: Date, default: Date.now },
    })

    const requestSchema = new mongoose.Schema({
      requester: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
      requesterName: { type: String, required: true },
      bloodGroup: { type: String, required: true, enum: ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"] },
      urgency: { type: String, enum: ["low", "medium", "high", "critical"], required: true },
      description: { type: String, trim: true },
      status: { type: String, default: "Pending", enum: ["Pending", "Matched", "Completed", "Cancelled"] },
      createdAt: { type: Date, default: Date.now },
    })

    const User = mongoose.model("User", userSchema)
    const Request = mongoose.model("Request", requestSchema)

    console.log("👥 Creating donor accounts...")

    // Create donors
    const createdDonors = []
    for (const donorData of sampleDonors) {
      try {
        const hashedPassword = await bcrypt.hash("password123", 12)
        const donor = new User({
          username: donorData.username,
          email: donorData.email,
          password: hashedPassword,
          role: "donor",
          bloodGroup: donorData.bloodGroup,
          isAvailable: true,
          isDonor: true,
        })
        const savedDonor = await donor.save()
        createdDonors.push(savedDonor)
        console.log(`✅ Created donor: ${donorData.username} (${donorData.bloodGroup})`)
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  Donor ${donorData.username} already exists, skipping...`)
        } else {
          console.error(`❌ Error creating donor ${donorData.username}:`, error.message)
        }
      }
    }

    console.log("🏥 Creating requester accounts...")

    // Create requesters
    const createdRequesters = []
    for (const requesterData of sampleRequesters) {
      try {
        const hashedPassword = await bcrypt.hash("password123", 12)
        const requester = new User({
          username: requesterData.username,
          email: requesterData.email,
          password: hashedPassword,
          role: "requester",
          bloodGroup: requesterData.bloodGroup,
          isRequester: true,
        })
        const savedRequester = await requester.save()
        createdRequesters.push(savedRequester)
        console.log(`✅ Created requester: ${requesterData.username} (${requesterData.bloodGroup})`)
      } catch (error) {
        if (error.code === 11000) {
          console.log(`⚠️  Requester ${requesterData.username} already exists, skipping...`)
        } else {
          console.error(`❌ Error creating requester ${requesterData.username}:`, error.message)
        }
      }
    }

    console.log("🩸 Creating blood requests...")

    // Create blood requests
    for (const requestData of sampleRequests) {
      try {
        // Find the requester
        const requester = await User.findOne({ username: requestData.requesterUsername })
        if (!requester) {
          console.log(`⚠️  Requester ${requestData.requesterUsername} not found, skipping request...`)
          continue
        }

        const request = new Request({
          requester: requester._id,
          requesterName: requester.username,
          bloodGroup: requestData.bloodGroup,
          urgency: requestData.urgency,
          description: requestData.description,
        })

        await request.save()
        console.log(`✅ Created ${requestData.urgency} request for ${requestData.bloodGroup} blood`)
      } catch (error) {
        console.error(`❌ Error creating request:`, error.message)
      }
    }

    // Display summary
    const totalUsers = await User.countDocuments()
    const totalDonors = await User.countDocuments({ role: "donor" })
    const totalRequesters = await User.countDocuments({ role: "requester" })
    const totalRequests = await Request.countDocuments()

    console.log("\n🎉 Database seeding completed!")
    console.log("📊 Summary:")
    console.log(`   👥 Total Users: ${totalUsers}`)
    console.log(`   🩸 Donors: ${totalDonors}`)
    console.log(`   🏥 Requesters: ${totalRequesters}`)
    console.log(`   📋 Blood Requests: ${totalRequests}`)

    console.log("\n🔑 Login Credentials:")
    console.log("   Admin: username=admin, password=admin123")
    console.log("   All sample users: password=password123")

    console.log("\n📋 Sample Donors:")
    sampleDonors.forEach((donor) => {
      console.log(`   • ${donor.username} (${donor.bloodGroup}) - ${donor.location}`)
    })

    console.log("\n🏥 Sample Requesters:")
    sampleRequesters.forEach((requester) => {
      console.log(`   • ${requester.username} (${requester.bloodGroup}) - ${requester.location}`)
    })

    await mongoose.connection.close()
    console.log("\n👋 Database connection closed")
  } catch (error) {
    console.error("💥 Error seeding database:", error)
    process.exit(1)
  }
}

seedDatabase()
