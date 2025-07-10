"use client"

import type React from "react"
import { useState } from "react"
import { useAuth } from "../contexts/AuthContext"
import "./Auth.css"

function RoleSelection() {
  const [selectedRole, setSelectedRole] = useState<"donor" | "requester" | null>(null)
  const [bloodGroup, setBloodGroup] = useState("A+")
  const [loading, setLoading] = useState(false)
  const { user, updateUserRole, error, clearError } = useAuth()

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

  const handleRoleSelect = (role: "donor" | "requester") => {
    setSelectedRole(role)
    if (error) clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedRole) return

    setLoading(true)
    const success = await updateUserRole(selectedRole, bloodGroup)
    setLoading(false)

    // If successful, user will be redirected by App.tsx
  }

  return (
    <div className="auth-container">
      <div className="auth-card role-selection-card">
        <h2>Choose Your Role</h2>
        <p className="auth-subtitle">Welcome {user?.username}! How would you like to participate?</p>

        <div className="role-options">
          <div
            className={`role-option ${selectedRole === "donor" ? "selected" : ""}`}
            onClick={() => handleRoleSelect("donor")}
          >
            <div className="role-icon">🩸</div>
            <h3>Blood Donor</h3>
            <p>Help save lives by donating blood to those in need</p>
            <ul>
              <li>Register your availability</li>
              <li>Get matched with requesters</li>
              <li>Track your donation history</li>
            </ul>
          </div>

          <div
            className={`role-option ${selectedRole === "requester" ? "selected" : ""}`}
            onClick={() => handleRoleSelect("requester")}
          >
            <div className="role-icon">🏥</div>
            <h3>Blood Requester</h3>
            <p>Request blood for yourself or loved ones in need</p>
            <ul>
              <li>Submit blood requests</li>
              <li>Set urgency levels</li>
              <li>Get matched with donors</li>
            </ul>
          </div>
        </div>

        {selectedRole && (
          <form onSubmit={handleSubmit} className="role-form">
            <div className="form-group">
              <label htmlFor="bloodGroup">
                {selectedRole === "donor" ? "Your Blood Group" : "Your Blood Group (for reference)"}
              </label>
              <select
                id="bloodGroup"
                name="bloodGroup"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
              >
                {bloodGroups.map((group) => (
                  <option key={group} value={group}>
                    {group}
                  </option>
                ))}
              </select>
            </div>

            {error && <div className="error-message">{error}</div>}

            <button type="submit" disabled={loading} className="auth-btn">
              {loading ? "Setting up..." : `Continue as ${selectedRole === "donor" ? "Donor" : "Requester"}`}
            </button>
          </form>
        )}

        <div className="role-note">
          <p>💡 You can always switch roles or become both a donor and requester later!</p>
        </div>
      </div>
    </div>
  )
}

export default RoleSelection
