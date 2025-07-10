"use client"

import type React from "react"
import { useState } from "react"
import { Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import "./Auth.css"

function Login() {
  const [formData, setFormData] = useState({
    username: "",
    password: "",
  })
  const [loading, setLoading] = useState(false)
  const { login, error, clearError } = useAuth()

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    })
    if (error) clearError()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.username.trim() || !formData.password) {
      return
    }

    setLoading(true)
    const success = await login(formData.username, formData.password)
    setLoading(false)

    // If login successful, user will be redirected by App.tsx
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              value={formData.username}
              onChange={handleChange}
              placeholder="Enter your username"
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Enter your password"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            type="submit"
            disabled={loading || !formData.username.trim() || !formData.password}
            className="auth-btn"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>

        <p className="auth-link">
          Don't have an account? <Link to="/signup">Create account</Link>
        </p>

        <div className="admin-note">
          <p>
            <strong>Admin Access:</strong>
            <br />
            Username: <code>admin</code>
            <br />
            Password: <code>admin123</code>
          </p>
        </div>
      </div>
    </div>
  )
}

export default Login
