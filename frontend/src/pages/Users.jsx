import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import AppShell from '../components/layout/AppShell'
import Modal from '../components/ui/Modal'
import { Badge, Pagination } from '../components/ui/index.jsx'
import { SkeletonRow, EmptyState } from '../components/shared/index.jsx'
import { usersApi } from '../api/users.api'
import toast from 'react-hot-toast'

const ROLE_LABEL = { direction: 'Direction', formateur: 'Formateur', stagiaire: 'Stagiaire' }
const ROLE_COLOR = { direction: 'blue', formateur: 'green', stagiaire: 'purple' }

export default function Users() {
  const qc = useQueryClient()
  const [page, setPage]           = useState(1)
  const [search, setSearch]       = useState('')
  const [roleFilter, setRoleFilter] = useState('')
  const [showCreate, setCreate]   = useState(false)
  const [created, setCreated]     = useState(null)
  const [form, setForm] = useState({ first_name: '', last_name: '', date_of_birth: '', role_id: '' })

  const roles = [
    { id: 1, name: 'direction' },
    { id: 2, name: 'formateur' },
    { id: 3, name: 'stagiaire' },
  ]

  const { data, isLoading } = useQuery({
    queryKey: ['users', { page, search, role: roleFilter }],
    queryFn:  () => usersApi.list({ page, limit: 15, search, role: roleFilter }),
    keepPreviousData: true,
  })

  const createMutation = useMutation({
    mutationFn: () => usersApi.create({ ...form, role_id: Number(form.role_id) }),
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ['users'] })
      toast.success('Compte créé')
      setCreate(false)
      setCreated(res)
      setForm({ first_name: '', last_name: '', date_of_birth: '', role_id: '' })
    },
    onError: (err) => toast.error(err.response?.data?.message ?? 'Erreur'),
  })

  const deleteMutation = useMutation({
    mutationFn: (id) => usersApi.delete(id),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['users'] }); toast.success('Utilisateur supprimé') },
    onError: () => toast.error('Erreur lors de la suppression'),
  })

  const users      = data?.data ?? []
  const total      = data?.total ?? 0
  const totalPages = data?.totalPages ?? 1

  return (
    <AppShell>
      <div className="max-w-6xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb"><span>Administration</span><span>/</span><span className="text-slate-700">Utilisateurs</span></nav>
            <h1 className="page-title">Gestion des Utilisateurs</h1>
            <p className="page-subtitle">{total} compte{total !== 1 ? 's' : ''} au total</p>
          </div>
          <button onClick={() => setCreate(true)} className="btn-primary">+ Nouveau compte</button>
        </div>

        <div className="card p-5">
          <div className="flex gap-3 mb-4 flex-wrap">
            <input
              type="text"
              placeholder="Rechercher par nom ou email..."
              value={search}
              onChange={e => { setSearch(e.target.value); setPage(1) }}
              className="input max-w-xs"
            />
            <select className="select w-40" value={roleFilter} onChange={e => { setRoleFilter(e.target.value); setPage(1) }}>
              <option value="">Tous les rôles</option>
              {roles.map(r => <option key={r.id} value={r.name}>{ROLE_LABEL[r.name]}</option>)}
            </select>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr>
                  <th className="table-header text-left rounded-l-lg">Utilisateur</th>
                  <th className="table-header text-left">Email</th>
                  <th className="table-header text-left">Rôle</th>
                  <th className="table-header text-right rounded-r-lg">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 8 }).map((_, i) => <SkeletonRow key={i} cols={4} />)
                  : users.length === 0 ? (
                    <tr><td colSpan={4}><EmptyState icon="👥" title="Aucun utilisateur" description="Créez le premier compte." /></td></tr>
                  ) : users.map(u => (
                    <tr key={u.id} className="table-row-hover">
                      <td className="table-cell">
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-full bg-brand-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
                            {u.first_name?.[0]}{u.last_name?.[0]}
                          </div>
                          <span className="font-medium text-slate-800">{u.first_name} {u.last_name}</span>
                        </div>
                      </td>
                      <td className="table-cell text-slate-500">{u.email}</td>
                      <td className="table-cell">
                        <Badge variant={ROLE_COLOR[u.role] ?? 'gray'}>{ROLE_LABEL[u.role] ?? u.role}</Badge>
                      </td>
                      <td className="table-cell text-right">
                        <button
                          onClick={() => { if (window.confirm('Supprimer cet utilisateur ?')) deleteMutation.mutate(u.id) }}
                          className="text-xs text-red-500 hover:text-red-700 hover:underline font-medium"
                        >
                          Supprimer
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 flex justify-end">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </div>
      </div>

      <Modal open={showCreate} onClose={() => setCreate(false)} title="Créer un compte">
        <div className="space-y-4">
          <div className="bg-brand-blue-xs border border-brand-blue/20 rounded-xl p-3">
            <p className="text-xs text-brand-blue font-medium">L'email et le mot de passe sont générés automatiquement à partir du nom et de la date de naissance.</p>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="label">Prénom</label>
              <input className="input" placeholder="Ex: Karim" value={form.first_name}
                onChange={e => setForm(f => ({ ...f, first_name: e.target.value }))} />
            </div>
            <div>
              <label className="label">Nom</label>
              <input className="input" placeholder="Ex: Bennani" value={form.last_name}
                onChange={e => setForm(f => ({ ...f, last_name: e.target.value }))} />
            </div>
          </div>
          <div>
            <label className="label">Date de naissance</label>
            <input type="date" className="input" value={form.date_of_birth}
              onChange={e => setForm(f => ({ ...f, date_of_birth: e.target.value }))} />
          </div>
          <div>
            <label className="label">Rôle</label>
            <select className="select" value={form.role_id} onChange={e => setForm(f => ({ ...f, role_id: e.target.value }))}>
              <option value="">— Sélectionner un rôle —</option>
              {roles.map(r => <option key={r.id} value={r.id}>{ROLE_LABEL[r.name]}</option>)}
            </select>
          </div>
          <div className="flex gap-3 pt-1">
            <button
              onClick={() => createMutation.mutate()}
              disabled={!form.first_name || !form.last_name || !form.role_id || createMutation.isPending}
              className="btn-primary flex-1 justify-center"
            >
              {createMutation.isPending ? 'Création...' : 'Créer le compte'}
            </button>
            <button onClick={() => setCreate(false)} className="btn-secondary">Annuler</button>
          </div>
        </div>
      </Modal>

      <Modal open={!!created} onClose={() => setCreated(null)} title="Compte créé avec succès">
        {created && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-4 text-center">
              <p className="text-2xl mb-1">✅</p>
              <p className="font-bold text-green-800">{created.user?.first_name} {created.user?.last_name}</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="label text-slate-500">Email généré</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={created.user?.email ?? ''} className="input bg-slate-50 font-mono text-xs" />
                  <button onClick={() => { navigator.clipboard.writeText(created.user?.email ?? ''); toast.success('Copié') }}
                    className="btn-secondary text-xs flex-shrink-0 px-3">Copier</button>
                </div>
              </div>
              <div>
                <label className="label text-slate-500">Mot de passe temporaire</label>
                <div className="flex items-center gap-2">
                  <input readOnly value={created.password ?? ''} className="input bg-slate-50 font-mono text-xs" />
                  <button onClick={() => { navigator.clipboard.writeText(created.password ?? ''); toast.success('Copié') }}
                    className="btn-secondary text-xs flex-shrink-0 px-3">Copier</button>
                </div>
              </div>
            </div>
            <p className="text-xs text-slate-500 text-center">L'utilisateur devra changer son mot de passe à la première connexion.</p>
            <button onClick={() => setCreated(null)} className="btn-primary w-full justify-center">Fermer</button>
          </div>
        )}
      </Modal>
    </AppShell>
  )
}