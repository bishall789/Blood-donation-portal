const mongoose = require("mongoose")
require("dotenv").config()

const resetDatabase = async () => {
  try {
    console.log("🔄 Connecting to MongoDB...")

    // Try different connection strings
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

    console.log("🗑️  Dropping existing database...")
    await mongoose.connection.db.dropDatabase()
    console.log("✅ Database dropped successfully")

    console.log("🏗️  Creating fresh collections...")

    // Create collections with proper schema
    const db = mongoose.connection.db
    await db.createCollection("users")
    await db.createCollection("requests")
    await db.createCollection("matches")
    await db.createCollection("histories")

    console.log("✅ Collections created successfully")
    console.log("🎉 Database reset complete!")

    await mongoose.connection.close()
    console.log("👋 Connection closed")
  } catch (error) {
    console.error("💥 Error resetting database:", error)
    process.exit(1)
  }
}

resetDatabase()
