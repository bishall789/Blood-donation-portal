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

function DonorDashboard() {
  const { user, updateUser } = useAuth()
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false)
  const [history, setHistory] = useState<DonationHistory[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [loading, setLoading] = useState(false)

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchHistory()
    fetchUserStatus()
    fetchNotifications()
  }, [])

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
        fetchNotifications() // Refresh notifications after status change
      }
    } catch (error) {
      console.error("Error updating availability:", error)
    } finally {
      setLoading(false)
    }
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
        {/* Notifications Section */}
        {notifications.length > 0 && (
          <div className="card">
            <h3>🔔 Recent Notifications</h3>
            <div className="notifications-list">
              {notifications.slice(0, 3).map((notification) => (
                <div key={notification._id} className={`notification-item ${notification.type}`}>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    {notification.data?.requesterInfo && (
                      <div className="contact-info">
                        <h5>🏥 Requester Contact Information:</h5>
                        <p>
                          <strong>Email:</strong> {notification.data.requesterInfo.email}
                        </p>
                        <p>
                          <strong>Phone:</strong> {notification.data.requesterInfo.phone}
                        </p>
                        <p>
                          <strong>Location:</strong> {notification.data.requesterInfo.location}
                        </p>
                        <p>
                          <strong>Urgency:</strong>{" "}
                          <span className={`urgency ${notification.data.requesterInfo.urgency}`}>
                            {notification.data.requesterInfo.urgency}
                          </span>
                        </p>
                        <p>
                          <strong>Details:</strong> {notification.data.requesterInfo.description}
                        </p>
                      </div>
                    )}
                    <small>{new Date(notification.createdAt).toLocaleString()}</small>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

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
                  🩸 You are currently matched with a requester. Check your notifications for contact details.
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
                  <p className="availability-note">✅ You are visible to admins and can receive new match requests.</p>
                )}
                {!isAvailable && (
                  <p className="availability-note">
                    ⏸️ You are hidden from the donor list and won't receive new match requests.
                  </p>
                )}
              </div>
            )}
          </div>
        </div>

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
