import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { authApi } from '../api/auth.api'
import { setAccessToken, clearAuthTokens, registerClearAuth } from '../api/axios'
import { hasPermission as checkPerm, isRole as checkRole } from '../utils/permissions'

const RT_KEY = 'ofppt_rt'
const saveRT  = (token) => sessionStorage.setItem(RT_KEY, token)
const loadRT  = ()      => sessionStorage.getItem(RT_KEY)
const clearRT = ()      => sessionStorage.removeItem(RT_KEY)

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user,  setUser]  = useState(null)
  const [ready, setReady] = useState(false)

  const clearAuth = useCallback(() => {
    clearAuthTokens()
    clearRT()
    setUser(null)
  }, [])


  useEffect(() => { registerClearAuth(clearAuth) }, [clearAuth])


  useEffect(() => {
    const restore = async () => {
      const rt = loadRT()
      if (!rt) { setReady(true); return }
      try {
        const data = await authApi.refresh(rt)
        setAccessToken(data.accessToken)
        if (data.refreshToken) saveRT(data.refreshToken) 
        const me = await authApi.me()
        setUser(me)
      } catch {

        clearRT()
      } finally {
        setReady(true)
      }
    }
    restore()
  }, [])

  const login = useCallback(async (email, password) => {
    const data = await authApi.login(email, password)
    setAccessToken(data.accessToken)
    if (data.refreshToken) saveRT(data.refreshToken)
    setUser(data.user)
    return data 
  }, [])

  const logout = useCallback(async () => {
    const rt = loadRT()

    try { await authApi.logout(rt) } catch {  }
    clearAuth()
  }, [clearAuth])

  const updateUser = useCallback((patch) => {
    setUser(prev => ({ ...prev, ...patch }))
  }, [])


  const hasPermission = useCallback(
    (permission) => checkPerm(user, permission),
    [user]
  )
  const isRole = useCallback(
    (role) => checkRole(user, role),
    [user]
  )

  return (
    <AuthContext.Provider value={{
      user, ready, login, logout, updateUser,
      hasPermission, isRole,
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider')
  return ctx
}
