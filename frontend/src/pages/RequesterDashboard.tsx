"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import "./Dashboard.css"

interface BloodRequest {
  _id: string
  bloodGroup: string
  urgency: string
  description: string
  status: string
  createdAt: string
}

interface MatchedRequest {
  _id: string
  bloodGroup: string
  urgency: string
  description: string
  status: string
  createdAt: string
  matchedAt: string
  matchedWith: {
    username: string
    email: string
    bloodGroup: string
  }
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
  donorName: string
  bloodGroup: string
  status: string
  expiresAt: string
  donor: {
    username: string
    email: string
    bloodGroup: string
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

function RequesterDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [matchedRequests, setMatchedRequests] = useState<MatchedRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [pendingMatches, setPendingMatches] = useState<PendingMatch[]>([])
  const [activeMatches, setActiveMatches] = useState<ActiveMatch[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    bloodGroup: "A+",
    urgency: "medium",
    description: "",
  })
  const [loading, setLoading] = useState(false)
  const [respondingTo, setRespondingTo] = useState<string | null>(null)

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const urgencyLevels = ["low", "medium", "high", "critical"]

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchAllData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchAllData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchAllData = async () => {
    await Promise.all([
      fetchRequests(),
      fetchMatchedRequests(),
      fetchNotifications(),
      fetchPendingMatches(),
      fetchActiveMatches(),
    ])
  }

  const fetchRequests = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/requester/requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setRequests(data)
      }
    } catch (error) {
      console.error("Error fetching requests:", error)
    }
  }

  const fetchMatchedRequests = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/requester/matched-requests`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        setMatchedRequests(data)
      }
    } catch (error) {
      console.error("Error fetching matched requests:", error)
    }
  }

  const fetchNotifications = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/requester/notifications`, {
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/requester/request`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        const data = await response.json()
        setShowForm(false)
        setFormData({ bloodGroup: "A+", urgency: "medium", description: "" })
        fetchAllData()
        alert(data.message || "Request submitted successfully! Looking for compatible donors...")
      } else {
        const errorData = await response.json()
        alert(errorData.message || "Failed to submit request")
      }
    } catch (error) {
      console.error("Error creating request:", error)
      alert("Error submitting request. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  const cancelRequest = async (requestId: string) => {
    // eslint-disable-next-line no-restricted-globals
    if (!confirm("Are you sure you want to cancel this blood request?")) {
      return
    }

    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/requester/requests/${requestId}/cancel`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchAllData()
        alert("Request cancelled successfully")
      } else {
        const data = await response.json()
        alert(data.message || "Failed to cancel request")
      }
    } catch (error) {
      console.error("Error cancelling request:", error)
      alert("Error cancelling request")
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
        <h1>Requester Dashboard</h1>
        <div className="user-status">
          <p>
            <strong>Blood Group:</strong> {user?.bloodGroup}
          </p>
          <p>
            <strong>Status:</strong> {user?.matchStatus || "Active"}
          </p>
        </div>
      </div>

      <div className="dashboard-content">
        {/* Pending Match Responses */}
        {pendingMatches.length > 0 && (
          <div className="card">
            <h3>🔍 Potential Donors ({pendingMatches.length})</h3>
            <div className="match-requests-list">
              {pendingMatches.map((match) => (
                <div key={match._id} className="match-request-item">
                  <div className="match-info">
                    <h4>
                      {match.donorName} ({match.donor.bloodGroup}) can help
                    </h4>
                    <p>
                      <strong>Time:</strong> <span className="time-remaining">{getTimeRemaining(match.expiresAt)}</span>
                    </p>
                    {match.donorResponse === "accepted" && (
                      <p className="other-response">✅ Donor has already accepted</p>
                    )}
                    {match.donorResponse === "pending" && (
                      <p className="other-response">⏳ Waiting for donor's response</p>
                    )}
                  </div>
                  <div className="match-actions">
                    {match.requesterResponse === "pending" && match.donorResponse === "accepted" ? (
                      <div className="response-buttons">
                        <button
                          onClick={() => respondToMatch(match._id, "accepted")}
                          disabled={respondingTo === match._id}
                          className="accept-btn"
                        >
                          {respondingTo === match._id ? "Accepting..." : "Accept Donor"}
                        </button>
                        <button
                          onClick={() => respondToMatch(match._id, "rejected")}
                          disabled={respondingTo === match._id}
                          className="reject-btn"
                        >
                          {respondingTo === match._id ? "Rejecting..." : "Reject"}
                        </button>
                      </div>
                    ) : match.requesterResponse !== "pending" ? (
                      <div className={`response-status ${match.requesterResponse}`}>
                        {match.requesterResponse === "accepted" ? "✅ You accepted" : "❌ You rejected"}
                      </div>
                    ) : (
                      <div className="waiting-status">⏳ Waiting for donor to respond first</div>
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
            <h3>🎉 Confirmed Donors ({activeMatches.length})</h3>
            <div className="active-matches-list">
              {activeMatches.map((match) => (
                <div key={match._id} className="active-match-item">
                  <div className="match-header">
                    <h4>Match with {match.donorName}</h4>
                    <span className="blood-group">{match.bloodGroup}</span>
                  </div>
                  <div className="contact-info">
                    <h5>📞 Donor Contact Information:</h5>
                    <p>
                      <strong>Email:</strong> {match.donorInfo.email}
                    </p>
                    <p>
                      <strong>Phone:</strong> {match.donorInfo.phone}
                    </p>
                    <p>
                      <strong>Location:</strong> {match.donorInfo.location}
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

        {/* Blood Request Form */}
        <div className="card">
          <div className="card-header">
            <h3>Blood Requests</h3>
            <button onClick={() => setShowForm(!showForm)} className="primary-btn">
              {showForm ? "Cancel" : "New Request"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="request-form">
              <div className="form-notice">
                <p>📋 Creating a new request will automatically search for compatible donors.</p>
              </div>
              <div className="form-group">
                <label htmlFor="bloodGroup">Blood Group Needed</label>
                <select id="bloodGroup" name="bloodGroup" value={formData.bloodGroup} onChange={handleChange}>
                  {bloodGroups.map((group) => (
                    <option key={group} value={group}>
                      {group}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="urgency">Urgency Level</label>
                <select id="urgency" name="urgency" value={formData.urgency} onChange={handleChange}>
                  {urgencyLevels.map((level) => (
                    <option key={level} value={level}>
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label htmlFor="description">Description</label>
                <textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="Additional details about the request..."
                  rows={3}
                />
              </div>
              <button type="submit" disabled={loading} className="submit-btn">
                {loading ? "Submitting..." : "Submit Request"}
              </button>
            </form>
          )}
        </div>

        {/* My Active Requests */}
        <div className="card">
          <h3>My Active Requests</h3>
          {requests.length === 0 ? (
            <p>No active requests. Create a new request to find donors.</p>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request._id} className="request-item">
                  <div className="request-info">
                    <p>
                      <strong>Blood Group:</strong> {request.bloodGroup}
                    </p>
                    <p>
                      <strong>Urgency:</strong> <span className={`urgency ${request.urgency}`}>{request.urgency}</span>
                    </p>
                    <p>
                      <strong>Description:</strong> {request.description}
                    </p>
                    <p>
                      <strong>Date:</strong> {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="request-actions">
                    <div className={`status ${request.status.toLowerCase().replace(" ", "-")}`}>{request.status}</div>
                    {request.status === "Pending" && (
                      <button
                        onClick={() => cancelRequest(request._id)}
                        className="cancel-btn"
                        title="Cancel this request"
                      >
                        Cancel
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Matched Requests History */}
        {matchedRequests.length > 0 && (
          <div className="card">
            <h3>📋 Matched Requests History</h3>
            <div className="requests-list">
              {matchedRequests.map((request) => (
                <div key={request._id} className="request-item matched-request">
                  <div className="request-info">
                    <p>
                      <strong>Blood Group:</strong> {request.bloodGroup}
                    </p>
                    <p>
                      <strong>Urgency:</strong> <span className={`urgency ${request.urgency}`}>{request.urgency}</span>
                    </p>
                    <p>
                      <strong>Description:</strong> {request.description}
                    </p>
                    <p>
                      <strong>Requested:</strong> {new Date(request.createdAt).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Matched:</strong> {new Date(request.matchedAt).toLocaleDateString()}
                    </p>
                    <p>
                      <strong>Donor:</strong> {request.matchedWith.username} ({request.matchedWith.bloodGroup})
                    </p>
                  </div>
                  <div className="request-actions">
                    <div className="status matched">✅ Matched</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default RequesterDashboard
