"use client"

import type React from "react"
import { Navigate, Route, BrowserRouter as Router, Routes } from "react-router-dom"
import "./App.css"
import Navbar from "./components/Navbar"
import { AuthProvider, useAuth } from "./contexts/AuthContext"
import AdminDashboard from "./pages/AdminDashboard"
import DonorDashboard from "./pages/DonorDashboard"
import Login from "./pages/Login"
import RequesterDashboard from "./pages/RequesterDashboard"
import RoleSelection from "./pages/RoleSelection"
import Signup from "./pages/Signup"

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode; allowedRoles: string[] }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!user) {
    return <Navigate to="/login" />
  }

  if (!allowedRoles.includes(user.role)) {
    return <Navigate to="/login" />
  }

  return <>{children}</>
}

function AppRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  // If user is logged in but has no role, show role selection
  if (user && !user.role) {
    return (
      <div className="App">
        <Navbar />
        <main className="main-content">
          <RoleSelection />
        </main>
      </div>
    )
  }

  return (
    <div className="App">
      <Navbar />
      <main className="main-content">
        <Routes>
          <Route path="/login" element={user ? <Navigate to={getDashboardRoute(user.role)} /> : <Login />} />
          <Route path="/signup" element={user ? <Navigate to={getDashboardRoute(user.role)} /> : <Signup />} />
          <Route path="/role-selection" element={user ? <RoleSelection /> : <Navigate to="/login" />} />
          <Route
            path="/donor-dashboard"
            element={
              <ProtectedRoute allowedRoles={["donor"]}>
                <DonorDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/requester-dashboard"
            element={
              <ProtectedRoute allowedRoles={["requester"]}>
                <RequesterDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={["admin"]}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={user ? <Navigate to={getDashboardRoute(user.role)} /> : <Navigate to="/login" />} />
        </Routes>
      </main>
    </div>
  )
}

function getDashboardRoute(role: string) {
  switch (role) {
    case "admin":
      return "/admin-dashboard"
    case "donor":
      return "/donor-dashboard"
    case "requester":
      return "/requester-dashboard"
    default:
      return "/role-selection"
  }
}

function App() {
  return (
    <AuthProvider>
      <Router>
        <AppRoutes />
      </Router>
    </AuthProvider>
  )
}

export default App
