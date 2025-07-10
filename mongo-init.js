// MongoDB initialization script
const db = db.getSiblingDB("blooddonation")

// Create collections
db.createCollection("users")
db.createCollection("requests")
db.createCollection("matches")
db.createCollection("histories")
db.createCollection("notifications")

// Create indexes for better performance
db.users.createIndex({ username: 1 }, { unique: true })
db.users.createIndex({ email: 1 }, { unique: true })
db.users.createIndex({ role: 1 })
db.users.createIndex({ bloodGroup: 1 })
db.users.createIndex({ isAvailable: 1 })
db.users.createIndex({ matchStatus: 1 })

db.requests.createIndex({ requester: 1 })
db.requests.createIndex({ bloodGroup: 1 })
db.requests.createIndex({ status: 1 })
db.requests.createIndex({ createdAt: -1 })

db.matches.createIndex({ donor: 1 })
db.matches.createIndex({ requester: 1 })
db.matches.createIndex({ status: 1 })
db.matches.createIndex({ createdAt: -1 })

db.histories.createIndex({ donor: 1 })
db.histories.createIndex({ requester: 1 })
db.histories.createIndex({ date: -1 })

db.notifications.createIndex({ userId: 1 })
db.notifications.createIndex({ createdAt: -1 })
db.notifications.createIndex({ read: 1 })

print("Database initialized successfully with all collections and indexes")
