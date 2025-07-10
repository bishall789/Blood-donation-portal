"use client"

import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import "./Dashboard.css"

interface DonationHistory {
  _id: string
  requesterName: string
  bloodGroup: string
  date: string
  status: string
}

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  createdAt: string
}

interface PendingMatch {
  _id: string
  requesterName: string
  bloodGroup: string
  status: string
  expiresAt: string
  requester: {
    username: string
    email: string
  }
  request: {
    urgency: string
    description: string
  }
  donorResponse: string
  requesterResponse: string
}

interface ActiveMatch {
  _id: string
  donorName: string
  requesterName: string
  bloodGroup: string
  status: string
  donorInfo: {
    email: string
    phone: string
    location: string
  }
  requesterInfo: {
    email: string
    phone: string
    location: string
    urgency: string
    description: string
  }
}

function DonorDashboard() {
  const { user, updateUser } = useAuth()
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false)
  const [history, setHistory] = useState<DonationHistory[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([])
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([])
  const [loading, setLoading] = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchAllData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async () => {
    await Promise.all([
      fetchHistory(),
      fetchUserStatus(),
      fetchNotifications(),
      fetchPendingMatches(),
      fetchActiveMatches(),
    ])
  }

  const fetchUserStatus = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const userData = await response.json()
        updateUser(userData)
        setIsAvailable(userData.isAvailable)
      }
    } catch (error) {
      console.error("Error fetching user status:", error)
    }
  }

  const fetchHistory = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/donor/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setHistory(data)
      }
    } catch (error) {
      console.error("Error fetching history:", error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/donor/notifications`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setNotifications(data)
      }
    } catch (error) {
      console.error("Error fetching notifications:", error)
    }
  }

  const fetchPendingMatches = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/matches/pending`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setPendingMatches(data)
      }
    } catch (error) {
      console.error("Error fetching pending matches:", error)
    }
  }

  const fetchActiveMatches = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/matches/active`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setActiveMatches(data)
      }
    } catch (error) {
      console.error("Error fetching active matches:", error)
    }
  }

  const updateAvailability = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/donor/availability`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ isAvailable: !isAvailable }),
      })

      if (response.ok) {
        setIsAvailable(!isAvailable)
        updateUser({ isAvailable: !isAvailable })
        fetchAllData() // Refresh all data after availability change
      }
    } catch (error) {
      console.error("Error updating availability:", error)
    } finally {
      setLoading(false)
    }
  }

  const respondToMatch = async (matchId: string, response: "accepted" | "rejected") => {
    setRespondingTo(matchId)
    try {
      const token = localStorage.getItem("token")
      const apiResponse = await fetch(`${API_BASE_URL}/api/matches/${matchId}/respond`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ response }),
      })

      if (apiResponse.ok) {
        const data = await apiResponse.json()
        alert(data.message)
        fetchAllData() // Refresh all data
      } else {
        const errorData = await apiResponse.json()
        alert(errorData.message || "Failed to respond to match")
      }
    } catch (error) {
      console.error("Error responding to match:", error)
      alert("Error responding to match")
    } finally {
      setRespondingTo(null)
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m remaining`
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Donor Dashboard</h1>
        <div className="user-status">
          <p>
            <strong>Blood Group:</strong> {user?.bloodGroup}
          </p>
          <p>
            <strong>Status:</strong> {user?.matchStatus || "Available"}
          </p>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Pending Match Requests */}
        {pendingMatches.length > 0 && (
          <div className="card">
            <h3>🩸 Pending Match Requests ({pendingMatches.length})</h3>
            <div className="match-requests-list">
              {pendingMatches.map((match) => (
                <div key={match._id} className="match-request-item">
                  <div className="match-info">
                    <h4>
                      {match.requesterName} needs {match.bloodGroup} blood
                    </h4>
                    <p>
                      <strong>Urgency:</strong>{" "}
                      <span className={`urgency ${match.request.urgency}`}>{match.request.urgency}</span>
                    </p>
                    <p>
                      <strong>Details:</strong> {match.request.description || "No additional details"}
                    </p>
                    <p>
                      <strong>Time:</strong> <span className="time-remaining">{getTimeRemaining(match.expiresAt)}</span>
                    </p>
                    {match.requesterResponse === "accepted" && (
                      <p className="other-response">✅ Requester has already accepted</p>
                    )}
                  </div>
                  <div className="match-actions">
                    {match.donorResponse === "pending" ? (
                      <div className="response-buttons">
                        <button
                          onClick={() => respondToMatch(match._id, "accepted")}
                          disabled={respondingTo === match._id}
                          className="accept-btn"
                        >
                          {respondingTo === match._id ? "Accepting..." : "Accept"}
                        </button>
                        <button
                          onClick={() => respondToMatch(match._id, "rejected")}
                          disabled={respondingTo === match._id}
                          className="reject-btn"
                        >
                          {respondingTo === match._id ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    ) : (
                      <div className={`response-status ${match.donorResponse}`}>
                        {match.donorResponse === "accepted" ? "✅ You accepted" : "❌ You rejected"}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Active Matches */}
        {activeMatches.length > 0 && (
          <div className="card">
            <h3>🎉 Active Matches ({activeMatches.length})</h3>
            <div className="active-matches-list">
              {activeMatches.map((match) => (
                <div key={match._id} className="active-match-item">
                  <div className="match-header">
                    <h4>Match with {match.requesterName}</h4>
                    <span className="blood-group">{match.bloodGroup}</span>
                  </div>
                  <div className="contact-info">
                    <h5>📞 Requester Contact Information:</h5>
                    <p>
                      <strong>Email:</strong> {match.requesterInfo.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {match.requesterInfo.phone}
                    </p>
                    <p>
                      <strong>Location:</strong> {match.requesterInfo.location}
                    </p>
                    <p>
                      <strong>Urgency:</strong>{" "}
                      <span className={`urgency ${match.requesterInfo.urgency}`}>{match.requesterInfo.urgency}</span>
                    </p>
                    <p>
                      <strong>Details:</strong> {match.requesterInfo.description}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Notifications */}
        {notifications.length > 0 && (
          <div className="card">
            <h3>🔔 Recent Notifications</h3>
            <div className="notifications-list">
              {notifications.slice(0, 5).map((notification) => (
                <div key={notification._id} className={`notification-item ${notification.type}`}>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <small>{new Date(notification.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Availability Status */}
        <div className="card">
          <h3>Availability Status</h3>
          <div className="availability-section">
            <p>
              Current Status:{" "}
              <span className={isAvailable ? "available" : "unavailable"}>
                {isAvailable ? "Available to Donate" : "Not Available"}
              </span>
            </p>
            {user?.matchStatus === "Matched" && (
              <div className="match-info">
                <p className="matched-status">
                  🩸 You are currently matched with a requester. Check your active matches above for contact details.
                </p>
                <p className="re-entry-info">
                  💡 To receive new donation requests, mark yourself as available again after completing this donation.
                </p>
                <button onClick={updateAvailability} disabled={loading} className="toggle-btn">
                  {loading ? "Updating..." : "Mark as Available for New Donations"}
                </button>
              </div>
            )}
            {user?.matchStatus !== "Matched" && (
              <div>
                <button onClick={updateAvailability} disabled={loading} className="toggle-btn">
                  {loading ? "Updating..." : `Mark as ${isAvailable ? "Unavailable" : "Available"}`}
                </button>
                {isAvailable && (
                  <p className="availability-note">
                    ✅ You are visible to the system and will receive automatic match requests.
                  </p>
                )}
                {!isAvailable && (
                  <p className="availability-note">
                    ⏸️ You are hidden from the system and won't receive new match requests.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Donation History */}
        <div className="card">
          <h3>Donation History</h3>
          {history.length === 0 ? (
            <p>No donation history yet.</p>
          ) : (
            <div className="history-list">
              {history.map((donation) => (
                <div key={donation._id} className="history-item">
                  <div className="history-info">
                    <p>
                      <strong>Requester:</strong> {donation.requesterName}
                    </p>
                    <p>
                      <strong>Blood Group:</strong> {donation.bloodGroup}
                    </p>
                    <p>
                      <strong>Date:</strong> {new Date(donation.date).toLocaleDateString()}
                    </p>
                  </div>
                  <div className={`status ${donation.status.toLowerCase()}`}>{donation.status}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default DonorDashboard
