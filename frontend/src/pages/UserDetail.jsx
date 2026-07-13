import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '../components/layout/AppShell'
import { Avatar, Badge } from '../components/ui/index.jsx'
import { usersApi } from '../api/users.api'
import { academicApi } from '../api/academic.api'
import toast from 'react-hot-toast'

const ROLE_LABEL = { direction: 'Direction', formateur: 'Formateur', stagiaire: 'Stagiaire' }
const ROLE_COLOR = { direction: 'blue', formateur: 'green', stagiaire: 'purple' }

export default function UserDetail() {
  const { id }  = useParams()
  const navigate = useNavigate()
  const qc       = useQueryClient()

  const { data: user, isLoading } = useQuery({
    queryKey: ['user', id],
    queryFn:  () => usersApi.get(id),
  })

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => academicApi.listGroups(),
  })

  const [form, setForm] = useState({})
  const [resetPwd, setResetPwd]   = useState('')
  const [showReset, setShowReset] = useState(false)

  useEffect(() => {
    if (user) setForm({
      first_name: user.first_name ?? '',
      last_name:  user.last_name  ?? '',
      email:      user.email      ?? '',
      role:       user.role       ?? '',
      group_id:   user.group_id   ?? '',
      is_active:  user.is_active  ?? true,
    })
  }, [user])

  const updateMutation = useMutation({
    mutationFn: () => usersApi.update(id, form),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] })
      qc.invalidateQueries({ queryKey: ['user', id] })
      toast.success('Profil mis à jour')
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const resetMutation = useMutation({
    mutationFn: () => usersApi.resetPassword(id, resetPwd),
    onSuccess: () => { toast.success('Mot de passe réinitialisé'); setShowReset(false); setResetPwd('') },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: () => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); navigate('/users'); toast.success('Compte supprimé') },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  if (isLoading) {
    return (
      <AppShell>
        <div className="flex justify-center py-20">
          <div className="w-8 h-8 border-2 border-slate-200 border-t-brand-blue rounded-full animate-spin" />
        </div>
      </AppShell>
    )
  }

  return (
    <AppShell>
      <div className="max-w-3xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <a href="/users">Utilisateurs</a><span>/</span>
              <span className="text-slate-700">{user?.first_name} {user?.last_name}</span>
            </nav>
            <h1 className="page-title">Modifier le profil</h1>
          </div>
          <div className="flex gap-2">
            <Badge variant={ROLE_COLOR[user?.role] ?? 'gray'}>{ROLE_LABEL[user?.role] ?? user?.role}</Badge>
            <Badge variant={user?.is_active ? 'green' : 'gray'}>{user?.is_active ? 'Actif' : 'Inactif'}</Badge>
          </div>
        </div>

        <div className="space-y-5">
          {}
          <div className="card p-6">
            <div className="flex items-center gap-4 mb-5">
              <Avatar user={user} size="xl" />
              <div>
                <h3 className="font-bold text-slate-900">{user?.first_name} {user?.last_name}</h3>
                <p className="text-sm text-slate-500">{user?.email}</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              {[
                { label: 'Prénom', field: 'first_name' },
                { label: 'Nom',    field: 'last_name'  },
              ].map(f => (
                <div key={f.field}>
                  <label className="label">{f.label}</label>
                  <input
                    className="input"
                    value={form[f.field] ?? ''}
                    onChange={e => setForm(p => ({ ...p, [f.field]: e.target.value }))}
                  />
                </div>
              ))}
              <div>
                <label className="label">Email</label>
                <input
                  type="email"
                  className="input"
                  value={form.email ?? ''}
                  onChange={e => setForm(p => ({ ...p, email: e.target.value }))}
                />
              </div>
              <div>
                <label className="label">Rôle</label>
                <select className="select" value={form.role ?? ''} onChange={e => setForm(p => ({ ...p, role: e.target.value }))}>
                  <option value="stagiaire">Stagiaire</option>
                  <option value="formateur">Formateur</option>
                  <option value="direction">Direction</option>
                </select>
              </div>
              <div>
                <label className="label">Groupe</label>
                <select className="select" value={form.group_id ?? ''} onChange={e => setForm(p => ({ ...p, group_id: e.target.value }))}>
                  <option value="">— Aucun —</option>
                  {(groups?.data ?? []).map(g => (
                    <option key={g.id} value={g.id}>{g.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 pt-4">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={!!form.is_active}
                  onChange={e => setForm(p => ({ ...p, is_active: e.target.checked }))}
                  className="w-4 h-4 accent-brand-blue"
                />
                <label htmlFor="is_active" className="text-sm text-slate-700 font-medium">Compte actif</label>
              </div>
            </div>

            <div className="flex gap-3 mt-5 pt-4 border-t border-slate-100">
              <button
                onClick={() => updateMutation.mutate()}
                disabled={updateMutation.isPending}
                className="btn-primary"
              >
                {updateMutation.isPending ? 'Enregistrement...' : 'Enregistrer les modifications'}
              </button>
              <button onClick={() => navigate('/users')} className="btn-secondary">Annuler</button>
            </div>
          </div>

          {}
          <div className="card p-6">
            <h3 className="font-semibold text-slate-800 mb-3"> Réinitialiser le mot de passe</h3>
            {showReset ? (
              <div className="flex gap-3">
                <input
                  type="password"
                  className="input flex-1"
                  placeholder="Nouveau mot de passe (min. 8 car.)"
                  value={resetPwd}
                  onChange={e => setResetPwd(e.target.value)}
                />
                <button
                  onClick={() => resetMutation.mutate()}
                  disabled={resetPwd.length < 8 || resetMutation.isPending}
                  className="btn-primary"
                >
                  Confirmer
                </button>
                <button onClick={() => setShowReset(false)} className="btn-secondary">Annuler</button>
              </div>
            ) : (
              <button onClick={() => setShowReset(true)} className="btn-secondary">
                Définir un nouveau mot de passe
              </button>
            )}
          </div>

          {}
          <div className="card p-6 border border-red-200 bg-red-50/30">
            <h3 className="font-semibold text-red-700 mb-2">️ Zone dangereuse</h3>
            <p className="text-sm text-slate-600 mb-4">La suppression est irréversible. Toutes les données liées seront perdues.</p>
            <button
              onClick={() => {
                if (window.confirm(`Supprimer le compte de ${user?.first_name} ${user?.last_name} ?`)) {
                  deleteMutation.mutate()
                }
              }}
              disabled={deleteMutation.isPending}
              className="btn-danger"
            >
              ️ Supprimer ce compte
            </button>
          </div>
        </div>
      </div>
    </AppShell>
  )
}
