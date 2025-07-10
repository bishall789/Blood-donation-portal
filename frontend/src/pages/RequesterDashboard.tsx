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

interface Notification {
  _id: string
  type: string
  title: string
  message: string
  data: any
  read: boolean
  createdAt: string
}

function RequesterDashboard() {
  const { user } = useAuth()
  const [requests, setRequests] = useState<BloodRequest[]>([])
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [showForm, setShowForm] = useState(false)
  const [formData, setFormData] = useState({
    bloodGroup: "A+",
    urgency: "medium",
    description: "",
  })
  const [loading, setLoading] = useState(false)

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]
  const urgencyLevels = ["low", "medium", "high", "critical"]

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchRequests()
    fetchNotifications()
  }, [])

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
        setShowForm(false)
        setFormData({ bloodGroup: "A+", urgency: "medium", description: "" })
        fetchRequests()
      }
    } catch (error) {
      console.error("Error creating request:", error)
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
        fetchRequests()
        fetchNotifications() // Refresh to see any new notifications
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
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
                    {notification.data?.donorInfo && (
                      <div className="contact-info">
                        <h5>📞 Donor Contact Information:</h5>
                        <p>
                          <strong>Email:</strong> {notification.data.donorInfo.email}
                        </p>
                        <p>
                          <strong>Phone:</strong> {notification.data.donorInfo.phone}
                        </p>
                        <p>
                          <strong>Location:</strong> {notification.data.donorInfo.location}
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
          <div className="card-header">
            <h3>Blood Requests</h3>
            <button onClick={() => setShowForm(!showForm)} className="primary-btn">
              {showForm ? "Cancel" : "New Request"}
            </button>
          </div>

          {showForm && (
            <form onSubmit={handleSubmit} className="request-form">
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

        <div className="card">
          <h3>My Requests</h3>
          {requests.length === 0 ? (
            <p>No requests yet.</p>
          ) : (
            <div className="requests-list">
              {requests.map((request) => (
                <div key={request._id} className="request-item">
                  <div className="request-info">
                    <p>
                      <strong>Blood Group:</strong> {request.bloodGroup}
                    </p>
                    <p>
                      <strong>Urgency:</strong> {request.urgency}
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
                    {(request.status === "Pending" || request.status === "Matched") && (
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
      </div>
    </div>
  )
}

export default RequesterDashboard
