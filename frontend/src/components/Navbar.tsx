"use client"
import { useAuth } from "../contexts/AuthContext"
import "./Navbar.css"

function Navbar() {
  const { user, logout } = useAuth()

  const handleLogout = () => {
    logout()
  }

  return (
    <nav className="navbar">
      <div className="nav-container">
        <div className="nav-brand">
          <h2>Blood Donation Platform</h2>
        </div>
        {user && (
          <div className="nav-user">
            <span className="user-info">
              Welcome, {user.username} ({user.role})
            </span>
            <button onClick={handleLogout} className="logout-btn">
              Logout
            </button>
          </div>
        )}
      </div>
    </nav>
  )
}

export default Navbar
