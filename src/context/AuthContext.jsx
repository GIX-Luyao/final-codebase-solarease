import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'
import { API_URL } from '../config'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [accessToken, setAccessToken] = useState(null)
  const [loading, setLoading] = useState(true)

  // Refresh access token using httpOnly cookie
  const refreshAccessToken = useCallback(async () => {
    try {
      const res = await fetch(`${API_URL}/api/auth/refresh`, {
        method: 'POST',
        credentials: 'include'
      })

      if (!res.ok) {
        throw new Error('Refresh failed')
      }

      const data = await res.json()
      setAccessToken(data.result.accessToken)
      return data.result.accessToken
    } catch (err) {
      setUser(null)
      setAccessToken(null)
      return null
    }
  }, [])

  // Fetch with automatic token refresh
  const authFetch = useCallback(async (url, options = {}) => {
    let token = accessToken

    // If no token, try to refresh
    if (!token) {
      token = await refreshAccessToken()
      if (!token) {
        throw new Error('Not authenticated')
      }
    }

    const fetchWithToken = async (tkn) => {
      const res = await fetch(url, {
        ...options,
        credentials: 'include',
        headers: {
          ...options.headers,
          'Authorization': `Bearer ${tkn}`,
          'Content-Type': options.headers?.['Content-Type'] || 'application/json'
        }
      })
      return res
    }

    let res = await fetchWithToken(token)

    // If token expired, try to refresh and retry
    if (res.status === 401) {
      const newToken = await refreshAccessToken()
      if (newToken) {
        res = await fetchWithToken(newToken)
      }
    }

    return res
  }, [accessToken, refreshAccessToken])

  // Check if user is logged in on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = await refreshAccessToken()
        if (token) {
          const res = await fetch(`${API_URL}/api/auth/me`, {
            headers: { 'Authorization': `Bearer ${token}` },
            credentials: 'include'
          })
          if (res.ok) {
            const data = await res.json()
            setUser(data.user)
          }
        }
      } catch (err) {
        // Not logged in
      } finally {
        setLoading(false)
      }
    }

    checkAuth()
  }, [refreshAccessToken])

  const register = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Registration failed')
    }

    setUser(data.result.user)
    setAccessToken(data.result.accessToken)
    return data.result.user
  }

  const login = async (email, password) => {
    const res = await fetch(`${API_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ email, password })
    })

    const data = await res.json()

    if (!res.ok) {
      throw new Error(data.error || 'Login failed')
    }

    setUser(data.result.user)
    setAccessToken(data.result.accessToken)
    return data.result.user
  }

  const logout = async () => {
    try {
      await fetch(`${API_URL}/api/auth/logout`, {
        method: 'POST',
        credentials: 'include'
      })
    } catch (err) {
      // Ignore errors
    }
    setUser(null)
    setAccessToken(null)
  }

  const value = {
    user,
    loading,
    isAuthenticated: !!user,
    register,
    login,
    logout,
    authFetch
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
