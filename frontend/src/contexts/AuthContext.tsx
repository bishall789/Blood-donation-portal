"use client"

import { createContext, useContext, useEffect, useState, type ReactNode } from "react"

interface User {
  id: string
  username: string
  email: string
  role: "donor" | "requester" | "admin" | null
  bloodGroup?: string
  isAvailable?: boolean
  matchStatus?: string
  isDonor?: boolean
  isRequester?: boolean
}

interface AuthContextType {
  user: User | null
  loading: boolean
  error: string | null
  login: (username: string, password: string) => Promise<boolean>
  signup: (userData: any) => Promise<boolean>
  logout: () => void
  updateUser: (userData: Partial<User>) => void
  updateUserRole: (role: "donor" | "requester", bloodGroup?: string) => Promise<boolean>
  clearError: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}

const API_BASE_URL = process.env.REACT_APP_API_URL || "http://localhost:5000"

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const token = localStorage.getItem("token")
    if (token) {
      fetchUserProfile(token)
    } else {
      setLoading(false)
    }
  }, [])

  const fetchUserProfile = async (token: string) => {
    try {
      console.log("👤 Fetching user profile...")
      const response = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      })

      if (response.ok) {
        const userData = await response.json()
        console.log("✅ User profile fetched:", userData)
        setUser(userData)
        setError(null)
      } else {
        console.log("❌ Profile fetch failed, removing token")
        localStorage.removeItem("token")
        setError("Session expired. Please login again.")
      }
    } catch (error) {
      console.error("💥 Error fetching user profile:", error)
      localStorage.removeItem("token")
      setError("Network error. Please check your connection.")
    } finally {
      setLoading(false)
    }
  }

  const login = async (username: string, password: string): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)

      console.log("🔑 Attempting login for:", username)

      const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username: username.trim(), password }),
      })

      const data = await response.json()
      console.log("📡 Login response:", { status: response.status, success: response.ok })

      if (response.ok) {
        localStorage.setItem("token", data.token)
        setUser(data.user)
        setError(null)
        console.log("✅ Login successful")
        return true
      } else {
        console.log("❌ Login failed:", data.message)
        setError(data.message || "Login failed")
        return false
      }
    } catch (error) {
      console.error("💥 Login error:", error)
      setError("Network error. Please check your connection.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const signup = async (userData: any): Promise<boolean> => {
    try {
      setError(null)
      setLoading(true)

      console.log("📝 Starting signup process for:", userData.username)

      const signupData = {
        username: userData.username.trim(),
        email: userData.email.trim().toLowerCase(),
        password: userData.password,
        bloodGroup: userData.bloodGroup,
      }

      console.log("📤 Sending signup request to:", `${API_BASE_URL}/api/auth/signup`)
      console.log("📤 Signup data:", { ...signupData, password: "[HIDDEN]" })

      const response = await fetch(`${API_BASE_URL}/api/auth/signup`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(signupData),
      })

      console.log("📡 Signup response status:", response.status)
      console.log("📡 Signup response ok:", response.ok)

      const data = await response.json()
      console.log("📡 Signup response data:", data)

      if (response.ok) {
        localStorage.setItem("token", data.token)
        setUser(data.user)
        setError(null)
        console.log("✅ Signup successful, user:", data.user)
        return true
      } else {
        console.log("❌ Signup failed:", data.message)
        setError(data.message || "Signup failed")
        return false
      }
    } catch (error) {
      console.error("💥 Signup error:", error)
      setError("Network error. Please check your connection and try again.")
      return false
    } finally {
      setLoading(false)
    }
  }

  const updateUserRole = async (role: "donor" | "requester", bloodGroup?: string): Promise<boolean> => {
    try {
      setError(null)
      const token = localStorage.getItem("token")

      console.log("🔄 Updating user role to:", role)

      const response = await fetch(`${API_BASE_URL}/api/auth/update-role`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role, bloodGroup }),
      })

      const data = await response.json()

      if (response.ok) {
        // Update token if provided
        if (data.token) {
          localStorage.setItem("token", data.token)
        }
        setUser(data.user)
        setError(null)
        console.log("✅ Role updated successfully")
        return true
      } else {
        console.log("❌ Role update failed:", data.message)
        setError(data.message || "Failed to update role")
        return false
      }
    } catch (error) {
      console.error("💥 Update role error:", error)
      setError("Network error. Please try again.")
      return false
    }
  }

  const logout = () => {
    localStorage.removeItem("token")
    setUser(null)
    setError(null)
    console.log("👋 User logged out")
  }

  const updateUser = (userData: Partial<User>) => {
    setUser((prev) => (prev ? { ...prev, ...userData } : null))
  }

  const clearError = () => {
    setError(null)
  }

  const value = {
    user,
    loading,
    error,
    login,
    signup,
    logout,
    updateUser,
    updateUserRole,
    clearError,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
