"use client"

import { useState, useEffect } from "react"
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
}

function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("donors")
  const [donors, setDonors] = useState<User[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [matches, setMatches] = useState<Match[]>([])
  const [loading, setLoading] = useState(false)

  const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    setLoading(true)
    try {
      const token = localStorage.getItem("token")
      const headers = { Authorization: `Bearer ${token}` }

      const [donorsRes, requestsRes, matchesRes] = await Promise.all([
        fetch(`${API_BASE_URL}/api/admin/donors`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/requests`, { headers }),
        fetch(`${API_BASE_URL}/api/admin/matches`, { headers }),
      ])

      if (donorsRes.ok) setDonors(await donorsRes.json())
      if (requestsRes.ok) setRequests(await requestsRes.json())
      if (matchesRes.ok) setMatches(await matchesRes.json())
    } catch (error) {
      console.error("Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const acceptMatch = async (matchId: string) => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/admin/matches/${matchId}/accept`, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Error accepting match:", error)
    }
  }

  const createMatches = async () => {
    try {
      const token = localStorage.getItem("token")
      const response = await fetch(`${API_BASE_URL}/api/admin/create-matches`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      if (response.ok) {
        fetchData()
      }
    } catch (error) {
      console.error("Error creating matches:", error)
    }
  }

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  return (
    <div className="dashboard-container">
      <div className="dashboard-header">
        <h1>Admin Dashboard</h1>
        <button onClick={createMatches} className="primary-btn">
          Generate Matches
        </button>
      </div>

      <div className="admin-tabs">
        <button className={activeTab === "donors" ? "tab active" : "tab"} onClick={() => setActiveTab("donors")}>
          Donors ({donors.length})
        </button>
        <button className={activeTab === "requests" ? "tab active" : "tab"} onClick={() => setActiveTab("requests")}>
          Requests ({requests.length})
        </button>
        <button className={activeTab === "matches" ? "tab active" : "tab"} onClick={() => setActiveTab("matches")}>
          Matches ({matches.length})
        </button>
      </div>

      <div className="dashboard-content">
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
                      <td>{request.status}</td>
                      <td>{new Date(request.createdAt).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === "matches" && (
          <div className="card">
            <h3>Blood Group Matches</h3>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Donor</th>
                    <th>Requester</th>
                    <th>Blood Group</th>
                    <th>Status</th>
                    <th>Date</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {matches.map((match) => (
                    <tr key={match._id}>
                      <td>{match.donorName}</td>
                      <td>{match.requesterName}</td>
                      <td>{match.bloodGroup}</td>
                      <td>
                        <span className={`status ${match.status.toLowerCase().replace(" ", "-")}`}>{match.status}</span>
                      </td>
                      <td>{new Date(match.createdAt).toLocaleDateString()}</td>
                      <td>
                        {match.status === "Pending" && (
                          <button onClick={() => acceptMatch(match._id)} className="accept-btn">
                            Accept
                          </button>
                        )}
                      </td>
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
