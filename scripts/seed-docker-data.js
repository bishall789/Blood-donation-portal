const mongoose = require("mongoose")
const bcrypt = require("bcryptjs")

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || "mongodb://mongo:27017/blooddonation", {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    console.log("✅ Connected to MongoDB for seeding")
  } catch (error) {
    console.error("❌ MongoDB connection failed:", error)
    process.exit(1)
  }
}

// User Schema (same as server.js)
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
  phone: { type: String, trim: true },
  location: { type: String, trim: true },
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

// Sample data
const sampleDonors = [
  {
    username: "john_donor",
    email: "john@donor.com",
    bloodGroup: "O-",
    location: "New York",
    phone: "+1-555-0101",
  },
  {
    username: "sarah_donor",
    email: "sarah@donor.com",
    bloodGroup: "A+",
    location: "Los Angeles",
    phone: "+1-555-0102",
  },
  {
    username: "mike_donor",
    email: "mike@donor.com",
    bloodGroup: "B+",
    location: "Chicago",
    phone: "+1-555-0103",
  },
  {
    username: "emma_donor",
    email: "emma@donor.com",
    bloodGroup: "AB+",
    location: "Houston",
    phone: "+1-555-0104",
  },
  {
    username: "david_donor",
    email: "david@donor.com",
    bloodGroup: "O+",
    location: "Phoenix",
    phone: "+1-555-0105",
  },
  {
    username: "lisa_donor",
    email: "lisa@donor.com",
    bloodGroup: "A-",
    location: "Philadelphia",
    phone: "+1-555-0106",
  },
  {
    username: "tom_donor",
    email: "tom@donor.com",
    bloodGroup: "B-",
    location: "San Antonio",
    phone: "+1-555-0107",
  },
  {
    username: "anna_donor",
    email: "anna@donor.com",
    bloodGroup: "AB-",
    location: "San Diego",
    phone: "+1-555-0108",
  },
]

const sampleRequesters = [
  {
    username: "patient_1",
    email: "patient1@hospital.com",
    bloodGroup: "A+",
    location: "New York",
    phone: "+1-555-0201",
  },
  {
    username: "patient_2",
    email: "patient2@hospital.com",
    bloodGroup: "O-",
    location: "Los Angeles",
    phone: "+1-555-0202",
  },
  {
    username: "patient_3",
    email: "patient3@hospital.com",
    bloodGroup: "B+",
    location: "Chicago",
    phone: "+1-555-0203",
  },
  {
    username: "patient_4",
    email: "patient4@hospital.com",
    bloodGroup: "AB-",
    location: "Houston",
    phone: "+1-555-0204",
  },
  {
    username: "emergency_req",
    email: "emergency@hospital.com",
    bloodGroup: "O+",
    location: "Phoenix",
    phone: "+1-555-0205",
  },
  {
    username: "clinic_req",
    email: "clinic@medical.com",
    bloodGroup: "A-",
    location: "Philadelphia",
    phone: "+1-555-0206",
  },
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
    requesterUsername: "clinic_req",
  },
]

const seedDatabase = async () => {
  try {
    console.log("🌱 Starting Docker database seeding...")

    await connectDB()

    // Clear existing data (except admin)
    console.log("🧹 Cleaning existing data...")
    await User.deleteMany({ username: { $ne: "admin" } })
    await Request.deleteMany({})

    console.log("👥 Creating donor accounts...")
    const createdDonors = []
    for (const donorData of sampleDonors) {
      try {
        const hashedPassword = await bcrypt.hash("donor123", 12)
        const donor = new User({
          username: donorData.username,
          email: donorData.email,
          password: hashedPassword,
          role: "donor",
          bloodGroup: donorData.bloodGroup,
          isAvailable: true,
          isDonor: true,
          phone: donorData.phone,
          location: donorData.location,
        })
        const savedDonor = await donor.save()
        createdDonors.push(savedDonor)
        console.log(`✅ Created donor: ${donorData.username} (${donorData.bloodGroup}) - ${donorData.location}`)
      } catch (error) {
        console.error(`❌ Error creating donor ${donorData.username}:`, error.message)
      }
    }

    console.log("🏥 Creating requester accounts...")
    const createdRequesters = []
    for (const requesterData of sampleRequesters) {
      try {
        const hashedPassword = await bcrypt.hash("requester123", 12)
        const requester = new User({
          username: requesterData.username,
          email: requesterData.email,
          password: hashedPassword,
          role: "requester",
          bloodGroup: requesterData.bloodGroup,
          isRequester: true,
          phone: requesterData.phone,
          location: requesterData.location,
        })
        const savedRequester = await requester.save()
        createdRequesters.push(savedRequester)
        console.log(
          `✅ Created requester: ${requesterData.username} (${requesterData.bloodGroup}) - ${requesterData.location}`,
        )
      } catch (error) {
        console.error(`❌ Error creating requester ${requesterData.username}:`, error.message)
      }
    }

    console.log("🩸 Creating blood requests...")
    for (const requestData of sampleRequests) {
      try {
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

    console.log("\n🎉 Docker database seeding completed!")
    console.log("📊 Summary:")
    console.log(`   👥 Total Users: ${totalUsers}`)
    console.log(`   🩸 Donors: ${totalDonors}`)
    console.log(`   🏥 Requesters: ${totalRequesters}`)
    console.log(`   📋 Blood Requests: ${totalRequests}`)

    console.log("\n🔑 Login Credentials:")
    console.log("   Admin: username=admin, password=admin123")
    console.log("   Donors: password=donor123")
    console.log("   Requesters: password=requester123")

    console.log("\n📋 Sample Donors:")
    sampleDonors.forEach((donor) => {
      console.log(`   • ${donor.username} (${donor.bloodGroup}) - ${donor.location} - ${donor.phone}`)
    })

    console.log("\n🏥 Sample Requesters:")
    sampleRequesters.forEach((requester) => {
      console.log(`   • ${requester.username} (${requester.bloodGroup}) - ${requester.location} - ${requester.phone}`)
    })

    console.log("\n🚀 Ready to use! Open http://localhost:3000")

    await mongoose.connection.close()
    console.log("👋 Database connection closed")
  } catch (error) {
    console.error("💥 Error seeding database:", error)
    process.exit(1)
  }
}

// Run seeding if this script is executed directly
if (require.main === module) {
  seedDatabase()
}

module.exports = { seedDatabase }
