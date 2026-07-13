import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './hooks/useAuth'
import ProtectedRoute from './components/guards/ProtectedRoute'
import Spinner from './components/ui/Spinner'

import Login           from './pages/Login'
import ChangePassword  from './pages/ChangePassword'
import Dashboard       from './pages/Dashboard'
import Profile         from './pages/Profile'
import Schedule        from './pages/Schedule'
import ScheduleBuilder from './pages/ScheduleBuilder'
import Absences        from './pages/Absences'
import Documents       from './pages/Documents'
import Assignments     from './pages/Assignments'
import Users           from './pages/Users'
import UserNew         from './pages/UserNew'
import UserDetail      from './pages/UserDetail'
import Branches        from './pages/Branches'
import Modules         from './pages/Modules'

function AppRoutes() {
  const { ready, user } = useAuth()

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="text-center">
          <Spinner size="lg" className="mx-auto mb-3" />
          <p className="text-sm text-slate-500">Chargement...</p>
        </div>
      </div>
    )
  }

  return (
    <Routes>
      <Route
        path="/login"
        element={user && !user.must_change_password ? <Navigate to="/dashboard" replace /> : <Login />}
      />
      <Route path="/change-password" element={<ProtectedRoute><ChangePassword /></ProtectedRoute>} />

      <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
      <Route path="/profile"    element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      <Route path="/schedule"   element={<ProtectedRoute><Schedule /></ProtectedRoute>} />
      <Route path="/absences"   element={<ProtectedRoute><Absences /></ProtectedRoute>} />
      <Route path="/documents"  element={<ProtectedRoute><Documents /></ProtectedRoute>} />
      <Route path="/assignments" element={<ProtectedRoute><Assignments /></ProtectedRoute>} />

      <Route path="/schedule/builder" element={<ProtectedRoute roles={['direction']}><ScheduleBuilder /></ProtectedRoute>} />
      <Route path="/users"     element={<ProtectedRoute roles={['direction']}><Users /></ProtectedRoute>} />
      <Route path="/users/new" element={<ProtectedRoute roles={['direction']}><UserNew /></ProtectedRoute>} />
      <Route path="/users/:id" element={<ProtectedRoute roles={['direction']}><UserDetail /></ProtectedRoute>} />
      <Route path="/branches"  element={<ProtectedRoute roles={['direction']}><Branches /></ProtectedRoute>} />
      <Route path="/modules"   element={<ProtectedRoute roles={['direction']}><Modules /></ProtectedRoute>} />

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}

export default AppRoutes
