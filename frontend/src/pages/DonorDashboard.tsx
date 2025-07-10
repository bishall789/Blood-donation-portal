"use client"

import { useState, useEffect } from "react"
import { useAuth } from "../contexts/AuthContext"
import "./Dashboard.css"

interface DonationHistory {
  _id: string
  requesterName: string
  bloodGroup: string
  date: string
  status: string
}

function DonorDashboard() {
  const { user, updateUser } = useAuth()
  const [isAvailable, setIsAvailable] = useState(user?.isAvailable || false)
  const [history, setHistory] = useState<DonationHistory[]>([])
  const [loading, setLoading] = useState(false)

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchHistory()
    fetchUserStatus()
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
        <div className="card">
          <h3>Availability Status</h3>
          <div className="availability-section">
            <p>
              Current Status:{" "}
              <span className={isAvailable ? "available" : "unavailable"}>
                {isAvailable ? "Available to Donate" : "Not Available"}
              </span>
            </p>
            <button onClick={updateAvailability} disabled={loading} className="toggle-btn">
              {loading ? "Updating..." : `Mark as ${isAvailable ? "Unavailable" : "Available"}`}
            </button>
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
