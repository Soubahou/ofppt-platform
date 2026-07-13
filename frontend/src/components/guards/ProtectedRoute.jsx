import { Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../context/AuthContext'

function Loader() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100">
      <div className="w-8 h-8 rounded-full border-2 border-slate-300 border-t-blue-600 animate-spin" />
    </div>
  )
}

export default function ProtectedRoute({ children, roles }) {
  const { user, ready } = useAuth()
  const location = useLocation()

  if (!ready) return <Loader />

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (user.must_change_password && location.pathname !== '/change-password') {
    return <Navigate to="/change-password" replace />
  }

  if (roles && !roles.includes(user.role)) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
