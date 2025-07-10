"use client"

import { useEffect, useState } from "react"
import "./Dashboard.css"

interface User {
  _id: string
  username: string
  email: string
  role: string
  bloodGroup: string
  isAvailable?: boolean
  matchStatus?: string
}

interface Request {
  _id: string
  requesterName: string
  bloodGroup: string
  urgency: string
  description: string
  status: string
  createdAt: string
}

interface Match {
  _id: string
  donorName: string
  requesterName: string
  bloodGroup: string
  status: string
  createdAt: string
  expiresAt: string
  donorResponse: string
  requesterResponse: string
  donor: {
    username: string
    email: string
    bloodGroup: string
  }
  requester: {
    username: string
    email: string
  }
  request: {
    urgency: string
    description: string
  }
}

interface Stats {
  totalUsers: number
  totalDonors: number
  totalRequesters: number
  availableDonors: number
  totalRequests: number
  pendingRequests: number
  totalMatches: number
  pendingMatches: number
  successfulMatches: number
  expiredMatches: number
  rejectedMatches: number
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("stats")
  const [donors, setDonors] = useState<User[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(false)

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchData()
    // Refresh data every 30 seconds
    const interval = setInterval(fetchData, 30000)
    return () => clearInterval(interval)
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const headers = { Authorization: `Bearer ${token}` }

      const [donorsRes, requestsRes, matchesRes, statsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/donors`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/requests`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/matches`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/stats`, { headers }),
      ])

      if (donorsRes.ok) setDonors(await donorsRes.json())
      if (requestsRes.ok) setRequests(await requestsRes.json())
      if (matchesRes.ok) setMatches(await matchesRes.json())
      if (statsRes.ok) setStats(await statsRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const triggerMatches = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/admin/trigger-matches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        const data = await response.json()
        alert(data.message)
        fetchData()
      }
    } catch (error) {
      console.error("Error triggering matches:", error)
    }
  }

  const getTimeRemaining = (expiresAt: string) => {
    const now = new Date()
    const expiry = new Date(expiresAt)
    const diff = expiry.getTime() - now.getTime()

    if (diff <= 0) return "Expired"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    return `${hours}h ${minutes}m`
  }

  if (loading && !stats) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard - Peer-to-Peer System</h1>
        <button onClick={triggerMatches} className="primary-btn">
          Trigger Match Detection
        </button>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === "stats" ? "tab active" : "tab"} onClick={() => setActiveTab("stats")}>
          Statistics
        </button>
        <button className={activeTab === "matches" ? "tab active" : "tab"} onClick={() => setActiveTab("matches")}>
          Matches ({matches.length})
        </button>
        <button className={activeTab === "donors" ? "tab active" : "tab"} onClick={() => setActiveTab("donors")}>
          Donors ({donors.length})
        </button>
        <button className={activeTab === "requests" ? "tab active" : "tab"} onClick={() => setActiveTab("requests")}>
          Requests ({requests.length})
        </button>
      </div>

      <div className="dashboard-content">
        {activeTab === "stats" && stats && (
          <div className="stats-grid">
            <div className="stat-card">
              <h3>Users</h3>
              <div className="stat-number">{stats.totalUsers}</div>
              <div className="stat-breakdown">
                <p>Donors: {stats.totalDonors}</p>
                <p>Requesters: {stats.totalRequesters}</p>
                <p>Available Donors: {stats.availableDonors}</p>
              </div>
            </div>

            <div className="stat-card">
              <h3>Requests</h3>
              <div className="stat-number">{stats.totalRequests}</div>
              <div className="stat-breakdown">
                <p>Pending: {stats.pendingRequests}</p>
                <p>Completed: {stats.totalRequests - stats.pendingRequests}</p>
              </div>
            </div>

            <div className="stat-card">
              <h3>Matches</h3>
              <div className="stat-number">{stats.totalMatches}</div>
              <div className="stat-breakdown">
                <p>Pending: {stats.pendingMatches}</p>
                <p>Successful: {stats.successfulMatches}</p>
                <p>Expired: {stats.expiredMatches}</p>
                <p>Rejected: {stats.rejectedMatches}</p>
              </div>
            </div>

            <div className="stat-card">
              <h3>Success Rate</h3>
              <div className="stat-number">
                {stats.totalMatches > 0 ? Math.round((stats.successfulMatches / stats.totalMatches) * 100) : 0}%
              </div>
              <div className="stat-breakdown">
                <p>Successful: {stats.successfulMatches}</p>
                <p>Total: {stats.totalMatches}</p>
              </div>
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="card">
            <h3>All Matches (Peer-to-Peer System)</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Requester</th>
                    <th>Blood Group</th>
                    <th>Status</th>
                    <th>Donor Response</th>
                    <th>Requester Response</th>
                    <th>Time Remaining</th>
                    <th>Created</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match._id}>
                      <td>{match.donorName}</td>
                      <td>{match.requesterName}</td>
                      <td>{match.bloodGroup}</td>
                      <td>
                        <span className={`status ${match.status.toLowerCase().replace("_", "-")}`}>
                          {match.status.replace("_", " ")}
                        </span>
                      </td>
                      <td>
                        <span className={`response ${match.donorResponse}`}>{match.donorResponse}</span>
                      </td>
                      <td>
                        <span className={`response ${match.requesterResponse}`}>{match.requesterResponse}</span>
                      </td>
                      <td>
                        {match.status === "both_accepted" || match.status === "expired"
                          ? "N/A"
                          : getTimeRemaining(match.expiresAt)}
                      </td>
                      <td>{new Date(match.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "donors" && (
          <div className="card">
            <h3>All Donors</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Username</th>
                    <th>Email</th>
                    <th>Blood Group</th>
                    <th>Available</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {donors.map((donor) => (
                    <tr key={donor._id}>
                      <td>{donor.username}</td>
                      <td>{donor.email}</td>
                      <td>{donor.bloodGroup}</td>
                      <td>
                        <span className={donor.isAvailable ? "available" : "unavailable"}>
                          {donor.isAvailable ? "Yes" : "No"}
                        </span>
                      </td>
                      <td>{donor.matchStatus || "Available"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "requests" && (
          <div className="card">
            <h3>All Requests</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Requester</th>
                    <th>Blood Group</th>
                    <th>Urgency</th>
                    <th>Description</th>
                    <th>Status</th>
                    <th>Date</th>
                  </tr>
                </thead>
                <tbody>
                  {requests.map((request) => (
                    <tr key={request._id}>
                      <td>{request.requesterName}</td>
                      <td>{request.bloodGroup}</td>
                      <td>
                        <span className={`urgency ${request.urgency}`}>{request.urgency}</span>
                      </td>
                      <td>{request.description}</td>
                      <td>
                        <span className={`status ${request.status.toLowerCase()}`}>{request.status}</span>
                      </td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default AdminDashboard
