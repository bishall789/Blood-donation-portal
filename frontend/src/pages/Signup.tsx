"use client"

import type React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import "./Auth.css"

function Signup() {
  const [formData, setFormData] = useState({
    username: "",
    email: "",
    password: "",
    confirmPassword: "",
    bloodGroup: "A+",
  })
  const [loading, setLoading] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)
  const { signup, error, clearError } = useAuth()

  const bloodGroups = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"]

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) clearError()
    if (validationError) setValidationError(null)
  }

  const validateForm = () => {
    console.log("🔍 Validating form data:", { ...formData, password: "[HIDDEN]", confirmPassword: "[HIDDEN]" })

    if (!formData.username.trim()) {
      return "Username is required"
    }
    if (formData.username.trim().length < 3) {
      return "Username must be at least 3 characters long"
    }
    if (!formData.email.trim()) {
      return "Email is required"
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!emailRegex.test(formData.email)) {
      return "Please enter a valid email address"
    }
    if (!formData.password) {
      return "Password is required"
    }
    if (formData.password.length < 6) {
      return "Password must be at least 6 characters long"
    }
    if (formData.password !== formData.confirmPassword) {
      return "Passwords do not match"
    }
    return null
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    console.log("📝 Form submitted!")

    const validationError = validateForm()
    if (validationError) {
      console.log("❌ Validation failed:", validationError)
      setValidationError(validationError)
      return
    }

    console.log("✅ Validation passed, attempting signup...")
    setLoading(true)
    setValidationError(null)

    try {
      const success = await signup(formData)
      console.log("📡 Signup result:", success)

      if (!success) {
        console.log("❌ Signup failed")
      } else {
        console.log("✅ Signup successful!")
      }
    } catch (err) {
      console.error("💥 Signup error:", err)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Create Account</h2>
        <p className="auth-subtitle">Join our blood donation community</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username *</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="email">Email Address *</label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="Enter your email"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password *</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password (min 6 characters)"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password *</label>
            <input
              type="password"
              id="confirmPassword"
              name="confirmPassword"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="bloodGroup">Blood Group *</label>
            <select
              id="bloodGroup"
              name="bloodGroup"
              value={formData.bloodGroup}
              onChange={handleChange}
              disabled={loading}
            >
              {bloodGroups.map((group) => (
                <option key={group} value={group}>
                  {group}
                </option>
              ))}
            </select>
          </div>

          <div className="role-info">
            <p>ℹ️ After signup, you can choose to be a donor, requester, or both!</p>
          </div>

          {(validationError || error) && <div className="error-message">{validationError || error}</div>}

          <button type="submit" disabled={loading} className="auth-btn">
            {loading ? "Creating Account..." : "Create Account"}
          </button>
        </form>

        <p className="auth-link">
          Already have an account? <Link to="/login">Sign in</Link>
        </p>

        {/* Debug info - remove in production */}
        <div style={{ marginTop: "20px", padding: "10px", backgroundColor: "#f0f0f0", fontSize: "12px" }}>
          <strong>Debug Info:</strong>
          <br />
          Loading: {loading ? "Yes" : "No"}
          <br />
          Form Valid: {validateForm() ? "No" : "Yes"}
          <br />
          API URL: {process.env.REACT_APP_API_URL || "http://localhost:5000"}
        </div>
      </div>
    </div>
  )
}

export default Signup
