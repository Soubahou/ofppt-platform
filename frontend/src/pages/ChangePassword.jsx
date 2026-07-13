import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../hooks/useAuth'
import { authApi } from '../api/auth.api'
import toast from 'react-hot-toast'

export default function ChangePassword() {
  const { updateUser } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({ current: '', next: '', confirm: '' })
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const validate = () => {
    const e = {}
    if (!form.current) e.current = 'Requis'
    if (form.next.length < 8) e.next = 'Minimum 8 caractères'
    if (form.next !== form.confirm) e.confirm = 'Les mots de passe ne correspondent pas'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (ev) => {
    ev.preventDefault()
    if (!validate()) return
    setLoading(true)
    try {
      await authApi.changePassword(form.current, form.next)
      updateUser({ must_change_password: false })
      toast.success('Mot de passe modifié avec succès')
      navigate('/dashboard', { replace: true })
    } catch (err) {
      const msg = err.response?.data?.message ?? 'Erreur lors du changement de mot de passe'
      toast.error(msg)
      setErrors({ current: msg })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="auth-bg min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md fade-in">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-brand-orange/10 rounded-2xl flex items-center justify-center text-2xl mx-auto mb-3"></div>
          <h1 className="text-xl font-bold text-slate-900">Nouveau Mot de Passe Requis</h1>
          <p className="text-sm text-slate-500 mt-1">
            Votre mot de passe doit être modifié avant de continuer.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">Mot de passe actuel</label>
            <input
              type="password"
              value={form.current}
              onChange={e => setForm(f => ({ ...f, current: e.target.value }))}
              className={`input ${errors.current ? 'border-red-400' : ''}`}
              placeholder="••••••••"
            />
            {errors.current && <p className="text-xs text-red-500 mt-1">{errors.current}</p>}
          </div>

          <div>
            <label className="label">Nouveau mot de passe</label>
            <input
              type="password"
              value={form.next}
              onChange={e => setForm(f => ({ ...f, next: e.target.value }))}
              className={`input ${errors.next ? 'border-red-400' : ''}`}
              placeholder="Minimum 8 caractères"
            />
            {errors.next && <p className="text-xs text-red-500 mt-1">{errors.next}</p>}
          </div>

          <div>
            <label className="label">Confirmer le nouveau mot de passe</label>
            <input
              type="password"
              value={form.confirm}
              onChange={e => setForm(f => ({ ...f, confirm: e.target.value }))}
              className={`input ${errors.confirm ? 'border-red-400' : ''}`}
              placeholder="••••••••"
            />
            {errors.confirm && <p className="text-xs text-red-500 mt-1">{errors.confirm}</p>}
          </div>

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full justify-center py-2.5 mt-2"
          >
            {loading ? (
              <><div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />Enregistrement...</>
            ) : 'Enregistrer le mot de passe '}
          </button>
        </form>
      </div>
    </div>
  )
}
