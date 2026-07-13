import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import toast from 'react-hot-toast'

const OFPPTLogo = () => (
  <svg viewBox="0 0 100 80" xmlns="http://www.w3.org/2000/svg" className="w-16 h-auto">
    <rect x="15" y="15" width="20" height="20" rx="1.5" transform="rotate(45 25 25)" fill="none" stroke="#00962e" strokeWidth="4" strokeLinejoin="round" />
    <rect x="40" y="15" width="20" height="20" rx="1.5" transform="rotate(45 50 25)" fill="none" stroke="#8f9194" strokeWidth="4" strokeLinejoin="round" />
    <rect x="65" y="15" width="20" height="20" rx="1.5" transform="rotate(45 75 25)" fill="none" stroke="#005a9c" strokeWidth="4" strokeLinejoin="round" />
    <text x="52" y="65" fontFamily="Inter,system-ui,sans-serif" fontSize="18" fontWeight="900" textAnchor="middle" fill="#0f172a" letterSpacing="0.5">OFPPT</text>
  </svg>
)

export default function Login() {
  const { login } = useAuth()
  const navigate  = useNavigate()
  const location  = useLocation()
  const from      = location.state?.from?.pathname ?? '/dashboard'

  const [email, setEmail]       = useState('')
  const [password, setPassword] = useState('')
  const [showPwd, setShowPwd]   = useState(false)
  const [loading, setLoading]   = useState(false)
  const [error, setError]       = useState('')


  const handleSubmit = async (ev) => {
    ev.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await login(email, password)
      if (data.must_change_password) {
        navigate('/change-password', { replace: true })
      } else {
        navigate(from, { replace: true })
      }
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Email ou mot de passe incorrect'
      setError(msg)
      toast.error(msg)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-2xl p-8 fade-in">
          {}
          <div className="text-center mb-7">
            <div className="inline-flex items-center justify-center bg-slate-50 rounded-xl p-3 mb-4 border border-slate-200">
              <OFPPTLogo />
            </div>
            <h1 className="text-xl font-bold text-brand-blue tracking-tight">OFPPT Connect</h1>
            <p className="text-sm text-slate-500 mt-0.5">Portail Intranet Académique Unifié</p>
          </div>

          {}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="label">Adresse Email Professionnelle</label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="nom.prenom@ofppt.ma"
                  className="input pl-8"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="label mb-0">Mot de passe</label>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"></span>
                <input
                  type={showPwd ? 'text' : 'password'}
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-8 pr-10"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(v => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
                >
                  {showPwd ? 'Masquer' : 'Afficher'}
                </button>
              </div>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full justify-center py-2.5 mt-2"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  Connexion en cours...
                </>
              ) : (
                <>Se Connecter <span></span></>
              )}
            </button>
          </form>

          {}
        <p className="text-center text-xs text-white/40 mt-6">
          © {new Date().getFullYear()} OFPPT · Maroc
        </p>
      </div>
    </div>
    </div>
  )
}
