import { useEffect, useMemo, useState } from 'react'

import { getCurrentUser, login as loginRequest } from '../api/auth'
import { AuthContext } from './authContextValue'
import { clearAccessToken, getAccessToken, setAccessToken } from '../lib/authToken'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [token, setToken] = useState(() => getAccessToken())
  const [loading, setLoading] = useState(Boolean(getAccessToken()))

  useEffect(() => {
    let cancelled = false
    const storedToken = getAccessToken()

    if (!storedToken) {
      return () => {
        cancelled = true
      }
    }

    getCurrentUser()
      .then((currentUser) => {
        if (!cancelled) {
          setUser(currentUser)
          setToken(storedToken)
        }
      })
      .catch(() => {
        clearAccessToken()
        if (!cancelled) {
          setUser(null)
          setToken(null)
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })

    return () => {
      cancelled = true
    }
  }, [])

  const login = async (email, password) => {
    const response = await loginRequest(email, password)
    setAccessToken(response.access_token)
    setToken(response.access_token)
    setUser(response.user)
    return response.user
  }

  const logout = () => {
    clearAccessToken()
    setToken(null)
    setUser(null)
  }

  const value = useMemo(() => ({
    user,
    accessToken: token,
    isAuthenticated: Boolean(user && token),
    loading,
    login,
    logout,
  }), [loading, token, user])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}
