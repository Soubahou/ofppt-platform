import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import AppShell from '../components/layout/AppShell'
import { usersApi } from '../api/users.api'
import { academicApi } from '../api/academic.api'
import toast from 'react-hot-toast'

function UserFormFields({ onSuccess, inline = false }) {
  const queryClient = useQueryClient()
  const navigate    = useNavigate()

  const [form, setForm] = useState({
    first_name: '', last_name: '', email: '',
    role: 'stagiaire', group_id: '', password: '',
  })
  const [errors, setErrors] = useState({})

  const { data: groups } = useQuery({
    queryKey: ['groups'],
    queryFn:  () => academicApi.listGroups(),
  })

  const mutation = useMutation({
    mutationFn: () => usersApi.create(form),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      toast.success(`Compte créé — mot de passe temporaire envoyé à ${data.email}`)
      if (onSuccess) onSuccess(data)
      else navigate('/users')
    },
    onError: (err) => {
      const msg = err.response?.data?.message ?? 'Erreur lors de la création'
      toast.error(msg)
      if (err.response?.data?.errors) setErrors(err.response.data.errors)
    },
  })

  const validate = () => {
    const e = {}
    if (!form.first_name.trim()) e.first_name = 'Requis'
    if (!form.last_name.trim())  e.last_name  = 'Requis'
    if (!form.email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) e.email = 'Email invalide'
    if (!form.password || form.password.length < 8) e.password = 'Minimum 8 caractères'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = (ev) => {
    ev?.preventDefault()
    if (!validate()) return
    mutation.mutate()
  }

  const Field = ({ label, field, type = 'text', placeholder = '' }) => (
    <div>
      <label className="label">{label}</label>
      <input
        type={type}
        className={`input ${errors[field] ? 'border-red-400' : ''}`}
        placeholder={placeholder}
        value={form[field]}
        onChange={e => setForm(f => ({ ...f, [field]: e.target.value }))}
      />
      {errors[field] && <p className="text-xs text-red-500 mt-1">{errors[field]}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <Field label="Prénom"    field="first_name" placeholder="Yousra" />
        <Field label="Nom"       field="last_name"  placeholder="Amrani" />
      </div>
      <Field label="Email professionnel" field="email" type="email" placeholder="prenom.nom@ofppt.ma" />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="label">Rôle</label>
          <select className="select" value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))}>
            <option value="stagiaire">Stagiaire</option>
            <option value="formateur">Formateur</option>
            <option value="direction">Direction</option>
          </select>
        </div>
        <div>
          <label className="label">Groupe</label>
          <select
            className="select"
            value={form.group_id}
            onChange={e => setForm(f => ({ ...f, group_id: e.target.value }))}
          >
            <option value="">— Aucun —</option>
            {(groups?.data ?? []).map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>
      </div>

      <Field label="Mot de passe temporaire" field="password" type="password" placeholder="••••••••" />

      <div className="flex gap-3 pt-2">
        <button
          onClick={handleSubmit}
          disabled={mutation.isPending}
          className="btn-primary flex-1 justify-center"
        >
          {mutation.isPending ? 'Création...' : 'Créer le compte'}
        </button>
        {!inline && (
          <button onClick={() => navigate('/users')} className="btn-secondary">
            Annuler
          </button>
        )}
      </div>
    </div>
  )
}

export default function UserNew({ onSuccess, inline }) {
  if (inline) return <UserFormFields onSuccess={onSuccess} inline />

  return (
    <AppShell>
      <div className="max-w-2xl mx-auto">
        <div className="page-header">
          <div>
            <nav className="breadcrumb">
              <a href="/users">Utilisateurs</a><span>/</span>
              <span className="text-slate-700">Nouveau</span>
            </nav>
            <h1 className="page-title">Créer un compte utilisateur</h1>
          </div>
        </div>
        <div className="card p-6">
          <UserFormFields />
        </div>
      </div>
    </AppShell>
  )
}
